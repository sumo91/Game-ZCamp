# Three.js #9 / #10 集成证据

固定审查基线 `63773aa38286a260c67781eb7da5e622c7f3dfbe`；根合入前为 clean `49bb5a636bf0a31a0c676b4a0ce121634299a0cb`，分支 `codex/threejs-integration`。按 #9 → #10 执行普通 `--no-ff`，来源历史均保留：

| 内容 | 来源 SHA | merge SHA |
| --- | --- | --- |
| #9 双 Boss | `d3613c146e11aef92a0e45de265856fe5036f2a5` | `91d26c326267c87753678621cb02054e30aace1e` |
| #10 三英雄 / 战役 | `e6c47499606bc119a9e0139b726f03721defb80c` | `30406353a7233c605c012ac1edeb098b8a609f63` |

受验代码为 `30406353a7233c605c012ac1edeb098b8a609f63`。#9 无冲突；#10 冲突位于 Battlefield、WhiteboxPreview、assetCatalog，均联合双方功能：保留 Boss 的核心剩余计时姿态、预警箭头、真实目标鼓舞环和 HUD；保留三英雄动作/攻击锚点、Campaign 的同一 BattleSession、result/retry/返回回调，以及页面持有共享 ModelLibrary 的释放边界。七类敌人、三英雄与 `warning/charge/inspire/idle` 动画语义全部登记；模型、命中、状态环继续共用 `enemyDisplayPosition`，兼有体型 wallInset 与 Boss 安全出生范围。

传入 Campaign session 时不准备开发 demo；独立显式 Boss 演示仍选原开发 catalog、显示清晰预设说明，标题不会被英雄名覆盖。保留 #10 玩家界面文案，普通战役无资产实现标签。只清理 diff-check 指出的四处文件 EOF 多余空行；未对 Python 烘焙重复或不可达 arrow 条件作重构。普通默认入口及 Phaser 退出仍属于 #11。

一次 `npm run check` exit 0：typecheck，22 files / 162 Vitest 与 4 HTTP 全通过；覆盖 Boss 真实计时/暂停、真实终局奖励只记一次、同关重试及存储兼容。一次 `npm run build -- --outDir C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-campaign-batch-dist` exit 0，63 modules；外部目录事先不存在，Vite 提示外部目录不清空及现有大 chunk。构建没有覆盖 root/source 原 dist。

固定审查基线与历史 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2` 到 HEAD 的完整 `git diff --check` 均通过。[资产审计](evidence/campaign-batch/asset-audit.json)核对 33 套 source/public/外部 dist 的 99 个 SHA-256 和 bytes，均符合固定 manifest；旧 28 套 source/public 共 56 文件哈希不变且无 diff，根原 dist 27 文件不变。没有重新导出或进行性能长测。

本档案不宣称整合候选 UI、听感或手机人工通过；完整玩家胜负/最终预算、#5/#13 设备与所有者接受仍待根或后续候选验证。未操作 master/tracker/远端或旧 phone 服务。外部命令日志与交接位于 `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/`：`product-campaign-batch-check.log`、`product-campaign-batch-build.log`、`product-campaign-batch-merge.md`。

补充根实际范围：[单独来源 Boss / Hero 玩测](evidence/campaign-batch/root-ui-review.md)及同目录最终截图/公开 JSON。#9 的真实 warning→charge 与 King inspire、#10 普通大厅→第二波失败→原 120/0 和五秒开局再战均有直接记录；这些针对各单独固定构建，不冒充组合默认 #11 游戏的完整手动胜负。原审查与前述命令未重跑。

## Standards

[独立原报告全文](evidence/campaign-batch/standards-review.md)：0 hard breaches，2 possible heuristics，均非阻断。分别为 Boss/Hero Python atlas 烘焙重复（Duplicated Code）与 Hero 脚本不可达 arrow 分支（Speculative Generality）；接受而不扩大本次合入。报告固定来源与基线，未冒充集成 UI 验证。

## Spec

[独立原报告全文](evidence/campaign-batch/spec-review.md)：0 findings，支持两份固定候选合入；保留 #11 默认入口切换与 #5/#13 人工门边界。

两轴原报告独立归档，正文不合并或重排；[复制审计](evidence/campaign-batch/copy-audit.json)记录原件与副本的 SHA-256，暂存 Git blob 已逐字节核对。
