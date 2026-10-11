# 普通与精英亡灵来源（Issue #8）

`create_undead_sources.py` 从已精修的 `skeleton_infantry.blend` 读取 14 关节骨架与四个 Actions，仅新建四个独立来源，拒绝覆盖已存在的目标。原骷髅、旧十二件 GLB 与历史样板清单没有改变。新身体、板甲、长爪、铁箍、盾和重锤为本项目原创建模；没有外部游戏模型或纹理。

| 内容 ID | 来源/GLB stem | 可读轮廓 | 实际三角数 |
| --- | --- | --- | --- |
| runner | undead_runner | 窄腰、背部突起、双长爪，无盾无剑 | 5,936 |
| tank | undead_tank | 宽躯、圆肩甲、铁箍及铁拳 | 5,960 |
| armored | undead_armored | 闭面长冠盔、尖肩甲、大鸢盾与长柄斩刀 | 6,672 |
| brute | undead_brute | 大腹缝线、不对称刺肩、巨大铁锤 | 7,160 |

每件一材质、一 primitive、两个自包含 512×512 PNG（baseColor 与组合 AO/roughness/metallic）、14 joints。保留 `editable_modules` 与 `runtime_export`，可在 Blender 修改真实网格、材料、骨架和动作，再使用既有 `export_assets.py -- undead_runner undead_tank undead_armored undead_brute` 读取保存源导出。骨架锚点随手/胸骨，脚底原点保持零附近、asset_root scale 为 1。最后锚点修订版本为 `undead_anchor_revision=1`。

四语义实际为 walk 0.8 秒、attack 0.8 秒、hit 0.3 秒、death 0.9 秒；各实例独立 SkeletonUtils 克隆和 AnimationMixer。attack 由核心已结算的 `enemy_wall_attack` 事件启动；受击、死亡仍由实际事件驱动，死亡短暂保留显示锚点。墙边静止时行走停在起始落脚姿态；大型单位只做显示后移，核心 position、范围、减伤、奖励和随机序列不变。暂停不推进 mixer 或短特效。

统计及容器、锚点、Actions、全顶点权重和脚底检查见 `docs/production/evidence/issue-8/asset-manifest.json`。这些数值是制作记录，没有宣称实体手机性能或人工美术验收通过。
