export interface MomenceMembership {
  productName: string
  amountGbp: number
  notes: string | null
  expiryDays: number | null
}

// ── Momence API Client ────────────────────────────────────────────────────────

const MOMENCE_BASE = 'https://api.momence.com/api/v2'

// Module-level auth state — valid for the lifetime of one function invocation
let _momenceToken: string | null = null
let _momenceTokenExpiry = 0

export interface MomenceSession {
  id: number
  name: string
  startsAt: string
}

export interface MomenceBookingMember {
  id?: number
  email?: string
  firstName?: string
  lastName?: string
}

export interface MomenceBooking {
  id: number
  cancelledAt?: string | null
  checkedIn?: boolean
  member?: MomenceBookingMember
}

export interface MomenceBoughtMembership {
  id: number
  type: string
  startDate?: string | null
  endDate?: string | null
  isFrozen: boolean
  eventCreditsLeft?: number | null
  eventCreditsTotal?: number | null
  membership?: { name: string } | null
}

interface MomencePage<T> {
  pagination: { totalCount: number }
  payload: T[]
}

function momenceSleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function isMomenceAllowed(method: string, path: string): boolean {
  if (method === 'POST' && path === '/auth/token') return true
  if (method === 'GET' && path === '/host/sessions') return true
  if (method === 'GET' && /^\/host\/sessions\/\d+\/bookings$/.test(path)) return true
  if (method === 'GET' && /^\/host\/members\/\d+\/bought-memberships\/active$/.test(path)) return true
  // Total Sales report: asking for a report and reading it back. Reading only, nothing is changed in Momence.
  if (method === 'POST' && path === '/host/reports') return true
  if (method === 'GET' && /^\/host\/reports\/[A-Za-z0-9_-]+$/.test(path)) return true
  return false
}

