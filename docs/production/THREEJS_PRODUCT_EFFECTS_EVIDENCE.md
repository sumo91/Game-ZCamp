# 产品可见修正合入证据

固定根基线 `ac4a6f8b5530baa91d995b8be71e6a475563bf52`，来源 `codex/threejs-product-visuals` / `475e2e0536b78fb13daa6353712b46b773d0611a`。在根接受短复验后，集成分支无冲突正常 `--no-ff` 合入；merge／受验代码 SHA `6b43a713e22a6b0d213edff64ef5bf1ccad470d7`，parents 精确为基线和来源。五个文件 55 additions / 16 deletions，合入未额外改产品代码。

普通/精英到墙前以稳定显示 hash 分成五排纵深，模型、减速与真实事件锚点共用投影；Boss 通道保持原值。事件命中锚点平移当前显示姿态，避免临时移动 actor；命中由大实心球改为透明小橙环，火焰前移，弹道/链电加粗提亮。模拟、寻敌、伤害、敌人数和正式 GLB 均未改；效果仍由模拟时间推进。

一次根 `npm run check` exit 0：typecheck、25 files / 169 Vitest 与 4 HTTP 通过。最终 src/tests/package 与精确来源 diff 为空，复用作者已通过的 58-module 外部生产构建 `product-effects-fix-dist`，未重复 build。完整 `ac4a6f8...HEAD` 与历史 `0bf8227...HEAD` 的 `git diff --check` 通过。src/core/public/art diff 为空，根旧 dist 27 文件 SHA/bytes 不变；冻结产物 46 文件另留外部 SHA 审计，未覆盖任何旧 dist。

[作者原报告](evidence/product-effects/author-delivery.md)的 CPU 几何诊断只检查姿态和锚点，纹理解码与 WebGL 输出被省略，不能当实时浏览器/GPU 性能；临时探针已移除。旧 b746 的桌面压力数据仅证明当时旧候选，本次可见修正未重跑长测或更新性能接受。

[根真实 UI 原报告](evidence/product-effects/root-review.md)固定 5344 冻结构建：100 混编内实际选择火炮、付费升 Lv2、选择真实提供的燃烧词条、真实攻击与暂停/画质切换。多排群体、轮廓和模型前方橙色燃烧可见，标准/流畅都保留 100 模型及双 Boss；暂停 HUD 木99435/金99890/next38 不变。归档 [before](evidence/product-effects/data/product-final-mixed-effects.jpg)、[标准 after](evidence/product-effects/data/product-effects-fixed-standard.jpg)、[流畅 after](evidence/product-effects/data/product-effects-fixed-low.jpg)与对应公开 JSON。

active/chain 短快照保存实际返回的截图与公开数据。JSON 的 arcane.effects6、缓存真实链目标及文件名不能证明那一帧清晰捕获紫色链或炮弹；这些瞬时视觉接受仍未完成，**#6/#7 保持 open**，不据效果数量或截图名称关闭。无 query 普通入口实际 fresh 大厅、切标准、进入首关、120 木/0 金/五秒开局、真实选格及建40木箭塔、真实暂停通过，[普通短回归](evidence/product-effects/data/product-effects-fixed-normal.jpg)及 JSON 留存；不是另一场完整通关或真机验收。根 warn/error 为空。

## Standards

[独立原文](evidence/product-effects/standards-review.md)，固定基线到精确来源完整 diff：0 明文规范违约、0 实质性 Fowler 异味。显示 hash 不消费核心随机；资源持有/释放及模拟时间边界保留。

## Spec

[独立原文](evidence/product-effects/spec-review.md)，同一固定 diff：0 findings。支持授权的纯显示修正；独立代码审查和根短复验按各自范围归档，不冒称完整视觉/设备接受。

[复制审计](evidence/product-effects/copy-audit.json)记录 16 份新增原件：14 份逐字节一致，两轴文本仅最后 CRLF→LF，文字/findings 与分轴保留，外部及旧原件未改；未增加 attributes 或绕过 whitespace。作者历史服务交接照原文保留；根另通知作者旧 listener 退出后，用同一冻结目录在同 port5344 启动其持有的 preview（session67027），本合入未操作服务或浏览器。

仅正常推送授权的产品来源分支和集成分支，并核对 `ls-remote` 精确 SHA。未 force、合 master、发布或发 tracker 消息；5332/5333/5344、手机服务与原 dist 未触。#1/#5/#13、艺术及所有者人工门仍保留，根负责 PR/tracker 和最终交付。
