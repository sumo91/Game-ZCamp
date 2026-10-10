# Three.js 正式内容 #6 / #7 / #8 集成交付

固定根基线：`3584504616f7905996dbbd50ab26ff63aa12699a`；分支 `codex/threejs-integration`。来源均独立审阅后按 #6 → #7 → #8 执行 `--no-ff`，保留来源历史：

| 内容 | 固定来源 SHA | 集成 merge SHA |
| --- | --- | --- |
| #6 连弩 / 火炮三档 | `cb523aab5611305595779a32322741e7f3b8c75b` | `2671910f5e5c298bd9864d7f6b833403d7064f13` |
| #7 寒霜 / 雷电三档 | `24509640a8cd770cb34cb17e185a335d77cb3cb8` | `939430567be61d9e4a6331d6df91862ab6870901` |
| #8 五种普通及精英亡灵 | `855852bee0143eab5ac59729e82b4df4eb941e86` | `97e66adce532973337a3eaa731e343d0ecff2ee2` |

集成小修与受验代码：`71de3557b38e99ed89cdb64acffbe816985a23c6`。保留所有 16 份新 GLB、两组显示名称投影、Siege/Arcane 的同步与 advance/reset/dispose；`tower_special.targetPosition` 只声明一次，穿透/溅射/弹射元数据全部保留，`enemy_wall_attack` 仍只读结算后的真实事件。慢速只影响 walk，攻墙动作按事件触发。演示参数互斥，正常入口仍使用原 catalog、资源与命令。

公共 `coordinates.enemyDisplayPosition(id, progress, definitionId)` 统一模型、冰环、死亡与事件命中锚点的显示后移。SiegeFeedback 和 Arcane 的主目标/链目标经 `Battlefield.enemyHitPosition` 取得该投影，核心进度不变。后续 #9 可在同一接点增加 Boss 出生安全边界并保留 `enemyWallInset`。仅显式 `demo=siege` 的重试复用原付费命令准备流程 `prepareSiegeDemo`；普通重试不变，Arcane/Undead 的原演示准备流程保留。

验证：新增 Siege 公共 BattleSession 重试用例先失败（缺少准备函数），实现后通过并恢复完全相同的三档状态。一次 `npm run check` 通过 typecheck、19 files / 155 Vitest 和 4 HTTP 用例，涵盖真实特殊目标、攻墙、暂停冻结、重试及原核心边界。一次 `npm run build -- --outDir C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-content-batch-dist` 通过，53 modules；Vite 仍提示外部目录不自动清空与大 chunk。`git diff --check 3584504616f7905996dbbd50ab26ff63aa12699a...HEAD` 通过。

[资产核对](evidence/content-batch/asset-audit.json)：28 套 source/public/外部 dist 的 84 个 SHA-256 与字节数符合各固定清单；旧 12 套 source/GLB 无 diff，根原 dist 的 27 个文件逐字节未变。没有重新导出模型或运行性能长测。

[根独立 UI 原记录](evidence/content-batch/root-ui-review.md)针对上述三个单独来源构建，实际覆盖成长、三/五目标链、混编攻墙/失败及演示重试；最终整合候选的显示复验交由根完成。截图保留在仓库外目录 `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/`：`product-siege-root.jpg`、`product-arcane-root.jpg`、`product-arcane-battle-root.jpg`、`product-undead-root.jpg`。本记录不将桌面演示当作手机测试。#5/#13 手机、所有者、正式预算与完整 Bible 人工接受仍 pending，未关闭这些门。

以下两轴为独立原报告全文；不合并或重排发现。原件另逐字节归档于 [Standards 原件](evidence/content-batch/standards-review.md) / [Spec 原件](evidence/content-batch/spec-review.md)，[复制审计](evidence/content-batch/copy-audit.json)记录 SHA。根 UI 与资产审计归档只将 CRLF 换为 LF，正文/数据不变，外部原件未改。Standards 的 1 项 Primitive Obsession 启发式建议明确接受为非阻断，本批未扩张为机制类型重构；报告中的合入注意事项由上述接点解决。

## Standards

Fixed baseline: `3584504616f7905996dbbd50ab26ff63aa12699a`.

- #6: `cb523aab5611305595779a32322741e7f3b8c75b` (cb523aa).
- #7: `24509640a8cd770cb34cb17e185a335d77cb3cb8` (2450964).
- #8: `855852bee0143eab5ac59729e82b4df4eb941e86` (2d870fd + 855852b).

