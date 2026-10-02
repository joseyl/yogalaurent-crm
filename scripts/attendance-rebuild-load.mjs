// scripts/attendance-rebuild-load.mjs
// Stage 2: loads rebuilt attendance into Supabase attendance_v2 and class_labels.
// Reads Acuity CSVs, Supabase people/attendance (read-only), Momence API (read-only).
// Writes ONLY to attendance_v2 and class_labels. Never touches public.attendance.

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Constants ─────────────────────────────────────────────────────────────────
const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MOMENCE_BASE       = 'https://api.momence.com/api/v2';
const ACUITY_DIR         = path.join(os.homedir(), 'yogalaurent-crm-data', 'acuity');
const OUTPUT_DIR         = path.join(os.homedir(), 'yogalaurent-crm-data', 'rebuild');
const EXPECTED_ACUITY    = 14769;
const WRITE_BATCH        = 500;

// Tables that may be written — anything else throws immediately
const WRITABLE = Object.freeze({
  attendance_v2: 'source,source_booking_id',
  class_labels:  'class_name',
});

// ── Momence auth state ────────────────────────────────────────────────────────
let momenceToken = null;
let momenceTokenExpiry = 0;
let momenceCreds = null; // { clientId, clientSecret, username, password }

// ── Safe Momence fetch (read-only, whitelisted paths only) ────────────────────
async function momenceFetch(method, urlPath, params = {}) {
  const allowed =
    (method === 'POST' && urlPath === '/auth/token') ||
    (method === 'GET'  && urlPath === '/host/sessions') ||
    (method === 'GET'  && /^\/host\/sessions\/\d+\/bookings$/.test(urlPath));
  if (!allowed) throw new Error(`Momence: blocked ${method} ${urlPath}`);

  const url = new URL(MOMENCE_BASE + urlPath);
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(200 * (attempt - 1));

    const headers = {};
    let body;
    if (method === 'POST' && urlPath === '/auth/token') {
      const basic = Buffer.from(`${momenceCreds.clientId}:${momenceCreds.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
      headers['Content-Type']  = 'application/x-www-form-urlencoded';
      body = new URLSearchParams({
        grant_type: 'password',
        username: momenceCreds.username,
        password: momenceCreds.password,
      });
    } else {
      await ensureMomenceToken();
      headers['Authorization'] = `Bearer ${momenceToken}`;
    }

    let res;
    try {
      res = await fetch(url.toString(), { method, headers, body });
    } catch (networkErr) {
      if (attempt === MAX_ATTEMPTS) throw networkErr;
      continue;
    }
    if (res.status === 401 && urlPath !== '/auth/token') {
      momenceToken = null; momenceTokenExpiry = 0; continue;
    }
    if (res.status >= 500) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`Momence ${res.status} on ${urlPath} after ${MAX_ATTEMPTS} attempts`);
      continue;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Momence ${res.status} on ${urlPath}: ${txt.slice(0, 200)}`);
    }
    return await res.json();
  }
}

async function momenceLogin() {
  const data = await momenceFetch('POST', '/auth/token');
  if (!data?.access_token) throw new Error('Momence login failed — no access_token');
  momenceToken = data.access_token;
  momenceTokenExpiry = Date.now() + ((data.expires_in ?? 3600) * 1000) - 60_000;
}

