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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Repository dependency mapping and architecture visualization",
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
                  className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0 text-zinc-900 dark:text-zinc-100"
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="4" height="4" rx="0.75" fill="currentColor" />
                    <rect x="10" y="2" width="4" height="4" rx="0.75" fill="currentColor" opacity="0.6" />
                    <rect x="10" y="10" width="4" height="4" rx="0.75" fill="currentColor" />
                    <path
                      d="M4 6V12H10M12 6V10"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Cartograph</span>
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