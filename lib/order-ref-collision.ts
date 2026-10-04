export type DecisionResult =
  | { action: 'skip' }
  | { action: 'insert'; orderRef: string; collided: boolean }

export function decideOrderRef(
  orderRef: string,
  personId: string,
  existing: { order_ref: string; person_id: string }[],
): DecisionResult {
  if (existing.some(row => row.person_id === personId)) {
    return { action: 'skip' }
  }

  if (existing.length === 0) {
    return { action: 'insert', orderRef, collided: false }
  }

  const usedRefs = new Set(existing.map(row => row.order_ref))
  let n = 2
  while (usedRefs.has(`${orderRef}-${n}`)) {
    n++
  }
  return { action: 'insert', orderRef: `${orderRef}-${n}`, collided: true }
}
