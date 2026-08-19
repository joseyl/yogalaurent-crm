export interface MomenceMembership {
  productName: string
  amountGbp: number
  notes: string | null
  expiryDays: number | null
}

export const MOMENCE_MEMBERSHIP_LOOKUP: Record<string, MomenceMembership> = {
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
