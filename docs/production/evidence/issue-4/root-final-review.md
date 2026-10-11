# Issue #4 根任务独立完整样板审阅

2026-10-09。固定实施基线 `d292a3fa3b493bf6e166063336c44721ca19d002`，工作树 `threejs-issue-4/ZCamp`。本记录是 #4 实施阶段独立 QA；#5 项目所有者接受和实体手机预算仍未完成。最终提交前须核对资产 SHA 未变。

## 最终来源与运行产物

根独立运行官方 `gltf-validator@2.0.0-dev.3.10` 检查全部 12 个正式 GLB，均 0 errors / 0 warnings。没有忽略或降级问题；空挂点为 `NODE_EMPTY` 信息，主城另有 `UNUSED_OBJECT` 信息。总运行文件 11,204,364 bytes；每个模型一材质、两张嵌入 PNG，AO 与 roughness/metallic 使用同一打包纹理。骷髅 14 joints，没有 neutral_bone，含 walk/attack/hit/death 四 clip。报告见 [独立格式校验](./root-final12-validation.jsonl)、[实际 PBR/骨架读取](./root-final12-pbr.jsonl)。格式检查不证明美术质量或场景性能。

根以 Blender 5.2.1 LTS 后台只读打开全部 12 个 `.blend`，没有保存、导出或重建。每份保留 editable_modules、可编辑 runtime mesh、UV 和 packed 图像，asset_root 原点/单位缩放正确；骷髅来源为 14 bones、四 Actions、四 NLA tracks。来源 SHA 与 asset-manifest 一致。见 [来源审计](./root-editable-source-audit.json)。导出过程及原创使用范围仍由 [来源说明](../../../../art/threejs/README.md) 登记。

## 玩家流程与实际镜头

运行入口 `http://127.0.0.1:5184/?preview=threejs`，固定 seed 1337 / first_defense / camp_warden。实际 Windows 桌面浏览器 Chrome 155、DPR 1.5；以下小屏尺寸是桌面视口，不能写成真机证据。

1. 空营地开始后自然推进并战术暂停，实际木材 130，建造 r1c2 木材厂扣 60、r1c3 箭塔扣 40，剩 30。初始暂停 step=711，改变视口和点选格位期间 step/资源/mixer 时间保持不变。
2. 恢复自然生产与战斗，分别升级木材厂和箭塔至 Lv.3、Lv.5；逐次真实扣费并选择对应建筑的词条，不注入资金、单位或时钟。草案时 HUD、战場及底栏有 inert 属性；从战术暂停升级后选词条返回战术暂停。后来另建 r1c4 Lv.1 箭塔，保持独立等级和词条。
3. 最终两家族均 Lv.5，另一箭塔仍 Lv.1，主城固定 Lv.1；满级按钮不可用。完整命令和阶段证据见 [自然成长记录](./root-final-growth-history.json)。截图见 [低档样板](./root-final-low-720.jpg)、[木材厂中档](./root-final-lumber-medium-720.jpg)、[箭塔中档](./root-final-arrow-medium-720.jpg)、[木材厂高档](./root-final-lumber-high-720.jpg)、[箭塔高档](./root-final-arrow-high-720.jpg)。

当前镜头中主城具有石质堡垒、中央蓝顶和两侧角楼，和木材厂的屋顶/锯木结构可区分。树岩在格外，城墙石缝、扶壁及蓝旗连成防线，营地绿色、推进区紫灰。高档箭塔双旗/金平台和木材厂旗/标牌/储木可见。特殊塔、英雄和其他敌人仍在页面明确标记为开发占位。

## 格位与模型拾取

实际检查 360×640、390×844、720×1280、1366×768。360 的全部 15 个按钮真实量得 44×44 CSS px、互不重叠，逐格点击得到正确 slot；390 和桌面各检查跨行格位。低档检查详情见 [布局与 21 次点击](./root-final-layout.json)，高档视口和准确等级见 [高档布局](./root-final-high-layout.json) 与 `root-final-high-{360,390,1366}.jpg`。主城没有抢占 r2c3 的格位输入。

使用 `cua.createBrowserTab` 返回的 native Tab，截图后进行真实像素点击：箭塔屋顶 (358,682)、弓手/金色附件 (369,695)、木材厂屋顶 (245,702)、主城屋顶 (361,935)，分别选中所属格位。高档旗布 (327,668) 选中 r1c3；最初 (337,668) 在旗布之外而清空选择，原始记录保留，不能作为命中证明。见 [像素拾取记录](./root-final-native-picks.json)、[高档旗布命中后截图](./root-final-high-flag-720.jpg)。旧 DOM-only wrapper 的坐标输入限制不适用于此次 native wrapper。

## 战斗反馈与边界

根独立自然观察捕获 walk、hit、death 和并存的不同实例姿态，命中/死亡时有箭矢、命中与金币表现；核心当前敌人数已减少时，死亡模型仍短暂保留。见 [精简动作观察](./root-final-action-samples.json)、[死亡早段](./root-final-death-pose-720.jpg)、[再推进 8 个真实固定步的后段](./root-final-later-death-720.jpg)。没有看到旧眼窝 neutral 顶点残片。攻墙 attack 未在该短观察窗口捕获，应以实施者补充的实际攻墙证据判断，不能将此记录写成根已验证全部四动作。

低档暂停时实际为三骷髅、一个箭塔、一个木材厂、主城及静态环境，读取 40 calls / 301,244 rendered triangles。该数包含当前渲染与阴影配置，不能与不同单位组成的历史截图直接换算性能提升，也不能推断实体手机容量。静态墙/地块/树岩的实例化和独立骨架所有权由源码及后续标准审查核对。

本次运行 console 无 warnings/errors。根关闭自己创建的验证 tab 并 reset 临时 viewport，再核对实施者收尾证据：`final-built-combat.json` 与攻墙截图实际捕获 walker-20 的 attack；`final-built-pause.json` 在约 52.7 秒间隔保持 step/HUD/mixer/effects 不变；失守后双击重启只一条 restart、旧敌人与效果为零，十四空格及资源/城墙/护盾复位。`final-built-failure.json` 保持失败 step0/countdown5/三层 inert，恢复原 SHA 后 `final-built-retry.json` 首个观测 step3/4.9秒，至 step150 进入 RUNNING，进度为 12/12。根查看了 attack 和 0.633 秒后期死亡截图，没有看到旧切口漂浮片。这些是实施者实际运行、根审阅其证据，和前述根独立操作分别记录。完整交付状态以 [总证据](../../THREEJS_ISSUE_4_EVIDENCE.md)、最终提交及双轴审查为准。
