export function validateWebhookSecret(request: Request): boolean {
  const secret = request.headers.get('x-webhook-secret')
  return secret === process.env.WEBHOOK_SECRET
}
