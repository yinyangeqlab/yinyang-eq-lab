# Lint policy

Run `npm run lint` on the reviewed source checkout. Application checks remain enabled, including React hook dependencies, render purity, refs and accessibility. Generated evidence, archived local worktrees and emulator output are excluded, as are the existing generated/framework directories. This does not exclude tracked application or regression source.

## Intentional boundaries

- Browser-only storage/media-query restoration and external loading/access checks occur after SSR. Guarded reconciliation also resets evidence when the active comparison/setup changes. These finite effects use local `set-state-in-effect` exceptions with their reason next to the code; they are not permission to add unbounded render loops.
- Playback effect lifetimes follow the selected pair, mode and explicit audio/setup inputs. Re-running them for a helper function's incidental identity would discard listening evidence, clear a source or duplicate an animation loop. Seven local dependency exceptions document helpers that read current refs and those explicit lifecycle inputs. The shortcut subscription now also tracks `personalOnly`.
- The compiler reports several action-handler timestamps/random choices as render impurity. Eight local exceptions identify the actual user-action context. Real render-time clocks and displayed player snapshots were moved into React state.
- Full-document anchors preserve access checks and unsaved-session `beforeunload` guards. Five local navigation exceptions retain that behavior. Five fixed local brand images retain the existing static-asset/CSS pipeline instead of introducing image optimization for a lint-only change.
- The conflict resolver reads request refs from explicit click handlers. One local compiler exception covers that rendered callback; displayed comparison/player state does not read imperative refs during render.
- The four existing CommonJS synthetic test harnesses use CommonJS imports. Only `scripts/**/*.cjs` permits that import syntax. VM module bindings use the distinct `fixtureModule` name.
- Unused underscore-prefixed compatibility arguments and destructuring used to omit metadata are deliberate API shapes. Ordinary unused bindings still warn.
- Three independently hash-pinned recovery modules preserve their original bytes. The legacy unused `rmSync` and `relative` imports and caught `e` binding are named explicitly in their narrow lint override. Removing them is deferred to a separately reviewed recovery baseline rotation; this release does not weaken recovery verification or trigger a redundant data export.
- Existing vendored UI exceptions remain limited to the original shadcn files.

The lint-cleanup review records the current zero-error/zero-warning result. Local exceptions are reviewed design choices, not proof that every workflow is bug-free. Keep the global React rules enabled and reassess a local exception when its lifecycle changes.

## Synthetic release fixtures

The public release scanner originally flagged SQL setup in two already-public, disposable in-memory tests as target seed data. The reviewed exact blobs are now keyed by path and SHA-256 for that one scanner rule. Credential/path checks still run, and a changed blob or new path is refused. `scripts/check_release_fixtures.py` exercises the real scanner in a disposable index to verify all three outcomes. No numerical production target seed is included.