Reviewed each complete three-dot diff, source ownership/lifecycle and delivered evidence. Standards: AGENTS.md, TEAM_PROTOCOL.md, domain.md, current THREEJS_DELIVERY_PLAN.md, Three.js spec, UI/Art Bibles, art/threejs/README.md and family source conventions. Applied all twelve Fowler heuristics; repository overrides prevail and tooling-enforced findings are omitted. No browser/build/test runs or repository/tracker changes.

**Hard documented-standard breaches: 0** in each candidate. Simulation remains platform independent; new event metadata follows existing settlement. Normal entry retains formal content/default resources; #7's explicit, labelled development configuration is isolated and validated. Model mappings remain typed; feedback observes actual events/statuses, advances by completed simulation time, and has reset/dispose ownership. New assets/evidence preserve historical samples and distinguish container statistics from acceptance.

**Possible heuristic: 1 shared finding affecting #6/#7; nonblocking Primitive Obsession.** #6 `src/three/siegeFeedback.ts:45,54`: `event.effect === "穿透"` / `"溅射"`; #7 `src/three/Battlefield.ts:367`: `event.effect === "弹射"`. Mechanism dispatch depends on display strings while `tower_special.effect` remains `string`. A small typed mechanism discriminator, with Chinese labels separate, would prevent silent feedback loss during copy changes. This is a judgment call, not a hard breach. #8: no additional smell identified.

Merge attention (not independent-candidate violations): union all asset/event additions; compose both presentation decorators and retain family reset/dispose calls. Combine #7 walk-only slow timeScale with #8 event-driven wall attack/idle logic. Arcane slow rings currently use `enemyPosition`; after #8's display setback, use the same inset-aware position as the actor to keep rings aligned. Preserve #7's actual GLB transform labels and mutually exclusive demos; #6 documents restart to ordinary opening, whereas #7/#8 reprepare their demos.

Scope: Standards review only. Independent UI/art acceptance and final device/budget gates remain pending; deferred #5 is not a batch blocker.

Totals: **0 hard breaches; 1 possible heuristic; 0 source modifications.**

## Spec

固定基线：`3584504616f7905996dbbd50ab26ff63aa12699a`。三个三点范围终点：#6 `cb523aab5611305595779a32322741e7f3b8c75b`；#7 `24509640a8cd770cb34cb17e185a335d77cb3cb8`；#8 `855852bee0143eab5ac59729e82b4df4eb941e86`（含 `2d870fd` 与演示重试修正 `855852b`）。已读取各完整代码/测试 diff、模型制作脚本、GLB 元数据及交付材料；未运行 UI、测试或构建。

**发现 0 项：缺失/部分 0，范围扩张 0，错误实现 0。Spec 轴支持三个固定候选合入。**

- #6“各有低、中、高三档成长外观”“改造仅通过既有命令执行”：目录与既有等级映射进入正常建造/改造/升级路径，显示投影保留数值及 ID。“伤害与追加目标由核心决定，不等待弹道或动画结算”：新增事件坐标只读；`siegeFeedback.ts:26` 使用实际主目标及穿透/溅射目标，`:62` 读取有效燃烧状态，reset/dispose 清理反馈。
- #7“减速结束及时取消；雷电只连接核心实际选定的链式目标”“暂停时效果不推进”：`arcaneFeedback.ts:44` 按真实事件顺序连链，`:52` 同步有效慢速状态，`:87` 仅按完成模拟时间推进。普通入口未使用演示 catalog/resources；明确开发配置已改用构造配置与命令，未写 GameState。
- #8“不能仅靠换色”“五种……具备行走、攻墙、受击和死亡反馈”“模型显示分布不参与寻敌”：四个新增剪影有不同装备与比例，实际 GLB 均含四语义/14关节/锚点；`Battlefield.ts:363` 使用结算后的攻墙事件，`:422` 仅后移显示；`WhiteboxPreview.ts:134` 在显式演示重试后重放同一正常命令准备，普通重试仍为原开局。

合入核对项（非已确认缺陷）：保留 #7 按实际资产标记改造选项的修正与两个反馈生命周期接点；根的真实 UI 顺便核对 #7 脚下环与 #8 大体型显示后移的接地对应。

实际运行截图、艺术辨识/遮挡与集成玩家回归由根独立完成。本报告不冒充 UI 通过；按 DELIVERY_PLAN 当前顺序，#5/最终#13 手机、所有者及最终预算接受仍待完成，不作为本批内容代码硬阻断。
