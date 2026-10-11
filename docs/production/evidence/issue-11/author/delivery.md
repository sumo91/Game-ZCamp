# Issue #11 delivery — complete default Three.js game

Role: ZCamp developer, reporting to producer. Worktree C:/Users/Admin/.codex/worktrees/threejs-issue-11/ZCamp only.

## Fixed code candidate

- Branch: codex/threejs-issue-11
- SHA: 40685ce386f1e8ef31aefd7eb47e0e287443363b, clean.
- Includes normal merge ac41007 of fixed full-content integration 30406353a7233c605c012ac1edeb098b8a609f63.
- Static dist: C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-issue-11-dist
- Matching default static entry: http://127.0.0.1:5312/Game-ZCamp/ (preview session 3750).
- No preview parameter needed. Old explicit sample URLs remain development entries; ordinary preview=threejs also uses the normal campaign lobby.
- Separate developer replay: http://127.0.0.1:5312/Game-ZCamp/?dev=campaign

## Player product

Default ThreeGame owns one Campaign, one ModelLibrary and one SoundDirector. Formal seven building families (six growth types plus main city), seven undead types including both Bosses, three heroes and three levels load all 33 formal assets. Catalog validation refuses missing formal enemy or hero references; building mapping is complete at the type boundary. No old GLB/source was exported or modified by this task.

Battle HUD now uses blue/gold fortress panels: wave/skull and next-wave countdown at top, pause and mute at top right, actual projected wall health/shield bar at the wall, wood plus production rate and gold in the bottom resource rail, local building details and costs in the bottom action panel. Ordinary slots show only Lv.N or a subtle empty plus; accessibility keeps real building name and row/column. No player-visible GLB, whitebox, grid IDs, development placeholders or renderer implementation text. Existing normal simulation values/prices/waves/hero control are unchanged.

All model/battle effects remain event/state driven. Header, field and bottom controls become inert during trait/transform/system/result overlays; slot controls are disabled at the same priority seam. Trait/transform dialog focus is trapped. First interaction unlocks the shared WebAudio owner; mute persists with the existing key. Returning/retrying keeps or resets the owned resources at the established Campaign/session boundary. Lobby load panels are also inert until ready. Lobby BFCache return resumes sound without allocating a second owner.

Production Phaser dependency, main entry, GameScene/LobbyScene/FxDirector and compatibility barrels are removed. Pure legacy layout/pointer regressions moved to src/ui/legacyLayout.ts and legacyGrowthPointer.ts; existing gameplay and UI tests preserved under tests/ui. No Phaser imports/references remain in src, tests, package.json or package-lock.json. Existing phone/pressure developer infrastructure was preserved and not expanded.

## Necessary verification

- npm run check: typecheck; 23 Vitest files /164 tests; 4 existing collector tests pass.
- npm run build -- --outDir <product-issue-11-dist>: pass, repository /Game-ZCamp/ static subpath.
- git diff --check: pass; clean final branch.
- Added two public Campaign/BattleSession/ProgressionStore command-replay regressions. First red was missing replay module, then real unchanged first campaign reached VICTORY. Full original-catalog three-campaign replay and storage reconstruction then passed, including the real final 15-wave double-Boss level.
- Build reports the existing Three.js/shared renderer chunk >500kB advisory; no Phaser chunk/dependency. This is not a phone performance claim.

## Actual CUA browser record on the fixed static candidate

Only cua_repl was used for UI. No external Playwright/CDP, no browser runtime writes, no direct GameState writes.

