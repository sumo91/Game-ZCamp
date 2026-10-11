# 连弩与火炮来源

Issue #6 的六件原创建筑采用既有石木蓝金材质与同一占格尺寸。连弩以宽弓臂、弩箭导轨、绕弦轮与弹匣识别；火炮以开放炮口、炮耳支架、回转台和炮弹架识别。Lv.1–2 / Lv.3–4 / Lv.5 映射低、中、高三档；中档加固侧板与金带，高档双旗与上层机构。

可编辑文件：`sources/ballista_tower_{low,medium,high}.blend` 和 `sources/cannon_tower_{low,medium,high}.blend`。运行产物在 `public/assets/threejs/`，同名 GLB。来源保存 `editable_modules`、已展开 UV 的 runtime surface、512×512 baseColor 与 ORM/AO，运行单材质。三处语义锚点为 `attack_anchor`、`hit_anchor` 和统一前沿 `label_anchor`；机构朝向源 +Y / GLB -Z 威胁区。开火、短弩箭、抛物线炮弹和状态火焰由核心事件与实际燃烧状态驱动，不参与伤害计算。

首次制作仅运行 `create_siege_sources.py`，脚本拒绝覆盖现存来源。此次制作后以 `refine_sources.py --` 显式列出六个新 stem 烘焙图集，再用 `export_assets.py --` 同样列出六个 stem 从保存来源导出；旧十二件来源与产物不重建。后续美术编辑直接保存 `.blend` 再导出。

实际容器与统计见 `docs/production/evidence/issue-6/asset-manifest.json`。格式与静态三角数不构成运行美术或真机性能接受。独立运行镜头由根任务验收。
