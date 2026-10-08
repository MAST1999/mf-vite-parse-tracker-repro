# @module-federation/vite: the parse tracker's idle timer counts other plugins' hook time as "no module activity"

Minimal reproduction for a `vite build` of a federation remote with
`@module-federation/vite` (1.23.4, the latest release) on Vite 8.3.1 (rolldown).

`slowWork()` in `vite.config.ts` stands in for any plugin, placed after
`federation()`, whose `buildStart` does real work for a while. In the project
that found this, the slow hook was the federation plugin's own expose walk
(`proxyRemoteEntry`'s `buildStart`, ~11 s on a large pnpm workspace).

```sh
pnpm install

# 11 s of buildStart work: the tracker fires before any module could load
SLOW_BUILD_START_MS=11000 pnpm build
# [Module Federation] moduleParseIdleTimeout: no module activity for 10s, forcing resolve. ...
#   Tracked modules: 0/1. Pending modules: <root>/src/widget.ts

# same, with an `import: false` share: its export analysis is discarded too
IMPORT_FALSE=1 SLOW_BUILD_START_MS=11000 pnpm build
# [Module Federation] moduleParseIdleTimeout: no module activity for 10s, forcing resolve. ... Tracked modules: 0/1 ...
# [Module Federation] import: false shared export analysis was discarded (reason: idle-timeout) — falling back to the complete export surface ...

# control: 5 s of buildStart work, no warning
SLOW_BUILD_START_MS=5000 pnpm build
IMPORT_FALSE=1 SLOW_BUILD_START_MS=5000 pnpm build
```

Vite runs every plugin's `buildStart` to completion before the first `load`,
but the tracker arms its idle timer in its own `buildStart`, so any
`buildStart` work after it that takes longer than `moduleParseIdleTimeout`
forces the barrier before a single module has been loaded.