1. 360x640 default /Game-ZCamp/ loaded the formal lobby and entered first battle. Initial visible state: wave0, first-wave5s, wood120/gold0, shield100. Paused without advancing the opening. Normal build arrow40 -> wood80, upgrade50 -> wood30, level2/trait draft. Trait screen had all underlying panels inert and zero enabled slots; choosing haste returned to the existing tactical pause with correct8.4 damage/.79 interval. Transform opened at gold0 with all four actual names/costs/shortfalls and inert background, and closed with the same selected slot.
2. Four viewport sizes 360x640,390x844,720x1280,1440x900: clicked all fifteen real DOM projected slot controls after each resize. Every selectedSlot matched the clicked stable ID in sequence. All targets were inside the field and at least44 CSS pixels in each dimension (44x44 on mobile/desktop;64x56 at720). Viewport override was reset after verification.
3. Mute changed to the actual silent state, persisted through navigation, and ordinary lobby retained the sound preference. Listening quality is left to producer/user; no audible-quality claim.
4. In explicitly labelled ?dev=campaign only, clicked real command/fixed-step replay controls: bare first defense DEFEAT atwave2/kills53/gold13.25; clicked normal “再战” restoring first-wave5s/wood120; command-built/economy/trait/transform replay reached actual first-defense VICTORY wave10/kills894/gold231. Result visibly unlocked 连弩卫士 and 裂谷尸潮. Returning and reloading kept these unlocks.
5. Selected actual newly unlocked second hero and level through ordinary cards. Real formal second-level VICTORY wave12/kills1328/gold432.5 unlocked 采伐领主 and 君王亲征. Selected those cards and real third-level VICTORY wave15/kills2054/gold855.5 followed. Returned and navigated to the plain default URL; all six cards remained unlocked, selected lumber_baron/kings_march, third campaign visibly marked cleared. No localStorage injection was used; the explicit replay banner warns that its real results record progress on this test origin.
6. Loading failure/retry was tested on an isolated copied static fixture on5313, not the source candidate or old phone servers. Temporarily withheld main_city.glb. Actual screen showed “资源加载中断，请检查网络后重试。” and “重试加载”, all three lobby panels inert, no battle phase/session started. Restored the copied file, clicked retry, and entered first battle; visible opening5s/wave0/wood120, ready dataset, actual next sample opening4.733333 after8 normal rendered steps. The full load wait did not consume any opening time. Fixture file restored; temporary tab closed. Producer5312 remains untouched.

The command replay is an explicit accelerated development demonstration of formal rules, not manual real-time completion, frame-rate evidence or a production automation feature. The normal URL has no replay controls. Producer independent QA/review remains separate. A prior WIP dev5311 HMR dynamic-import error while merge conflict text existed is historical, not the5312 static candidate; final static flow itself did not generate such an error.

## Evidence files

External directory C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/

- product-issue-11-size-qa.json: actual rects and selected IDs for all4 sizes/60clicks.
- product-issue-11-battle-360.png: ordinary player HUD, realLv2 arrow and cost panel.
- product-issue-11-trait-360.png: actual trait modal at360x640.
- product-issue-11-defeat-360.png; product-issue-11-victory-360.png; product-issue-11-second-victory.png; product-issue-11-third-victory.png: actual terminal results.
- product-issue-11-lobby-720.png: ordinary default lobby after true three-level progression.
- product-issue-11-reload-qa.json: visible default lobby card lock/selection states.
- product-issue-11-loading-error.png; product-issue-11-loading-retry.json: actual failure and ready opening state.

## Producer steps

For independent fresh-lock verification use a fresh port/origin serving the same dist, or the existing normal browser profile if its progress is known. The author test origin5312 now has legitimate three-level test progress. To quickly inspect true unlocks on a fresh origin: ?dev=campaign -> start -> replay defeat -> retry -> replay defense -> return -> reload -> select next unlocked cards -> repeat. This uses real formal catalog, prices and waves and no state edits.

For ordinary visible battle: plain /Game-ZCamp/ -> select available hero/level -> start -> pick a plot -> build arrow/lumberyard -> grow/pause/transform. For all models/tiers at once use the explicitly labelled existing ?dev=demo&demo=siege/arcane/undead/boss; ordinary gameplay also uses the same mapped models and events.

## Limits / no false acceptance

No deployment/master push/tracker changes by this task. No new asset cost, no old phone server restart, no phone data collection changes. Real physical-phone performance, final owner art acceptance and extended pressure/lifecycle checks remain #5/#12/#13. Safe-area CSS exists, but emulated viewport checks do not prove notch hardware behavior. System-pause priority/freeze is covered by the existing public seam regressions and DOM modal gating; the author did not fabricate native phone background evidence.
