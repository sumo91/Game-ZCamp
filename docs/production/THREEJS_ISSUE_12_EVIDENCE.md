# #12 密集战斗与画质合入证据

根起点 clean `1a1ef5327b56def91816544f529ad788316a484a`；固定来源 `b7465c3af6e2725a133317ba06bbe14fa0b2feb3`，包含实现 22e94f2、正常合入根基线 7b3afd1 和生产开发入口挂载修正 b7465c3。在根确认 300 单位及低画质检查完成后，`codex/threejs-integration` 无冲突执行 `--no-ff`；merge／受验代码 SHA 为 `c7581573da7bf943870b55bfc3de66e961a02040`，两个 parents 精确为根起点与来源。没有另改玩法或产品代码。

显式 `dev=pressure` 通过 typed catalog 与公开 BattleSession 命令建立 100/200/300 混编、正式七敌及双 Boss、14 塔加主城。HP 10 亿、攻墙伤害 0 和建造资源仅属于明确的压力目录；正式 catalog 校验、玩家入口规则和模拟保持原边界。标准/流畅只改变 DPR、阴影、动画频率及外围装饰，保留全体单位和关键事件路径。

一次 `npm run check` exit 0：typecheck、24 files / 167 Vitest 与 4 HTTP 通过。一次 `npm run build -- --outDir C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-final-game-dist` exit 0，58 modules；外部目录事先不存在。保留 Three.js 大 chunk 与外部目录不自动清空的既有提示。根旧 dist 27 文件 SHA/bytes 不变，本次 public/GLB/源资产 diff 为空；未重新导出资产、重建旧候选或重跑长测。完整根基线与历史 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2` 到交付 HEAD 的 `git diff --check` 通过。

[作者原报告](evidence/issue-12/author-delivery.md)与[根独立原报告](evidence/issue-12/root-review.md)均固定修复后的 `product-issue-12-dist-v2` / 5343 静态产物。旧 v1 生产压力入口没有挂载，已修复且不是下列测量来源。[桌面 CIM 登记](evidence/issue-12/data/root-desktop-registration.json)证明 i7-12700KF、20 线程、RTX 4060 Ti、Windows 11；浏览器报告 Chrome155 IAB、1280×720、native DPR 1.5。

| 实际桌面场景 | 实测时长 | 全程样本 / 归档 raw 数 | 中位 / P95 / 最大 ms | live min=max=actual |
| --- | --- | --- | --- | --- |
| 作者 100 标准 | 60.0004 s | 8552 / 8552 | 6.9 / 7.1 / 41.7 | 100 |
| 根 200 标准 | 300.0018 s | 42614 / 前 2000 | 6.9 / 7.1 / 34.8 | 200 |
| 根 300 标准 | 60.0074 s | 6327 / 6327 | 7 / 14 / 83.4 | 300 |

三个 completed 记录、截图与响应/资源/真实攻击事件原件保存在 [data](evidence/issue-12/data/)；100、300 raw 完整。200 页面统计使用全部 42614 间隔，但 CUA 对象导出只保存前 2000，不能据该子集复算全程 P95；304 次资源采样和完整汇总仍在。300 的 83.4 ms 单帧退化保留，不将其称为稳定帧预算通过。rAF 包含调度和整页负载，非独立 CPU/GPU 耗时；JS 堆为全页数据，geometry/texture 数量不是显存字节。

根 200 高密度实际选择雷电、300 实际选择火炮。300 结束后通过玩家按钮切流畅仍有 300 单位及双 Boss，调用 517、三角 2177241；战术暂停的两次敌 presentation 完全相同，实际继续后恢复，见 [冻结核对](evidence/issue-12/data/root-300-low-pause-freeze.json)和对应截图。低品质截图当时没有活动预警/鼓舞，不能证明瞬时提示视觉；三阶段事件与关键路径由运行记录和独立规格审查支持，人工视觉接受仍保留。根 warn/error 为空。

无 query 正式入口的 [360/390 布局记录](evidence/issue-12/data/normal-quality-layout.json)及截图证明 HUD 无重叠/裁切，15 格至少 44×44；暂停中切标准/流畅/标准敌 presentation 相同，Standards 的待核实布局疑点已排除。该 origin 继承作者合法回放解锁，不能称 fresh 存档。

[十次生命周期原件](evidence/issue-12/data/static-v2-ten-lifecycle-cycles.json)包含正常建造、合法正式开发回放结算、实际重试与返回，不是十次实时完整战役。11 次大厅采样共享库 33、gallery geometry 3 / texture 10 / portrait 3 稳定；音频首次手势后 context 为 1，首次返回帧旧节点允许待 onended，不称瞬时全部归零。JS 堆有升降，只证明所列有限循环未持续单调增长。[三关核心记录](evidence/issue-12/data/formal-campaign-peaks.json)及复现脚本使用原目录、合法命令和固定步长，所测策略峰值 8/11/14；不是所有策略最大值或设备渲染峰值。

## Standards

[独立原文](evidence/issue-12/standards-review.md)，固定 `1a1ef53...b7465c3`：0 明文违约、0 实质性 Fowler 异味。原报告分轴保留；其当时未复现的小屏疑点由上述实际 DOM/截图核实。

## Spec

[独立原文](evidence/issue-12/spec-review.md)，同一固定 diff：0 实施性 findings。报告当时待收口的 root 200/300、十循环及核心峰值现按实际证据范围补齐，不能把这些桌面/核心证据当实体手机验收。

[复制审计](evidence/issue-12/copy-audit.json)记录 37 份原件：35 份报告/截图/raw JSON/复现脚本逐字节一致；两轴报告仅最后 CRLF→LF，文字和 findings 原样、外部原件未改，未增加 attributes 或改变 whitespace 规则。历史 development smoke 未用作 v2 生产证据。同步补归档 [#11 普通首关十波 QA](evidence/issue-11/normal/product-normal-game-qa.md)，更新其正常完整局 pending；该记录固定旧来源 40685ce 与无 query 5331，不冒充本批重测。

#5/#13 实体手机、听感、瞬时视觉、艺术、最终预算与所有者接受仍待人工；未操作 master、tracker、远端、浏览器或任何既有服务，5332 玩家页及 5331/4194/4195 保留。
