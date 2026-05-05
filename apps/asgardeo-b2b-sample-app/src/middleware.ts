import { asgardeoMiddleware, createRouteMatcher } from "@asgardeo/nextjs/middleware";

const isProtectedRoute = createRouteMatcher([
  "/employee(.*)",
  "/admin(.*)",
]);

export default asgardeoMiddleware(async (asgardeo, req) => {
  if (isProtectedRoute(req)) {
    await asgardeo.protectRoute();
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
