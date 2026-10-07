import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { CyberBackground } from "@/components/CyberBackground";

export const metadata: Metadata = {
  title: "Secure Data Vault · Cryptography & Web Security Lab",
  description:
    "An offline full-stack lab demonstrating SHA-512 password hashing, SQL injection attacks vs. parameterized queries, and AES-256-CBC encryption at rest.",
};

export const viewport: Viewport = {
  themeColor: "#04060c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <CyberBackground />
          <Navbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
          <footer className="border-t border-edge/60 py-5 text-center font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
            Secure Data Vault · Node crypto · SQLite · 100% offline · for educational use
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
