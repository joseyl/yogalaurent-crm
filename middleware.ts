import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/webhooks/momence-class-booking",
  "/api/webhooks/momence-membership-purchase",
  "/api/webhooks/training-order",
  "/api/webhooks/training-instalment",
  "/api/webhooks/payment-link-sale",
  "/api/webhooks/payment-link-refund",
  "/api/webhooks/balance-payment",
  "/api/webhooks/balance-refund",
  "/api/cron/momence-sync",
  "/api/cron/momence-sales",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
