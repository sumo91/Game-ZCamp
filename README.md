# 尸潮营地

Phaser 4 + TypeScript + Vite 的竖屏塔防生存 MVP。

## 开始

```bash
npm install
npm run dev
```

游戏以 720×1280 为逻辑设计分辨率，当前框架包含确定性核心模拟、基础状态机、内容注册表和 Phaser 启动画面。

## 检查

```bash
npm run check
npm run build
```

核心规则位于 `src/core`，表现层位于 `src/phaser`。可以通过 `?seed=123` 为本地调试指定随机种子。
