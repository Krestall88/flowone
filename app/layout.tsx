import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuditModeBanner } from "@/components/audit/audit-mode-banner";
import { OfflineIndicator } from "@/components/offline/offline-indicator";
import { PwaRegister } from "@/components/pwa/pwa-register";

const sans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HACCP Control / Production Control",
  description: "HACCP, санитарный контроль, журналы и документы для проверок",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${mono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>
          <PwaRegister />
          <AuditModeBanner />
          <OfflineIndicator />
          {children}
        </Providers>
      </body>
    </html>
  );
}
