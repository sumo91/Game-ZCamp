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
