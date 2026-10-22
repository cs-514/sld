import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Project site: https://cs-514.github.io/sld/
// Files are emitted at the root of dist/. The /sld prefix is in every URL.
export default defineConfig({
  site: "https://cs-514.github.io",
  base: "/sld",
  trailingSlash: "always",
  compressHTML: true,
  prefetch: false,
  build: {
    format: "directory",
  },
  integrations: [
    sitemap({
      // CIK pages repeat the ticker pages. Tickers are the ones we list.
      filter: (page) => !page.includes("/edgar/cik/"),
    }),
  ],
});
