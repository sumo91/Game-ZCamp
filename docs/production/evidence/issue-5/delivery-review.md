# Issue #5 independent merge delivery review

Date: 2026-10-10. Role: ZCamp independent merger, restored from the explicit task assignment after reading TEAM_PROTOCOL. This delivery merges the reviewed companion candidate and preserves the independent reports; #5 remains OPEN.

The root checkout `D:/AI/Codex/WebGames/ZCamp` was clean on `codex/threejs-integration` at fixed base `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2`. The source checkout `C:/Users/Admin/.codex/worktrees/threejs-issue-5/ZCamp` was clean on `codex/threejs-issue-5` at `5252f732e0dc2fd377af5ccf774991b3841d4577`, containing implementation `d26b800a5b4a92200ecda0c613c97d98f716f896` and its correction. The full fixed diff was nonempty and both final reports were read before merging.

The exact source SHA was merged with `git merge --no-ff` into `2b8af0ecf652bf9dfda33aec87b447cae84f911e`. Its first parent is the fixed integration base and its second parent is the fixed source HEAD. Source files, source checkout, formal assets and original external evidence were not edited by the merger. The [candidate](../../THREEJS_ISSUE_5_CANDIDATE.md) retains the manual acceptance and asset expansion gates.

## Standards

[Initial Standards report](./standards-initial.md): fixed base to `d26b800`, 0 new hard breaches, 1 nonblocking smell, and the previously known input follow-up awaiting repair/review. The report's own classifications remain unchanged. [Final Standards report](./standards-final.md) covers the complete fixed base to `5252f73` diff. Its original final wording follows, with only the duplicate section heading and terminal layout whitespace omitted:

Reviewed the complete fixed diff `git diff 0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...5252f732e0dc2fd377af5ccf774991b3841d4577` (commits `d26b800`, `5252f73`) against the previously read AGENTS/TEAM/domain instructions, README, Art/UI Bibles, asset README, controlling Three.js specification and delivery plan. No CONTRIBUTING/CODING_STANDARDS file exists. Repository overrides apply; tooling-enforced rules were excluded.

**Documented-standard breaches: none found within the companion-candidate scope.** Core simulation and formal content/assets remain untouched; browser and renderer work stays at the boundary. Ownership, independent skeleton/mixer instances, static batching and deployment-relative loading follow the documented integration contracts.

**Prior heuristic resolved:** `src/three/AssetPressureField.ts` removes `configure()`'s repeated DPR expression. `configure()` records quality and calls `resize()`, which is now the single setter. No remaining actionable Fowler-baseline smell found; independent Python recalculation deliberately remains separate from application statistics.

**Prior input follow-up resolved at the documented desktop scope:** `src/three/pressure.css:1,13` uses `#app.pressure-app` for the scroll-container rule and explicitly sets lab canvas `touch-action: pan-y`. This defeats global `#app` overflow specificity and the canvas `none` rule. The saved before/after records show `overflowY: auto`, container/canvas `pan-y`, and actual scrolling from 0 to 640 with configuration entering view; the playable scene retains its original input rule. This supplies the relevant verification required by AGENTS.md and Art Bible §16.2 without claiming physical touch acceptance.

**Evidence integrity and gates:** All 34 imported root artifacts match their recorded SHA256 and byte lengths, and their unfiltered Git blobs match the final commit. Scoped `.gitattributes` preserves original line endings. Long measurements retain `d26b800` identity; repaired-build smoke evidence is separate. Zero-response, slower and interrupted rounds remain preserved. Candidate documents retain the DELIVERY_PLAN requirements for physical-device/owner acceptance, formal budgets and Bible acceptance; #5 remains open and #6–#9 expansion remains gated.

Totals: **0 documented breaches; 0 remaining heuristic findings.** Standards review only: no browser operations, build/test or long-measurement reruns, repository edits, publishing or issue closure.

## Spec

[Initial Spec report](./spec-initial.md): fixed base to `d26b800`, 1 known P2 and 0 new findings; #5 OPEN and #6–9 gated. [Final Spec report](./spec-final.md) covers the same complete fixed base to `5252f73` diff. Its original final wording follows, with only the duplicate section heading and terminal layout whitespace omitted. The Spec findings are not combined with or used to rerank Standards:

固定全量范围：`git diff 0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...5252f732e0dc2fd377af5ccf774991b3841d4577`；提交 `d26b800 feat: prepare reviewable asset pressure candidate for #5`、`5252f73 fix: complete lab scrolling and preserve independent evidence for #5`。已复读TEAM_PROTOCOL，核对实时#5/#1、总规格、交付计划、实施委托及全部变更类别。只读，未执行浏览器、测试或构建。

