# Issue #4：精修资产驱动的可玩美术样板

日期：2026-10-09。实施分支 `codex/threejs-issue-4`，固定集成基线 `d292a3fa3b493bf6e166063336c44721ca19d002`。本记录覆盖 #4 样板实施；项目所有者接受、实体设备预算和后续全资产扩充分别由 #5–#13 交付。

## 范围与运行

- 开发：`http://127.0.0.1:5184/?preview=threejs`；构建预览：`http://127.0.0.1:4190/Game-ZCamp/?preview=threejs`。复现命令为 `npm run dev -- --host 127.0.0.1 --port 5184 --strictPort`，或 `npm run build` 后 `npm run preview -- --host 127.0.0.1 --port 4190 --strictPort`。
- 样板固定 `seed=1337`、`first_defense`、`camp_warden`，使用同一个真实 `BattleSession`。取证仅通过玩家点击和自然固定步推进，没有注入资金、等级、敌人或时间。
- 默认原版入口保留作阶段 A/B 对照。页面、战场和加载面板明确说明精修覆盖与开发占位；英雄、特殊塔和其余敌人留待 #5 接受后扩充。
- `src/core`、经济、波次、英雄加成、寻敌与进度存储没有改动。表现目录只承载模型、尺寸、锚点和动作，不复制费用、伤害、产速或成长规则。
- 当前服务是恢复后的受管理开发 session `41106` 与构建预览 session `81160`；历史截图对应的旧服务会话不作为存活证明。

## 制作来源与最终清单

交付 12 个原创 `.blend` 与自包含 GLB，制作/导出流程及坐标协议见 [来源说明](../../art/threejs/README.md)。来源包含可编辑分件、runtime 网格与 UV、packed 材质图像；骷髅有 14 个关节、四个 Actions/NLA。初始创建脚本不会被游戏执行，正式导出只读取已保存精修来源。

每个 GLB 使用一个 PBR 材质及两张嵌入 PNG：baseColor 与合并 AO/roughness/metallic。独立粗糙度、金属度及结构遮蔽保留在图集中。主光的地面投影由运行渲染，不烘焙进模型。

| 运行资产 | 字节 | 三角形 | 内容 |
| --- | ---: | ---: | --- |
| arrow_tower_low.glb | 1,169,432 | 12,512 | Lv.1–2 石质箭塔、蓝顶、驻守弓手 |
| arrow_tower_medium.glb | 1,204,952 | 13,052 | Lv.3–4 加固基座、金支撑、前垛 |
| arrow_tower_high.glb | 1,241,992 | 13,408 | Lv.5 双旗、金平台圈 |
| lumberyard_low.glb | 800,392 | 8,596 | Lv.1–2 木梁、锯刃、切木年轮 |
| lumberyard_medium.glb | 965,724 | 12,016 | Lv.3–4 储木架、金檐、柱箍 |
| lumberyard_high.glb | 1,121,796 | 14,832 | Lv.5 双旗、行会标牌、上层木堆 |
| main_city.glb | 1,839,060 | 18,508 | 固定 Lv.1 石质堡垒与两侧角楼 |
| wall_segment.glb | 898,288 | 9,312 | 石缝、扶壁、原创蓝金旗徽 |
| skeleton_infantry.glb | 1,034,236 | 6,982 | 骷髅步兵、盾剑、14 joints、四动作 |
| pine_tree.glb | 320,432 | 1,582 | 格外松树 |
| rock_cluster.glb | 290,636 | 880 | 格外切面岩簇 |
| camp_plot.glb | 317,424 | 1,620 | 十五格石边底座 |

总 GLB 体积 11,204,364 字节。来源/运行 SHA、纹理、挂点与 clip 时长由 [asset-manifest.json](./evidence/issue-4/asset-manifest.json) 登记。静态墙段六份、地块十五份、树木四份和岩簇四份使用 `InstancedMesh`；骷髅使用完整 `SkeletonUtils.clone` 与每实例独立 `AnimationMixer`，没有把普通实例化当作独立骨架动画方案。

## 接入与生命周期

`SAMPLE_ASSETS` 校验必需资源，`ModelLibrary` 加载时检查场景原点/单位缩放、尺寸、脚底/基座和语义挂点，骷髅还检查 `walk/attack/hit/death`。首批资产全部就绪前，会话不接收时间戳，场景与操作栏保持 inert。加载失败显示具体文件、重试入口，成功后从完整五秒准备阶段开始。

建筑档位读取真实 `BuildingState.level`，每个实例有稳定格位 ID；标签采用 GLB `(0,.025,.5)` 前沿挂点投影。射线可命中建筑屋顶与附件，并沿父节点找到相同格位；树岩与城墙装饰不参与建造选取。

