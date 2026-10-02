// scripts/attendance-rebuild-dryrun.mjs
// Stage 1 dry run — reads Acuity CSVs + Momence API + Supabase people.
// Writes 4 files to ~/yogalaurent-crm-data/rebuild/. No writes to Supabase or Momence.

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Constants ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MOMENCE_BASE = 'https://api.momence.com/api/v2';
const ACUITY_DIR  = path.join(os.homedir(), 'yogalaurent-crm-data', 'acuity');
const OUTPUT_DIR  = path.join(os.homedir(), 'yogalaurent-crm-data', 'rebuild');
const EXPECTED_ACUITY_ROWS = 14769;

// ── Momence auth state ────────────────────────────────────────────────────────
let momenceToken = null;
let momenceTokenExpiry = 0;
let momenceCreds = null; // { clientId, clientSecret, username, password }

// ── Safe Momence fetch (only whitelisted endpoints) ───────────────────────────
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
      momenceToken = null;
      momenceTokenExpiry = 0;
      continue;
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
  if (!data?.access_token) throw new Error(`Momence login failed — no access_token in response`);
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
  // Strip UTF-8 BOM if present
  const text = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;
  const len = text.length;
  let pos = 0;

  function parseField() {
    if (pos >= len) return '';
    if (text[pos] === '"') {
      pos++; // skip opening quote
      let val = '';
      while (pos < len) {
        if (text[pos] === '"') {
          if (pos + 1 < len && text[pos + 1] === '"') {
            val += '"'; pos += 2; // doubled quote → literal "
          } else {
            pos++; break; // closing quote
          }
        } else {
          val += text[pos++];
        }
      }
      return val;
    }
    // Unquoted field: read until comma or row terminator
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
      if (pos < len && text[pos] === ',') {
        pos++; // comma → more fields follow
      } else {
        break; // row terminator or EOF
      }
    }
    // Consume row terminator
    if (pos < len && text[pos] === '\r') pos++;
    if (pos < len && text[pos] === '\n') pos++;
    return fields;
  }

  const allRows = [];
  while (pos < len) {
    const before = pos;
    const row = parseRow();
    if (pos === before) { pos++; continue; } // safety: skip stuck position
    if (row.length === 1 && row[0] === '') continue; // skip blank lines
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

// ── CSV output helpers ────────────────────────────────────────────────────────
function csvField(val) {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(fields) { return fields.map(csvField).join(','); }

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

function utcToLondonISO(date) {
  const p = londonParts(date);
  const londonAsUTC = new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
  const offsetH = Math.round((londonAsUTC - date) / 3_600_000);
  const sign = offsetH >= 0 ? '+' : '-';
  const absH = String(Math.abs(offsetH)).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${absH}:00`;
}

// Parse Acuity "Start Time" (UK local) → UTC Date. E.g. "March 30, 2020 6:30 am"
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
  // Treat as UTC first, compute what London would read, subtract offset to get true UTC
  const roughUTC = new Date(Date.UTC(year, month, day, hour, minute, 0));
  const lp = londonParts(roughUTC);
  const londonAsUTC = new Date(Date.UTC(+lp.year, +lp.month - 1, +lp.day, +lp.hour, +lp.minute, +lp.second));
  return new Date(roughUTC - (londonAsUTC - roughUTC));
}

// ── Class name labelling ──────────────────────────────────────────────────────
function labelClassName(name, source) {
  const n = (name ?? '').toLowerCase();
  if (/teacher\s+training|professional\s+training|taster|mentoring|q\s*&\s*a/.test(n)) return 'training';
  if (/private|1-2-1/.test(n)) return 'private';
  if (source === 'acuity') {
    if (/^ytfl\s+series/.test(n))                       return 'check';
    if (/^the\s+path\s+to\b/.test(n))                   return 'check';
    if (/^a\s+guide\s+to\b/.test(n))                    return 'check';
    if (/^making\s+your\s+way\b/.test(n))               return 'check';
    if (/pranayama\s+and\s+breathwork\s+self.?practice/.test(n)) return 'check';
  }
  return 'online_class';
}

// ── Supabase REST fetch (no supabase-js) ──────────────────────────────────────
async function fetchSupabaseTable(table, select) {
  const PAGE = 1000;
  const rows = [];
  let start = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
        'Range-Unit': 'items',
        'Range': `${start}-${start + PAGE - 1}`,
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Supabase ${table} ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    start += PAGE;
  }
  return rows;
}

// ── Momence Sept 2026 smoke-test ──────────────────────────────────────────────
async function testMomenceSept2026() {
  await ensureMomenceToken();
  const url = new URL(`${MOMENCE_BASE}/host/sessions`);
  url.searchParams.set('page',            '0');
  url.searchParams.set('pageSize',        '200');
  url.searchParams.set('startAfter',      '2026-09-01T00:00:00.000Z');
  url.searchParams.set('startBefore',     '2026-10-01T00:00:00.000Z');
  url.searchParams.set('includeCancelled','true');
  url.searchParams.set('sortBy',          'startsAt');
  url.searchParams.set('sortOrder',       'ASC');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${momenceToken}` },
  });
  const rawText = await res.text();

  console.log(`  HTTP status: ${res.status}`);

  let data = null;
  try { data = JSON.parse(rawText); } catch (_) { /* noop */ }

  if (!data || typeof data !== 'object') {
    console.error('\nERROR: Sept 2026 test — response is not JSON.');
    console.error('Raw response (first 500 chars):\n' + rawText.slice(0, 500));
    process.exit(1);
  }

  console.log(`  Top-level keys: ${Object.keys(data).join(', ')}`);
  console.log(`  pagination.totalCount: ${data?.pagination?.totalCount ?? '(key not found)'}`);
  const payload = Array.isArray(data?.payload) ? data.payload : [];
  console.log(`  Sessions in payload: ${payload.length}`);

  if (payload.length === 0) {
    console.error('\nERROR: September 2026 test returned 0 sessions (expected ~11).');
    console.error('Raw response (first 500 chars):\n' + rawText.slice(0, 500));
    process.exit(1);
  }
  console.log(`  ✓ Smoke test passed — ${payload.length} sessions found for September 2026`);
}

