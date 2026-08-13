# Mission Brief: 建筑成长与改造领域模型可独立验证

## Outcome

ZCamp 的平台无关核心模拟能够在不切换现有公开界面的前提下，完整表达并验证新版“木材建造与升级、升级触发单建筑词条三选一、金币确定性改造”规则，为后续战斗接入和界面迁移提供唯一、稳定的数据与命令契约。

## Context

- 项目目录为 `D:\00_Ai\Codex\WebGames\ZCamp`。
- 开工前必须读取 `docs/production/TEAM_PROTOCOL.md` 并确认开发身份。
- 已确认的产品事实源是 `docs/尸潮营地_建筑成长改造_阶段版本设计_v0.2.md`，尤其是第 0～8、12、14 节。
- 当前稳定基线提交为 `063a83c`；现有 Phaser 界面仍使用动态手牌，阶段 A 不要求它切换到新循环。
- 核心模拟属于 `src/core`；Phaser、DOM 和浏览器状态不得成为新规则的事实源。

## Required Behaviors

- 核心状态能分别表达箭塔、四种特殊塔、木材厂的等级，以及每座建筑独立持有的词条与层数。
- 空格可以通过明确命令消耗木材建造 Lv.1 箭塔或木材厂；非法目标和资源不足不得产生部分状态变化。
- 箭塔、特殊塔和木材厂可以通过明确命令消耗木材升级；Lv.5 为上限。
- 成功升级以原子方式提高等级并生成三个合法、不重复、已经写入核心状态的词条选项；失败不得扣费或推进确定性随机状态。
- 箭塔只抽通用战斗词条，木材厂只抽经济词条，特殊塔的三个选项至少包含一个本塔专属词条且不包含其他塔型专属词条。
- 待选择词条存在时，战斗有效时间、资源、敌人和波次冻结，基地操作与恢复战斗被拒绝；系统暂停往返后仍是同一组选项。
- 玩家只能从当前三个选项中选择一个；选择后词条只写入目标建筑，并返回 v0.2 规定的阶段状态。
- 箭塔可以通过明确命令只消耗金币改造成四种特殊塔；改造保留建筑 ID、格子、等级和通用词条，不触发三选一，特殊塔不能再次改造。
- 相同种子和相同命令序列产生相同词条选项。
- 新内容、状态与命令具有可校验的类型化定义，错误内容在启动或验证时尽早失败。

## Constraints

- 本阶段不得改变 5 秒开局、60 秒波次、十波尸群、敌人数值、Boss、城墙、地图、胜负条件或现有暂停时间语义。
- 必须遵守 v0.2 已冻结的初始资源、建造费、升级费、统一 10 金币改造费、Lv.5 上限和首批词条池。
- 金币只能用于改造；木材只能用于建造和升级；建造与改造不触发词条三选一。
- 词条归属以建筑 ID 为准，不得使用塔型级或全局永久次数冒充单建筑成长。
- 新规则必须保持确定性和平台无关，随机选项不能由 UI 生成或持有。
- 共享工作树中的他人改动必须保留；不得回退与本任务无关的文件。

## Non-goals

- 不替换底部手牌、补给或卡牌界面。
- 不删除旧卡牌模型、命令、内容和测试；最终清理由阶段 D 承担。
- 不要求新词条在本阶段真实改变塔伤害、特殊攻击或木材产量；这些结算由阶段 B 接入。
- 不更新 UI Bible，不制作新美术，不发布 GitHub Pages。
- 不实现词条稀有度、刷新、保底、全局遗物、挑战任务、主城升级或城墙新规则。

## Evidence of Completion

- 自动化从玩家可观察规则层证明：建造、升级、强制选择、阶段冻结、确定性、单建筑归属、四种改造、继承、资源隔离和失败原子性。
- 至少包含两座同类建筑的隔离用例，以及重新开始后清除新系统运行状态的用例。
- 内容校验证明非法词条池、非法改造目标、缺少三个合法选项等配置无法静默进入游戏。
- `npm run check`、`npm run build` 和 `git diff --check` 通过；既有 bundle 大小提示可记录为已知非阻断风险。
- 提供阶段 A 变更摘要、核心契约说明、测试结果和仍留待阶段 B/C/D 的边界；工作树和提交范围可审阅。

## Delegated Decisions and Unknowns

- 由执行者选择新旧模型在阶段 A 的兼容接缝、类型拆分、选择器和校验器组织方式，以降低阶段 D 清理成本为原则。
- 由执行者决定如何表示强制词条选择期间的内部阶段，但外部行为必须符合 v0.2 的冻结和返回规则。
- 由执行者确定随机抽取算法和候选池组合方式，但必须稳定、无重复、满足专属保底，并可由测试复现。
- 若现有状态结构无法安全双轨承载，可以做局部重构；不得借此提前删除旧界面仍依赖的契约。

## Autonomy and Approval Boundaries

- 可以在功能分支内修改核心类型、内容定义、模拟命令、校验和自动化测试，并创建必要的开发证据文档。
- 可以提交并推送当前功能分支，以保存阶段 A 成果。
- 不得合入或推送 `master`，不得部署 Pages，不得修改已确认产品规则。
- 若实现必须改变 v0.2 的资源职责、词条归属、升级/改造语义或冻结范围，停止并向总制作人报告差异和影响。
- 完成后先交总制作人进行阶段 A 门禁审阅，未获通过不得自行继续阶段 B。

## Execution Directive

You own delivery of the outcome above. Investigate the relevant environment, choose an efficient path consistent with its existing conventions, make the in-scope changes, and validate the result with evidence appropriate to the task.

Adapt the route as evidence appears. Preserve the Outcome and Constraints when assumptions conflict with repository facts, and report material divergence. Resolve discoverable implementation questions yourself; escalate only decisions requiring user judgment or approval.

Continue until the outcome is delivered and credibly verified. Report the result, evidence, and remaining uncertainty.
