## Standards

Base: `30406353a7233c605c012ac1edeb098b8a609f63`

Source: `40685ce386f1e8ef31aefd7eb47e0e287443363b` (#11; commits 40685ce / ac41007 / 95d1b6e).

Reviewed the complete fixed triple-dot diff, including all 24 changed paths. Standards: AGENTS.md, TEAM_PROTOCOL.md, domain.md, UI/Art Bibles, Three.js specification and current DELIVERY_PLAN. Applied all twelve supplied Fowler heuristics; repository overrides take precedence, and tooling-enforced checks are excluded. Read-only static review; no UI operation or test execution.

**Totals: 0 documented-standard breaches; 1 possible, non-blocking smell.**

Documented standards, by changed file/hunk:

- `src/main.ts`, package files, deleted Phaser scenes/barrels, and moved UI regressions: no breach of the specification’s “技术栈与模块边界” production Phaser removal or AGENTS.md simulation boundary. Normal entry mounts the formal Campaign lobby; legacy pointer/layout code remains pure UI logic.
- `ThreeGame.ts`, `WhiteboxPreview.ts`, `SoundDirector.ts`, `preview.css`: no breach of the specification’s shared-session, “时间与生命周期”, or UI Bible input-priority rules. One page owns Campaign, library and sound; battle cleanup removes listeners/frames and respects shared assets. Retry resets battle feedback, BFCache resumes through existing clock/pause semantics, and modal panels remain inert. HUD values use actual state/selectors and typed presentation data.
- `assetCatalog.ts`, `campaignReplay.ts`, `campaignReplay.test.ts`: no breach of AGENTS.md data-first rules or the specification’s GameCommand/GameState/GameEvent boundary. Coverage validation includes formal heroes/enemies. Explicit development replay dispatches legal commands and fixed steps, without modifying gameplay state/catalog; ordinary entry exposes no replay controls. New regressions exercise real results and persisted unlocks through public interfaces.

Possible Fowler smell — **Duplicated Code**, `src/three/Battlefield.ts:149,154`:

`return { x: (projected.x + 1) * this.width / 2, y: (1 - projected.y) * this.height / 2 };`

`projectSlot` and newly added `projectWall` repeat the screen conversion. An optional private projection helper would keep future viewport changes consistent. Both currently use the same camera/viewport; this is not a breach of the unified-projection rule.

**Standards conclusion: mergeable.** Independent producer UI verification, physical-device performance and owner acceptance remain separate; this report does not close #5/#13 or grant final product acceptance.