- **(a) 无未解决的配套候选缺口。** 委托 `issue5-implementation-brief.md:9–17,23` 的独立入口、100/200/300活动实例、十五格、独立动画、静态合批、双画质、公开控件、连续采样、锁参、中断及导出均有对应实现和记录。根长测及短复验已归档；手机/雷电/owner/Bible预算仍明确pending，符合委托`:25–27`与`THREEJS_DELIVERY_PLAN.md:49–53`，不误报为工具代码闭环缺陷。
- **(b) 未发现 scope creep。** `src/main.ts:4–8` 仅增加实验分流；核心、正式GLB/来源和Art/UI Bible无变更。页面及JSON保留单骷髅、无正式核心持续攻击的范围声明，符合委托`:9`；候选`THREEJS_ISSUE_5_CANDIDATE.md:97`保留#13混编与完整验收。
- **(c) 未发现错误实现或错误取证；初审P2已修复。** 总规格`:64,113`要求按钮可触达及手机适配；`src/three/pressure.css:1,13`现以`#app.pressure-app`启用`overflow-y:auto`、画布允许`pan-y`。`post-review-verification.md:7–15`及滚动前后JSON证明实际桌面滚动0→640、配置进入视口，并明确不等于真触摸。`AssetPressureField.ts:89–96`统一设置DPR，不改数量或阴影。`THREEJS_ISSUE_5_CANDIDATE.md:48–59`明确长测属于d26源码，保留首100零响应、第二轮更慢max及后台未hidden事实；根原始数据、复制SHA和独立统计审计一致，未改写身份或补填成功。

结论：候选Spec通过，0项未解决发现。#5仍OPEN；真机、雷电补测、所有者逐项接受及正式预算/Bible修订待补，#6–9不得推进。

## Preserved reports and raw evidence

| Original external filename | Repository copy |
| --- | --- |
| `issue5-standards-review.md` | [standards-initial.md](./standards-initial.md) |
| `issue5-spec-review.md` | [spec-initial.md](./spec-initial.md) |
| `issue5-standards-final-review.md` | [standards-final.md](./standards-final.md) |
| `issue5-spec-final-review.md` | [spec-final.md](./spec-final.md) |

All four report copies are byte-identical to the external originals. None contained Markdown double-space hard breaks requiring conversion. Ordinary review Markdown uses the repository's existing text handling; no whitespace exemption was added. The originals remain unchanged.

All 11 new `root-final-*` files from `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/issue5-root-evidence` were copied byte-for-byte, including line endings. [Final copy audit](./root-final-evidence-copy-audit.json) records each original/copy SHA256 and byte length, plus equal staged Git blob SHA256. It also independently rechecks all 34 historical root artifacts against their external originals, recorded hashes, fixed source blobs and merge blobs. The [historical 34-file audit](./root-evidence-copy-audit.json), its reports and every previously committed raw artifact remain unchanged. Existing scoped `.gitattributes` preserves raw `root-*` bytes; no attributes were changed.

[Final root public smoke report](./root-final-review.md) retains repaired-source `5252f73` identity. The long 100/200/300 rounds remain attributed to `d26b800` in [the historical report](./root-independent-review.md). No long round was rerun. The immediate wheel observation at scrollTop 0 and stable result at 640 are both preserved. The first restart record's own-select `.disabled` observation is preserved alongside the supplemental effective `locator.isEnabled` / `:disabled` evidence: fieldset inheritance disables configuration, stop remains enabled, and prior results are cleared. These supplemental observations do not rewrite raw records or imply a source defect.

The final short manual-stop result is interrupted, with 10.1389 sampled seconds, 1453 samples and one measuring-phase response. It is a public control smoke check with an incomplete device declaration, not a replacement capacity baseline. Desktop scroll evidence does not establish physical touch, actual background interruption or WebGL context loss.

## Independent merge verification

At merge `2b8af0ecf652bf9dfda33aec87b447cae84f911e`, `npm run check` passed TypeScript and 15 test files / 125 tests. `npm run build` passed; Vite retained its existing large-chunk notice. The merge fixed-range `git diff --check 0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...HEAD` and the staged delivery whitespace check passed. This delivery adds review/evidence files only after those checks; final commit ancestry, raw blob integrity and the complete fixed-range whitespace check are verified again before handoff.

[Independent 36-SHA audit](./merge-asset-sha-audit.json) checks all 12 editable `.blend` sources, all 12 public GLB files and all 12 newly built GLB copies against the fixed [#4 manifest](../issue-4/asset-manifest.json), and agrees with [unchanged-assets.json](./unchanged-assets.json). All hashes and byte lengths match. The fixed-base diff is empty for formal `art/threejs`, `public/assets/threejs`, the manifest, `src/core`, and Art/UI Bibles. No Blender, format validator, browser, device automation or pressure rerun was performed by the merger.

## Preview handoff and remaining gates

The root coordinator confirmed that the historical source preview PID46284/session89062 had exited and port4191 had no listener before restarting the same fixed source/dist preview. The replacement loopback4191 service is owned by the root coordinator: Vite/listener PID34580, npm PID42216, exec session10463. Its [pressure entry](http://127.0.0.1:4191/Game-ZCamp/?preview=asset-pressure), [playable art sample](http://127.0.0.1:4191/Game-ZCamp/?preview=threejs) and [original entry](http://127.0.0.1:4191/Game-ZCamp/) use the source checkout's dist; the merger's root build did not alter it. Historical service reports retain their original handoff facts. The merger did not start or stop services, and the root reported final UI tabs closed with temporary viewport reset.

Physical phone evidence, actual 雷电 browser supplementary measurements, project-owner acceptance of every listed sample criterion, formal asset budgets/group rendering decisions and accepted Art/UI Bible revisions remain pending. #5 stays OPEN, and #6–9 asset expansion remains gated. #13 still requires its separate full mixed-asset/core continuous-attack, device, performance and lifecycle acceptance. The source worktree remains available for the user's inspection. Push, remote CI, tracker operations and later acceptance remain with the root task.
