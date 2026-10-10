# 手机中断补测开发交付

2026-10-10。以开发身份按 TEAM_PROTOCOL、已确认 phone-continuation-brief 与 implement-spec/tdd 执行。指定source工作树先clean fast-forward到integration `62f628ca80277c761c97e63a8f0a381c7b0aa5f5`。

固定source：`02e26aa4814b3424b3063a6c7e91e5a09d052ee2`，分支 `codex/threejs-issue-5`，工作树clean。提交 `fix: allow explicit remaining-round phone continuation`。没有push/merge根分支，不关闭Issue5。

## 实现范围

- `phoneStartRound`只接受精确query `from=1/2/3`，其他默认完整三轮。
- `from=2`页顶“补测第二、三轮 · 约6分10秒”，按钮“开始剩余两轮”。第1轮“本入口不测，使用电脑已保存记录”，不会制造PhoneRecord、receipt、完成或接受状态。`from=3`约1分5秒，只补第三轮。
- `PhoneTestSequence`的轮次游标独立于attempt记录；原完整JSON不改变、不拼接，记录 `round` 与该轮独立 `attempt`。
- 中断后停止，前台显式点击“继续未完成测试”，被中断轮重新预热5秒、重新完整300或60秒采样。
- sending/failed未取得实际回执时禁止继续；retry-send只重发同一JSON；完整完成但发送失败的轮次重试送达后显式继续下一轮，避免重测已完整轮。
- 发送中page-hidden等停止竞态留下pending未开始轮，也可在回执后显式继续；返回前台与图形重新加载后更新按钮。
- 轮次表聚合独立attempts，区分“已中断记录已保存”和“完整完成”；补测结束只称“本入口补测完成”。OS/投屏待核实与accepted=false保持。
- 只改 `src/three/phoneTest.ts`、`AssetPressure.ts`、`pressure.css`、公共测试和说明/证据，未改collector、资产、渲染、core或预算。

## 原始手机证据

提交 `docs/production/evidence/issue-5/phone-continuation/iqoo-public-review.md`、`iqoo-public-audit-summary.json`。重新读取两份外部原件并独立计算SHA256与外部audit逐一匹配；公开摘要保留byte/hash、原audit/review hash和必要复算结果，不含私人LAN、token或collector会话身份。

- 100原件：223701 bytes，`005b00e67bf4fb057c04e6f821f2d90b96475d2fc03d635470d3e0426f493039`，completed，3616帧，60.0119秒。
- 200原件：437547 bytes，`ab5583db5a1ad2b01d6374a490571e52c98bdf54d4895be3e863b0a9d3fdb47e`，page-hidden中断，8091帧，134.3627秒。
- 300原件不存在；200不是完整300秒。原件仍外部，未覆盖，不重跑100，不拼接旧中断时段。

## 测试和构建

按已确认公共边界逐片red→green：from解析缺方法失败→通过；2→3原先错误100开始失败→通过；中断同轮显式continue缺方法失败→通过；completed发送失败重发后原先重测200错误失败→通过。补充停止竞态/pending不可继续、失败中断重发后同轮、最终completed失败重发后无继续、独立attempt原JSON不变、无伪造第1轮等回归。

- `npm run check` PASS：16文件147 Vitest（phoneTest22项）+4项真实HTTP收件测试。
- `npm run build -- --outDir <仓库外工作目录>/phone-continuation-dist` PASS。输出到外部目录，旧工作树dist未覆盖，live4194未动。
- 固定完整范围 `git diff 62f628c..02e26aa --check` PASS；clean；净化目录扫描未发现原private session/token/LAN字段值。
- 实际新loopback HTTP静态入口200、session source02e26aa及会话一致性验证PASS，证据外部 `phone-continuation-http-readiness.json`。这只证明HTTP就绪，不是公开UI或手机表现证据。

## 公开UI状态与根接手

开发试图通过允许的CUA公开浏览器执行from=3正常完整60秒；`cua.createBrowserTab('iab')` 返回 `Browser is not available: iab`，`cua.getState()` 返回 `apps:[] / browsers:[]`。本子任务没有可用表面，未执行真实UI测试，未用CDP/ADB/native输入绕过。根已收到限制与可接手入口；根需要完成from=2手动中断→显式继续同轮→两个attempt保留，以及from=3正常完整60秒。没有需要去重的已执行UI长测。

独立loopback collector：HTTP base `<loopback QA入口>`，source02e26aa，运行进程与执行会话详情只留在仓库外，output `<仓库外工作目录>/phone-continuation-ui-results`。完整私有URL/token/session保存在该目录 `qa-private-entry.json`，不进入仓库。启动脚本外部 `phone-continuation-ui-server.mjs`；其HTTP服务器由公开createPhoneCollector API绑定loopback随机端口，供桌面QA使用，不复用旧4194身份。

新手机补测QR仍由根建立新candidate session与真实QR，collector代码可复用：

```powershell
node <候选工作树>/scripts/phone-collector.mjs --host <本机实际LAN地址> --port 4195 --dist <仓库外工作目录>/phone-continuation-dist --output <新的仓库外收件目录> --build-sha 02e26aa4814b3424b3063a6c7e91e5a09d052ee2
```

将新服务stdout入口末尾追加 `&from=2` 后生成真实QR。本代码不更改CLI默认入口生成规则，也不沿用旧buildSha伪标新bundle。既有旧4194/session保留。

## 剩余边界

独立双轴审查/merger由根安排，实际公开UI待根完成，200与300真实手机补测和用户人工接受仍待。本功能只在当前页面内保持attempts与显式继续，不跨页面/浏览器/session持久恢复。URL轮次选择不构成先前记录或接受证据。此代码改动不是Issue5人工通过。