async function momenceFetch(
  method: string,
  path: string,
  params: Record<string, string | number | boolean> = {},
  jsonBody: unknown = null,
): Promise<unknown> {
  if (!isMomenceAllowed(method, path)) throw new Error(`Momence: blocked ${method} ${path}`)

  const url = new URL(MOMENCE_BASE + path)
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await momenceSleep(200 * (attempt - 1))

    const headers: Record<string, string> = {}
    let body: BodyInit | undefined

    if (method === 'POST' && path === '/auth/token') {
      const basic = Buffer.from(
        `${process.env.MOMENCE_CLIENT_ID}:${process.env.MOMENCE_CLIENT_SECRET}`,
      ).toString('base64')
      headers['Authorization'] = `Basic ${basic}`
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams({
        grant_type: 'password',
        username: process.env.MOMENCE_USERNAME!,
        password: process.env.MOMENCE_PASSWORD!,
      })
    } else {
      await ensureMomenceToken()
      headers['Authorization'] = `Bearer ${_momenceToken}`
      if (jsonBody !== null) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(jsonBody)
      }
    }

    let res: Response
    try {
      res = await fetch(url.toString(), { method, headers, body })
    } catch {
      if (attempt === 3) throw new Error(`Momence network error on ${path}`)
      continue
    }

    if (res.status === 401 && path !== '/auth/token') {
      _momenceToken = null
      _momenceTokenExpiry = 0
      continue
    }
    if (res.status >= 500) {
      if (attempt === 3) throw new Error(`Momence ${res.status} on ${path} after 3 attempts`)
      continue
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Momence ${res.status} on ${path}: ${txt.slice(0, 200)}`)
    }
    return res.json()
  }
  throw new Error(`Momence: exhausted retries for ${path}`)
}

async function ensureMomenceToken(): Promise<void> {
  if (_momenceToken && Date.now() < _momenceTokenExpiry) return
  await login()
}

export async function login(): Promise<void> {
  const data = (await momenceFetch('POST', '/auth/token')) as {
    access_token?: string
    expires_in?: number
  }
  if (!data?.access_token) throw new Error('Momence login failed — no access_token')
  _momenceToken = data.access_token
  _momenceTokenExpiry = Date.now() + ((data.expires_in ?? 3600) * 1000) - 60_000
}

export async function getSessions(
  startAfter: string,
  startBefore: string,
): Promise<MomenceSession[]> {
  const PAGE_SIZE = 200
  const all: MomenceSession[] = []
  let page = 0
  while (true) {
    await momenceSleep(200)
    const data = (await momenceFetch('GET', '/host/sessions', {
      page,
      pageSize: PAGE_SIZE,
      startAfter,
      startBefore,
      includeCancelled: true,
      sortBy: 'startsAt',
      sortOrder: 'ASC',
    })) as MomencePage<MomenceSession>
    const payload = Array.isArray(data?.payload) ? data.payload : []
    const totalCount = data?.pagination?.totalCount ?? 0
    all.push(...payload)
    if ((page + 1) * PAGE_SIZE >= totalCount) break
    page++
  }
  return all
}

export async function getBookings(sessionId: number): Promise<MomenceBooking[]> {
  const PAGE_SIZE = 100
  const all: MomenceBooking[] = []
  let page = 0
  while (true) {
    await momenceSleep(200)
    const data = (await momenceFetch('GET', `/host/sessions/${sessionId}/bookings`, {
      page,
      pageSize: PAGE_SIZE,
      includeCancelled: true,
    })) as MomencePage<MomenceBooking>
    const payload = Array.isArray(data?.payload) ? data.payload : []
    const totalCount = data?.pagination?.totalCount ?? 0
    all.push(...payload)
    if ((page + 1) * PAGE_SIZE >= totalCount) break
    page++
  }
  return all
}

export async function getActivePasses(memberId: string): Promise<MomenceBoughtMembership[]> {
  const PAGE_SIZE = 50
  const all: MomenceBoughtMembership[] = []
  let page = 0
  while (true) {
    await momenceSleep(200)
    const data = (await momenceFetch(
      'GET',
      `/host/members/${memberId}/bought-memberships/active`,
      { page, pageSize: PAGE_SIZE },
    )) as MomencePage<MomenceBoughtMembership>
    const payload = Array.isArray(data?.payload) ? data.payload : []
    const totalCount = data?.pagination?.totalCount ?? 0
    all.push(...payload)
    if ((page + 1) * PAGE_SIZE >= totalCount) break
    page++
  }
  return all
}

// ── Total Sales report ────────────────────────────────────────────────────────
// One line per sale. Tested 2 to 8 Oct 2026 (claude/MOMENCE_API_TEST_RESULTS.md and
// ~/yogalaurent-crm-data/momence/items-list.mjs). Momence allows 100 report runs a day.

export interface MomenceSaleLine {
  saleItemId?: number | null
  paymentTransactionId?: number | null
  paymentCategory?: string | null
  paymentItem?: string | null
  eventType?: string | null
  paymentDate?: string | null
  serviceDate?: string | null
  paymentStatus?: string | null
  paymentMethod?: string | null
  paymentValue?: number | null
  paidInMoneyCredits?: number | null
  refunded?: number | null
  currency?: string | null
  memberId?: number | null
  payingMemberId?: number | null
  customerEmail?: string | null
  customerName?: string | null
  payingCustomerEmail?: string | null
  payingCustomerName?: string | null
  details?: {
    sessionBookingId?: number | null
    boughtMembershipId?: number | null
    appointmentReservationId?: number | null
  } | null
}

function reportRows(poll: unknown): MomenceSaleLine[] | null {
  const p = poll as Record<string, unknown> | null
  const data = p?.data as Record<string, unknown> | undefined
  for (const c of [p?.payload, data?.payload, data?.rows, data?.items, p?.data, p?.rows, p?.result, p?.items]) {
    if (Array.isArray(c)) return c as MomenceSaleLine[]
  }
  return null
}

/** Runs the Total Sales report for London dates from..to (inclusive) and returns every line. */
export async function getTotalSales(from: string, to: string): Promise<MomenceSaleLine[]> {
  const hostId = Number((process.env.MOMENCE_CLIENT_ID ?? '').match(/^api-(\d+)-/)?.[1])
  if (!hostId) throw new Error('Momence: cannot read the host id from MOMENCE_CLIENT_ID')

  const submitted = (await momenceFetch('POST', '/host/reports', {}, {
    parameters: {
      reportType: 'total-sales',
      hostId,
      dateRange: { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` },
    },
  })) as Record<string, unknown> | null
  const reportId = (submitted?.id ?? submitted?.reportId ?? (submitted?.data as Record<string, unknown> | undefined)?.id) as
    | string
    | number
    | undefined
  if (reportId == null) throw new Error('Momence: no report id returned')

  for (let i = 0; i < 40; i++) {
    await momenceSleep(3000)
    const poll = (await momenceFetch('GET', `/host/reports/${reportId}`)) as Record<string, unknown> | null
    const status = String(poll?.status ?? poll?.state ?? '').toLowerCase()
    if (status === 'failed' || status === 'error') throw new Error(`Momence report ${reportId} failed`)
    if (status !== 'completed' && status !== 'done' && status !== 'finished') continue

    const rows = reportRows(poll) ?? []
    const total = Number(
      (poll?.pagination as Record<string, unknown> | undefined)?.totalCount ??
        ((poll?.data as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)?.totalCount ??
        NaN,
    )
    if (Number.isFinite(total) && rows.length > 0 && rows.length < total) {
      const pageSize = rows.length
      for (let page = 1; rows.length < total && page <= 50; page++) {
        await momenceSleep(1000)
        const next = await momenceFetch('GET', `/host/reports/${reportId}`, { page, pageSize })
        const more = reportRows(next) ?? []
        if (more.length === 0) break
        rows.push(...more)
      }
      if (rows.length < total) throw new Error(`Momence report ${reportId}: read ${rows.length} of ${total} lines`)
    }
    return rows
  }
  throw new Error(`Momence report ${reportId} did not finish in 2 minutes`)
}

