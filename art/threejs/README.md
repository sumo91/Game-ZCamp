# 原创 Three.js 美术样板来源

此目录只承载 Issue #4 的原创样板。人物、结构、纹理、分段骨架与动作由本任务在 Blender 5.2.1 制作；没有导入 Warcraft、第三方游戏模型或付费素材。参考图只用于色彩、比例、材质与镜头对照。其他敌人、特殊塔和英雄由后续任务制作，当前运行仍明确标记其开发占位。

## 可编辑来源与运行产物

- `sources/*.blend` 是正式可编辑制作来源，含 `editable_modules` 原始分件、倒角与法线修改器，`runtime_export` 已合并并展开 UV 的可编辑网格、packed 表面纹理和 512×512 AO。骷髅包含 14 个制作关节、刚性权重、四个 Actions 与 NLA tracks；眼窝布尔切口顶点已明确绑定 head，最终 skin 为 14 joints，没有静止的 neutral_bone。
- `public/assets/threejs/*.glb` 是来源导出的自包含运行产物，所有 PNG 嵌在 GLB 内。每个模型使用一个 PBR 材质、两个 PNG：baseColor 图集和合并的 AO/roughness/metallic 图集。石/骨、木纹、蓝屋顶与局部金属仍具有不同粗糙度与金属度；不把光源的长地面投影烘焙到模型。
- `create_sample_sources.py` 保存原始构造过程，只用于新建来源；不要对已有精修来源再次运行它。创建脚本并非游戏运行时几何工厂。
- `create_environment_sources.py` 新建木材厂三档、主城、墙段、松树、岩簇及营地石边 plot；若指定的 `.blend` 已存在会拒绝覆盖。木材厂含锯刃、切木年轮、桁架与低/中/高附件；主城有角楼、分石拱门及蓝顶金饰；墙段含分层石缝、扶壁与原创旗徽。
- `refine_sources.py` 读取已保存来源，执行记录了 revision 的比例、弓手朝向及 PBR 图集修订。它从保留分件更新 runtime 面、UV、结构 AO 与图集，并保存来源；只有显式调用该修订工具才会更新 runtime。首对当前是 skeleton proportion revision 3、skin revision 1、tower archer revision 3、cloth revision 1、atlas revision 1；薄旗与布片有实体厚度，重复运行这些修订会跳过已应用步骤。
- `refine_environment_shapes.py` 保存固定镜头审阅后的主城/松树修订：主城收窄中央屋顶、抬起石质主堡并前移两座尖顶角楼；松树收窄树冠、拉高顶梢。`camera_shape_revision=1` 防止重复应用；这是已执行的制作记录。源修改后仍需更新 runtime 面与图集再导出，默认导出不会重跑这些造型修订。
- `export_assets.py` **只读取已保存的 `.blend`**，导出 `runtime_export` 与 rig/语义 Empty，不重建造型、不回存来源。可直接编辑 runtime 网格、UV、材料、骨架与 Actions 后保存再导出。`editable_modules` 是保留的可编辑分件备份；若改动该备份，需在 Blender 中更新 runtime 合并面、UV/AO 再保存，不会被默认导出器悄悄替换。

```powershell
# 正式导出：读取所有已保存源，或者在 -- 后列出明确资产 stem。
& 'D:/Apps/Blender/blender.exe' --background --python-exit-code 1 --python art/threejs/export_assets.py
python art/threejs/inspect_assets.py
```

Blender 默认保留的 `.blend1` 等备份不进入交付，修改源文件时可在 Blender 另存备份。正式 GLB 导出使用 Blender 5.2.40 的 glTF 插件、Y-up、应用网格修改器、NLA_TRACKS、30fps 采样、clip 起点归零、skins/extras；不含 cameras/lights，也不依赖压缩解码器。

## 坐标与接入协议

1 Blender unit = 1 米；源 Z-up，经 GLB 导出转 Y-up。源 -Y / GLB +Z 为人物正面。脚底或建筑基座中心在零点，根 scale=(1,1,1)，模型布局只影响显示。塔/木材厂保持同一基座，最大占格外接盒 1.8×1.55 米；游戏真实格位来自 `CAMP_POSITIONS`，没有复制经济/战斗数值。

`asset_root`、`attack_anchor`、`hit_anchor`、`label_anchor` 是语义名；骨架锚点跟随对应手/胸骨，运行读取 world matrix。完整 GLTF scene 被 SkeletonUtils 克隆后移动，不能只克隆 SkinnedMesh 或共享 AnimationMixer。导出时将蒙皮面放在场景根，以避免 glTF 忽略其父变换的警告；rig 与锚点保留在完整同一 scene 中，游戏克隆/move 该完整 scene。不能把一只骷髅的骨骼动作当作另一只的动作。

`walk`（0.8秒）为原地循环；`attack`（0.8秒）为举剑挥击；`hit`（0.3秒）为短暂后仰；`death`（0.9秒）为倒地并保持。最终时长与通道数由 `inspect_assets.py` 重新读取 GLB 后登记；暂停不推进 mixer，动画不结算伤害。

第二版首对按实际镜头反馈扩大骷髅胸腔/腿部，头顶约 1.37 米；固定镜头约 55° 高俯角。箭塔标签读取 `label_anchor` 并投影到基座前沿，弓手朝向城墙外的 -Z 威胁区。只有被玩法事件命中的位置用于取样反馈锚点，活单位仍保持该批固定步的末态位置。

箭塔低档 Lv.1–2，中档 Lv.3–4，高档 Lv.5：中档增加加固基座、金支撑与前垛，高档增加双旗与金平台圈。真实等级来自核心状态，三档目录不写价格、伤害、产速或升级规则。

木材厂同样按 Lv.1–2 / Lv.3–4 / Lv.5 映射三档：中档增加后储木架、金色檐口和柱箍，高档增加双旗、行会标牌和上层木堆。主城固定一档；城墙以同一 1.9 米墙段连接六次。树岩属于装饰，不参与点选、单位推进或碰撞；营地 plot 只是原始十五格的显示底座。主城和所有成长建筑标签统一为 GLB (0,.025,.5)。

## 验证与边界

`inspect_assets.py` 检查容器、自包含资源、必需锚点和骨架 clip，并写出实际 SHA/字节/三角形/材质统计。官方 Khronos 校验报告和真实游戏截图随 `docs/production/evidence/issue-4/` 留存；这些格式检查不能代替美术判断。GPU draw calls 与活动单位帧耗时另由运行测量，不能把单模型 primitive 数当作场景性能。

十二个来源与 GLB 已完整接入当前样板，最终资产 SHA、运行步骤及检查结果见 [Issue #4 实施证据](../../docs/production/THREEJS_ISSUE_4_EVIDENCE.md)。首对历史审阅图保留为比例、标签和材质修订的记录，不作为最终资产清单。实体手机、100/200/300 活动实例与项目所有者接受属于 #5/#13 后续门，当前没有相应通过声明。
