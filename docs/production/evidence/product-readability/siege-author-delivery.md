# #6 攻击可读性候选

角色：开发；范围：只完成连弩与火炮的玩家可见反馈。未操作 tracker、master、手机服务或测试平台。

基线：e7c8eede157a8639dc11cd113f028049b3a691e5。
候选：06ebdb75ec0c45974a11692531753a97c8f39edf。
工作树：C:/Users/Admin/.codex/worktrees/threejs-issue-6/ZCamp。
分支：codex/threejs-issue-6。
修改：仅 src/three/siegeFeedback.ts，39 additions / 24 deletions。
提交：fix: clarify bolt trails and cannon impact feedback (#6)。

## 玩家行为与表现

- 连弩有较长的金白色箭身与细橙金尾迹，主弹道 0.20 秒、真实穿透目标间弹道 0.16 秒。穿透仍只响应 core tower_special 的实际目标。
- 炮弹稍大、有短尾迹，0.34 秒沿抛物线飞行；高度 0.95 世界单位，尾迹朝向跟随轨迹切线。
- 核心伤害仍在事件到达前结算。炮击事件立即产生橙色地环与紧凑冲击亮点，地环 0.42 秒扩散并渐隐；不等待炮弹到达再扣血，也不生成新的溅射对象。
- 现有燃烧锥体未改。只有有效 burn 状态且来源建筑仍活动才保留火焰。
- 每条端点从事件锚点复制；目标移动、死亡、移除后不重新追踪。暂停时 advance 的 delta 为零，尾迹、轨迹、地环不推进；移除、reset 与 dispose 都释放每条临时透明材质，几何及不变材质共享。
- 无 src/core、arcaneFeedback、coordinates、Battlefield、资产、演示准备或依赖修改。

## 验证

沿用已确认 GameCommand / GameState / GameEvent、高层 BattleSession 与浏览器玩家流程 seam。不新建私有几何或材质数量测试。视觉 red 来源为根提供的 e7c8eed 真实运行截图 product-effects-fixed-active.jpg：该瞬间没有可辨弩矢或抛物线炮弹；旧显示分别 0.12 / 0.10 / 0.22 / 0.26 秒。截图只说明该瞬间可读性缺口，不能证明从未产生攻击；完整玩家镜头 green 由根独立看本候选。

npm run check：通过 typecheck、25 files / 169 Vitest 与 4 HTTP 用例。含 siegeReplay 的真实付费改造、三档成长、混合攻击/穿透/燃烧、暂停冻结，原特殊塔、核心伤害、成长、BattleSession 确定性和完整关卡回归。

npm run build -- --outDir C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-siege-readability-dist：通过，58 modules。Vite 仅提示已有大 chunk 与外部 outDir 不自动清空。

git diff --check：通过；工作区 clean。报告前 git merge --ff-only codex/threejs-integration 返回 Already up to date，集成尖端仍为 e7c8eed。

## 固定生产候选入口

Frozen build：C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-siege-readability-dist。
正式大厅：http://127.0.0.1:5356/Game-ZCamp/
三档实战演示：http://127.0.0.1:5356/Game-ZCamp/?preview=threejs&demo=siege
实际混编持续攻击：http://127.0.0.1:5356/Game-ZCamp/?dev=pressure&count=100&quality=standard&seconds=15

预览 exec session 9248；5356 / strictPort / 127.0.0.1。入口 GET 已返回 200；根尚未进行本次浏览器视觉验收。既有 siegeDemo 通过正常 BattleSession 赚取资源并执行真实命令，三档结束时为战术暂停；继续战斗可见真实后续波次。pressure 为原有明确开发入口，其高 HP、零攻墙伤害仅为维持数量条件，不能当正式关卡或真机通过。

未触碰 5344、5332、5333、4194、4195。5356 服务保留供根实际画面复验，构建不再原地改写。

## 限度

本候选只改善攻击表现，并非 #5 / #13 最终美术、手机性能或所有者接受。未新增或重跑性能长测；多一条细尾迹会增加每个活动弹道的一次绘制和一个短寿命透明材质，需要最终 #12 候选复测。高密度下不应以 effects 总数替代弧线、穿透和爆炸实际辨识；正式关闭 #6 前仍需要根截图、遮挡检查与独立审查。
