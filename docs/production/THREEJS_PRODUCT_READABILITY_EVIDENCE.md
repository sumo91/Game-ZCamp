# 攻击可读性与战场环境合入证据

共同基线 `e7c8eede157a8639dc11cd113f028049b3a691e5`，集成分支 `codex/threejs-integration`。三组显示改动依次正常 `--no-ff` 合入，无冲突、无额外产品代码修改；冻结构建所对应代码为 `cc7b6fd460ad9df599da896bcf0ab7ba5340d483`。

| merge | 第一 parent | 来源／第二 parent |
| --- | --- | --- |
| `7ea85ee00d0b84f0e7f8ec5533cb8b9df51cdc69` | `e7c8eede157a8639dc11cd113f028049b3a691e5` | #6 `06ebdb75ec0c45974a11692531753a97c8f39edf` |
| `58828a5f779c035f1bf4f7c80c1442564abca3be` | `7ea85ee00d0b84f0e7f8ec5533cb8b9df51cdc69` | #7 `3811111d6c7abc12f6856103b8dc97e6fbb296c0` |
| `cc7b6fd460ad9df599da896bcf0ab7ba5340d483` | `58828a5f779c035f1bf4f7c80c1442564abca3be` | 场景 `215fbd9a1a04fdd0f85d7034ff2ec3ff9428f9b4` |

组合代码仅四个显示文件，235 additions / 51 deletions。连弩增加细尾迹，炮弹延长弧线与扩散地环；寒霜扩大真实减速标记，紫电增加外缘、白芯和抬高中段。伤害、目标、状态及反馈寿命仍由核心事件和完成的模拟 delta 决定。场景增加紫灰／绿色地面色层、营地路径、外围正式树岩和墙端灯火；低档保留地面与关键反馈，同时同步方向光的阴影开关以消除旧装饰残影。重复静态部件合批；灯火初审 P3 已在 `215fbd9` 修为四个 count=2 实例批次。

[连弩／火炮作者原报告](evidence/product-readability/siege-author-delivery.md)、[寒霜／雷电作者原报告](evidence/product-readability/arcane-author-delivery.md)、[场景作者原报告](evidence/product-readability/scenery-author-delivery.md)保留各自提交、实现和限度。对基线的 `src/core`、`public`、`art`、`tests`、package 文件 diff 均为空。

一次集成 `npm run check` 通过 typecheck、25 files / 169 Vitest 和 4 项既有 HTTP 回归；一次 `npm run build -- --outDir <新目录>` 通过，59 模块。日志分别为 [check](evidence/product-readability/integration-check.log) 与 [build](evidence/product-readability/integration-build.log)。既有大 chunk 提示保留，未将提示当失败；旧构建未被清空。新冻结目录 `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-readable-game-dist`，46 文件 [SHA 审计](evidence/product-readability/frozen-dist-audit.json)固定代码 SHA。原服务和作者冻结目录均未改写；合入任务没有启动服务、操作浏览器或重复文档提交后的全套代码测试。

## 实际画面复验

[根原报告](evidence/product-readability/root-review.md)记录来源候选的实际操作和截图。#7 的低／中／高六塔、真实冰圈和多段紫电在标准及流畅都可见；暂停切画质保留 19 敌人及 HUD。环境候选标准→流畅→标准消除了旧树长影，地面、路径、15 格与标签保持可读。

根在最终固定代码 `cc7b6fd` 的 5360 入口完成短复验，并明确接受本批组合画面：普通默认大厅 Start enabled，进入正式首关，付费建两箭塔、运行至 27 kills / 6.75 gold 后真实 Pause。[普通截图](evidence/product-readability/data/product-readable-game-normal.jpg)与 [公开 DOM 原记录](evidence/product-readability/data/product-readable-game-normal.json)保留实际范围，这是短回归，不是本轮另一场完整通关。

最终原 arcaneDemo 有明确开发标签（600 HP、授予资源、零墙伤，正式战役不使用），由真实 Continue 运行至第二波 25 敌人后 Pause。根看到冰晶、减速圈、多段紫电与场景灯火；标准→流畅→标准维持 25 敌人、4846 木／47 金／36 秒 HUD，关键 VFX 保留且无旧装饰长影，warn/error 为空。[标准截图](evidence/product-readability/data/product-readable-game-arcane.jpg)、[流畅截图](evidence/product-readability/data/product-readable-game-arcane-low.jpg)及各自 JSON 保存原始输出。视觉依据是实际截图中的反馈，非 chains 缓存或 effects 总数；手机尚未测。

#6 的三档正式模型及既有行为回归沿用 [原内容交付](THREEJS_CONTENT_BATCH_EVIDENCE.md)。本批真实混编内燃烧和细长金白弹道可见，但尚未清楚抓到抛物线炮弹与橙色扩散环；归档 live-1／live-3、paused 和 current.json，仅证明各自实际镜头。live-2 是一次截图空读帧，后续正常截图恢复，不据此宣称游戏整体空白，也不归档它作为交付图。**#6 的完整运行镜头接受保留，继续 open。**

## Standards

[独立原报告](evidence/product-readability/standards-review.md)覆盖基线至三个精确来源的完整差异及全部 12 项 Fowler 启发式：0 未解决明文规范违约、0 实质性异味。灯火实例化 P3 修复已复查，保留发现来源。反馈临时材质与场景自有资源的释放、共享 GLB 边界和暂停时间不变。

## Spec

[独立原报告](evidence/product-readability/spec-review.md)同一固定来源三范围：0 findings。核心目标／伤害不等待显示动画，真实减速按状态清理；地面可读、装饰不抢选取、低档保留接地与关键反馈。代码审查不冒称自身完成浏览器或设备接受。

[复制审计](evidence/product-readability/copy-audit.json)记录 27 份工作区原件副本：26 份逐字节一致；单个 Spec 文本仅 CRLF→LF 并去掉末尾额外空行，文字与 findings 不变，外部原件未改。未新增 attributes 或更改 Git 换行／白空格配置。截图与 JSON 的名称、缓存和计数不扩张视觉结论。

本批完成产品可读性和环境交付，不新增采集平台、不重跑手机流程。新组合 GPU／长期性能尚未测，旧 `b7465c3` 桌面数据只证明旧候选；#12 仍待新组合复验。#5／#13 美术、实体设备与项目所有者明确接受及 master 最终合入保留，#1／Goal 未完成。根负责 #7 达标后的 tracker／PR 更新；本合入仅正常推送三来源分支与集成分支并核对远端 SHA，不 force、不合 master、不发布。
