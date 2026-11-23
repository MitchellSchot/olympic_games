// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle chart/map/UI deps so the dev server never re-optimizes mid-session
    // (which loads a second React copy and crashes hooks).
    optimizeDeps: {
      include: [
        "recharts", "country-flag-icons/string/3x2", "d3-geo", "d3-scale", "d3-scale-chromatic", "topojson-client",
        "@radix-ui/react-tooltip", "@radix-ui/react-slider", "@radix-ui/react-toggle-group",
        "@radix-ui/react-tabs", "@radix-ui/react-switch", "@radix-ui/react-collapsible",
        "@radix-ui/react-label", "lucide-react", "country-flag-icons/react/3x2",
      ],
    },
  },
});
