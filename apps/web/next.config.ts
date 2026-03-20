
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // reactCompiler: true, // Commenting out if causing issues with plugin, but should be fine
};

// Next.js 15/16 might have strict config types, but next-intl plugin handles it.
export default withNextIntl(nextConfig);
