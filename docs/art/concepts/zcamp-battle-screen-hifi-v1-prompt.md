# ZCamp 主战场高保真概念稿 v1：生成记录

> 工具：内置 `image_gen`  
> 用例：`ui-mockup`  
> 日期：2026-08-11

## 参考图职责

1. 方案 H PNG：约束纵向结构、尸潮占比、薄城墙、5×3 和底部四卡；
2. 用户僵尸防守参考图：只参考尸潮压迫感、卡通轮廓与冷暖攻守关系；
3. 用户《皇室战争》截图：只参考战场优先、安静地表、信息贴物和固定底栏，不复制 PvP 镜像、河流、桥或第二套手牌。

## 最终合成提示词

```text
Use case: ui-mockup
Asset type: high-fidelity in-game battle screen concept for the portrait mobile game ZCamp

Create a polished, believable 9:16 mobile strategy game screenshot of a tiny survivor camp defending against a huge zombie horde at night. Use a stylized miniature diorama treatment with chunky readable silhouettes, hand-painted 3D-like materials and shippable casual-game UI quality; not flat wireframe, photorealistic or pixel art.

The vertical composition is binding: approximately 58-63% of the full screen is a cold dark zombie threat field; a thin fortified wall occupies only 5-7%; directly below it is a compact but complete EXACT 5 columns by 3 rows build area, exactly 15 clearly countable slots occupying about 18-22%; the bottom 15-17% is a fixed dashboard with EXACTLY four vertical tower cards. The player's camp must feel small and vulnerable. Keep the main combat and VFX above the wall.

The threat field is a low-saturation blue-green forest road with fog, subtle tracks, cracked earth and sparse debris. Dense trees, wrecks and abandoned objects frame the edges; the central path remains quiet and readable. Dozens of small gray-green zombies advance from the distant top, with a few larger armored enemies and one red-marked elite. The nearest zombies approach the wall. Restrained yellow muzzle flashes, one orange shell burst, cyan frost and a short violet-white electric arc remain readable without covering UI.

The grid reads as an integrated fortified yard of worn metal plates, timber frames, sandbags and foundations, not a spreadsheet. Several slots contain miniature defenses or camp utilities; empty foundations remain low contrast. Buildings may overlap their own foundation slightly but may not hide the 15-slot count.

Minimal HUD only: top-left gold coin plus "35"; top-center "8/20" and small remaining-enemy number "46"; small pause icon top-right. Wall health is attached to the wall. Bottom resource is a recognizable warm-brown cut wood-log icon plus "120". No duplicated wood resource, no resource capacity bar.

Bottom cards are ordered machine-gun, cannon, freeze, electromagnetic. All share one neutral dark metal-and-wood shell, with large centered tower art. Upper-left round cost badges read "40", "65", "55", "85". Chinese labels appear verbatim: "机枪塔", "火炮塔", "冰冻塔", "电磁塔". The selected first card rises slightly with a warm-white outer outline and restrained yellow inner glow. All complete rounded card shells and text remain within the canvas with a visible bottom safe margin.

Lighting: cold moonlit threat field versus localized warm amber wall lamps and camp windows. Use 65-75% cold dark neutrals, 15-20% warm camp light and under 15% saturated functional VFX. Materials are matte worn metal, dark timber, sandbags, canvas and damp road.

Avoid: giant castle or city, wrong grid dimensions, towers along the sides of the enemy field, second player's cards, mirrored PvP layout, river, bridges, free deployment, start-wave button, next-card preview, purple elixir or segmented resource bar, oversized HUD panels, rainbow card frames, tutorial hand, heavy gore, tiny clutter, extra text, logos, trademarks or watermark.
```

## 定向迭代

1. 首稿只修正纵向比例：向下延展尸潮区，把城墙移动到约 60% 屏高，同时压缩营地和底栏；保持美术风格不变。
2. 第二稿只修正底部安全区：缩小并上移四卡，保证卡壳与文字完整；把木材数值旁的圆形占位替换为木段图标；保持战场、城墙和 5×3 不变。
