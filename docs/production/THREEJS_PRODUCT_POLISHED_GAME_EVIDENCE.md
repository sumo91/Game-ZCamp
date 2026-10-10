# 精修来源与炮击反馈完整游戏证据

基线 `c3310f8c085edb21078cc03c7af51ed43636c319`。炮击来源 `d2fcc75d1c39fc8460884ea60baa8c6ae14f7ed8`；八件正式模型的技术范围 `77616d125728191f73418dc309f72b301efe155b`，来源最终 `191273cff438e54461fa0e7b491a0df0aaa1056a` 仅在其后增加十文件证据，代码／源／GLB／metadata 不变。两轴原报告均 0 未解决发现后，根集成分支依次正常 `--no-ff` 合入，无冲突、无额外产品代码修改。

| merge | 第一 parent | 来源／第二 parent |
| --- | --- | --- |
| `4bb04a62a533f08318c5ba90216ecbb094d2ede4` | `c3310f8c085edb21078cc03c7af51ed43636c319` | `d2fcc75d1c39fc8460884ea60baa8c6ae14f7ed8` |
| `6d5dcf87fce4a5e0efe2afeeaa4259e511e29a23` | `4bb04a62a533f08318c5ba90216ecbb094d2ede4` | `191273cff438e54461fa0e7b491a0df0aaa1056a` |

**冻结游戏的代码 SHA 为 `6d5dcf87fce4a5e0efe2afeeaa4259e511e29a23`；本页与证据归档在其后的纯 docs 提交，不是新的受验代码。** `src/core`、tests、package 文件对基线 diff 为空。合入不改变规则、寻敌、伤害、事件端点、暂停时间或模型所有权。

炮弹使用深铁色核心、薄橙边及短暖橙尾迹，保留弧线；事件到达时即时产生紧凑橙色爆发与高对比扩散圈，连弩改为饱和金色。反馈由完成的模拟 delta 推进，过期／reset 释放每条临时材质，owner.dispose 释放共享几何。[炮击作者原报告](evidence/product-polished/cannon-author-delivery.md)保留其当时尚待实画／审查的阶段；随后真实接受见下文。

模型修改仅八件保存来源及对应 GLB：三档箭塔、三档木材厂、主城、骷髅步兵。箭塔弓手与蓝金顶棚、木厂粗梁／实体锯、主城主堡／角楼／金檐、骷髅头胸／衣甲比例直接进入正式游戏。局部修订工具读取已保存 `.blend`，白名单及 revision 防止重复叠加，不重新创建来源。根／语义锚点、占格、接地、14 joints／inverse bind／四动作采样保留；其他 25 来源与 25 GLB 未改。原 Khronos、纹理／PBR、清单及实画证据保持在 [来源原规范](THREEJS_PRODUCT_SOURCE_REFINEMENT.md)，本归档不改写它。[来源作者原报告](evidence/product-polished/source-author-delivery.md)记录八件下载增 1,331,592 bytes、三角增 3,488；这些成本不是最新 GPU 或手机预算通过。

一次必要集成 `npm run check` 通过 typecheck、25 files / 169 Vitest 与 4 项既有 HTTP 回归；一次新目录 build 通过，59 模块，既有大 chunk 提示保留。原 [check 日志](evidence/product-polished/integration-check.log)、[build 日志](evidence/product-polished/integration-build.log)及 [阶段验证](evidence/product-polished/integration-verification.json)归档。新冻结目录 `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-polished-game-dist`，46 文件完整 [SHA 审计](evidence/product-polished/frozen-dist-audit.json)固定上述代码。Phase 2 只有 docs，不重复代码测试或构建、不改写冻结游戏。

## 实际组合画面与付费流程

[制作人最终原报告](evidence/product-polished/root-review.md)固定根持有的 5363 静态生产预览（session 45814）。普通无 query、新 origin 从真实大厅 Start 进入第一防线，自然 125 木支付箭塔 40／木厂 60；自然获得 203 木后用 50／70 升箭塔至 Lv.3，实际选远射／急射，再用 10 金改造火炮，等级与合法词条保留。自然推进至第三波，墙／盾 100，console 为空。[普通开局](evidence/product-polished/data/product-polished-normal.jpg)、[改造前中档箭塔](evidence/product-polished/data/product-polished-normal-upgrade.jpg)、normal／transform／final JSON 保留原付费、词条和结果。这是新代码的短流程，不宣称新版完整通关，也不把旧胜利移作新版证据。

