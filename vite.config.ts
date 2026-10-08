import { defineConfig, type Plugin } from "vite";
import { federation } from "@module-federation/vite";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Stand-in for any plugin whose hook does real work for a while, placed AFTER
// federation() so it runs once the parse tracker's idle timer is armed. In the
// reporting project it was the federation plugin's own expose walk
// (proxyRemoteEntry.buildStart, 11 s) and its own __loadShare__ loads.
const SLOW_BUILD_START_MS = Number(process.env.SLOW_BUILD_START_MS ?? 0);
const SLOW_LOAD_SHARE_MS = Number(process.env.SLOW_LOAD_SHARE_MS ?? 0);
// `import: false` is the share kind whose export narrowing waits on the tracker.
const IMPORT_FALSE = process.env.IMPORT_FALSE === "1";

const slowWork = (): Plugin => ({
  name: "slow-work",
  async buildStart() {
    if (SLOW_BUILD_START_MS) await sleep(SLOW_BUILD_START_MS);
  },
  async transform(_code, id) {
    if (SLOW_LOAD_SHARE_MS && id.includes("__loadShare__")) await sleep(SLOW_LOAD_SHARE_MS);
    return null;
  },
});

export default defineConfig({
  plugins: [
    federation({
      name: "remote",
      filename: "remoteEntry.js",
      exposes: { "./widget": "./src/widget.ts" },
      shared: {
        react: IMPORT_FALSE ? { singleton: true, import: false } : { singleton: true },
        "react-dom": { singleton: true },
      },
      dts: false,
    }),
    slowWork(),
  ],
  build: { target: "esnext" },
});
