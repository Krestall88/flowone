export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/api/documents/:path*",
    "/api/workflow/:path*",
    "/api/journals/:path*",
  ],
};
