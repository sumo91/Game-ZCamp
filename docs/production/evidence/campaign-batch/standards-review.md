## Standards

Fixed baseline: `63773aa38286a260c67781eb7da5e622c7f3dfbe`.

- #9: `d3613c146e11aef92a0e45de265856fe5036f2a5`.
- #10: `e6c47499606bc119a9e0139b726f03721defb80c`.

Reviewed both complete three-dot diffs and supplied delivery/evidence records. Standards sources: AGENTS.md, TEAM_PROTOCOL.md, domain.md, current DELIVERY_PLAN, Three.js spec, UI/Art Bibles and asset-source conventions. Applied all twelve Fowler heuristics, giving repository rules precedence and omitting tooling-enforced findings. Read-only: no browser, tests, build, source or tracker changes.

**Hard documented-standard breaches: 0** for both candidates. Standards does not block their merge.

#9: core additions only expose existing charge target/duration; animation and warnings observe actual remaining timers. Inspire rings follow event target IDs and the current core duration, including source death. Model, impact, warning and status positions share `enemyDisplayPosition`; boss caches/effects clear on reset/dispose. Development configuration is explicit and excluded from the normal player catalog. State-audit evidence clearly distinguishes the development catalog from formal difficulty acceptance.

#10: one Campaign owns the active BattleSession; duplicate starts are rejected and result/retry stay on the selected battle. Existing progression/mute keys and IDs remain compatible; blocked storage retains page state. Lobby/feedback modules are unchanged relocations. ModelLibrary has page ownership; battle/gallery release cloned rigs and mixers, listeners/frames are removed, and page disposal closes audio and shared GPU resources. Compatibility re-exports are intentional pending #11, so suppressed as Middle Man candidates.

**Possible heuristics: 2, nonblocking.**

1. **Duplicated Code**, across `art/threejs/create_boss_sources.py:147–180` and `create_hero_sources.py:106–143`: both repeat baseColor/roughness/metallic baking and atlas-node wiring, e.g. `bpy.ops.object.bake(type='EMIT',margin=3); packed.pack()`. Consider a shared atlas-baking helper, preserving separate family geometry and saved-source export ownership.
2. **Speculative Generality**, #10 `create_hero_sources.py:111`: `width=1024 if name.startswith('arrow') else 512` (also height). The script admits only three `hero_*` names, making the arrow branch unreachable. Use the required 512 size directly.

Merge attention, not candidate violations: retain #9 Boss HUD/demo, timed poses and shared coordinates alongside #10 Campaign callbacks, hero animation/anchors and shared-library ownership; union animation semantics and asset coverage.

Scope excludes #11 default-entry/Phaser exit and pending #5/#13 device, listening and owner acceptance.

Totals: **0 hard breaches; 2 possible heuristics.**
