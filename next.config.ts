import type { NextConfig } from "next";
import { validateEnv } from "./lib/env";

// Fail loudly on boot if environment variables are missing
validateEnv();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
