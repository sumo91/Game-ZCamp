# #5 固定候选独立桌面检查

2026-10-10。根按已授权 Goal 执行 QA；不是项目所有者接受。固定运行源码 `d26b800a5b4a92200ecda0c613c97d98f716f896`，从集成 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2` 构建，真实入口 `/Game-ZCamp/?preview=asset-pressure`。源码与正式资产未由根修改。

## 连续压力

实际硬件 i7-12700KF / RTX4060Ti、Windows11 家庭中文版10.0.26300，完整 CIM 已登记。实际 Windows IAB UA 为 Chrome155.0.0.0；视口1366×768，canvas440×492；native/standard renderer DPR `1.0000000298023224`。标准档仅上限2，本机实际约1，不能据此推断DPR2成本。1024PCF方向光、四种动画，十五格含主城1和十四成长建筑，墙6、plot15、树4、岩4。雷电保持运行，Codex/IAB及审查文本工作存在；无同时构建、建模或其他压力场景，不宣称空载机器或独立CPU/GPU计时。

| 文件 | 数量 | 有效秒数 | 样本 | median / P95 / max ms | calls | 渲染triangles | 测量中响应 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| root-100-standard-60-no-in-run-response.json | 100 | 60.0003 | 8640 | 6.9 / 7.0 / 7.5 | 239 | 1955010 | 0 |
| root-100-standard-60.json | 100 | 60.0002 | 8639 | 6.9 / 7.0 / 13.9 | 239 | 1955010 | 1 |
| root-300-standard-60.json | 300 | 60.0005 | 8628 | 6.9 / 7.1 / 14.0 | 639 | 4747810 | 1 |
| root-200-standard-300.json | 200 | 300.0017 | 43181 | 6.9 / 7.1 / 34.7 | 439 | 3351410 | 3 |

每轮预热另计5秒；全部连续rAF间隔原样导出下载，未删除慢帧。首100轮完成后才点到响应，故原记录保留并再测一轮；第二轮最大慢帧更高，也保留。长200轮三次实际输入在约77/149/238秒测量阶段，处理器近似延迟0.4/0.1/0.1ms，非端到端显示延迟。长测开始/结束visibility均visible；中段读到完整canvas在viewport内，200单位全部visible/actionRunning/centerInView，全部mixer从start到end真实推进。画面中可见动作和接地阴影。控制配置测量中锁定，没有重建单位或修改数量。

公开大JSON通过真实“导出JSON”下载保存，避免单次DOM读取结果被传输长度截断。`verify-public-pressure-result.py` 独立复算全部原始间隔的median、nearest-rankP95、max、样本数、sum时长及实际组成，通过；输出root-statistics-audit.json。统计核对是记录审计，没有新增私有实现单测。

当前桌面200的两个目标数值范围可达到，但这是单骷髅表现实验，不运行核心持续攻击、未混编普通/精英/Boss；不能宣称#13通过或手机容量。每增加100单位实测calls增加200、triangles增加1396400；独立蒙皮与实时阴影的绘制成本明显增长。正式手机制作预算和群体方案需实体设备同构场景取证，不能仅根据强桌面144Hz节奏锁定。

## 公开操作和负面路径

- 桌面1366×768和360×640、390×844、720×1280实际布局，独立记录主要控件均>=44CSSpx、无横向超宽。360降低DPR后实际200单位不删减、1024阴影保留。本机native约1，两档的像素密度几乎相同，未验证真实高DPR设备的节省。
- 360真实开始→响应→停止保留manual-stop 1497样本/10.396秒左右；重新测量清空旧结果，真实改390视口得到viewport-resized新0样本预热中断。下载原始记录均保留，具体秒数以原始JSON及审计为准。
- “复制结果”真实UI成功：90066字符与下载结果逐字符一致；按钮操作没有第二套隐藏结果。
- 正常路径console 0 warning/error，单独保存root-normal-console.json；失败路径只移走自有dist的arrow_tower_low.glb，正式public/source未动。实际报“模型或材质资源不可用：arrow_tower_low.glb”，开始/config禁用、重试可见、无占位canvas。恢复原SHA后真实重试成功，canvas1、可开始；移前/恢复SHA另存证据。
- 临时about:blank标签切换探测未使IAB中的文档hidden，实际仍visible。没有用evaluate合成事件；保存事实root-background-probe.json后手动中断并保存原始结果。该路径不宣称后台切换通过；实体手机真实后台/转屏仍待验证。WebGL context loss未通过可支持安全UI触发，未宣称实测通过。
- 确认lab画布目前computed touch-action=none；限定lab canvas的pan-y修复仍待开发及公开回归，不能以桌面检查替代真触摸。

## 清理与门

根临时pressure tab2、about:blank tab3均已关闭；viewport override已reset。4191固定构建服务仍由根接管，等修复/证据提交和最终回归再安排可审阅入口或清理。所有公开JSON与截图保存在本目录，开发纳入仓库时原样保留；本报告的链接/数字可据真实原始文件核对。

Standards初审0硬违例、1 DPR重复启发式；Spec初审1已知P2 canvas滚动。修复后再固定head复审、独立合入及CI。#5 OPEN、真机/雷电/owner未接受；#6–9不启动。真实手机型号、系统、浏览器与同WiFi问题已提出，尚待回复。
