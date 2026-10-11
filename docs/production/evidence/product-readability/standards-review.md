## Standards

固定共同基线：`e7c8eede157a8639dc11cd113f028049b3a691e5`。最终三个三点 diff：

- 至 `06ebdb75ec0c45974a11692531753a97c8f39edf`：siegeFeedback.ts，0 未解决发现。
- 至 `3811111d6c7abc12f6856103b8dc97e6fbb296c0`：arcaneFeedback.ts，0 未解决发现。
- 至 `215fbd9a1a04fdd0f85d7034ff2ec3ff9428f9b4`：BattleScenery.ts / Battlefield.ts，0 未解决发现。

另外专门复查 `7308ed4bff23f9c1af17713f7ed9baa81e0e42e3...215fbd9a1a04fdd0f85d7034ff2ec3ff9428f9b4`；后者直接 parent 为前者，只改火盆合批。

**原 P3 已解决，保留发现来源。** 初审 `7308ed4` 的 `BattleScenery.ts:117–128` 使用 `for (const x of [-5.28, 5.28])` 与 `new Mesh(geometry, material)` 重复绘制四种静态火盆部件，偏离 `docs/specs/ZCamp-Threejs-3D-lowpoly-spec.md:145` 的“静态重复场景元素按几何与材质进行实例化”。`215fbd9` 改为四个 count=2 的 InstancedMesh。平移矩阵仍为 x=±5.28、原部件 y、z=.07；原 geometry/material、默认阴影标志和 decorations 所属不变。显式更新 instanceMatrix 并计算包围球；原 dispose 遍历会释放新增实例缓冲，资源未转移给 GLB 库。

其余边界复查无新增违约：拖尾、扩散环及链电独占临时材质，过期/reset 均释放，共享几何保留至 owner.dispose；渐隐/弹道仍由完成的模拟 delta 驱动，冻结不推进。BattleScenery 独占纹理/材质/几何；低档仅隐藏装饰，地面与路径保留。paths/stones/tree/rocks/lights 均已静态合批。setQuality 同时调整 shadowMap.enabled 与 sun.castShadow，销毁仍释放阴影资源。core 与资产未改变。

**最终明文规范未解决项：0；实质性 Fowler 异味：0。** 已覆盖全部 12 项启发式，不建议装饰性重构。

仅只读代码审查及外部报告更新，未运行长测、未改代码/仓库/tracker。根任务报告 5359 v2 标准→流畅→标准的 HUD、十五格与地面保持，残影消失；整体视觉与设备接受仍由根任务判断，代码检查不等于视觉 pass。
