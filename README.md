# 尸潮营地

TypeScript + Vite + Three.js 的竖屏塔防生存游戏。正式入口使用正交 3D 战场、风格化低模建筑与亡灵动画，以及 HTML/CSS 操作界面。

## 开始

```bash
npm ci
npm run dev
```

在大厅选择堡垒守望者、连弩卫士或采伐领主，挑战第一防线、裂谷尸潮与君王亲征；三关分别有 10、12、15 波，通关解锁后续关卡与英雄。玩家在 5×3 建造格内建造箭塔和木材厂，用木材升级、选择成长词条，并用金币将箭塔改造为连弩、火炮、寒霜或雷电塔。战术暂停期间可以规划防线。

## 检查与构建

```bash
npm run check   # 类型检查、核心/会话/表现行为测试及现有采集入口检查
npm run build
npm run preview
```

开发服务器从根路径提供游戏；构建预览使用 `/Game-ZCamp/` 子路径。画质和声音设置、战役进度保存在当前浏览器中。

## 结构

- `src/core`：平台无关的确定性模拟、内容目录、成长规则和战役进度模型。
- `src/core/battleSession.ts`：命令、固定步推进、事件交付、暂停与终局生命周期。
- `src/three`：正式 Three.js 战场、模型缓存、动画、攻击效果、大厅和战斗界面。
- `src/ui`：战役、建筑成长交互与反馈分类；`src/audio`：音效；`src/platform`：浏览器进度保存边界。
- `art/threejs/sources`：可编辑 Blender 来源；`public/assets/threejs`：33 件正式 GLB。制作与导出说明见 [资产说明](art/threejs/README.md)。

敌人、建筑、波次和升级通过 typed catalog 与验证定义，表现层只读取状态和事件。协作规范见 [制作组协议](docs/production/TEAM_PROTOCOL.md)，当前范围与交付状态见 [Three.js 交付计划](docs/production/THREEJS_DELIVERY_PLAN.md)。

## 开发入口

这些入口用于复现开发场景，默认地址仍进入正常大厅。

- `?dev=campaign`：明确标记的真实战役加速入口，通过合法建造、升级、词条和改造命令回放防守或失守。结果会写入这个浏览器的实际进度。
- `?dev=pressure&count=200&quality=standard&seconds=300`：持续战斗观察入口，支持 100/200/300 个活动单位与标准/低画质。页面明确说明用于维持数量的敌人生命和攻墙伤害调整，并记录运行数据。
- `?dev=demo&demo=siege`：攻城表现场景；`demo=arcane`、`demo=undead`、`demo=boss` 分别用于法术、亡灵和首领表现。各场景明确标记演示条件。

PR 与 master/codex 分支 push 运行 `.github/workflows/check.yml` 的检查和构建。GitHub Pages 仅通过 `deploy-pages.yml` 的手动 `workflow_dispatch` 发布。