// ── Membership lookup (used by webhook handlers) ──────────────────────────────

export const MOMENCE_MEMBERSHIP_LOOKUP: Record<string, MomenceMembership> = {
  '930677': {
    productName: 'One month access',
    amountGbp: 0,
    notes: 'Promotional pass, price 0. Fill in price from the Momence sales report if paid.',
    expiryDays: null,
  },
  '394008': {
    productName: 'Introductory Offer',
    amountGbp: 20,
    notes: null,
    expiryDays: null,
  },
  '48100': {
    productName: '10 Class Pass',
    amountGbp: 120,
    notes: 'Non-expiring',
    expiryDays: null,
  },
  '63538': {
    productName: '5 Class Pass',
    amountGbp: 55,
    notes: null,
    expiryDays: 60,
  },
  '63598': {
    productName: '10 Class Pass',
    amountGbp: 90,
    notes: null,
    expiryDays: 90,
  },
  '66324': {
    productName: 'Private Class Pack',
    amountGbp: 120,
    notes: '2 sessions',
    expiryDays: null,
  },
  '72629': {
    productName: 'Private Class Pack',
    amountGbp: 550,
    notes: '10 sessions',
    expiryDays: null,
  },
  '136079': {
    productName: 'Private Class Pack',
    amountGbp: 180,
    notes: '3 sessions',
    expiryDays: null,
  },
  // Momence re-created the 3-session private pack under a new id. Both are live.
  '137069': {
    productName: 'Private Class Pack',
    amountGbp: 180,
    notes: '3 sessions',
    expiryDays: null,
  },
  '330739': {
    productName: '10 Class Pass',
    amountGbp: 90,
    notes: 'Autorenew',
    expiryDays: 90,
  },
  '333121': {
    productName: 'Unlimited Pass',
    amountGbp: 69,
    notes: 'Autorenew',
    expiryDays: null,
  },
}
