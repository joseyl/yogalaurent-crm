import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { read, utils } from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load env
dotenv.config({ path: join(ROOT, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  realtime: {
    transport: ws
  }
})

const XLSX_PATH = join(__dirname, 'data', 'cleaned_supabase_ready_workbook.xlsx')

// Helper: read a sheet as array of objects
function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`)
  return utils.sheet_to_json(sheet, { defval: null })
}

// Helper: pick only the specified columns from a row object
function pickColumns(rows, columns) {
  return rows.map(row => {
    const out = {}
    for (const col of columns) {
      out[col] = row[col] ?? null
    }
    return out
  })
}

// Helper: insert rows in batches, throw on any error
async function insertBatches(table, rows, batchSize) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`Error inserting into ${table} (batch starting at ${i}):`, error)
      throw error
    }
  }
}

// Helper: truncate a table via delete on all rows
async function truncateTable(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) {
    console.error(`Error truncating ${table}:`, error)
    throw error
  }
  console.log(`Truncated: ${table}`)
}

async function main() {
  // Read workbook once
  const workbook = read(readFileSync(XLSX_PATH))

  // ── STEP 1: TRUNCATE ────────────────────────────────────────────────────────
  console.log('\n── Step 1: Truncating tables ──')
  await truncateTable('attendance')
  await truncateTable('purchases')
  await truncateTable('leads')
  await truncateTable('people')
  await truncateTable('products')

  // ── STEP 2: IMPORT PRODUCTS ─────────────────────────────────────────────────
  console.log('\n── Step 2: Importing products ──')
  const productCols = ['id', 'name', 'category', 'created_at']
  const products = pickColumns(readSheet(workbook, 'Products'), productCols)
  await insertBatches('products', products, products.length)
  console.log(`Imported products: ${products.length} rows`)

  // ── STEP 3: IMPORT PEOPLE ───────────────────────────────────────────────────
  console.log('\n── Step 3: Importing people ──')
  const peopleCols = [
    'id', 'email', 'alt_email', 'first_name', 'last_name',
    'phone', 'country', 'status', 'assigned_to', 'source_channel',
    'notes', 'created_at', 'updated_at',
  ]
  const people = pickColumns(readSheet(workbook, 'People'), peopleCols)
  await insertBatches('people', people, 200)
  console.log(`Imported people: ${people.length} rows`)

  // ── STEP 4: IMPORT PURCHASES ────────────────────────────────────────────────
  console.log('\n── Step 4: Importing purchases ──')
  const purchaseCols = ['id', 'person_id', 'product_id', 'amount_gbp', 'purchase_date', 'notes', 'created_at']
  const purchases = pickColumns(readSheet(workbook, 'Purchases'), purchaseCols)
  await insertBatches('purchases', purchases, 200)
  console.log(`Imported purchases: ${purchases.length} rows`)

  // ── STEP 5: IMPORT ATTENDANCE ───────────────────────────────────────────────
  console.log('\n── Step 5: Importing attendance ──')
  const attendanceCols = ['id', 'person_id', 'class_name', 'class_date', 'pass_used', 'created_at']
  const attendance = pickColumns(readSheet(workbook, 'Attendance'), attendanceCols)
  await insertBatches('attendance', attendance, 500)
  console.log(`Imported attendance: ${attendance.length} rows`)

  // ── STEP 6: VERIFY ──────────────────────────────────────────────────────────
  console.log('\n── Step 6: Verifying row counts ──')
  const tables = ['people', 'products', 'purchases', 'attendance', 'leads']
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`Error counting ${table}:`, error)
      throw error
    }
    console.log(`  ${table}: ${count}`)
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
