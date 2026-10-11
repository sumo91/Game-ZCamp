# #5 phone-continuation independent merge delivery review

Date: 2026-10-10. Role: ZCamp independent merger / package exporter, restored from the explicit assignment after reading TEAM_PROTOCOL. This delivers the reviewed limited phone-continuation correction, not product-design or manual acceptance changes.

The root integration checkout was clean on `codex/threejs-integration` at fixed base `62f628ca80277c761c97e63a8f0a381c7b0aa5f5`. The source checkout was clean on `codex/threejs-issue-5` at `02e26aa4814b3424b3063a6c7e91e5a09d052ee2`, one source commit above the fixed base. Complete nonempty fixed diff and the two independent reports were read before the exact source was merged using `--no-ff`. Merge `69cc1ae46f15b6abaf675bcf46568e27fa3a7edf` has the fixed base and exact source as its two parents.

## Standards

[Original Standards report](./standards-review.md) is preserved byte-for-byte. Its own final wording follows, with only the duplicate heading and terminal layout whitespace omitted. The nonblocking repeated presentation-condition-chain heuristic remains independent from Spec, with no required fix or reranking.

Fixed base: `62f628ca80277c761c97e63a8f0a381c7b0aa5f5`; head: `02e26aa4814b3424b3063a6c7e91e5a09d052ee2`. Reviewed the complete `git diff 62f628ca80277c761c97e63a8f0a381c7b0aa5f5...02e26aa4814b3424b3063a6c7e91e5a09d052ee2`, containing only `02e26aa fix: allow explicit remaining-round phone continuation`.

Scope: the authorized continuation brief and supplied review context. Standards: AGENTS.md, TEAM_PROTOCOL.md, README.md and docs/agents/domain.md; the previously read UI/art/production boundaries retain authority. All twelve supplied Fowler heuristics were considered; repository rules override them and tooling-enforced checks were excluded.

**Documented-standard breaches: none found.** The continuation state and browser wiring remain outside `src/core`, satisfying AGENTS.md's simulation/platform boundary; gameplay content, rendering, models and budgets are untouched. Public sequence tests cover restricted entry, attempts, interrupted/failed delivery, explicit continuation and pending-delivery races, providing reproducible coverage under AGENTS.md's player-visible verification rule. Independent UI confirmation remains pending, rather than being declared complete by this review.

The added public phone summary and audit preserve the original source SHA, byte/hash references, completed first round and incomplete second round. They clearly retain missing-full-round and acceptance gates. The continuation documentation states that skipped rounds create no record/receipt, attempts remain independent, and this limited change does not close #5. These statements respect TEAM_PROTOCOL's decision/acceptance roles and the brief's evidence boundary.

**Nonblocking judgement call — possible Repeated Switches:** `src/three/AssetPressure.ts:49–50` independently repeats `firstRound === 2 ? ... : firstRound === 3 ? ... : ...` for both `plan` and `startLabel`. Both are one entry presentation decision, but adding or adjusting an entry variant requires editing parallel condition chains. A small shared configuration keyed by the validated starting round could provide both texts together. This is a Fowler heuristic, not a documented-standard breach or a necessary fix.

Totals: **0 hard breaches; 1 nonblocking heuristic; 0 necessary Standards fixes.** Read-only source/evidence review: no UI operations, tests, long measurements, repository edits or tracker actions. No physical-device/owner acceptance is inferred.

## Spec

[Original Spec report](./spec-review.md) is preserved byte-for-byte. Its own final wording follows, with only the duplicate heading and terminal layout whitespace omitted. Its review-time pending UI statements remain historical; the later root review below is separate evidence.

审查范围：`62f628ca80277c761c97e63a8f0a381c7b0aa5f5...02e26aa4814b3424b3063a6c7e91e5a09d052ee2`；唯一提交 `02e26aa fix: allow explicit remaining-round phone continuation`。仅静态读取固定 diff、代码、测试定义及公开/外部审核材料；未运行测试、构建或 UI。

Findings：**0**。缺失/部分要求 0；未经要求行为 0；错误实现 0。

- brief 第9行“只接受1/2/3，其他回归完整默认”“不伪造PhoneRecord、receipt或已完成状态”：`src/three/phoneTest.ts:14` 严格解析入口；`src/three/AssetPressure.ts:48` 设置入口文案，`:101` 按轮显示旧记录引用说明，未插入首轮结果。
- 第10行“轮次游标独立于attempt records”“不改变或覆盖旧记录”：`phoneTest.ts:32` 使用独立游标，`:39` 按轮计数，`:56` 追加保留原始 JSON；`AssetPressure.ts:159` 写入准确 round/attempt，`:210` 为新 attempt 建立独立预热及采样数组。
- 第11行“一轮completed且durable receipt才前进”“retry-send仅重发同一JSON”：`phoneTest.ts:40` 禁止未收件继续，`:54` 收件后才推进，`:74` 完整轮重发成功推进至下一轮；中断轮保持原轮。`AssetPressure.ts:253` 要求前台显式继续；`:280` 返回前台仅更新按钮。
- 第12–13行“stopped含pending未开始轮”“表格按round聚合attempts”“本入口补测完成”：`AssetPressure.ts:101` 聚合完整/中断记录，`:110` 限定完成声明，`:127` 提供 pending 继续入口，`:240` 重新加载后更新按钮；背景、resize、context-loss、手动停止仍留证。
- 第5行“不动渲染/资产/core预算”：diff 未扩张到这些实现。第18行公开净化摘要及 hash 已纳入；历史 200 记录仍明确为 134.3627 秒中断，未冒充完整300秒或首轮接受。

