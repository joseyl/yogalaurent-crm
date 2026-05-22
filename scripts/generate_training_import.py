import csv
import math

INPUT_CSV = "scripts/teacher_training_data.csv"
OUTPUT_SQL = "scripts/training_import.sql"

PRODUCT_MAP = {
    ("Breathwork Professional Training (Live)", "60-hour"): "Breathwork Professional Training - 60hr (Live)",
    ("Breathwork Professional Training (Online)", "60-hour"): "Breathwork Professional Training - 60hr",
    ("Breathwork Professional Training (Online)", "40-hour"): "Breathwork Professional Training - 40hr",
    ("Breathwork Professional Training (Online)", "100-Hour Bundle"): "Breathwork Professional Training - 100hr Bundle",
    ("Yoga Nidra Teacher Training (Online)", "50-hour"): "Yoga Nidra Teacher Training",
    ("Yoga Nidra Teacher Training (Live)", "50-hour"): "Yoga Nidra Teacher Training",
}

EDITION_MONTH = {
    "Winter": "01",
    "Spring": "04",
    "Summer": "07",
    "Autumn": "10",
}

SKIP_EMAILS = {"jamieanderson.scott@gmail.com", "soulconversations24@gmail.com"}

SPECIAL_OVERRIDE_EMAIL = "isabellehughes95@gmail.com"
SPECIAL_OVERRIDE_PRODUCT = "Breathwork Professional Training - 100hr Bundle"
SPECIAL_OVERRIDE_AMOUNT = 648.00


def escape_sql(value):
    return value.replace("'", "''")


def parse_amount(raw):
    if not raw or not raw.strip():
        return 0.00
    try:
        val = float(raw.strip().lstrip('\xa3£').replace(",", "").strip())
        if math.isnan(val) or math.isinf(val):
            return 0.00
        return val
    except ValueError:
        return 0.00


def note_sql(raw):
    if not raw or not raw.strip():
        return "NULL"
    return f"'{escape_sql(raw)}'"


def main():
    rows_processed = 0
    purchase_inserts = 0
    skipped = []

    seen_emails = []  # ordered unique emails for people inserts
    seen_email_set = set()
    email_to_person = {}  # email -> (first_name, last_name)

    purchase_rows = []

    with open(INPUT_CSV, encoding="latin-1", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows_processed += 1

            email = row["Email Address"].strip().lower()
            first_name = row["First Name"].strip()
            last_name = row["Last Name"].strip()
            course = row["Course"].strip()
            path = row["Path"].strip()
            edition = row["Edition"].strip()
            year_raw = row["Year"].strip()
            amount_raw = row["Amount Paid"].strip()
            note_raw = row.get("Note", "").strip()

            if email in SKIP_EMAILS:
                skipped.append((rows_processed, email, "email in skip list"))
                continue

            product = PRODUCT_MAP.get((course, path))
            if product is None:
                skipped.append((rows_processed, email, f"no product mapping for ({course!r}, {path!r})"))
                continue

            month = EDITION_MONTH.get(edition)
            if month is None:
                skipped.append((rows_processed, email, f"unknown edition {edition!r}"))
                continue

            try:
                year = int(year_raw)
            except ValueError:
                skipped.append((rows_processed, email, f"invalid year {year_raw!r}"))
                continue

            purchase_date = f"{year}-{month}-15"

            amount = parse_amount(amount_raw)
            if email == SPECIAL_OVERRIDE_EMAIL and product == SPECIAL_OVERRIDE_PRODUCT:
                amount = SPECIAL_OVERRIDE_AMOUNT

            if email not in seen_email_set:
                seen_email_set.add(email)
                seen_emails.append(email)
                email_to_person[email] = (first_name, last_name)

            purchase_rows.append({
                "email": email,
                "product": product,
                "amount": amount,
                "purchase_date": purchase_date,
                "note_raw": note_raw,
                "edition": edition,
                "year": year,
            })

    lines = []

    # Section 1
    lines.append("-- Step 1: Delete all training purchase records except Jamie Scott and Claudia Benjamin")
    lines.append("DELETE FROM purchases")
    lines.append("WHERE product_id IN (SELECT id FROM products WHERE category = 'training')")
    lines.append("AND person_id NOT IN (")
    lines.append("  SELECT id FROM people WHERE lower(email) IN ('jamieanderson.scott@gmail.com','soulconversations24@gmail.com')")
    lines.append(");")
    lines.append("")

    # Section 2
    lines.append("-- Step 2: Insert new people (deduplicated by email)")
    for email in seen_emails:
        first_name, last_name = email_to_person[email]
        lines.append(
            f"INSERT INTO people (email, first_name, last_name, status, assigned_to)\n"
            f"SELECT '{escape_sql(email)}', '{escape_sql(first_name)}', '{escape_sql(last_name)}', 'client', 'Jose'\n"
            f"WHERE NOT EXISTS (\n"
            f"  SELECT 1 FROM people WHERE lower(email) = '{escape_sql(email)}' OR lower(alt_email) = '{escape_sql(email)}'\n"
            f");"
        )
    lines.append("")

    # Section 3
    lines.append("-- Step 3: Insert purchases")
    for pr in purchase_rows:
        email = pr["email"]
        product = pr["product"]
        amount = pr["amount"]
        purchase_date = pr["purchase_date"]
        note = note_sql(pr["note_raw"])
        edition = pr["edition"]
        year = pr["year"]
        purchase_inserts += 1
        lines.append(
            f"INSERT INTO purchases (person_id, product_id, amount_gbp, purchase_date, notes, edition, cohort_year)\n"
            f"SELECT p.id, pr.id, {amount:.2f}, '{purchase_date}', {note}, '{escape_sql(edition)}', {year}\n"
            f"FROM people p, products pr\n"
            f"WHERE (lower(p.email) = '{escape_sql(email)}' OR lower(p.alt_email) = '{escape_sql(email)}')\n"
            f"  AND pr.name = '{escape_sql(product)}';"
        )
    lines.append("")

    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Total rows processed: {rows_processed}")
    print(f"Total purchase INSERT statements generated: {purchase_inserts}")
    if skipped:
        print(f"\nSkipped rows ({len(skipped)}):")
        for row_num, email, reason in skipped:
            print(f"  Row {row_num}: {email} — {reason}")
    else:
        print("No rows skipped.")
    print(f"\nOutput: {OUTPUT_SQL}")


if __name__ == "__main__":
    main()
