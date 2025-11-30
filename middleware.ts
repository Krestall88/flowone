export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/workflow",
    "/workflow/:path*",
    "/journals",
    "/journals/temperature",
    "/journals/health",
    "/documents/:path*",
    "/api/documents/:path*",
    "/api/workflow/:path*",
    "/api/journals/:path*",
  ],
};
