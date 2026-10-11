# 三名人类驻守英雄

三个稳定 ID 与玩法统计保持不变：`camp_warden` 堡垒守望者有宽金边蓝面盾与弩；`vanguard_gunner` 连弩卫士用双弩和背部箭匣；`lumber_baron` 采伐领主有斧、皮围裙、背负木材与手弩。剪影、装备与结构来自原创几何，不使用第三方角色或徽记。

来源为同名 `sources/hero_*.blend`。来源保留独立可编辑模块、原始材料、512 图集、结构 AO 与 14 骨骼；运行导出为单材质单 primitive、内嵌两张 PNG、`idle`（2秒）和 `attack`（0.4秒）Actions，以及 `attack_anchor`、`hit_anchor`、`label_anchor`。脚底落地，单位米，源 -Y 朝前、GLB +Z 朝前；战场驻守对象旋转朝 -Z 威胁区。

首次制作：`Blender --background --python art/threejs/create_hero_sources.py`。此脚本仅创建缺失来源，拒绝覆盖已保存 .blend，并完成 PBR 图集。后续编辑直接保存 .blend，然后显式只导出这三件：`Blender --background --python art/threejs/export_assets.py -- hero_camp_warden hero_vanguard_gunner hero_lumber_baron`。不对旧来源执行重建脚本。

大厅三个卡片与主城旁的驻守角色调用同一 ModelLibrary/GLB。大厅 idle 只承担展示；战场 idle/attack mixer 只按完成的核心步推进。真实英雄 `tower_attack` 触发动作和武器锚点发射；连弩卫士复用 SiegeFeedback 的连弩路径，角色动画不判定命中或伤害。

实际哈希、字节、三角形与 clip 检查见 `docs/production/evidence/issue-10/hero-asset-manifest.json`。这些格式记录不表示真机预算或最终美术接受已经通过。
