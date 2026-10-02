// Fetches every row from a Supabase table by paging with .range() in 1,000-row
// chunks (Supabase's hard per-request cap). Pass a factory that returns a fully
// configured query builder — without .range(); we add that each iteration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAll<T>(buildQuery: () => any): Promise<T[]> {
  const PAGE = 1000
  const results: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    results.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }

  return results
}