验证限制：本报告不声称实际 UI 或真机补测已通过；这些由根独立核验。Issue #5 的设备/所有者/预算人工门仍待完成，不作为本次限定代码缺陷。

## Implementation and independent public evidence

[Implementation report](./implementation-public.md) preserves the original source identity, implementation, red/green and 147+4 check results, CUA limitation and historical pending handoff. Only absolute user paths, the concrete loopback QA URL and process/execution-session details were replaced with public placeholders. [Implementation copy audit](./implementation-copy-audit.json) records original/public SHA256, bytes and substitution counts; the external original remains unchanged.

The source's [iQOO public review](./iqoo-public-review.md) and [phone audit summary](./iqoo-public-audit-summary.json) retain the two real-phone records on older source `6d1a168`: 100 completed, 200 page-hidden at 134.3627 seconds, 300 absent. Their original files remain local. This merge does not relabel those records as `02e26aa`, concatenate interrupted frames or fill any acceptance.

The root's final [public continuation review](./root-review.md), [public statistics audit](./root-public-audit-summary.json), [screenshot audit](./root-screenshot-audit.json), [stopped screenshot](./phone-continuation-stopped.jpg) and [completed screenshot](./phone-continuation-done.jpg) were received after the final result notification. No result was prefilled while the full 60-second third round was still pending. All five public artifacts are copied exactly, with local private raw JSON/session metadata excluded. The screenshots were visually inspected and show page content without connection credentials.

Root actual device was Windows desktop Codex IAB, at 360×703. The iQOO/Android quick preset is a declaration and does not change that actual device. Two from=2 manual-stop attempts remained round2/attempt1 and round2/attempt2, each independently warmed and saved, with explicit continuation and no early third-round advance. They sampled 66.7434 seconds / 9611 frames and 97.3200 seconds / 14014 frames. A separate from=3 round completed its actual 60.0003 seconds / 8565 frames, median6.9/P957/max14ms, one real measuring-phase response, and durable save before displaying only this-entry completion. These are desktop public-control checks, not completed phone 200/300 records. Console errors/warnings were empty. The root's rejected loopback CLI host attempt is preserved in the public audit as an unsuccessful launch before assigned-address QA succeeded.

The merger independently checked all three existing raw-result SHA/bytes, full raw statistics, source/round/attempt identity, desktop UA, false owner/physical acceptance and screenshot SHA/bytes without creating a new pressure round. [Evidence copy audit](./evidence-copy-audit.json) records exact copied public-artifact hashes and review report provenance. The directory contains no private raw phone/desktop JSON, real LAN address, actual session token, QR or collector session metadata. The public audit's loopback diagnostic and browser-version text are generic contextual values, not private LAN credentials. Ordinary report handling has no new whitespace exemption.

## Independent integration checks and build boundary

`npm run check` passed: TypeScript, 16 Vitest files / 147 tests including 22 phone-sequence tests, and 4 actual HTTP/disk collector tests. `npm run build -- --outDir <仓库外目录>/phone-continuation-integration-dist` passed. The explicit external output directory did not exist before building. Vite's outside-root/non-emptying notice and existing large-chunk notice remain informational; no empty-dir override was needed. No root or source original dist was written.

[Integration build audit](./integration-build-audit.json) records 27 external output files, all 12 built GLB SHA/byte matches to the fixed formal manifest, and unchanged before/after root and source-original dist inventories (27 files each). Build output identity is the integration merge and reviewed source above; this external build was not relabelled as an existing live collector build. The merger did not operate a live collector, browser, native device, network/firewall, Blender or asset production.

Both the current fixed-base range `62f628ca80277c761c97e63a8f0a381c7b0aa5f5...HEAD` and full original companion range `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...HEAD` pass `git diff --check`; staged evidence whitespace and final committed ranges are verified before handoff. Formal assets, deterministic core, product Bibles and existing historical evidence remain unchanged. Only this continuation evidence directory receives new delivery files after the source merge.

## Remaining manual gates

Real phone evidence remains 100 complete, 200 interrupted at 134.3627 seconds, and no 300 record. Phone 200 continuous full300seconds and phone300 full60seconds, actual remaining-device/lifecycle paths, supplementary 雷电 measurement, owner sample acceptance, formal budgets/group scheme and accepted Art/UI Bible revisions remain pending. All accepted boxes/false flags remain unchanged. #5 stays OPEN, #6–9 remain gated, and #13 mixed-assets/core continuous attack/device/performance/lifecycle acceptance stays separate. No master change, push, tracker closure or source-worktree archive is performed. Root owns final push/CI, actual phone continuation entry, live-service handoff and user delivery.
