# ZCamp 开发交付：正式来源精修

最终工作树 C:/Users/Admin/.codex/worktrees/threejs-issue-13/ZCamp，分支 codex/threejs-issue-13，clean。

基线 c3310f8c085edb21078cc03c7af51ed43636c319。
- 实现提交 01b41a6：局部 revision 工具、八正式来源及对应 GLB、八条样板身份 metadata 与真实成本清单。
- 77616d125728191f73418dc309f72b301efe155b：补充保持根变换与共享 ORM/AO 的实读记录。制作人已以此固定技术范围发出两轴审查。
- 191273cff438e54461fa0e7b491a0df0aaa1056a：在固定 SHA 消息到达前已提交的纯证据/说明补充，仅十文件；代码、源、GLB、metadata 全与 776 同。制作人已获告知；之后不再新增提交。

候选：C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-source-refinement-v2-dist。
首版 product-source-refinement-dist 保留，制作人的 5361/session29459 服务由根管理；本开发任务未启动额外服务。v1/v2 三十三 GLB 均与当前源产物相同。v2 差异为压力页固定身份清单，八条更新、四条未精修记录逐值相同，既有行为与镜头未变。

制作：箭塔的可见厚弓手、冠饰、蓝金顶棚与石塔；木材厂的蓝屋顶、粗梁、前移实体钢锯与切木端面；主城的中央主堡、两座角楼、金檐、石拱入口与旗徽；骷髅的颅骨/眉骨、肩胸体积、衣甲/暖骨分层、粗护腕与靴。不是整体放大，不执行创建工厂；正式导出只读取这八件已保存源。

可重放工具 art/threejs/refine_product_sources.py：明列允许的八 stem、product_shape_revision=1 保护；第二次运行全跳过，八来源 SHA 不变。源保留 editable_modules、原生产骨架与四动作，再合并 UV 和烘焙 AO/PBR。其他 25 来源 + 25 GLB 全部与基线 SHA 相同。根/语义挂点变换不变，所有建筑占格在 1.8×1.55 内。骷髅脚底Y=0.00270与基线相同；14 joints的节点矩阵/inverse bind及四clip采样逐值相同，全部11,063导出顶点有归一权重。所有资产一材质/两PNG，AO与roughness/metallic为同贴图；箭塔1024 baseColor/512 ORM，其他五件512/512，均保持原8-bit RGB尺寸。官方Khronos八件0 errors/0 warnings，原完整报告保留。

成本：八件9,377,584→10,709,176 bytes，增1,331,592（14.20%）；99,906→103,394三角，增3,488（3.49%）。没有额外游戏灯光、后处理或网络素材；几何增量是冠饰/檐、实体锯齿/倒角/支座、门槛、衣甲/骨板/眉骨。烘焙与UV修改同时改变PNG压缩文件长度。不能用这些数宣称手机GPU预算通过。

检查原日志：product-source-refinement-check.log（169玩家行为/会话/坐标 + 4 HTTP pass）；product-source-refinement-build.log（首版59 modules pass）；metadata必要接入后product-source-refinement-v2-build.log（pass）；blender/export/replay同名前缀日志。纯几何未新造私有测试、采样或手机平台。后两个repo提交纯证据，不重复完整回归。

制作人固定游戏镜头实际观察本批接受：三档箭塔Lv1/3/5与木材厂Lv1/3/5经公开建造/升级可见；顶棚收缩后弓可见、粗梁/锯轮/主城层次改善；第二波15 live + 1短死亡模型的新骷髅头胸/衣甲可辨。截图采用明确标注arcane演示配置（600生命、无攻墙伤害、授予资源），不是25混编、正式战役胜利或性能证明。暂停标准→流畅→标准，公开actor+arcane逐项相等，warn/error[]。开发也读取实际 actors 图，证据已归档docs/production/evidence/product-source-refinement/，临时原件保持。

canonical docs/production/THREEJS_PRODUCT_SOURCE_REFINEMENT.md、局部资产/纹理/材质/根审计以及9份真实画面/操作/暂停记录都随提交。freeze全文件SHA见product-source-refinement-v2-dist-audit.json：46文件、33 GLB，与当前产物逐一相同；compiled metadata引用committed LF清单SHA 9351e9d14226d55f7be707ead297a3cfbe48b4a3fd147d110c37910aa4d74ce5。

未合入、未push、未改tracker；#5/#13人工接受与实体设备要求保留。根负责两轴审查、合入候选短复验、推送与最终接受。
