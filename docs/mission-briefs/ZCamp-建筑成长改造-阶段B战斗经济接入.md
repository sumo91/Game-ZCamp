# Mission Brief: 新版建筑成长真实进入战斗与经济结算

## Outcome

在不切换现有公开 UI、也不删除旧卡牌系统的前提下，ZCamp 平台无关核心模拟中的新版箭塔、四种改造塔、建筑等级和逐建筑词条真实影响攻击、控制与木材产出；所有效果都以建筑 ID 为归属边界，同类建筑互不串联，并继续保持确定性和跨平台一致。

## Context

- 项目目录：`D:\00_Ai\Codex\WebGames\ZCamp`。
- 开工前读取 `docs/production/TEAM_PROTOCOL.md`，确认 Developer 身份、当前分支与共享工作树状态。
- 当前功能分支：`codex/tower-evolution-v0.2`；阶段 A 已通过门禁，基线 HEAD 为 `e5c00ac`。
- 产品事实源：`docs/尸潮营地_建筑成长改造_阶段版本设计_v0.2.md`，重点为第 4～6、8、10、13.2、14.4～14.6 节。
- 阶段 A 契约与证据：`src/core/buildingGrowth.ts`、`docs/evidence/ZCamp-建筑成长改造-阶段A-2026-08-13.md`。
- 现有 Phaser 界面仍只操作旧动态手牌。阶段 B 只接核心结算，不让公开界面切换到新循环。

## Required Behaviors

### 新版战斗塔

- `model: "growth"` 的 Lv.1 箭塔能够自动寻找目标、攻击并产生与现有边界兼容的攻击/命中事件；改造后的机枪塔、炮塔、冰冻塔和电磁塔复用各自既有基础攻击职责。
- 每座塔的最终基础属性只由“当前塔型定义＋当前等级＋该建筑自己的词条”派生，不把结果回写进共享塔型定义，也不读取旧 `permanentApplications` 作为新版塔增益。
- 等级伤害倍率为 `1 + 0.20 × (level - 1)`；等级攻速倍率为 `1 + 0.10 × (level - 1)`；攻击间隔使用塔型基础间隔除以等级和本塔攻速倍率。
- `tower_damage` 每层使该塔伤害增加 12%；`tower_attack_speed` 每层使该塔攻速增加 15%；`tower_range` 每层使该塔射程增加 10%。同一词条的层数线性相加，再作为该类别的一个倍率应用。
- `tower_elite_damage` 每层对精英和 Boss 增伤 25%；`machine_hunter`、`electric_overload` 每层对精英和 Boss 增伤 30%。同属精英/Boss 增伤类别的百分比相加。
- `tower_wall_guard` 每层对正在贴墙的目标增伤 20%；`tower_finisher` 每层对受击前生命低于 30% 的目标增伤 20%。这些条件只在本塔本次伤害中计算。
- 改造后按新塔基础属性与保留等级重新派生结果；不能沿用改造前箭塔的最终数值缓存。

### 特殊机制词条

- 机枪塔保持单体主攻击；`machine_penetration` 每层增加一个后续目标，后续目标各承受按其自身条件计算的本塔直接伤害的 70%，目标选择与排序必须稳定。
- 炮塔保持既有范围伤害职责；`cannon_blast` 每层使基础爆炸半径增加 20%。
- `cannon_burn` 首层解锁一次燃烧触发器：命中的主目标和合法溅射目标燃烧 3 秒，每秒造成该次基础攻击伤害的 20%；后续每层只让该燃烧伤害在上一基准上增加 50%，不复制触发器。燃烧伤害基准包含塔型基础伤害、等级和 `tower_damage`，不包含精英、贴墙、收割等目标条件增伤；持续伤害仍遵守敌人的既有防御规则。
- 冰冻塔保持基础减速；`frost_deep` 每层增加 0.5 秒持续时间并把移动倍率再降低 0.05。最终倍率使用一个命名且经过测试的系统安全下限；具体安全常量由执行者在证据中记录，不得散落魔法数。
- `frost_vulnerability` 每层只让该冰冻塔对“当前仍处于该塔自身减速效果”的目标增伤 25%；不能放大其他塔的伤害，也不能把另一座冰冻塔施加的减速当作自己的标记。
- 电磁塔保持既有链式次级伤害职责；`electric_chain` 每层增加一个弹射目标，目标选择与排序稳定；`electric_overload` 只作用于持有该词条的电磁塔。
- 任何需要持续状态或来源判断的效果必须保留来源建筑 ID。两座同类塔可以同时对同一敌人施加各自效果，但不得共享词条层数、触发器或易伤归属。
- 拆除来源建筑后，它不再产生新的攻击、控制、易伤、燃烧或其他词条效果；实现不得留下能继续冒充该建筑结算的幽灵全局增益。

### 新版木材厂

- 主城仍提供 0.5 木材/秒。
- 每座 `model: "growth"` 木材厂按自身等级读取基础产量 `[1.0, 1.6, 2.4, 3.4, 4.6]`，再独立计算：`(等级基础产量 + 0.4 × lumber_flat 层数) × (1 + 0.25 × lumber_output 层数)`。
- 多座新版木材厂逐座计算后相加；A 厂词条不改变 B 厂的派生产量。
- `lumber_upgrade_discount` 在该木材厂后续升级时每层减免 15%，总折扣上限 35%；继续使用阶段 A 的确定性费用函数和舍入规则，只影响持有该词条的木材厂。
- `lumber_wave_stockpile` 在每次新波开始时，由仍存在的该木材厂提供 `5 × 层数` 木材；每个波次每座厂只触发一次，重启后不保留。
- 战术暂停、强制三选一和系统暂停期间，主城与所有木材厂均不增长；现有有效战斗时间语义不变。
- 阶段 B 双轨期间，旧木材厂和旧永久卡必须继续维持当前公开版行为；但新版木材厂的等级/词条派生函数不得读取旧全局永久次数。总产速可以由主城、旧路径和逐座新版路径相加。