// ── Momence: fetch all sessions month by month ────────────────────────────────
async function fetchAllMomenceSessions() {
  const allSessions = new Map(); // session.id → session

  // Months 2023-03 through 2026-10
  const months = [];
  for (let y = 2023, mo = 3; y < 2026 || (y === 2026 && mo <= 10); ) {
    months.push({ y, mo });
    mo++;
    if (mo > 12) { mo = 1; y++; }
  }

  for (const { y, mo } of months) {
    const pad     = String(mo).padStart(2, '0');
    const nextMo  = mo === 12 ? 1 : mo + 1;
    const nextY   = mo === 12 ? y + 1 : y;
    const nextPad = String(nextMo).padStart(2, '0');

    const startAfter  = `${y}-${pad}-01T00:00:00.000Z`;
    const startBefore = `${nextY}-${nextPad}-01T00:00:00.000Z`;
    const PAGE_SIZE = 200;
    let page = 0;
    let newThisMonth = 0;

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

// ── Momence: fetch bookings for all sessions ──────────────────────────────────
async function fetchAllMomenceBookings(allSessions) {
  const bookings = []; // { session, booking }
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

  // Prompt for Momence credentials upfront (not saved, not logged)
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
    const text = fs.readFileSync(path.join(ACUITY_DIR, f), 'utf8');
    const rows = parseCSVFull(text);
    console.log(`  ${f}: ${rows.length} rows`);
    rawAcuity.push(...rows);
  }
  if (rawAcuity.length !== EXPECTED_ACUITY_ROWS) {
    console.error(`\nERROR: Expected ${EXPECTED_ACUITY_ROWS} Acuity rows total but parsed ${rawAcuity.length}. Stopping.`);
    process.exit(1);
  }
  console.log(`  Total: ${rawAcuity.length} rows ✓`);

  // Deduplicate by Appointment ID (all should be unique; log any dups found)
  const acuityById = new Map();
  let dups = 0;
  for (const row of rawAcuity) {
    const id = (row['Appointment ID'] ?? '').trim();
    if (!id) continue;
    if (acuityById.has(id)) { dups++; continue; }
    acuityById.set(id, row);
  }
  if (dups > 0) console.log(`  Warning: ${dups} duplicate Appointment IDs removed`);
  console.log(`  After dedup: ${acuityById.size} rows`);

  // ── STEP 2: Supabase people and current attendance ───────────────────────────
  console.log('\n── Step 2: Loading Supabase people and current attendance ──');

  const allPeople = await fetchSupabaseTable('people', 'id,email,alt_email,first_name,last_name');
  console.log(`  Loaded ${allPeople.length} people`);

  const byEmail    = new Map();
  const byAltEmail = new Map();
  const byName     = new Map(); // "first last" → person (for suggestions only, never linked)
  for (const p of allPeople) {
    if (p.email)     byEmail.set(p.email.toLowerCase().trim(), p);
    if (p.alt_email) byAltEmail.set(p.alt_email.toLowerCase().trim(), p);
    if (p.first_name && p.last_name) {
      const key = `${p.first_name.toLowerCase().trim()} ${p.last_name.toLowerCase().trim()}`;
      if (!byName.has(key)) byName.set(key, p);
    }
  }

  const currentRows = await fetchSupabaseTable('attendance', 'id,person_id,class_name,class_date,pass_used');
  console.log(`  Loaded ${currentRows.length} current attendance rows`);
  const passUsedCount = currentRows.filter(r => r.pass_used && String(r.pass_used).trim()).length;

  const currentByMonth = new Map();
  for (const r of currentRows) {
    if (!r.class_date) continue;
    const mo = r.class_date.slice(0, 7);
    if (mo < '2023-04') continue;
    currentByMonth.set(mo, (currentByMonth.get(mo) ?? 0) + 1);
  }

  // ── STEP 3: Momence September 2026 smoke test ────────────────────────────────
  console.log('\n── Step 3: Momence September 2026 smoke test ──');
  await momenceLogin();
  console.log('  Authenticated successfully');
  await testMomenceSept2026();

  // ── STEP 4: Full Momence fetch ───────────────────────────────────────────────
  console.log('\n── Step 4: Fetching all Momence sessions (Mar 2023 → Oct 2026) ──');
  const allSessions = await fetchAllMomenceSessions();
  console.log(`  Total unique sessions: ${allSessions.size}`);

  console.log('\n── Step 4b: Fetching Momence bookings ──');
  const momenceBookings = await fetchAllMomenceBookings(allSessions);
  console.log(`  Total Momence bookings: ${momenceBookings.length}`);

  // ── STEP 5: Build attendance records ────────────────────────────────────────
  console.log('\n── Step 5: Building attendance records ──');

  function matchPerson(email) {
    const e = (email ?? '').toLowerCase().trim();
    if (!e) return { person: null, method: 'none' };
    const p = byEmail.get(e);
    if (p) return { person: p, method: 'email' };
    const p2 = byAltEmail.get(e);
    if (p2) return { person: p2, method: 'alt_email' };
    return { person: null, method: 'none' };
  }

  const records = [];

  // Acuity records
  for (const [apptId, row] of acuityById) {
    const email      = (row['Email']      ?? '').toLowerCase().trim();
    const firstName  = (row['First Name'] ?? '').trim();
    const lastName   = (row['Last Name']  ?? '').trim();
    const className  = (row['Type']       ?? '').trim();
    const label      = (row['Label']      ?? '').trim();
    const cancelled  = /cancel/i.test(label);
    const checkedIn  = /checked[\s-]?in/i.test(label);
    const extraPerson = /extra\s+person/i.test(className);

    let classDate = '', classStart = '';
    try {
      const utc  = parseAcuityTime(row['Start Time'] ?? '');
      classDate  = utcToLondonDate(utc);
      classStart = utcToLondonISO(utc);
    } catch (e) {
      process.stderr.write(`  WARN Acuity parse: appt ${apptId}: ${e.message}\n`);
    }

    const { person, method: matchMethod } = matchPerson(email);
    const nameKey = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
    const hasSuggestion = !person && byName.has(nameKey);

    records.push({
      source: 'acuity',
      source_booking_id: apptId,
      momence_session_id: '',
      momence_member_id: '',
      class_name: className,
      class_date: classDate,
      class_start: classStart,
      email,
      first_name: firstName,
      last_name: lastName,
      cancelled: cancelled ? 'true' : 'false',
      checked_in: checkedIn ? 'true' : 'false',
      person_id: person ? person.id : '',
      match_method: hasSuggestion ? 'name_suggestion' : matchMethod,
      extra_person: extraPerson ? 'true' : 'false',
    });
  }

  // Momence records
  for (const { session, booking } of momenceBookings) {
    const member    = booking.member ?? {};
    const email     = (member.email     ?? '').toLowerCase().trim();
    const firstName = (member.firstName ?? '').trim();
    const lastName  = (member.lastName  ?? '').trim();
    const className = (session.name     ?? '').trim();
    const cancelled = !!booking.cancelledAt;
    const checkedIn = !!booking.checkedIn;

    let classDate = '', classStart = '';
    if (session.startsAt) {
      const utc  = new Date(session.startsAt);
      classDate  = utcToLondonDate(utc);
      classStart = utcToLondonISO(utc);
    }

    const { person, method: matchMethod } = matchPerson(email);
    const nameKey = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
    const hasSuggestion = !person && byName.has(nameKey);

    records.push({
      source: 'momence',
      source_booking_id: String(booking.id  ?? ''),
      momence_session_id: String(session.id ?? ''),
      momence_member_id: String(member.id   ?? ''),
      class_name: className,
      class_date: classDate,
      class_start: classStart,
      email,
      first_name: firstName,
      last_name: lastName,
      cancelled: cancelled ? 'true' : 'false',
      checked_in: checkedIn ? 'true' : 'false',
      person_id: person ? person.id : '',
      match_method: hasSuggestion ? 'name_suggestion' : matchMethod,
      extra_person: 'false',
    });
  }

  console.log(`  Total rebuilt records: ${records.length}`);

  // ── STEP 5a: attendance_rebuild.csv ──────────────────────────────────────────
  const ATTENDANCE_COLS = [
    'source','source_booking_id','momence_session_id','momence_member_id',
    'class_name','class_date','class_start','email','first_name','last_name',
    'cancelled','checked_in','person_id','match_method','extra_person',
  ];
  const attendanceLines = [ATTENDANCE_COLS.join(',')];
  for (const r of records) attendanceLines.push(csvRow(ATTENDANCE_COLS.map(c => r[c] ?? '')));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'attendance_rebuild.csv'), attendanceLines.join('\n') + '\n');
  console.log(`\n  Written attendance_rebuild.csv (${records.length} rows)`);

  // ── STEP 5b: unmatched_people.csv ────────────────────────────────────────────
  const unmatchedMap = new Map(); // email → entry
  for (const r of records) {
    if (r.person_id || !r.email) continue;
    if (!unmatchedMap.has(r.email)) {
      const nameKey = `${r.first_name.toLowerCase()} ${r.last_name.toLowerCase()}`;
      const suggestion = byName.get(nameKey);
      unmatchedMap.set(r.email, {
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
        sources: new Set(),
        count: 0,
        first_date: r.class_date || '9999',
        last_date:  r.class_date || '',
        name_suggestion: suggestion
          ? `${suggestion.id} | ${suggestion.first_name} ${suggestion.last_name}`
          : '',
      });
    }
    const e = unmatchedMap.get(r.email);
    e.sources.add(r.source);
    e.count++;
    if (r.class_date && r.class_date < e.first_date) e.first_date = r.class_date;
    if (r.class_date && r.class_date > e.last_date)  e.last_date  = r.class_date;
  }
  const unmatchedSorted = [...unmatchedMap.values()].sort((a, b) => b.count - a.count);

  const UNMATCHED_COLS = ['email','first_name','last_name','source','booking_count','first_class_date','last_class_date','name_suggestion'];
  const unmatchedLines = [UNMATCHED_COLS.join(',')];
  for (const e of unmatchedSorted) {
    unmatchedLines.push(csvRow([
      e.email, e.first_name, e.last_name,
      [...e.sources].sort().join('+'),
      String(e.count),
      e.first_date === '9999' ? '' : e.first_date,
      e.last_date,
      e.name_suggestion,
    ]));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'unmatched_people.csv'), unmatchedLines.join('\n') + '\n');
  console.log(`  Written unmatched_people.csv (${unmatchedSorted.length} unique unmatched emails)`);

  // ── STEP 5c: class_names.csv ─────────────────────────────────────────────────
  const classNameMap = new Map(); // "source::name" → entry
  for (const r of records) {
    const key = `${r.source}::${r.class_name}`;
    if (!classNameMap.has(key)) {
      classNameMap.set(key, {
        class_name: r.class_name, source: r.source,
        count: 0,
        first_date: r.class_date || '9999',
        last_date:  r.class_date || '',
        label: labelClassName(r.class_name, r.source),
      });
    }
    const e = classNameMap.get(key);
    e.count++;
    if (r.class_date && r.class_date < e.first_date) e.first_date = r.class_date;
    if (r.class_date && r.class_date > e.last_date)  e.last_date  = r.class_date;
  }

  const CLASS_COLS = ['class_name','source','booking_count','first_date','last_date','label'];
  const classLines = [CLASS_COLS.join(',')];
  for (const e of [...classNameMap.values()].sort((a, b) => b.count - a.count)) {
    classLines.push(csvRow([
      e.class_name, e.source, String(e.count),
      e.first_date === '9999' ? '' : e.first_date,
      e.last_date, e.label,
    ]));
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'class_names.csv'), classLines.join('\n') + '\n');
  console.log(`  Written class_names.csv (${classNameMap.size} distinct names)`);

  // ── STEP 5d: summary stats ───────────────────────────────────────────────────
  const bySourceMonth = new Map();
  for (const r of records) {
    if (!r.class_date) continue;
    const key = `${r.source}::${r.class_date.slice(0, 7)}`;
    if (!bySourceMonth.has(key)) bySourceMonth.set(key, { active: 0, cancelled: 0 });
    const e = bySourceMonth.get(key);
    if (r.cancelled === 'true') e.cancelled++; else e.active++;
  }

  const matchedPersonIds = new Set(records.filter(r => r.person_id).map(r => String(r.person_id)));
  const unmatchedEmails  = new Set(records.filter(r => !r.person_id && r.email).map(r => r.email));
  const suggestionEmails = new Set(records.filter(r => r.match_method === 'name_suggestion').map(r => r.email));

  const momenceEmailDateSet = new Set();
  for (const r of records) {
    if (r.source === 'momence' && r.cancelled !== 'true' && r.email && r.class_date) {
      momenceEmailDateSet.add(`${r.email}::${r.class_date}`);
    }
  }
  const OVERLAP_MONTHS = ['2023-03', '2023-04', '2023-05', '2023-06'];
  const overlapStats = {};
  for (const mo of OVERLAP_MONTHS) overlapStats[mo] = { total: 0, matched: 0, unmatched: 0 };
  for (const r of records) {
    if (r.source !== 'acuity' || r.cancelled === 'true' || !r.class_date) continue;
    const mo = r.class_date.slice(0, 7);
    if (!OVERLAP_MONTHS.includes(mo)) continue;
    if (mo === '2023-03' && r.class_date < '2023-03-31') continue; // only from 31 Mar
    overlapStats[mo].total++;
    if (momenceEmailDateSet.has(`${r.email}::${r.class_date}`)) overlapStats[mo].matched++;
    else overlapStats[mo].unmatched++;
  }

  const rebuiltByMonth = new Map();
  for (const r of records) {
    if (r.cancelled === 'true' || !r.class_date) continue;
    const mo = r.class_date.slice(0, 7);
    if (mo < '2023-04') continue;
    rebuiltByMonth.set(mo, (rebuiltByMonth.get(mo) ?? 0) + 1);
  }

  const sep2026 = new Set();
  for (const r of records) {
    if (!r.class_date?.startsWith('2026-09') || r.cancelled === 'true') continue;
    if (labelClassName(r.class_name, r.source) !== 'online_class') continue;
    sep2026.add(r.person_id || `email:${r.email}`);
  }

  // ── STEP 5e: summary.txt ─────────────────────────────────────────────────────
  const L = [];
  const ln = (s = '') => L.push(s);

  ln('ATTENDANCE REBUILD DRY RUN — SUMMARY');
  ln('=====================================');
  ln();
  ln(`Acuity rows (after dedup):  ${acuityById.size}`);
  ln(`Momence bookings fetched:   ${momenceBookings.length}`);
  ln(`Supabase people loaded:     ${allPeople.length}`);
  ln(`Total rebuilt records:      ${records.length}`);
  ln(`  of which active:          ${records.filter(r => r.cancelled !== 'true').length}`);
  ln(`  of which cancelled:       ${records.filter(r => r.cancelled === 'true').length}`);
  ln();

  ln('── BOOKINGS BY SOURCE AND MONTH ─────────────────────────────────────────');
  ln();
  const allMonthKeys = new Set();
  for (const k of bySourceMonth.keys()) allMonthKeys.add(k.split('::')[1]);
  for (const mo of [...allMonthKeys].sort()) {
    const ac  = bySourceMonth.get(`acuity::${mo}`)  ?? { active: 0, cancelled: 0 };
    const mom = bySourceMonth.get(`momence::${mo}`) ?? { active: 0, cancelled: 0 };
    const parts = [];
    if (ac.active  || ac.cancelled)  parts.push(`Acuity: ${ac.active} active + ${ac.cancelled} cancelled`);
    if (mom.active || mom.cancelled) parts.push(`Momence: ${mom.active} active + ${mom.cancelled} cancelled`);
    if (parts.length) ln(`  ${mo}  ${parts.join(' | ')}`);
  }
  ln();

  ln('── PEOPLE MATCHING ──────────────────────────────────────────────────────');
  ln();
  ln(`  Distinct CRM person IDs matched:         ${matchedPersonIds.size}`);
  ln(`  Distinct unmatched emails:               ${unmatchedEmails.size}`);
  ln(`  Unmatched with same-name CRM suggestion: ${suggestionEmails.size}`);
  ln(`  (Name suggestions appear in unmatched_people.csv but are never linked)`);
  ln();

  ln('── ACUITY / MOMENCE OVERLAP: 31 Mar – 30 Jun 2023 ──────────────────────');
  ln();
  ln('  For each non-cancelled Acuity booking in this period,');
  ln('  "match" = a non-cancelled Momence booking for the same email on the same date.');
  ln();
  for (const mo of OVERLAP_MONTHS) {
    const s = overlapStats[mo];
    const label = mo === '2023-03' ? '2023-03 (from 31st)' : mo;
    if (s.total === 0) { ln(`  ${label}: no Acuity bookings`); continue; }
    ln(`  ${label}: ${s.total} Acuity bookings — ${s.matched} matched in Momence, ${s.unmatched} not`);
  }
  ln();

  ln('── MONTH-BY-MONTH: REBUILT vs CURRENT ATTENDANCE (from Apr 2023) ────────');
  ln();
  ln('  Month       Rebuilt   Current      Diff');
  ln('  ─────────────────────────────────────────');
  const compareMonths = new Set([...rebuiltByMonth.keys(), ...currentByMonth.keys()]);
  for (const mo of [...compareMonths].sort()) {
    const reb  = rebuiltByMonth.get(mo) ?? 0;
    const cur  = currentByMonth.get(mo) ?? 0;
    const diff = reb - cur;
    const diffStr = diff === 0 ? '0' : diff > 0 ? `+${diff}` : String(diff);
    ln(`  ${mo}    ${String(reb).padStart(6)}   ${String(cur).padStart(6)}   ${diffStr}`);
  }
  ln();

  ln('── SEPTEMBER 2026: DISTINCT PEOPLE BOOKING ONLINE CLASS ────────────────');
  ln();
  ln(`  Distinct bookers (online_class, not cancelled): ${sep2026.size}  (expected ~33)`);
  ln();

  ln('── pass_used IN CURRENT ATTENDANCE TABLE ───────────────────────────────');
  ln();
  ln(`  Rows with non-empty pass_used: ${passUsedCount} of ${currentRows.length}`);
  ln();

  ln('── CODE FILES REFERENCING attendance TABLE OR pass_used ─────────────────');
  ln();
  const CODE_REFS = [
    'app/page.tsx:55                                    reads .from(\'attendance\').select(\'person_id,class_date\')',
    'app/api/dashboard/alerts/route.ts:24               reads .from(\'attendance\').select(\'person_id,class_date\')',
    'app/clients/[id]/page.tsx:27-28                    reads .from(\'attendance\').select(\'id,class_name,class_date,pass_used\')',
    'components/ClientDetail.tsx:39,62,87               receives attendance prop; pass_used typed as string|null',
    'components/ClientTabs.tsx:31,67,155,249,882,894    displays attendance rows including pass_used column',
    'scripts/reimport-supabase.mjs:79,111-115,119       truncates and bulk-imports attendance table (incl. pass_used)',
    'app/api/webhooks/momence-class-booking/route.ts:66-70  inserts into attendance with pass_used field',
  ];
  for (const ref of CODE_REFS) ln(`  ${ref}`);
  ln();

  ln('── OUTPUT FILES ─────────────────────────────────────────────────────────');
  ln();
  ln(`  ${path.join(OUTPUT_DIR, 'attendance_rebuild.csv')}`);
  ln(`  ${path.join(OUTPUT_DIR, 'unmatched_people.csv')}`);
  ln(`  ${path.join(OUTPUT_DIR, 'class_names.csv')}`);
  ln(`  ${path.join(OUTPUT_DIR, 'summary.txt')}`);
  ln();

  const summaryText = L.join('\n') + '\n';
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.txt'), summaryText);
  console.log('  Written summary.txt');

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('\n── SUMMARY ──\n');
  console.log(summaryText);
}

main().catch(err => {
  console.error('\nFatal error:', err.message ?? err);
  process.exit(1);
});
