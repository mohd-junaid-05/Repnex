import {
  ClerkProvider,
  Show,
  UserButton,
  OrganizationSwitcher,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { RepnexLogo } from "@/components/repnex-logo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://repnex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Repnex — AST Codebase Architecture & Dependency Graph",
    template: "%s | Repnex",
  },
  description:
    "Interactive AST-parsed dependency maps for TypeScript and JavaScript codebases. Real code parsing, blast radius computation, and architectural explanations.",
  applicationName: "Repnex",
  authors: [{ name: "Repnex" }],
  creator: "Repnex",
  publisher: "Repnex",
  keywords: [
    "Repnex",
    "codebase architecture",
    "dependency graph",
    "AST parser",
    "repository visualizer",
    "TypeScript dependency map",
    "software architecture visualization",
    "blast radius analysis",
    "call graph",
    "code map",
    "Next.js architecture",
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Repnex",
    title: "Repnex — AST Codebase Architecture & Dependency Graph",
    description:
      "Interactive AST-parsed dependency maps for TypeScript and JavaScript codebases. Understand architecture, blast radius, and component relationships from real code.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Repnex — Codebase Architecture & Dependency Graph",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Repnex — AST Codebase Architecture & Dependency Graph",
    description:
      "Interactive AST-parsed dependency maps for TypeScript and JavaScript codebases. Real code parsing with zero hallucinated edges.",
    images: ["/og.png"],
    creator: "@repnex",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

/** Wrap pages with authentication, theme support, and shared navigation. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-6 h-12 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-5">
                <Link
                  href="/"
                  className="hover:opacity-90 transition-opacity flex items-center"
                  aria-label="Repnex Home"
                >
                  <RepnexLogo
                    size={18}
                    showText
                    textClassName="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100"
                  />
                </Link>
                <Show when="signed-in">
                  <nav className="flex items-center gap-1 text-xs">
                    <Link
                      href="/"
                      className="px-2.5 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors font-mono"
                    >
                      Dashboard
                    </Link>
                  </nav>
                </Show>
              </div>

              <div className="flex items-center gap-2.5">
                <ThemeSwitcher />
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Sign in
                  </Link>
                </Show>
                <Show when="signed-in">
                  <OrganizationSwitcher hidePersonal={false} />
                  <UserButton />
                </Show>
              </div>
            </header>
            <div className="flex-1 min-h-0 flex flex-col overflow-auto">
              {children}
            </div>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}