# 尸潮营地

TypeScript + Vite 的竖屏塔防生存 MVP。默认入口使用 Phaser 4，共享战斗会话同时支持 Three.js 开发白模预览。

## 开始

```bash
npm ci
npm run dev
```

游戏以 720×1280 为逻辑设计分辨率：大厅从 3 名英雄 × 3 个关卡中选择出战组合（营地守望者/机枪老兵/伐木大亨 × 第一防线/裂谷尸潮/君王亲征），通关解锁下一关卡与新英雄；波次尸潮自上而下冲击城墙，玩家在 5×3 建造格内建造/升级箭塔与木材厂，用金币改造特殊塔（机枪/火炮/寒霜/电磁），升级触发词条抉择，战术暂停期间可自由规划。

## 检查

```bash
npm run check   # 类型检查 + 核心、会话及显示数据测试
npm run build
```

## 结构

- `src/core` — 确定性核心模拟（平台无关，同一输入同一结果）
- `src/core/battleSession.ts` — 两个入口共用的命令、固定步推进、事件交付及会话生命周期
- `src/phaser` — 表现层：场景、布局契约、图元化美术、程序化音效与反馈特效
- `src/three` — 独立 Three.js 白模预览：正交战场、格位选取、事件表现与 HTML/CSS 界面
- 建筑成长内容走数据定义（typed catalog + validation），不在场景逻辑中散落
- 协作规范见 `docs/production/TEAM_PROTOCOL.md`，设计事实源与验收证据见 `docs/`

## 调试

- `?preview=threejs` 进入明确标记的 Three.js 开发白模，固定种子 1337、营地守望者与第一防线。空格可建造箭塔，支持战术/系统暂停；完整成长 UI 和精修资产分别由 #3/#4 交付。
- `?seed=123` 固定随机种子
- `?stage4-demo=1` 演示模式（30 倍速 + 无敌城墙，用于快速取证后期波次）

PR 与 master/codex 分支 push 运行 `.github/workflows/check.yml` 的检查和构建。GitHub Pages 仅由 `deploy-pages.yml` 的手动 `workflow_dispatch` 发布，合入不会自动发布网站。

白模复现与截图见 [Issue #2 验收记录](docs/evidence/Threejs-Issue-2-验收-2026-10-09.md)。

## 已知引擎问题

Phaser 4.2.1 的 Graphics 路径填充（fillTriangle/fillPoints）在本项目环境下不渲染；全部可见美术已迁移为矩形/圆/线条图元组合，路径填充在渲染代码中已清零（记录见 `docs/evidence/ZCamp-浮窗图标渲染修复验收-2026-08-16.md`）。
