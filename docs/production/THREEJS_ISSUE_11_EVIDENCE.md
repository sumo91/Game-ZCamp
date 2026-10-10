# #11 默认 Three.js 游戏合入证据

固定审查基线 `30406353a7233c605c012ac1edeb098b8a609f63`；来源 `40685ce386f1e8ef31aefd7eb47e0e287443363b`，包含 ac41007 正常合入完整 #9/#10 产品。根起点 clean `c4d3230ccf277a35d3bf5d846cf1acfdaaf2dc49`，在 `codex/threejs-integration` 无冲突执行 `--no-ff`，merge／受验代码 SHA 为 `f51447c7f27d13439f24cc71b4fa6423ee5e812d`。两个 parents 为根起点与精确来源，完整来源历史保留。

默认入口现在挂载 ThreeGame 正式大厅与战斗。保留 Campaign 单会话、33 份正式资产、七建筑家族、七敌与三英雄、共享资源生命周期、输入优先级与原核心规则。Phaser 生产依赖、场景及入口已删除；纯 UI 回归迁移保留。未重构非阻断显示投影建议。

一次 `npm run check` exit 0：typecheck、23 files / 164 Vitest 与 4 HTTP 通过。一次 `npm run build -- --outDir C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-default-game-dist` exit 0，54 modules，无 Phaser chunk；保留 Three.js 大 chunk 与外部目录不自动清空提示。产物目录事先不存在；未覆盖根原 dist、来源 dist 或旧 phone 服务。完整区间检查发现来源提交的八处源/测试文件 EOF 多余空行，最终仅移除这些空白，语义与受验代码一致，未为纯空白和证据重复测试。完整审查基线与历史 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2` 到最终 HEAD 的 `git diff --check` 通过。src/tests/package 文件无 Phaser 引用；本次 source/GLB diff 为空，根旧 dist 27 文件 SHA/bytes 不变。未重新导出资产或重跑性能长测。

[作者交付原文](evidence/issue-11/author/delivery.md)对应固定来源的 5312 静态构建。实际四尺寸 360×640、390×844、720×1280、1440×900 共 60 次格位选取，目标至少 44px、都在场内，详见 [矩形和选取记录](evidence/issue-11/author/product-issue-11-size-qa.json)。普通 360 页面建造/成长/词条/改造与输入遮罩、静音记忆已实际操作。加载错误和重试在隔离的缺失 main_city 模型副本 5313 验证；恢复后真实开局仍有五秒，详见 [重试记录](evidence/issue-11/author/product-issue-11-loading-retry.json)和同目录 loading-error 截图。归档的败北及三关胜利截图均属于显式开发回放；[刷新记录](evidence/issue-11/author/product-issue-11-reload-qa.json)记录该回放合法结算后的公开大厅卡片，不冒充普通手动通关。

[根独立原记录](evidence/issue-11/root/review.md)对应同一精确来源的 5330 静态构建。普通 URL 实际进入首关，以真实玩家按钮建箭塔 40、木材厂 60，木材 123→23、实际模型出现在所选格位；战术暂停和 resize 后选择正确。390×844 的 15 个 44×44 热区无重叠；[热区记录](evidence/issue-11/root/product-default-slots-root-390.json)及同目录 lobby/battle 截图归档。

根随后明确打开 `?dev=campaign`，使用原 catalog、合法命令和固定步长完成真实 10/12/15 波结算，两轮解锁；返回普通 URL 刷新后保持六卡解锁及所选英雄/关卡，[公开卡片记录](evidence/issue-11/root/product-default-reloaded-cards-root.json)和三关 replay/reloaded 截图归档。该加速序列验证正式规则结果与持久化，**不能称普通手动实时通关**。独立 normal_game_qa 的 5331 普通按钮完整十波玩测仍 pending；本证据不预填该结果，#11 Issue 关闭须等独立记录。听感、真机、安全区硬件、最终预算与所有者人工接受亦未宣称通过。

同时补归档根 #9/#10 单独来源的 [真实 Boss / Hero 记录](evidence/campaign-batch/root-ui-review.md)及对应截图/公开 JSON；warning→charge、鼓舞、普通第二波失败与原开局重试只证明报告所列范围，不计作本候选完整手动通关。

## Standards

[独立原文报告](evidence/issue-11/standards-review.md)：0 hard breaches，1 非阻断 Duplicated Code（projectSlot/projectWall 屏幕投影转换重复），接受且本批未扩大重构。

## Spec

[独立原文报告](evidence/issue-11/spec-review.md)：0 实施缺陷，支持代码合入；正式完整手动胜负取证与 #5/#13 设备、所有者接受门保留。

30 份新增报告/截图/公开 JSON 的 [复制审计](evidence/issue-11/copy-audit.json)记录原件与副本 SHA/bytes。Spec 与作者交付仅 CRLF→LF；旧批次根报告清理 EOF 多余空行以通过 diff-check；其余副本逐字节相同，原件未改。两轴原文独立归档，不合并或重排。外部检查日志及 `product-issue-11-merge.md` 位于 `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/`。未操作 master/tracker/远端；未触浏览器或旧 phone 服务。
