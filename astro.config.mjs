// @ts-check
import { defineConfig, envField } from "astro/config";

import preact from "@astrojs/preact";

import node from "@astrojs/node";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    preact({
      compat: true,
    }),
    tailwind(),
  ],
  adapter: node({
    mode: "standalone",
  }),
  output: "static",
  env: {
    schema: {
      ANTHROPIC_API: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      HUGGINGFACE_TOKEN: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      ELEVEN_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
});