箭矢来源读取真实建筑/主城攻击挂点；命中和死亡读取事件的推进位置与缓存身份。`enemy_spawned` 建立缓存，允许同一批固定步出现即被移除的目标仍产生短反馈；临时采样事件位置不会把存活目标移回旧位置。金币仅展示核心已结算的奖励，不派发第二次伤害或资源命令。死亡模型约 0.95 秒后清理，金币反馈约 0.7 秒后清理；暂停不推进 mixer/反馈 TTL。

重启清理上轮敌人、建筑、效果及锚点缓存，保留可复用 GLB 库。实例清理释放独立骨架和实例化缓冲，不释放仍被其他实例使用的共享 geometry/material/texture；最终退出按库所有权释放共享资源和 ImageBitmap。

## 实际玩家证据

对照 [规格参考图](../specs/assets/zcamp-threejs-reference.png)，当前镜头保留紫灰威胁区、横向唯一城墙与绿色五列三行营地；石堡、蓝顶/金饰、木材厂木梁/年轮、骷髅盾剑与外围切面树岩进入实时画面，主光和结构 AO 提供接地与材质层次。当前截图中的特殊塔、其他敌人和英雄仍明确标记占位，不能用此样板声明参考图中全部内容已实现，也不能代替 #5 的审美接受。

- 开始空营地后战术暂停，以真实木材建造木材厂（60）和箭塔（40），继续战斗取得后续生产/击杀收益。中/高木材厂已经通过自然运营升级并选择真实词条，截图 [final-lumber-medium.jpg](./evidence/issue-4/final-lumber-medium.jpg) / [final-lumber-high.jpg](./evidence/issue-4/final-lumber-high.jpg) 分别显示 Lv.3 与 Lv.5、精修 GLB 与准确产速。较早命令和动作记录为 [lumber-medium-player.json](./evidence/issue-4/lumber-medium-player.json)。
- 当前堡垒/松树轮廓与静态合批运行图为 [castle-instanced-low-720.jpg](./evidence/issue-4/castle-instanced-low-720.jpg)。更早 `full-sample-low-720.jpg` 的大坡屋顶主城与未合批场景作为修订前记录，不能替代当前资产证据。
- 根独立 QA 在同一个自然玩家会话中把 r1c2 木材厂与 r1c3 箭塔均升到 Lv.5；真实命令、固定步与标签见 [root-final-growth-history.json](./evidence/issue-4/root-final-growth-history.json)。箭塔低/中/高三档图分别为 `root-final-low-720.jpg`、`root-final-arrow-medium-720.jpg`、`root-final-arrow-high-720.jpg`；木材厂中/高档为 `root-final-lumber-medium-720.jpg` / `root-final-lumber-high-720.jpg`。该轮木材厂选择实际产量与固定产出词条，箭塔选择急射与猛攻，标签及详情显示真实等级/词条；没有以直接加载高档模型代替升级流程。
- 第一版比例/脚底标签/材质调用反馈及第二版 atlas 首对的独立真实 360、390、720、1366 检查分别保留在 [root-first-pair-review.md](./evidence/issue-4/root-first-pair-review.md) 与 [root-atlas-pair-review.md](./evidence/issue-4/root-atlas-pair-review.md)。它们明确自己的历史 SHA 与未完成项，不是最终 #4/#5 接受。
- 第二版首对实际十五格均为 44×44 CSS px、无重叠，十五次真实点击得到对应格位；720 原生像素点击屋顶与弓手附件选中对应箭塔，见 `root-atlas-grid-360.json`、`root-atlas-selections-360.json` 与 `root-atlas-roof-attachment-720.jpg`。完整最终样板独立 QA 见 [root-final-review.md](./evidence/issue-4/root-final-review.md)，覆盖全部四视口、最终 15 格以及箭塔、木材厂、主城屋顶和高档旗布的实际像素点选；原始旗外 miss 记录没有伪装成命中。
- 构建子路径的较早加载失败记录 [final-subpath-failure-freeze.json](./evidence/issue-4/final-subpath-failure-freeze.json) 显示相隔约 26 秒，assetState 保持 failed、clockStep=0、openingCountdown=5；失败图为 `final-subpath-failed.jpg`。恢复后的最终重试与正常刷新见下节。

## 最终构建收尾

最后一轮只临时移走本工作树 `dist/assets/threejs/arrow_tower_low.glb`，正式 `public` 与来源不变。页面明确显示该资源失败和重试入口；两次取样间隔约 16.35 秒，step=0、openingCountdown=5、assetState=failed 始终相同，下层 HUD/场景/底栏均有 inert。见 [final-built-failure.json](./evidence/issue-4/final-built-failure.json) / `final-built-failure.jpg`。较早失败记录作为历史补证保留。

