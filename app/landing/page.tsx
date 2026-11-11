import { LandingPage } from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Codebase Architecture & Dependency Graph",
  description:
    "Explore interactive AST dependency maps of TypeScript and JavaScript codebases. Folders fold into panels, imports become directional lines, and architecture explains itself.",
  alternates: {
    canonical: "/landing",
  },
};

export default function LandingPageRoute() {
  return <LandingPage />;
}

