# #5 两轴审阅后的限定修复与复验

2026-10-10，开发分支 `codex/threejs-issue-5`，基线 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2`。根独立长测固定运行源码是 `d26b800a5b4a92200ecda0c613c97d98f716f896`；本记录后续修复没有改场景组成、质量上限、动画、光照或资产，也没有重跑长测。

Standards初审为0新硬违例、1非阻塞DPR重复；Spec初审为1已知P2实验画布滚动。DPR规则已只保留在resize，configure调用resize，不再重复设置。实验画布限定 `touch-action: pan-y`，真实游戏canvas规则保持原来行为。

第一次修复构建的公开computed回归发现另一处同属滚动路径的级联问题：[原始样式](./post-review-lab-style.json) 显示实验容器仍 `overflow-y: hidden`，因为全局 `#app` 的overflow优先级较高。实际从360×640画布向下滚动一页后仍scrollTop0、scrollHeight1856、clientHeight640，见 [操作记录](./post-review-scroll-before-overflow-fix.json)。locator自动滚入视图不能代替这个用户滚动检查。

经根授权，同一滚动P2的容器规则限定为 `#app.pressure-app`，提高优先级而不添加overflow的 `!important`，全局与真实游戏样式不改。最终构建实测如下：

- 360×640，canvas和滚动容器computed均pan-y、overflow-y为auto。使用支持的实际 `tab.scroll([180,420], 'down', 1)` 从画布滚动一页，scrollTop由0增至640，配置区进入视口，见 [滚动前](./post-review-scroll-before.json)、[滚动后](./post-review-scroll-after.json) 与 [截图](./post-review-scroll-after.jpg)。这是桌面滚动输入，不声称模拟了真触摸。
- 通过公开配置选择200、降低像素密度、15秒并开始；配置锁定，停止/响应可用；200活动、200独立动画、200镜头内中心，main_city1、建筑总数15、两家族三档存在，1024PCF阴影保留。见 [开始](./post-review-started.json)、[运行](./post-review-running.json) 与 [图](./post-review-running-360.jpg)。
- 本短轮自然完成2160样本/15.0001秒，median6.9/P95 7.1/max7.2ms，439calls/3,351,410triangles。实际响应点击到达时已经完成，因此原始responseChecks为空，未补填；停止按钮当时正确禁用。保留 [公开完整JSON](./post-review-completed-short.json) 与 [实际下载](./post-review-completed-short-downloaded.json)，两文件SHA相同。
- 改请求时长60秒、点击重新测量，公开结果长度0且配置锁定、停止/响应可用；立即实际响应与停止，新结果manual-stop、预热中0样本、1次warming响应，参数恢复。见 [清空状态](./post-review-restart-cleared.json) 与 [原始中断JSON](./post-review-manual-stop.json)。不将此新轮写作60秒完成或采样中响应。
- [最终布局](./post-review-final-layout.json) 主要控件>=44CSSpx、页面宽360，公开200实例保持活动；[正常console](./post-review-normal-console.json) 0 warnings/errors。实际点击“可玩美术样板”进入自然战斗，真实游戏canvas computed touch-action仍none、无pressure-app类，见 [公开样板记录](./post-review-playable-style.json)。本次自有tab2已关闭，viewport reset；存活4191服务仍移交根负责。

`npm run check`通过15文件/125测试；最终 `npm run build`成功，保留既有大bundle提示。完整基线rangecheck及集成合并状态在项目外交付报告登记。没有新增测试或改变既定公开测试边界。

根原始完整下载、截图、独立报告和审计脚本原样归档，34份源/目标逐文件SHA一致，见 [复制核对](./root-evidence-copy-audit.json)。本目录限定.gitattributes阻止Git对这些原件作换行转换，保留提交字节。其中首100零响应及第二100更高max均保留；报告中当时的滚动待修事实没有改写。根已独立复算原始帧数组，见 [原始审计](./root-statistics-audit.json)。可在此目录以 `python verify-public-pressure-result.py root-100-standard-60-no-in-run-response.json root-100-standard-60.json root-200-standard-300.json root-300-standard-60.json root-360-reduced-manual-stop.json root-390-resize-interrupted.json root-background-probe-manual-stop.json` 重现记录审计；该脚本不访问应用内部或模拟浏览器行为。

实体手机、雷电真实浏览器补测、项目所有者逐项接受、正式预算与Art/UI Bible接受仍pending。根的实际about:blank探测没有让文档hidden，WebGL context loss也没有实际触发。桌面滚动/样式/按钮复验不代表真触摸或上述中断路径通过。#5仍OPEN，#6–#9不启动，#13完整混编/核心持续攻击另须验收。
