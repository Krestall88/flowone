export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard",
    "/documents/:path*",
    "/api/documents/:path*",
    "/api/workflow/:path*",
  ],
};
