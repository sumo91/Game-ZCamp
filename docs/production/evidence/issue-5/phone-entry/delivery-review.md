# #5 phone-entry independent merge delivery review

Date: 2026-10-10. Role: ZCamp development, independent merger, restored from the explicit task assignment after reading TEAM_PROTOCOL. This records the authorized phone-entry UX correction and public evidence summaries. It does not change product design or manual acceptance gates.

The integration checkout was clean on `codex/threejs-integration` at fixed base `ff3cd40d2548f23d0b554f51b8745ec55773de9b`. The source checkout was clean on `codex/threejs-issue-5` at `6d1a168d86fe2ff0b19dc448917e236309a6739e`, one implementation commit above the fixed base. The complete nonempty fixed diff and both independent reports were read before merging. Exact source was merged with `--no-ff` into `7be09fcc8b75c1875e0220a14a4c77cdca4f2ac3`; its parents are the fixed integration base and source SHA.

## Standards

The original [Standards report](./standards-review.md) is copied byte-for-byte. Its final wording follows, with only the duplicate heading and terminal layout whitespace omitted. The nonblocking duplicate round-label suggestion remains a Standards heuristic; it is not reranked using Spec.

Fixed base: `ff3cd40d2548f23d0b554f51b8745ec55773de9b`; head: `6d1a168d86fe2ff0b19dc448917e236309a6739e`. Reviewed the complete `git diff ff3cd40d2548f23d0b554f51b8745ec55773de9b...6d1a168d86fe2ff0b19dc448917e236309a6739e`, containing only `6d1a168 feat: add one-click phone pressure tests and durable LAN collection`.

Scope: the authorized phone-entry UX brief, not full #5 acceptance. Sources: AGENTS.md, TEAM_PROTOCOL.md, docs/agents/domain.md, README.md and tsconfig.json; no CONTRIBUTING/CODING_STANDARDS/CLAUDE, glossary or ADR source exists. Previously read controlling UI/art/production boundaries remain applicable. Tool-enforced checks excluded.

**Documented-standard breaches: none found.** Browser/DOM/HTTP integration remains outside `src/core`, satisfying AGENTS.md's platform-independent simulation boundary. Gameplay definitions, formal models and old evidence are untouched. The new tests exercise public entry/sequence behavior and real HTTP/disk outcomes; the development report keeps independent public UI verification pending, consistent with AGENTS.md's player-visible verification rule. Documentation preserves truthful device declarations, fixed candidate identity and human acceptance gates; neither the preset nor a collector receipt claims physical-device/owner acceptance. QA review stayed within TEAM_PROTOCOL's read-only role.

**Nonblocking judgement call — possible Duplicated Code:** `src/three/phoneTest.ts:15–19` declares `{ count: 100, seconds: 60, ... }`, `{ count: 200, seconds: 300, ... }`, `{ count: 300, seconds: 60, ... }`; `src/three/AssetPressure.ts:49,95,147` separately embeds the same protocol in initial progress markup, `const labels = ["100单位 · 60秒", "200单位 · 300秒", "300单位 · 60秒"]`, and the exported protocol string. A later protocol adjustment could change execution while leaving the screen or evidence description stale. Expose one read-only round definition and derive labels, totals and protocol text from it. This is a Fowler heuristic, not a hard breach of the gameplay-content rule; repeated expectations in the independent tests are not included in this finding.

Totals: **0 hard breaches; 1 nonblocking heuristic; 0 necessary fixes identified by this Standards review.** No browser/page operations, long measurements, build/test runs, repository edits or tracker changes. This review does not certify the still-pending physical-phone or complete #5 acceptance.

## Spec

The original [Spec report](./spec-review.md) is copied byte-for-byte. Its final wording follows, with only the duplicate heading and terminal layout whitespace omitted. Its review-time pending root UI wording remains historical; the later [public root review summary](./root-ui-summary.md) records desktop UI verification and its limits separately.

