# ZCamp 主战场高保真概念稿 v3：生成记录

> 工具：内置 `image_gen`  
> 用例：`ui-mockup` / `stylized-concept`  
> 日期：2026-08-11  
> 状态：当前视觉样板【2026-08-11 已确认】

## 本轮目标

1. 在不走写实、暗黑路线的前提下，将 v2.1 的低幼、廉价卡通感提升为高品质休闲 3D；
2. 把防守区重建为严格可数的 5 列×3 行刚性棋盘；
3. 所有建筑使用统一占地规则，底座、锚点和接触阴影都位于单格中心。

## 参考图职责

1. v2.1：编辑底稿，锁定敌区、城墙、格区、资源轨道和四卡的纵向骨架；
2. v1：只参考厚实造型、材质层次和接触感，不继承暗度、写实度或墙体炮位；
3. 《皇室战争》实机图：只参考商业化完成度、倒角、高光、剪影、间距和层级纪律；
4. 用户提供的僵尸防守参考：只参考轻休闲语气、尸潮可读性和暖冷危险对比。

## 核心提示词摘要

```text
Re-render the approved ZCamp layout as a commercially competitive premium stylized casual 3D mobile battle screen. Use chunky sculpted silhouettes, refined hand-painted gradients, purposeful bevels, controlled roughness/specular separation, soft ambient occlusion, crisp contact shadows and selective saturated accents. Keep the scene bright, readable and playful; avoid realism, grimdark, primitive low-poly forms, flat children's-cartoon rendering and generic mobile-ad illustration.

Construct the defense area as one rigid board on one shared near-orthographic three-quarter plane. Subdivide it into exactly five equal columns and exactly three equal rows. All 15 cells are identical clones of one master cell. Four vertical separators and two horizontal separators run straight and uninterrupted across the complete board. No staggered, warped, enlarged, narrow, tall or clipped cells.

Center the machine-gun, cannon, freeze and electromagnetic towers in row 1 columns 1–4; the main camp in row 1 column 5; a support tent in row 2 column 5; a lumber camp in row 3 column 1. Every base uses at most 68% of a cell and its contact shadow remains inside that cell. Leave all other cells empty.

Preserve the large enemy field, thin weapon-free palisade, wall-embedded 78% HP, full-width wood rail with 120, four equal cards with log-icon costs 40/65/55/85, compact top HUD and absence of a start-wave button.
```

## 几何验收口径

- 肉眼可以一次数清 5 列×3 行，共 15 格；
- 每一列的中心线贯通三行，每一行的中心线贯通五列；
- 同行同列没有错位、扩格、缩格或独立透视；
- 建筑底座不压线、不跨格、不悬空，空格保持完整；
- 概念图中的透视只服务体积感，不改变格位的逻辑尺寸。

## 交付文件

- `zcamp-battle-screen-hifi-v3-master.png`：生成母版；
- `zcamp-battle-screen-hifi-v3-720x1280.png`：项目逻辑画布预览。