明确标注的 arcane 开发 fixture（600 HP、无攻墙伤害、授予资源）使用真实建造／改造／词条命令填满 15 格。箭塔／木厂 Lv.1／3／5、火炮 Lv.3 扩爆／燃烧、连弩 Lv.2 穿透、三档冰电与主城实际入战，操作保存在 [原 UI 记录](evidence/product-polished/data/product-polished-ui-actions.json)。第四波 [live-16](evidence/product-polished/data/product-polished-live-16.jpg)同时可见深色橙边弧线炮弹、清楚橙色扩散圈／爆发与冰圈；[live-00](evidence/product-polished/data/product-polished-live-00.jpg)保留金色箭和紫电，另留 live-29。建筑占格可读，弓手、木厂锯梁、主城层次和新骷髅头胸／护甲可辨，制作人明确接受本批组合画面。

最终暂停为 12 live／12 public actor，标准→流畅原 enemies 与 arcane 逐项相等，console 为空。[暂停比较](evidence/product-polished/data/product-polished-pause-comparison.json)、两份原始暂停 JSON 与 [流畅图](evidence/product-polished/data/product-polished-low.jpg)留存。瞬时视觉依据是实际画面，不以缓存或 effects 数量代替。实际前后图波次不同，不用作同一状态 pixel 差值；12 单位／开发 fixture 的局部接受不能扩称 25 混编、200 压力、正式战役性能、手机或所有者最终审美接受。

炮击来源固定 5362 的 [制作人原接受](evidence/product-polished/cannon-root-acceptance.md)及 frame audit、UI actions、两份暂停 JSON、流畅图另保留。仅选旧 frame-10、新 first-frame-00、frame-04／25：新 frame-25 清楚显示橙圈／爆发及金箭，frame-04 有小深色弹体与轨迹；燃烧、冰圈与紫电保持可读。它同样是明确开发 fixture 的公开付费流程，没有私有状态注入，也不是性能或真机接受。两轮旧短板至最终组合的实画补齐支持 #6 在合入推送后由根按真实交付关闭，本合入任务不操作 tracker。

## Standards

[独立原文](evidence/product-polished/standards-review.md)固定 A `c331...d2`、B `c331...776`、追加 `776...191`：0 明文违例、全部十二项 Fowler 启发式 0 实质发现。独立实读 Git bytes 确认八 blend／八 GLB 及 metadata 身份、其他 50 资产文件不变；GLB 根／锚点、PBR、权重与动作流合同保留。反馈释放、有效 delta 和所有权符合项目边界，未提出装饰性重构。

## Spec

[独立原文](evidence/product-polished/spec-review.md)同一三范围 findings 0，并保留 [独立原审计](evidence/product-polished/spec-independent-audit.json)。伤害不等待弹道、锚点与实际目标保留；厚实轮廓由局部来源修订实现，数据／资产证据准确标注 fixture 和实际数量。审查本身没有执行长测或代替浏览器／人工终门。

[复制 SHA 审计](evidence/product-polished/copy-audit.json)记录 34 份工作区原件副本全部逐字节一致、无文本改写，外部原件及先前归档来源证据不变。只归档最终组合三帧、炮击／旧基线四帧及必要 UI／暂停记录，没有复制全部 34／44／28 帧；原 frame audit 的临时绝对路径照录，其毫秒数是截图序列时间，不能当 GPU／帧性能。作者与 Phase 1 报告中的 then-pending 状态照原文保存，最终接受由本页和制作人原报告说明。未新增 attributes、更改 Git 换行配置或建立测试／采集平台。

5363 新版本及旧 5360／5361／5362、既有用户预览和手机服务均由根保留；合入任务未启动／修改服务或操作浏览器。正常推送仅授权 `codex/threejs-issue-6`、`codex/threejs-issue-13` 与 `codex/threejs-integration`，实际远端必须逐项精确核对，不以本地提交代替成功同步。#5／#12／#13 完整美术、新组合性能、实体手机和所有者明确接受仍保留，#1／Goal／master 最终交付未完成；不 force、不合 master、不发布。
