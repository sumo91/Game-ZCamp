# #3 TDD 日志

所有命令在独立工作树执行。以下失败摘要来自实际 red 阶段工具输出，没有在绿色实现后重新构造失败状态。测试边界由父规格预先确认；不对 Three.js 私有方法建立镜像测试。

| 时间（工具本地输出） | 切片与 red | green |
| --- | --- | --- |
| 03:50:04 | 两种真实建造与单次结算：`Cannot find module '../../src/ui/growthUi'`；1 suite failed，未收集测试。新界面中性边界尚不存在。 | 03:50:38：共享模块提取、旧包装兼容、选择/建造语义接入；2 suites / 11 tests passed（1 新 + 10 原 UI）。 |
| 03:51:06 | 升级/强制局部词条/战术暂停恢复：`expected undefined to be 'upgrade_building'`；1 failed / 1 passed。 | 03:51:54：2 tests passed。自然资金 fixture 从 750 调整为 900 固定步：前 5 秒倒计时没有木材推进，避免把临界浮点余额当成足够升级。未改核心收益或费用。 |
| 03:52:24 | 四路改造及无钱查看：预期 transformOpen=true、reason=""，实际 `格位已占用` 与 false；4 failed / 2 passed。 | 03:52:47：6 tests passed。每条路用真实升级/词条后自然击杀赚取金币，10 金币扣费、身份/格位/等级/词条保持。 |
| 03:53:12 | 拆除确认/取消/零返还：预期 `请先确认拆除当前建筑`，实际 `格位已占用`；1 failed / 6 passed。 | 03:53:30：7 tests passed。换格清确认、主城禁止拆除、取消不派发命令、确认删除且零返还。 |
| 03:54:12 | 暂停/重启/系统暂停/改造优先级：预期 `{type:'pause'}`，实际 null；1 failed / 7 passed。 | 03:54:33：8 tests passed。真实最终失败阶段允许 restart，其余层级阻断下层动作；系统返回保留打开的改造。 |
| 浏览器截图时间见文件 | 初始 Stage A 只提供箭塔建造，`red-only-arrow-choice.jpg`；后续真实建造双击第二次 click 意外升级，`red-build-doubleclick-upgrades.jpg`。 | 完整 HTML 接入后 `green-build-doubleclick-360.jpg`：只扣 40、Lv.1，一条建造；独立升级、词条双击和完整拆除流程随后通过。 |
| 04:12:03 | 首波草案 HUD：`deriveGrowthWaveTime is not a function`；1 failed / 8 passed。浏览器先真实复现 TRAIT_DRAFT 显示“下一波 60 秒”。 | 04:12:24：2 suites / 19 tests passed。首波直接草案及其系统暂停显示“首波 5 秒”，选择恢复 OPENING_COUNTDOWN；红/绿截图保留。 |
| 浏览器截图时间见文件 | 1366×768 下相邻 64px 热区出现 12 对横向重叠，`red-wide-slot-overlap.jpg`。 | 高度条件修正后 44px 热区无重叠，`layouts-other-sizes.json` / `green-wide-no-overlap.jpg`；720×1280 保留大标签并逐格点击通过。 |

04:15:35 最终回归：`npm run check`，15 test files passed / 125 tests passed；`npm run build` 通过。没有提交失败的中间实现。

环境准备：初次新工作树没有安装 node_modules，`vitest is not recognized` 不算 red；先执行 `npm ci`，lockfile 未修改，再观察上表第一条行为失败。

## 审查后提示期限修复

公开浏览器玩家边界继续作为本切片的测试入口，没有为局部 deadline 或私有渲染函数增加镜像测试。实施代理本回合浏览器断开，库存 apps=[] / browsers=[]，根会话恢复浏览器后代跑实际 red；红证据取得后才修改源码。

- Red：固定提交 `800c240` 中，战术暂停、箭塔 40 + 木材厂 60、木材 20；点击箭塔升级得到“还差 30 木材”，等待 21818ms 后仍显示，TACTICAL_PAUSE 未变化。见 `root-red-persistent-notice.json` / `.jpg`。
- 最小实现：只在 WhiteboxPreview 增加 1.5 秒真实时间 deadline，由既有 RAF 清理；系统暂停与结算清除旧提示，永久费用/差额详情保留。
- Green：根浏览器同一暂停路径初始差 30 可见，后续 status 为空，详情仍保留差 30、阶段 TACTICAL_PAUSE。`root-green-notice-time.json` 的 1325ms 没有记录点击起点，不能当作完整点击有效期。零金币点击炮塔的初始 modal status 差 10；从 click action 开始 1622ms 后为空，四路永久差额各 10、命令记录仅 pause + 2 build，无付费命令，error=[]。初始/到期截图及两个 `root-green-*-time.json` 保留。根 viewport 已 reset，临时页关闭。
- 10:54:14 自动回归：`npm run check`，15 files / 125 tests passed；`npm run build` 和 `git diff --check` 通过。构建仍仅有既有 chunk 体积警告。
