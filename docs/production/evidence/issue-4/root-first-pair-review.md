# #4 首对独立检查（第一版，待修）

日期：2026-10-09。入口：http://127.0.0.1:5184/?preview=threejs；来源分支 codex/threejs-issue-4，集成基线 d292a3fa3b493bf6e166063336c44721ca19d002。此记录只覆盖未提交首对第一版，不是 #4/#5 完成验收。

## 实际检查

- 在真实 seed 1337 / first_defense / camp_warden 会话自然运行后战术暂停。木材139，r1c3双击建造箭塔40，剩99，模型Lv1。双击升级50后剩49、Lv2，双击远射仅1层且返回战术暂停；r1c4建造40后剩9。未注入资金、单位数或模拟时间。
- 暂停前后 data-presentation 的独立 mixer 时间、死亡停留和四个特效完全相同，资源/倒计时也保持；改变视口没有推进模拟。
- 恢复自然战斗后15秒观察到 walk/hit/death，实例时间不同；没有在该观察窗口捕获 attack，因此此记录不宣称四类动作全部通过。读数与取证见 root-first-pair-actions.json。
- 实际截图：root-first-pair-720.jpg（720×1280）、root-first-pair-360.jpg（360×640）、root-first-pair-desktop.jpg（1280×720）。十五格完整可见；这一轮未做逐格热区和屋顶像素点击验收。
- 浏览器错误为0；警告1条：PCFSoftShadowMap 已移除，运行实际回退到 PCFShadowMap，需改用支持的类型。

## 独立资产校验

官方 Khronos glTF Validator 2.0.0-dev.3.10，全部零 error/零 warning，每个资产三个 NODE_EMPTY info 对应语义挂点。嵌入纹理与 AO 存在；骷髅有 skin 及四个 clip。验证报告存本机临时 gltf-tools/reports；最终交付需按最终资产SHA重新验证并保存正式记录。

| 文件 | 字节 | 三角面 | 材质 | SHA256 |
| --- | ---: | ---: | ---: | --- |
| arrow_tower_low.glb | 1112836 | 12512 | 10 | eaf8a9c0ff147f2c8aedf9cea56914af23d75e3a155789099652f29a0e8ad98e |
| arrow_tower_medium.glb | 1146528 | 13052 | 10 | d002639bae215b24fcda6beb733c4c447c051bfa28ea68a499d4d766a9a1d33e |
| arrow_tower_high.glb | 1170740 | 13382 | 10 | ad70d0a66c2169f3d84e982c7da1cd992297ba1b0697182dd5d21629de9a7b18 |
| skeleton_infantry.glb | 956116 | 6963 | 9 | 0e2ecf6256857df44e1ca3f2fb744565d1e0d6574b69880f1c13bd976f573657 |

## 需要回归

1. 360手机中骷髅躯干/腿部轮廓不够可读；箭塔石质塔身与驻守弓手受高俯角和脚底标签覆盖影响。开发已接收：在固定高俯角范围内小幅调整镜头、角色轮廓，采用 label_anchor 并避免遮挡；保持15格、44px热区及不改核心位置/推进。
2. 五个骨架（含死亡）加一座箭塔的实际读数为195 calls/95556 triangles，包含阴影通道，不能将它当成200单位手机性能证据。开发已接收：保留原可编辑材质，运行导出使用atlas/更少材质并保留视觉分色及roughness/metallic/AO。扩充前重测。
3. 使用支持的阴影类型，清除上述console警告。
4. 源码检查发现最后锚点已有fallback，但敌人定义由ID字符串解析，首次出现即被同批核心步骤移除的单位没有实例。建议使用 enemy_spawned 的definitionId与表现缓存完成事件序列，最终需验证同帧已移除目标反馈。

本轮没有进行实体手机验证、屋顶坐标点击、加载失败独立复测和完整资产覆盖；#5人工与设备门禁保持未满足。