async function ensureMomenceToken() {
  if (!momenceToken || Date.now() >= momenceTokenExpiry) await momenceLogin();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Prompts ───────────────────────────────────────────────────────────────────
async function promptVisible(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

async function promptHidden(question) {
  return new Promise(resolve => {
    process.stdout.write(question);
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const handler = ch => {
      if (ch === '\r' || ch === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\x03') {
        process.exit();
      } else if (ch === '\x7f' || ch === '\b') {
        if (value.length > 0) value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    process.stdin.on('data', handler);
  });
}

// ── CSV parser: handles quoted fields, embedded newlines, doubled quotes, BOM ─
function parseCSVFull(rawText) {
  const text = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;
  const len = text.length;
  let pos = 0;

  function parseField() {
    if (pos >= len) return '';
    if (text[pos] === '"') {
      pos++;
      let val = '';
      while (pos < len) {
        if (text[pos] === '"') {
          if (pos + 1 < len && text[pos + 1] === '"') { val += '"'; pos += 2; }
          else { pos++; break; }
        } else { val += text[pos++]; }
      }
      return val;
    }
    let val = '';
    while (pos < len && text[pos] !== ',' && text[pos] !== '\r' && text[pos] !== '\n') {
      val += text[pos++];
    }
    return val;
  }

  function parseRow() {
    const fields = [];
    while (true) {
      fields.push(parseField());
      if (pos < len && text[pos] === ',') { pos++; }
      else { break; }
    }
    if (pos < len && text[pos] === '\r') pos++;
    if (pos < len && text[pos] === '\n') pos++;
    return fields;
  }

  const allRows = [];
  while (pos < len) {
    const before = pos;
    const row = parseRow();
    if (pos === before) { pos++; continue; }
    if (row.length === 1 && row[0] === '') continue;
    allRows.push(row);
  }
  if (allRows.length === 0) return [];
  const header = allRows[0];
  return allRows.slice(1).map(row => {
    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = row[j] ?? '';
    return obj;
  });
}

// ── Timezone utilities ────────────────────────────────────────────────────────
const LONDON_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function londonParts(date) {
  const p = {};
  for (const { type, value } of LONDON_FMT.formatToParts(date)) p[type] = value;
  return p;
}

function utcToLondonDate(date) {
  const p = londonParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

const MONTHS = {
  January:0, February:1, March:2, April:3, May:4, June:5,
  July:6, August:7, September:8, October:9, November:10, December:11,
};

function parseAcuityTime(str) {
  const m = str.trim().match(/^(\w+)\s+(\d+),\s+(\d{4})\s+(\d+):(\d+)\s+(am|pm)$/i);
  if (!m) throw new Error(`Cannot parse Acuity time: "${str}"`);
  const [, monthName, dayStr, yearStr, hourStr, minStr, ampm] = m;
  const month = MONTHS[monthName];
  if (month === undefined) throw new Error(`Unknown month "${monthName}"`);
  const year = +yearStr, day = +dayStr, minute = +minStr;
  let hour = +hourStr;
  if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
  const roughUTC = new Date(Date.UTC(year, month, day, hour, minute, 0));
  const lp = londonParts(roughUTC);
  const londonAsUTC = new Date(Date.UTC(+lp.year, +lp.month - 1, +lp.day, +lp.hour, +lp.minute, +lp.second));
  return new Date(roughUTC - (londonAsUTC - roughUTC));
}

// ── Class name labelling (same rules as dry run; 'check' → 'course' here) ─────
function labelClassName(name, source) {
  const n = (name ?? '').toLowerCase();
  if (/teacher\s+training|professional\s+training|taster|mentoring|q\s*&\s*a/.test(n)) return 'training';
  if (/private|1-2-1/.test(n)) return 'private';
  if (source === 'acuity') {
    if (/^ytfl\s+series/.test(n))                                  return 'course';
    if (/^the\s+path\s+to\b/.test(n))                             return 'course';
    if (/^a\s+guide\s+to\b/.test(n))                              return 'course';
    if (/^making\s+your\s+way\b/.test(n))                         return 'course';
    if (/pranayama\s+and\s+breathwork\s+self.?practice/.test(n))  return 'course';
  }
  return 'online_class';
}

// ── Supabase read (no supabase-js, plain fetch) ───────────────────────────────
async function fetchSupabaseTable(table, select) {
  const PAGE = 1000;
  const rows = [];
  let start = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    const res = await fetch(url, {
      headers: {
        'apikey':         SUPABASE_KEY,
        'Authorization':  `Bearer ${SUPABASE_KEY}`,
        'Accept':         'application/json',
        'Range-Unit':     'items',
        'Range':          `${start}-${start + PAGE - 1}`,
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Supabase read ${table} ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    start += PAGE;
  }
  return rows;
}

// Returns the total row count for a table with optional PostgREST filter string.
// Uses Prefer: count=exact; reads Content-Range header.
async function fetchSupabaseCount(table, filterQS = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id${filterQS ? '&' + filterQS : ''}`;
  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        'count=exact',
      'Range-Unit':    'items',
      'Range':         '0-0',
    },
  });
  const cr = res.headers.get('content-range') ?? '';
  const m  = cr.match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── Supabase write (ONLY attendance_v2 and class_labels, POST/upsert only) ────
async function supabaseUpsert(table, rows) {
  if (!Object.prototype.hasOwnProperty.call(WRITABLE, table)) {
    throw new Error(`Supabase write BLOCKED: "${table}" is not in the allowed write list [${Object.keys(WRITABLE).join(', ')}]`);
  }
  const onConflict = WRITABLE[table];
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;

  let sent = 0;
  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    const batch = rows.slice(i, i + WRITE_BATCH);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Supabase upsert ${table} batch ${Math.floor(i / WRITE_BATCH) + 1} failed ${res.status}: ${txt.slice(0, 400)}`);
    }
    sent += batch.length;
    process.stdout.write(`  ${table}: ${sent}/${rows.length} rows sent\r`);
  }
  process.stdout.write('\n');
  return sent;
}

// ── Momence: fetch all sessions from startMonth to endMonth (1-indexed) ───────
async function fetchAllMomenceSessions(startY, startMo, endY, endMo) {
  const allSessions = new Map();
  const months = [];
  for (let y = startY, mo = startMo; y < endY || (y === endY && mo <= endMo); ) {
    months.push({ y, mo });
    if (++mo > 12) { mo = 1; y++; }
  }

  for (const { y, mo } of months) {
    const pad     = String(mo).padStart(2, '0');
    const nextMo  = mo === 12 ? 1 : mo + 1;
    const nextY   = mo === 12 ? y + 1 : y;
    const nextPad = String(nextMo).padStart(2, '0');
    const startAfter  = `${y}-${pad}-01T00:00:00.000Z`;
    const startBefore = `${nextY}-${nextPad}-01T00:00:00.000Z`;
    const PAGE_SIZE = 200;
    let page = 0, newThisMonth = 0;

    while (true) {
      await sleep(200);
      const data = await momenceFetch('GET', '/host/sessions', {
        page, pageSize: PAGE_SIZE,
        startAfter, startBefore,
        includeCancelled: true,
        sortBy: 'startsAt', sortOrder: 'ASC',
      });
      const payload    = Array.isArray(data?.payload) ? data.payload : [];
      const totalCount = data?.pagination?.totalCount ?? 0;
      for (const s of payload) {
        if (!allSessions.has(s.id)) { allSessions.set(s.id, s); newThisMonth++; }
      }
      if ((page + 1) * PAGE_SIZE >= totalCount) break;
      page++;
    }
    if (newThisMonth > 0) console.log(`  ${y}-${pad}: ${newThisMonth} sessions`);
  }
  return allSessions;
}

async function fetchAllMomenceBookings(allSessions) {
  const bookings = [];
  const PAGE_SIZE = 100;
  let sIdx = 0;
  for (const [sessionId, session] of allSessions) {
    sIdx++;
    if (sIdx % 50 === 0) process.stdout.write(`  ${sIdx}/${allSessions.size} sessions processed...\n`);
    let page = 0;
    while (true) {
      await sleep(200);
      const data = await momenceFetch('GET', `/host/sessions/${sessionId}/bookings`, {
        page, pageSize: PAGE_SIZE, includeCancelled: true,
      });
      const payload    = Array.isArray(data?.payload) ? data.payload : [];
      const totalCount = data?.pagination?.totalCount ?? 0;
      for (const b of payload) bookings.push({ session, booking: b });
      if ((page + 1) * PAGE_SIZE >= totalCount) break;
      page++;
    }
  }
  return bookings;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  // Compute today and Momence end date (3 months from today)
  const now       = new Date();
  const todayStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let endMo       = now.getMonth() + 1 + 3; // 1-indexed
  let endY        = now.getFullYear();
  while (endMo > 12) { endMo -= 12; endY++; }

  console.log(`\nToday: ${todayStr}  |  Momence end month: ${endY}-${String(endMo).padStart(2, '0')}`);

  // Credentials
  console.log('\nMomence credentials (not saved, not logged):');
  const clientId     = (await promptVisible('  Client ID:         ')).trim();
  const clientSecret = (await promptHidden ('  Client Secret:     ')).trim();
  const username     = (await promptVisible('  Momence email:     ')).trim();
  const password     =  await promptHidden ('  Momence password:  ');
  momenceCreds = { clientId, clientSecret, username, password };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── STEP 1: Acuity CSVs ──────────────────────────────────────────────────────
  console.log('\n── Step 1: Parsing Acuity CSVs ──');
  const csvFiles = fs.readdirSync(ACUITY_DIR).filter(f => f.endsWith('.csv')).sort();
  const rawAcuity = [];
  for (const f of csvFiles) {
    const rows = parseCSVFull(fs.readFileSync(path.join(ACUITY_DIR, f), 'utf8'));
    console.log(`  ${f}: ${rows.length} rows`);
    rawAcuity.push(...rows);
  }
  if (rawAcuity.length !== EXPECTED_ACUITY) {
    console.error(`\nERROR: Expected ${EXPECTED_ACUITY} Acuity rows but got ${rawAcuity.length}. Stopping.`);
    process.exit(1);
  }
  console.log(`  Total: ${rawAcuity.length} rows ✓`);

  const acuityById = new Map();
  let acuityDups = 0;
  for (const row of rawAcuity) {
    const id = (row['Appointment ID'] ?? '').trim();
    if (!id) continue;
    if (acuityById.has(id)) { acuityDups++; continue; }
    acuityById.set(id, row);
  }
  if (acuityDups > 0) console.log(`  Warning: ${acuityDups} duplicate Appointment IDs skipped`);
  console.log(`  After dedup: ${acuityById.size} rows`);

  // ── STEP 2: Supabase reads ────────────────────────────────────────────────────
  console.log('\n── Step 2: Loading Supabase people and current attendance ──');

  const allPeople = await fetchSupabaseTable('people', 'id,email,alt_email,first_name,last_name');
  console.log(`  Loaded ${allPeople.length} people`);

  const byEmail    = new Map();
  const byAltEmail = new Map();
  for (const p of allPeople) {
    if (p.email)     byEmail.set(p.email.toLowerCase().trim(), p);
    if (p.alt_email) byAltEmail.set(p.alt_email.toLowerCase().trim(), p);
  }

  function matchPerson(email) {
    const e = (email ?? '').toLowerCase().trim();
    if (!e) return null;
    return byEmail.get(e) ?? byAltEmail.get(e) ?? null;
  }

  // Old attendance — needed for pass_used lookup and comparison table
  const oldAttendance = await fetchSupabaseTable('attendance', 'id,person_id,class_name,class_date,pass_used');
  console.log(`  Loaded ${oldAttendance.length} old attendance rows`);

  const oldPassUsedCount = oldAttendance.filter(r => r.pass_used && String(r.pass_used).trim()).length;

  // Build pass_used lookup: person_id + class_date + class_name(lower) → first non-empty value
  const passLookup = new Map();
  for (const r of oldAttendance) {
    if (!r.person_id || !r.class_date || !r.class_name) continue;
    const passVal = r.pass_used ? String(r.pass_used).trim() : '';
    if (!passVal) continue;
    const key = `${r.person_id}::${r.class_date}::${r.class_name.toLowerCase().trim()}`;
    if (!passLookup.has(key)) passLookup.set(key, passVal);
  }

  // Old attendance count by month (for comparison table, Apr 2023+)
  const oldByMonth = new Map();
  for (const r of oldAttendance) {
    if (!r.class_date) continue;
    const mo = r.class_date.slice(0, 7);
    if (mo < '2023-04') continue;
    oldByMonth.set(mo, (oldByMonth.get(mo) ?? 0) + 1);
  }

  // ── STEP 3: Momence ───────────────────────────────────────────────────────────
  console.log('\n── Step 3: Authenticating with Momence ──');
  await momenceLogin();
  console.log('  Authenticated successfully');

  console.log(`\n── Step 3b: Fetching Momence sessions (Mar 2023 → ${endY}-${String(endMo).padStart(2, '0')}) ──`);
  const allSessions = await fetchAllMomenceSessions(2023, 3, endY, endMo);
  console.log(`  Total unique sessions: ${allSessions.size}`);

  console.log('\n── Step 3c: Fetching Momence bookings ──');
  const momenceBookings = await fetchAllMomenceBookings(allSessions);
  console.log(`  Total Momence bookings: ${momenceBookings.length}`);

  // ── STEP 4: Build records ─────────────────────────────────────────────────────
  console.log('\n── Step 4: Building records ──');

  // Build Momence records first so we can flag Acuity duplicates
  const momenceEmailDate = new Set(); // non-cancelled momence: "email::YYYY-MM-DD"
  const momenceRecords = [];

  for (const { session, booking } of momenceBookings) {
    const member    = booking.member ?? {};
    const email     = (member.email     ?? '').toLowerCase().trim();
    const firstName = (member.firstName ?? '').trim();
    const lastName  = (member.lastName  ?? '').trim();
    const className = (session.name     ?? '').trim();
    const cancelled = !!booking.cancelledAt;
    const cancelledAt = booking.cancelledAt ?? null;
    const checkedIn = !!booking.checkedIn;

    let classDate = null, classStart = null;
    if (session.startsAt) {
      const utc = new Date(session.startsAt);
      classDate  = utcToLondonDate(utc);
      classStart = utc.toISOString();
    }

    const person = matchPerson(email);
    const personId = person ? person.id : null;

    // pass_used: copy from old attendance for matched people
    let passUsed = null;
    if (personId && classDate && className) {
      const key = `${personId}::${classDate}::${className.toLowerCase().trim()}`;
      passUsed = passLookup.get(key) ?? null;
    }

    if (!cancelled && email && classDate) {
      momenceEmailDate.add(`${email}::${classDate}`);
    }

    momenceRecords.push({
      source: 'momence',
      source_booking_id: String(booking.id  ?? ''),
      momence_session_id: String(session.id ?? '') || null,
      momence_member_id:  String(member.id  ?? '') || null,
      class_name: className || null,
      class_date: classDate,
      class_start: classStart,
      email: email || null,
      first_name: firstName || null,
      last_name:  lastName  || null,
      cancelled,
      cancelled_at: cancelledAt,
      checked_in: checkedIn,
      extra_person: false,
      person_id: personId,
      pass_used: passUsed,
      duplicate_of_momence: false,
    });
  }

  // Build Acuity records, flagging duplicates
  const acuityRecords = [];
  for (const [apptId, row] of acuityById) {
    const email      = (row['Email']      ?? '').toLowerCase().trim();
    const firstName  = (row['First Name'] ?? '').trim();
    const lastName   = (row['Last Name']  ?? '').trim();
    const className  = (row['Type']       ?? '').trim();
    const label      = (row['Label']      ?? '').trim();
    const cancelled  = /cancel/i.test(label);
    const checkedIn  = /checked[\s-]?in/i.test(label);
    const extraPerson = /extra\s+person/i.test(className);

    let classDate = null, classStart = null;
    try {
      const utc  = parseAcuityTime(row['Start Time'] ?? '');
      classDate  = utcToLondonDate(utc);
      classStart = utc.toISOString();
    } catch (e) {
      process.stderr.write(`  WARN Acuity parse: appt ${apptId}: ${e.message}\n`);
    }

    const person   = matchPerson(email);
    const personId = person ? person.id : null;

    // Flag as duplicate if a non-cancelled Momence booking exists for same email+date
    const duplicateOfMomence = !cancelled && !!email && !!classDate &&
      momenceEmailDate.has(`${email}::${classDate}`);

    acuityRecords.push({
      source: 'acuity',
      source_booking_id: apptId,
      momence_session_id: null,
      momence_member_id:  null,
      class_name: className || null,
      class_date: classDate,
      class_start: classStart,
      email: email || null,
      first_name: firstName || null,
      last_name:  lastName  || null,
      cancelled,
      cancelled_at: null,
      checked_in: checkedIn,
      extra_person: extraPerson,
      person_id: personId,
      pass_used: null,
      duplicate_of_momence: duplicateOfMomence,
    });
  }

  const records = [...acuityRecords, ...momenceRecords];
  console.log(`  Acuity records: ${acuityRecords.length}`);
  console.log(`  Momence records: ${momenceRecords.length}`);
  console.log(`  Total: ${records.length}`);
  console.log(`  Flagged duplicate_of_momence: ${records.filter(r => r.duplicate_of_momence).length}`);
  console.log(`  Momence rows with pass_used: ${momenceRecords.filter(r => r.pass_used).length}`);

  // Build class_labels rows (one per distinct class_name)
  // Use Acuity source for labelling if name appears in Acuity (course detection is Acuity-specific)
  const classNameSources = new Map(); // class_name → Set of sources
  for (const r of records) {
    if (!r.class_name) continue;
    if (!classNameSources.has(r.class_name)) classNameSources.set(r.class_name, new Set());
    classNameSources.get(r.class_name).add(r.source);
  }
  const classLabelRows = [];
  for (const [name, sources] of classNameSources) {
    const src = sources.has('acuity') ? 'acuity' : 'momence';
    classLabelRows.push({ class_name: name, label: labelClassName(name, src) });
  }
  const labelCounts = {};
  for (const row of classLabelRows) labelCounts[row.label] = (labelCounts[row.label] ?? 0) + 1;
  console.log(`  Distinct class names: ${classLabelRows.length}`);

  // ── STEP 5: Write confirmation ────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────────');
  console.log(`Ready to upsert ${records.length} rows into attendance_v2`);
  console.log(`and ${classLabelRows.length} rows into class_labels.`);
  console.log('────────────────────────────────────────────────────');
  const answer = await promptVisible('\nType WRITE to load into attendance_v2 and class_labels: ');
  if (answer.trim() !== 'WRITE') {
    console.log('\nExiting without writing. No data was changed.');
    process.exit(0);
  }

  // ── STEP 6: Upsert attendance_v2 ─────────────────────────────────────────────
  console.log('\n── Step 6: Upserting attendance_v2 ──');
  await supabaseUpsert('attendance_v2', records);
  console.log(`  Upsert complete`);

  // ── STEP 7: Upsert class_labels ───────────────────────────────────────────────
  console.log('\n── Step 7: Upserting class_labels ──');
  await supabaseUpsert('class_labels', classLabelRows);
  console.log(`  Upsert complete`);

  // ── STEP 8: Read back counts from Supabase ────────────────────────────────────
  console.log('\n── Step 8: Reading back counts ──');
  const countAcuity  = await fetchSupabaseCount('attendance_v2', 'source=eq.acuity');
  const countMomence = await fetchSupabaseCount('attendance_v2', 'source=eq.momence');
  const countTotal   = countAcuity + countMomence;
  console.log(`  attendance_v2: ${countAcuity} acuity + ${countMomence} momence = ${countTotal} total`);

  // ── STEP 9: Summary stats ─────────────────────────────────────────────────────

  const withPerson    = records.filter(r => r.person_id).length;
  const withoutPerson = records.filter(r => !r.person_id).length;
  const dupCount      = records.filter(r => r.duplicate_of_momence).length;
  const passUsedCount = momenceRecords.filter(r => r.pass_used).length;

  // Month-by-month: rebuilt (not cancelled, not duplicate_of_momence) vs old attendance
  const rebuiltByMonth = new Map();
  for (const r of records) {
    if (r.cancelled || r.duplicate_of_momence || !r.class_date) continue;
    const mo = r.class_date.slice(0, 7);
    if (mo < '2023-04') continue;
    rebuiltByMonth.set(mo, (rebuiltByMonth.get(mo) ?? 0) + 1);
  }

  // September 2026: online_class, not cancelled — distinct people by email, checked_in count
  const sep2026 = records.filter(r =>
    r.class_date?.startsWith('2026-09') && !r.cancelled &&
    labelClassName(r.class_name ?? '', r.source) === 'online_class'
  );
  const sep2026Emails      = new Set(sep2026.map(r => r.email).filter(Boolean));
  const sep2026CheckedEmails = new Set(
    sep2026.filter(r => r.checked_in).map(r => r.email).filter(Boolean)
  );

  // Future bookings by month (class_date > today, not cancelled)
  const futureByMonth = new Map();
  for (const r of records) {
    if (!r.class_date || r.cancelled || r.class_date <= todayStr) continue;
    const mo = r.class_date.slice(0, 7);
    futureByMonth.set(mo, (futureByMonth.get(mo) ?? 0) + 1);
  }

  // ── Build summary text ────────────────────────────────────────────────────────
  const L = [];
  const ln = (s = '') => L.push(s);

  ln('ATTENDANCE_V2 LOAD SUMMARY');
  ln('==========================');
  ln();
  ln(`Run date: ${todayStr}`);
  ln();

  ln('── ROWS SENT AND CONFIRMED IN attendance_v2 ─────────────────────────────');
  ln();
  ln('  Sent by this script:');
  ln(`    Acuity:   ${acuityRecords.length}`);
  ln(`    Momence:  ${momenceRecords.length}`);
  ln(`    Total:    ${records.length}`);
  ln();
  ln('  Now in attendance_v2 (read back with Prefer: count=exact):');
  ln(`    Acuity:   ${countAcuity}`);
  ln(`    Momence:  ${countMomence}`);
  ln(`    Total:    ${countTotal}`);
  ln();

  ln('── DUPLICATE_OF_MOMENCE ─────────────────────────────────────────────────');
  ln();
  ln(`  Acuity rows flagged duplicate_of_momence: ${dupCount}`);
  ln(`  (Non-cancelled Acuity bookings where a Momence booking exists`);
  ln(`   for the same email on the same date)`);
  ln();

  ln('── PERSON MATCHING ──────────────────────────────────────────────────────');
  ln();
  ln(`  Rows with person_id:    ${withPerson}`);
  ln(`  Rows without person_id: ${withoutPerson}`);
  ln();

  ln('── PASS_USED COPY ───────────────────────────────────────────────────────');
  ln();
  ln(`  Momence rows with pass_used populated:   ${passUsedCount}`);
  ln(`  Old attendance table had non-empty pass_used: ${oldPassUsedCount} rows`);
  ln(`  (Reference value from instructions: ~3,610)`);
  ln();

  ln('── CLASS LABELS ─────────────────────────────────────────────────────────');
  ln();
  for (const label of ['online_class', 'training', 'private', 'course']) {
    ln(`  ${label.padEnd(13)}: ${labelCounts[label] ?? 0} class names`);
  }
  ln(`  ${'Total'.padEnd(13)}: ${classLabelRows.length} distinct class names`);
  ln();

  ln('── MONTH-BY-MONTH: attendance_v2 (not cancelled, not duplicate) vs public.attendance ──');
  ln();
  ln('  Month       New table   Old table     Diff');
  ln('  ───────────────────────────────────────────');
  const compareMonths = new Set([...rebuiltByMonth.keys(), ...oldByMonth.keys()]);
  for (const mo of [...compareMonths].sort()) {
    const rebuilt = rebuiltByMonth.get(mo) ?? 0;
    const old     = oldByMonth.get(mo) ?? 0;
    const diff    = rebuilt - old;
    const diffStr = diff === 0 ? '0' : diff > 0 ? `+${diff}` : String(diff);
    ln(`  ${mo}    ${String(rebuilt).padStart(8)}   ${String(old).padStart(8)}   ${diffStr}`);
  }
  ln();

  ln('── SEPTEMBER 2026: ONLINE CLASS, NOT CANCELLED ─────────────────────────');
  ln();
  ln(`  Distinct people (by email): ${sep2026Emails.size}`);
  ln(`  Of those with checked_in = true at least once: ${sep2026CheckedEmails.size}`);
  ln();

  ln('── FUTURE BOOKINGS (after today, not cancelled) ─────────────────────────');
  ln();
  if (futureByMonth.size === 0) {
    ln('  None');
  } else {
    for (const mo of [...futureByMonth.keys()].sort()) {
      ln(`  ${mo}: ${futureByMonth.get(mo)} bookings`);
    }
  }
  ln();

  ln('── OUTPUT ───────────────────────────────────────────────────────────────');
  ln();
  ln(`  ${path.join(OUTPUT_DIR, 'load_summary.txt')}`);
  ln();

  const summaryText = L.join('\n') + '\n';
  fs.writeFileSync(path.join(OUTPUT_DIR, 'load_summary.txt'), summaryText);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Summary saved to: ${path.join(OUTPUT_DIR, 'load_summary.txt')}`);
  console.log('\n── LOAD SUMMARY ──\n');
  console.log(summaryText);
}

main().catch(err => {
  console.error('\nFatal error:', err.message ?? err);
  process.exit(1);
});