固定范围：`git diff ff3cd40d2548f23d0b554f51b8745ec55773de9b...6d1a168d86fe2ff0b19dc448917e236309a6739e`。唯一提交：`6d1a168 feat: add one-click phone pressure tests and durable LAN collection`。已读取TEAM_PROTOCOL、实施委托、`phone-quick-test.md`及实时Issue #5，审查全部9个变更文件。仅只读代码/现有证据；未运行测试、浏览器或长测，不宣称独立UI通过。

- **(a) 未发现代码配套要求缺失或部分实现。** 委托`phone-entry-ux-brief.md:8`要求“不得从 UA/机型猜具体系统版本，声明来源/不完整字段必须进入记录”；`phoneTest.ts:2–10`预填已知声明，`AssetPressure.ts:199–205`保留来源与未核实标志。`:9`要求“一次点击依次执行标准画质 100/60 秒、200/300 秒、300/60 秒，每轮各5秒预热”；`phoneTest.ts:15–19`和`AssetPressure.ts:184–208,271–279`保留真实时长，不提供假短测开关。首屏加载状态、失败/重试位于收起的高级区之外（`:51,210–228`）。真实QR展示、手机扫码可达性与根公开UI验证仍属后续交付，未冒称完成。
- **(b) 未发现未经要求行为。** 本地收件脚本、公共边界测试和快速入口均在委托`:9–11,16`授权范围内；核心、正式模型、旧原始证据与人工门未改。原高级实验仍可独立进入，配置和导航在快速测量期间隐藏/锁定（`AssetPressure.ts:111–120`）。
- **(c) 未发现错误实现。** 委托`:10`要求“服务器成功持久化后才显示‘电脑已收到’，顺序测试仅在成功写入后推进”；`phoneTest.ts:34–60,81–85`先保存同一JSON，验证回执后才推进，失败/中断停止，重发不会续轮或清空成功记录。`phone-collector.mjs:34–38,56–72`校验token/大小/必要原始字段，独占写入、同步并关闭后回执；`:76–90`限制静态路径，`:101–110`限定指定本机地址并保留会话构建身份。备援包含各轮原JSON（`AssetPressure.ts:230–235`），收件不产生人工接受（`:144–147`）。

结论：0项未解决Spec发现。#5持续OPEN；根UI验证、真实QR与手机取证/owner接受仍待对应交付，不据此推进#6–9。

## Public evidence and merge verification

[Public audit summary](./public-audit-summary.json) records fixed source/base/merge identity, local original SHA256/byte lengths, the two desktop round summaries, full-statistics confirmation, and complete second-client/server byte identity. It contains only selected public fields. Raw results, failed/truncated read, screenshot, QR and private session metadata remain local and are not committed. The initial DOM truncation and backup download timeout remain explicit limitations, with no false successful-read/download claim.

The merger's first `npm run check` exited at typecheck with code 1 and no diagnostic output. A standalone `npm run typecheck` passed, and the complete subsequent `npm run check` passed: 16 Vitest files / 133 tests, followed by 4 real HTTP/disk collector tests. No source edit was made between attempts; the first exit cause is undetermined. `npm run build` passed and retained the existing large-chunk notice. Fixed-range and full companion-range `git diff --check` are verified before and after committing these new evidence files.

The source implementation changes only the authorized entry, public sequence/collector behavior, tests, package commands and quick-test instructions. The independent merger adds files only in this new evidence directory. Existing historical evidence, formal assets, deterministic core, product Bibles, other-task files and source checkout remain unchanged. The root's existing preview/collector services and browser are not touched. There are no new report whitespace exemptions.

Physical-phone scans and full actual-phone rounds, supplementary 雷电 measurement, owner sample acceptance, formal budgets/group scheme and accepted Art/UI Bible revisions remain pending. #5 stays OPEN and #6–9 remain gated; #13 complete mixed assets/core attack/device/performance/lifecycle acceptance remains separate. Push, remote CI, QR/live-service handoff and user delivery remain with the root coordinator. This merger does not push, change tracker/master or archive the source worktree.
