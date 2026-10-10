# 正式来源精修：箭塔、木材厂、主城与骷髅

基线 c3310f8c085edb21078cc03c7af51ed43636c319，任务分支 codex/threejs-issue-13。此批改善 #5 / #13 的正式候选美术，不关闭任何人工接受节点。

精修工具直接打开保存的八件来源，不调用 create 入口。箭塔压低石缝噪声、缩短顶棚并向后收，使厚头盔、肩甲和长弓露出；三档加固基座、金撑和双旗保留。木材厂加厚木梁、提亮蓝顶，把钢锯和支座移到屋檐外的前侧，增加锯齿实体厚度并强化暖木端面；三档储木架、檐饰、行会牌与旗保留。主城强化中央主堡和两座角楼的蓝顶厚度、金檐与入口，旗徽上移以露出石拱门。骷髅扩大颅骨、肩甲、胸腔、靴和护腕，保留温暖骨色与紫灰衣甲，增加低面数眉骨和胸前骨板。

所有建筑底座原点、语义挂点、根变换与基线一致；最大包围盒均在 1.8 × 1.55 米占格内。骷髅脚底 Y=0.00270 米，与基线相同；14 关节及其变换、inverse bind、walk/attack/hit/death 四动作采样全部逐值相同，导出 11,063 顶点全部权重归一。全批仍为一 PBR 材质、两张内嵌 PNG；保留现有贴图分辨率（[PNG 尺寸比对](./evidence/product-source-refinement/texture-size-audit.json)），不添加网络资源或游戏灯光。其他 25 件来源与 GLB 共 50 个文件的 SHA 保持一致。比较见 [本批资产清单](./evidence/product-source-refinement/asset-manifest.json)。

八件 GLB 合计从 9,377,584 增至 10,709,176 bytes（+1,331,592，约 14.20%），从 99,906 增至 103,394 三角（+3,488，约 3.49%）。几何增量来自箭塔冠饰/金檐、木材厂锯齿的侧面与倒角及支座、主城檐带/门槛、骷髅胸甲/骨板/眉骨，没有统一细分。PNG 仍为原尺寸，文件增量同时包含重新展开、重新烘焙后的图集编码。文件大小与单件三角数不代表场景 GPU 时间或手机预算。

验证：既有 `npm run check` 的 169 个玩家行为/会话/坐标测试与 4 个 HTTP 收件测试通过；新目录 build 通过。官方 Khronos 校验八件均 0 errors、0 warnings（[原报告](./evidence/product-source-refinement/khronos-validation.json)）。重复执行 revision 工具跳过全部八件，来源 SHA 不变。纯几何变更未增加私有镜像测试。总制作人在真实固定游戏镜头下接受本批产品画面：缩收顶棚后弓手与弓可见，锯轮、粗梁、主城层次改善，骷髅头胸与衣甲更清楚。[基线图](./evidence/product-source-refinement/product-source-before.jpg)、[三档建造升级图](./evidence/product-source-refinement/product-source-after-tiers.jpg)、[运行演员图](./evidence/product-source-refinement/product-source-after-actors.jpg)及操作记录已附。该运行图来自明确标注的 arcane 演示配置：600 生命、无攻墙伤害、授予资源；实际第二波 15 活单位与 1 个短暂死亡模型，不能宣称 25 混编或正式战役性能通过。暂停标准→流畅→标准时，公开 actor/arcane 状态逐项相同、无 warn/error，原记录和[流畅图](./evidence/product-source-refinement/product-source-after-low.jpg)随附。v1/v2 模型同 SHA；完整集成候选仍须短复验。以上格式和制作人观察不替代所有者与实体手机接受。

```powershell
& 'D:/Apps/Blender/blender.exe' --background --python-exit-code 1 --python art/threejs/refine_product_sources.py -- arrow_tower_low arrow_tower_medium arrow_tower_high lumberyard_low lumberyard_medium lumberyard_high main_city skeleton_infantry
& 'D:/Apps/Blender/blender.exe' --background --python-exit-code 1 --python art/threejs/export_assets.py -- arrow_tower_low arrow_tower_medium arrow_tower_high lumberyard_low lumberyard_medium lumberyard_high main_city skeleton_infantry
```

首版冻结候选 `product-source-refinement-dist` 与身份清单修正后的 `product-source-refinement-v2-dist` 在临时交付目录，仅供合入前固定镜头审阅。v2 八件 GLB 与 v1 同 SHA；运行十二样板身份清单仅更新本批八条和 provenance，四条未精修样板保持。v2 的构建含此必要接入通过，未覆盖首版。核心规则、存档、布局、镜头、资产语义映射、其他来源工厂与原历史清单保持；#5/#13 的所有者及实体设备接受要求保留。