恢复相同 SHA 的文件后点击真实“重试加载”，进度完成 12/12。首个 ready 观测为 step=3、剩余 4.9 秒，UI 显示首波 5 秒；持续取样至 step=150 才进入 RUNNING、剩余为 0，表明真实完整五秒固定步准备阶段。没有把加载失败期间墙钟补算到会话。见 [final-built-retry.json](./evidence/issue-4/final-built-retry.json)。最终再正常刷新，实际观察到加载 2/12 的进度及 12/12 ready，原版链接仍为 `/Game-ZCamp/`，三层解除 inert，console 无 warnings/errors，见 `final-built-normal.json` / `final-built-normal.jpg`。

重试取证原观测 666 次，交付日志保留原观测数、首尾、阶段变化及相隔至少 15 个真实固定步的检查点，删除相同状态的高频重复，未合成新样本。

在这轮构建的自然战斗中，walker-20 实际播放 attack，城墙护盾正在受击；同帧另有死亡短保留与金币效果，见 [final-built-combat.json](./evidence/issue-4/final-built-combat.json) / `final-built-attack.jpg`。随后战术暂停 52.695 秒，两次 step=2284、HUD、独立 mixer 时间及效果数完全相同，恢复后继续自然战斗，见 [final-built-pause.json](./evidence/issue-4/final-built-pause.json)。结合根的 walk/hit/death 观察和本轮 attack，四语义具有运行证据。

自然失守时场景仍有 13 个单位，三层 inert、可用格位 0；结果面板双击“重新开始”只记录一条 accepted restart。旧敌人与反馈均为 0，十四空格/固定主城恢复，木材120、金币0、城墙100、护盾100、五秒准备阶段重新开始。见 [final-built-restart.json](./evidence/issue-4/final-built-restart.json)、`final-built-result.jpg` / `final-built-restarted.jpg`。这是一次真实结果重启，尚不构成 #13 的十次长期循环与无泄漏接受。

重启后跟踪新的 walker-18 death，从首次观测到自然推进 0.633 秒再暂停；冻结读数仍为同一个死亡实例，截图没有看到旧白色眼窝残片。头顶黄色圆片是独立奖励金币短反馈。见 [final-built-late-death.json](./evidence/issue-4/final-built-late-death.json) / `final-built-late-death.jpg`；也实际查看了根保存的死亡早段及后段图，不以 14 joints 格式检查替代形变判断。

所有临时移走的构建文件已恢复，与正式 public 的 12 个 GLB 逐个 SHA 相同；自己的验证页已关闭，viewport 已 reset。浏览器 DOM 读取偶尔发生在加载还未提供 presentation 数据时，该次取证查询报错后等待 ready 再读取，没有页面运行异常。首轮 DPR 实测 1.5，最终正常刷新读数约 1.00000003；各原始记录保留实际值，不把这些视口测试写成实体手机。

## Red → Green 与检查

本任务沿用已确认公开边界：GameCommand/GameState/GameEvent、一个 BattleSession、共享 UI 派生/决策和真实浏览器。没有新增模型工厂、材料数、私有缓存布局的镜像测试。制作变化用实际镜头观察作为视觉 red/green：原白模缺少所需正式资产，第一对在小屏躯干/标签与材质调用存在明确问题，经比例、前沿挂点、PBR atlas、支持的阴影类型修订后复验；眼窝新增顶点随后明确绑定 head，保留死亡姿态图 `skull-weight-death.jpg`。

恢复工作树后执行 `npm run check`：15 文件、125 项通过；`npm run build`：通过，仅有现有大 bundle 提示。`python art/threejs/inspect_assets.py`：12 个容器/来源/语义检查通过，清单与最终资产一致。根独立运行官方 Khronos glTF Validator `2.0.0-dev.3.10`，12 个最终 GLB 均 0 errors / 0 warnings；挂点空节点及主城 `UNUSED_OBJECT` 为信息项，不忽略或降级警告。

## 边界与后续验收

运行截图与隐藏 IAB 视口来自 Windows 桌面浏览器（Chrome/155），不构成实体手机证据。格式、来源和单帧调用统计不能证明美术接受或群体性能。#5 仍须项目所有者实际镜头接受及实体中档手机 100/200/300 活动实例预算；#13 仍须完整内容、持续性能和真实生命周期接受。主城维持冻结的固定不可升级规则，未为视觉档位添加新玩法。

本 Issue 的实施、公开回归与上述实际运行取证已齐备；交付提交仍须经固定基准双轴审查和独立 merger 决定合入。#5/#13 人工与设备门继续保持未满足。
