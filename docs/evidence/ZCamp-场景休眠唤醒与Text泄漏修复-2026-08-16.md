# 场景休眠唤醒与 Text 泄漏修复验收 · 2026-08-16

## 现象与根因

项目所有者反馈"某组合开始游戏时卡死"。实证定位（与英雄/关卡组合无关，实际触发条件是**同页面的第二局战斗**）：

1. **卡死**：旧流程大厅↔战斗使用 `scene.start` 互相重启。Phaser 4.2.1 在场景 stop/start 循环中会破坏复用画布池的新建 Text 纹理（实测：坏 Text 的 `frame.source = null`、纹理键已从管理器移除、`drawImage/glTexture` 抛 TypeError，渲染循环中断，画面冻结在开局）。
2. **泄漏**：敌人名字标签按 enemy.id 池化，敌人死亡后仅 `setVisible(false)` 永不销毁——每个生成的敌人永久遗留一个隐藏 Text 及其画布纹理（30 倍演示局 15 秒即累积至 919 个存活 Text / 956 个纹理，持续增长）。

## 修复

- **休眠/唤醒生命周期**（`GameScene`/`LobbyScene`）：场景每页只创建一次，切换改用 `scene.switch(key, data)`——大厅↔战斗互相睡眠/唤醒；`GameScene` 监听 `WAKE` 事件以携带的启动参数重新装配战斗（`launchBattle`：解析配置、新建模拟、重置 UI，`init` 首启与唤醒共用）；`LobbyScene` 在 `WAKE` 时按最新通关进度刷新卡组。系统暂停的窗口监听加 `scene.isActive()` 守卫，睡眠场景不再响应。再战（`restartSimulation`）本就不重启场景，保持不变。
- **敌人标签真释放**：不在场的敌人标签改为 `destroy()` 并从 Map 删除（enemy.id 每次生成唯一，池化无复用价值）。
- `main.ts` 增加 DEV-only `window.__zcampGame` 句柄用于实机取证。

## 验证（renderer = AUTO/WebGL，`?stage4-demo=1` 30 倍速取证）

- `npm run check` 全绿（110/110）。
- **三局连续循环**（同页不刷新）：第 1 局第一防线 → 胜利 → 返回营地（GameScene sleeping / LobbyScene active，大厅解锁态刷新：L2 锁形消失）→ 第 2 局裂谷尸潮（默认选中新关卡，建造/选择/升级/词条弹窗全部正常）→ 胜利 → 第 3 局君王亲征正常启动。全程 `pageerror` 为 0（修复前第 2 局 create 即抛 `drawImage null`）。
- **泄漏压测**：30 倍速战斗 15 秒（24 个在场敌人、持续击杀）后纹理 124、存活 Text 87，数值稳定不再增长（修复前同期 919/956 且持续攀升）。
- 睡眠期间窗口失焦不再触发系统暂停；控制台仅历史 favicon 404。

## 证据截图

- `zcamp-scene-wake-cycle2.png`：第 2 局（裂谷尸潮）运行中。
- `zcamp-scene-wake-cycle3.png`：第 3 局（君王亲征）运行中。

## 遗留说明

- Phaser 4.2.1 为当前最新发布版（无 4.2.2+ 可升级）；场景 stop/start 的纹理破坏与此前记录的 Graphics 路径填充缺陷同属该版本引擎问题，本项目已分别以休眠唤醒与图元管线完全绕开。
- 旧标签池行为在线上从未积压到此规模，但长局+高波次会显著累积，本修复同时消除了每帧遍历隐藏 Text 的开销。
