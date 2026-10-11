# iQOO 首次手机记录公开摘要

2026-10-10。项目所有者确认设备为 iQOO Z10 Turbo、同 WiFi、Vivo 办公套件连接，并表示已执行。电脑实际保存两份完整原始 JSON，来源构建 `6d1a168d86fe2ff0b19dc448917e236309a6739e`。原件保持外部；公开 hash/bytes 与独立复算审核见同目录 `iqoo-public-audit-summary.json`。不包含私人 LAN 地址、会话 token 或会话身份。

| 轮次 | 实际状态 | 实际采样 | 样本 | median/P95/max ms | 实际 calls/triangles |
| --- | --- | --- | --- | --- | --- |
| 100 / 60秒 | 完整完成 | 60.0119秒 | 3616 | 16.6 / 16.7 / 16.8 | 239 / 1,955,010 |
| 200 / 300秒 | page-hidden 中断 | 134.3627秒 | 8091 | 16.6 / 16.7 / 50 | 439 / 3,351,410 |
| 300 / 60秒 | 没有记录 | — | — | — | — |

100/200 的测量期真实 trusted touch 分别261/451次。事件到处理器近似延迟 median7.2/9.8ms、max15.4/23.1ms，不代表端到端视觉延迟。正有限原始帧间隔、sum时长、样本数、median、nearest-rank P95、max及render样本数均独立复算一致，慢帧与中断完整保留。逐单位快照活跃/可见/镜头内，独立mixer数量符合100/200，mixer时间前进。

实际viewport360×703、nativeDPR3.5、rendererDPR2、画布336×313，1024²PCF接地阴影。浏览器环境提示为 Android16/V2452A/Quark10.16.5.1140/Chrome123；它不核实具体系统版本、OriginOS或实际投屏负载。原声明的待核实字段与 ownerAccepted/physicalDeviceAccepted=false 保持原样。

page-hidden 只证明 document.visibilityState 变为 hidden，不能断言是锁屏、切应用或具体系统动作，没有崩溃证据。200的约134秒不能充当完整300秒长测或热稳定通过，300仍缺失。只补200连续完整300秒与300完整60秒，各重新预热5秒；不重跑已保存100、不拼接中断帧、不缩短目标。

这是已交付单骷髅、样板建筑与环境表现实验，没有核心战斗、完整敌人混编或核心持续攻击。Issue5仍OPEN，人工接受没有解除，本次UI续测改动也不构成Issue5通过。
