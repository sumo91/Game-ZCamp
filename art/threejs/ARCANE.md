# 寒霜与雷电原创资产

Issue #7 的六个来源位于 `sources/frost_tower_{low,medium,high}.blend` 与 `sources/electric_tower_{low,medium,high}.blend`，自包含运行产物在 `public/assets/threejs/`。原创分件、512×512 图集与 AO 继续采用样板的可编辑来源和受控 PBR 协议。没有引入第三方模型，也没有覆盖旧十二件来源或 GLB。

寒霜以中央六面冰晶与两侧冰爪为轮廓；中档增加副晶与冰纹铭牌，高档增加两枚王冠侧晶和上层金箍。雷电以叉状导体、封存符文与竖向金环为轮廓；中档增加后导体和水平符文环，高档增加冠状金叉与小符文。两族共用石缝、蓝色饰带、金属箍和原创徽记，但攻击主体不只换色。

`create_arcane_sources.py` 只创建缺失来源，遇到已保存文件会拒绝覆盖。新建后显式对这六个 stem 运行 `refine_sources.py` 烘焙单材质图集，再用 `export_assets.py` 从保存来源导出；后续编辑直接保存 `.blend` 后导出，不重跑创建脚本。编辑模块与 runtime 合并面沿用 [正式来源约定](README.md)。

来源 Z-up、基座在零点；导出 Y-up。三个必要锚点为 `attack_anchor`、`hit_anchor` 和统一前沿 `label_anchor`。塔是静态建筑；施法和命中由真实事件驱动的程序反馈承担，没有改变伤害计算的动画 clip。实际六件统计、SHA、字节与锚点记录在 `docs/production/evidence/issue-7/arcane-asset-manifest.json`。静态格式与三角数不能代替最终手机或美术接受。

正常可玩入口 `?preview=threejs` 已接入改造、升级、词条和三档模型；`?preview=threejs&demo=arcane` 是明确标记的独立开发配置。后者配置初始木材 6000 / 金币 100，walker 生命 600、所有单位攻墙伤害为 0，仍使用已校验的三关波次。建筑由真实命令准备，默认正式入口不使用这些配置，也不直接写战斗状态。

战斗中寒霜冰环/脚下冰晶读取当前 `growthSlowStates`，移除源塔、目标死亡或减速结束会立即取消。行走动作以真实最低减速倍率推进；命中、攻墙与死亡动作不套用走路减速。雷电第一段连实际主目标，后续只沿 `tower_special` 的真实目标顺序连接；事件携带命中时推进位置，目标移除仍可完成短反馈。所有这些反馈按已完成模拟步的时间推进，暂停与后台冻结时为零。
