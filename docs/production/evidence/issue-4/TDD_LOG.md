# #4 公开边界与视觉 Red → Green

本任务沿用已确认的核心 `GameCommand/GameState/GameEvent`、单一 `BattleSession`、共享成长 UI 派生/决策与真实浏览器玩家流程。没有给私有模型工厂、材质组织或每个 GLB 编写镜像单元测试。

| 切片 | 实际 red 证据 | 修订与 green 证据 |
| --- | --- | --- |
| 正式样板接入 | `red-whitebox-baseline.jpg`：原白模无法满足精修资产的外部视觉要求 | 十二个 GLB 通过实际页面加载；`castle-instanced-low-720.jpg` 显示当前主城、墙、树岩和真实建造 |
| 镜头下轮廓与标签 | `root-first-pair-review.md`：360 视口骷髅躯干/腿部过细，脚底标签遮住塔身；未捕获 attack，不作四动作声明 | 比例、55° 高俯角和前沿挂点修订；`root-atlas-pair-review.md` 实际 360/390/720/1366、15 个 44px 热区与真实屋顶/附件点击通过 |
| 材质与受支持阴影 | 第一版实际 5 骨架/1 箭塔帧为 195 calls / 95,556 triangles；PCFSoftShadowMap 有运行警告 | PBR atlas 保留分色/粗糙度/金属度/AO，改用 PCFShadowMap；第二版 4 骨架/1 塔/4 效果帧为 95 calls / 81,630 triangles、console 0 warning / 0 error；场景组成不同，不宣称同场景性能百分比 |
| 骨架眼窝形变 | 第二版在源审计中发现布尔切口新增顶点使用 neutral_bone，格式校验不能排除此形变缺陷 | 明确绑定 head 并重新导出，最终 14 joints、无 neutral_bone；`skull-weight-death.jpg` 保留真实倒地姿态，最终四动作另由完整样板运行取证 |
| 主城和环境 | `full-sample-low-720.jpg` 的主城大坡屋顶与木材厂接近，树冠偏宽；重复环境尚未合批 | `castle-instanced-low-720.jpg`：双尖顶石堡与木材厂轮廓区分，树冠变窄；墙/plot/树/岩以静态 InstancedMesh 合批 |
| 加载失败不推进 | 暂时移走自己构建目录的一个 GLB，`final-subpath-failed.jpg` 显示具体失败资源 | `final-subpath-failure-freeze.json` 的相隔约 26 秒采样保持 failed、step 0、五秒倒计时；最终 `final-built-failure.json` 再确认三层 inert，恢复原 SHA 后 `final-built-retry.json` 从 ready/step3/4.9秒采样至 step150/RUNNING，完整五秒没有被加载墙钟跳过 |

这些记录是浏览器视觉/行为切片，不声称每一列都来自新增 Vitest red 用例。最终完整样板流程、资产 SHA 和回归结果统一登记在 `docs/production/THREEJS_ISSUE_4_EVIDENCE.md`。恢复任务于 2026-10-09 执行 `npm run check` 125 / 125 通过及 `npm run build` 通过；已有规则与输入回归保留。

历史首对报告、SHA 和未完成项保留原事实。后续完成不得反写历史报告为已通过，也不得把本记录作为 #5/#13 项目所有者接受或实体设备性能证明。
