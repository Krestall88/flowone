export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/documents/:path*",
    "/api/documents/:path*",
    "/api/workflow/:path*",
    "/api/journals/:path*",
  ],
};
