# 尸潮营地

Phaser 4 + TypeScript + Vite 的竖屏塔防生存 MVP。

## 开始

```bash
npm install
npm run dev
```

游戏以 720×1280 为逻辑设计分辨率：大厅从 3 名英雄 × 3 个关卡中选择出战组合（营地守望者/机枪老兵/伐木大亨 × 第一防线/裂谷尸潮/君王亲征），通关解锁下一关卡与新英雄；波次尸潮自上而下冲击城墙，玩家在 5×3 建造格内建造/升级箭塔与木材厂，用金币改造特殊塔（机枪/火炮/寒霜/电磁），升级触发词条抉择，战术暂停期间可自由规划。

## 检查

```bash
npm run check   # 类型检查 + 110 项单元测试
npm run build
```

## 结构

- `src/core` — 确定性核心模拟（平台无关，同一输入同一结果）
- `src/phaser` — 表现层：场景、布局契约、图元化美术、程序化音效与反馈特效
- 建筑成长内容走数据定义（typed catalog + validation），不在场景逻辑中散落
- 协作规范见 `docs/production/TEAM_PROTOCOL.md`，设计事实源与验收证据见 `docs/`

## 调试

- `?seed=123` 固定随机种子
- `?stage4-demo=1` 演示模式（30 倍速 + 无敌城墙，用于快速取证后期波次）

## 已知引擎问题

Phaser 4.2.1 的 Graphics 路径填充（fillTriangle/fillPoints）在本项目环境下不渲染；全部可见美术已迁移为矩形/圆/线条图元组合，路径填充在渲染代码中已清零（记录见 `docs/evidence/ZCamp-浮窗图标渲染修复验收-2026-08-16.md`）。