### 隔离与兼容

- 新版战斗/经济结算只读取 `model: "growth"` 建筑；旧结算只读取 `model: "legacy_card"` 建筑，双方不能重复攻击、重复产出或互相应用升级/词条。
- 旧动态手牌、供牌、旧永久卡和对应测试暂不删除；现有 Phaser 页面仍可构建和运行，其旧建筑体验不得因阶段 B 意外失效。
- 敌人、Boss、波次、城墙、胜负、5 秒开局、60 秒波次和现有生成节奏保持不变。

## Constraints

- 所有新结算、派生属性、状态来源和随机/排序规则留在 `src/core`；不得从 Phaser、DOM 或视觉节点反查玩法事实。
- 内容保持 data-first；数值从 `BuildingGrowthContent` 与词条 effect 读取。不得在攻击循环、资源 tick 或 UI 中另写一份费用、倍率或词条名单。
- 同一种子、状态和命令/tick 序列必须得到相同目标、伤害、状态、产出与事件顺序。
- 失败操作继续保持原子性；本阶段不得改变阶段 A 已通过的建造、升级、选择、改造和暂停契约。
- 不因实现方便修改 v0.2 冻结数值。发现现有模拟结构无法表达来源隔离时，可以局部重构敌人持续状态或结算选择器，但不得退化为塔型级或全局增益。

## Non-goals

- 不替换或修改底部手牌 UI，不实现空格建造面板、建筑详情、改造面板或三选一视觉；这些属于阶段 C。
- 不删除旧卡牌内容、状态、命令、供牌、弃牌和旧结算；最终清理由阶段 D 处理。
- 不发布 Pages，不合并 `master`，不更新 UI Bible，不做美术与移动端布局调整。
- 不新增词条、遗物、稀有度、刷新、保底、主城升级、城墙新能力、敌人新能力或平衡改数。
- 不要求阶段 B 浏览器人工玩测新版循环，因为公开 UI 尚无入口；只需证明旧页面构建不回归和新核心可复现。

## Evidence of Completion

- 纯核心测试逐项证明箭塔与四种特殊塔的 Lv.1/Lv.3/Lv.5 派生伤害、攻击间隔和射程符合公式，改造后的同等级结果来自新塔基础定义。
- 每个通用词条和八个特殊塔词条至少有一个行为级断言；机制叠层必须证明“强化同一机制而非复制触发器”。
- 至少用两座同类塔证明：A 的普通增伤不影响 B；A 的特殊机制不赋予 B；冰霜易伤只认来源塔；拆除 A 后不再结算 A 的效果。
- 至少用两座木材厂证明等级、固定产量、倍率、升级折扣、波次储备逐座隔离；拆除后产速和后续波次奖励立即排除该厂。
- 证明新版建筑不读取旧 `permanentApplications`，旧建筑仍保持原有攻击、产出与永久卡行为；同一建筑不会被新旧路径重复结算。
- 证明不同合法 tick 切分不会改变离散规则结果或事件排序；若现有持续伤害存在既有的步长误差，应以新增行为不扩大该误差为底线，在证据中说明。
- 更新 `docs/evidence/` 下的阶段 B 验收记录，写明派生公式、持续状态来源表示、减速安全下限、测试结果和仍留给 C/D 的边界。
- `npm run check`、`npm run build`、`git diff --check` 全部通过；既有 bundle 大小提示可记录为非阻断风险。

## Delegated Decisions and Unknowns

- 由执行者决定将新版塔结算放入独立模块、选择器还是 `GameSimulation` 内部，但公开核心契约要小而清楚，并避免把 `game.ts` 继续膨胀成数据与机制的双重事实源。
- 由执行者选择来源型减速/燃烧状态的数据结构、刷新与并存策略；必须满足来源隔离、确定性、暂停冻结和拆除后无幽灵增益。
- 由执行者确定减速倍率的系统安全下限，以及在现有离散 tick 模型内处理 3 秒燃烧的稳定方式；选择必须写入命名常量、测试与阶段证据，不得修改已冻结的词条标称数值。
- 现有炮塔次级伤害、电磁弹射衰减、目标排序和敌人防御规则在没有冲突时继续复用；若它们与来源隔离发生实质冲突，停止并报告最小差异，不自行重做战斗系统。

## Autonomy and Approval Boundaries

- 可以在当前功能分支修改 `src/core`、相应核心测试和阶段 B 证据，并为来源状态做必要的局部类型重构。
- 可以提交并推送 `codex/tower-evolution-v0.2` 保存阶段 B 成果。
- 不得修改 `master`、部署 Pages、切换公开 UI、删除旧系统或推进阶段 C。
- 若必须改变 v0.2 的数值、词条语义、资源职责、单建筑归属或现有敌人/Boss规则，停止并向总制作人报告影响。
- 完成后先交总制作人进行阶段 B 门禁审阅，未获通过不得自行进入阶段 C。

## Execution Directive

You own delivery of the outcome above. Investigate the relevant environment, choose an efficient path consistent with its existing conventions, make the in-scope changes, and validate the result with evidence appropriate to the task.

Adapt the route as evidence appears. Preserve the Outcome and Constraints when assumptions conflict with repository facts, and report material divergence. Resolve discoverable implementation questions yourself; escalate only decisions requiring user judgment or approval.

Continue until the outcome is delivered and credibly verified. Report the result, evidence, and remaining uncertainty.
