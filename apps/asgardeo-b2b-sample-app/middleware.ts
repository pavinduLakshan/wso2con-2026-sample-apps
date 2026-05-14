import { asgardeoMiddleware, createRouteMatcher } from "@asgardeo/nextjs/middleware";

const isProtectedRoute = createRouteMatcher([
  "/dashboard",
  "/dashboard/(.*)",
  "/bookings",
  "/bookings/(.*)",
  "/requests",
  "/requests/(.*)",
  "/organization",
  "/organization/(.*)"
]);

export default asgardeoMiddleware(async (asgardeo, request) => {
  if (isProtectedRoute(request)) {
    const protectionResult = await asgardeo.protectRoute();

    if (protectionResult) {
      return protectionResult;
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
