## Spec

固定基点：`d292a3fa3b493bf6e166063336c44721ca19d002`。固定 HEAD：`58b5b33062c346a8ff5d7697509969eefeba32e4`。全范围保留原实现提交，增量为 `3f16e2b..58b5b33`，新增 `fix: centralize sample asset coverage and mesh pipeline (#4)`。

**发现 0：缺失或部分要求 0；未要求的范围膨胀 0；实现错误 0。原 P2 已解决。** 总规格 `docs/specs/ZCamp-Threejs-3D-lowpoly-spec.md:93` 要求：“通过类型化表现目录关联内容 ID 与模型、材质、比例、动画、攻击锚点、等级附件、名称及特效。加载前校验覆盖范围与必要字段，不在场景分支中散落资产配置。” #4 第二项要求“建立类型化表现目录与加载校验”。固定增量中 `assetCatalog.ts` 统一声明 `ENEMY_ASSETS` 的 walker→skeleton 关联与建筑三档引用；`ModelLibrary.load` 在第一个文件请求前验证所有声明引用存在、正式敌人 ID 存在；`Battlefield.makeEnemy` 仅消费 `enemyAsset`，原场景专用分支已移除。

未覆盖敌人继续使用明确标记的开发占位，未新增玩法或后续正式资产。总规格明确“美术样板是中间验收阶段，不代表完整迁移完成”。机械制作流程抽取保留创建/修订、烘焙及保存的既有决策边界，未改变运行导出协议；十二份来源与十二个 GLB 的原 SHA 和既有视觉审计仍适用。

已审阅完整八文件增量及项目外修复证据：125 项测试、构建、全范围 diff --check、Blender 临时内存流程对比，以及自然 walker 与短保留 runner 开发占位冒烟。后者不作为 active runner 姿态证据。未重复 QA，未启动浏览器或服务，未导出资产。

原 `issue4-spec-final.md` 保留不改。本报告将原全范围审查与该固定增量结合，Spec 轴无剩余阻断；该轴最严重问题：无。#5/#13 的项目所有者接受、实体手机及持续性能/生命周期验收仍为独立未满足门禁，本次不宣称通过。
