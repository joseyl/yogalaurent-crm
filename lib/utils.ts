const gbpFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatGBP(amount: number): string {
  return gbpFormatter.format(amount)
}

export function categoryLabel(cat: string): string {
  if (cat === 'workshop') return 'In-person Workshop'
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}
