import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
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
            <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 z-30">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 dark:bg-indigo-400 inline-block shadow-xs shadow-indigo-500/50" />
                  <span>Cartograph</span>
                </Link>
                <nav className="flex items-center gap-1 text-xs">
                  <Link
                    href="/"
                    className="px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors font-mono"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/preview"
                    className="px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors font-mono"
                  >
                    Preview
                  </Link>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <ThemeSwitcher />
                <Show when="signed-out">
                  <SignInButton />
                  <SignUpButton />
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