# #5 配套工具实施验证

2026-10-10，基线 `0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2`。本记录是开发自己的公开浏览器短冒烟，Windows桌面IAB；不是实体手机、模拟器补测、独立长时预算或项目所有者接受。

## Red → Green

已批准边界沿用总规格的公开浏览器玩家/验收操作；没有新增私有renderer/mixer/模型常量镜像单测。

1. 实施前真实打开开发URL `http://127.0.0.1:5185/?preview=asset-pressure`，DOM仅为 `main "尸潮营地游戏画布"`，截图是原版大厅；没有压力入口或控件，这是实际red。然后加入独立表现入口及GLB场景，真实UI选300并点响应，公开数据为300实例/独立动画，四动作循环、实际绘制数据可见。首个切片仍缺测量/停止/导出，这是下一操作切片的red。
2. 增加测量与结果公开流程，在开发页选择15秒并开始；参数全部disabled、停止/响应可用。实际完成2160个连续帧间隔，15秒，不用固定步或自报FPS替代。该开发初轮检查发现主城ID写法不符，因此不能作为完整资产候选；已改用真实 `slot-r3-c3` 并通过以下构建记录复验。
3. 构建360页面最初按长宽比例生成较高canvas，视口截图不能同时看到全部营地；改为视口适配高度，最终完整镜头位于CSS y=254.16至618.16，360×640一屏内可见全部单位/15格，见 [布局](./built-layout-360.json) / [图](./built-layout-360.jpg)。全部select/input/button/link至少44px，页面宽360无水平溢出。
4. 构建测量、停止、新轮次、resize中断和实际导出/复制通过。后补逐实例公开动作/时间/可见状态与真实distinct mixer计数，最终300短测在全部300实例上检查时间推进、actionRunning、visible及centerInView，全部true。这个公开报告变化没有改正式资产、核心或实验组成。

## 构建公开操作

构建使用 `/Game-ZCamp/` 基址，独立预览4191。公开链接准确保留此基址。所有交互通过 `mcp__cua_repl` 支持的真实locator操作；只读evaluate只读取DOM公开结果，不访问私有renderer/mixer或变造状态。

| 实际步骤 | 原始证据 | 结果与边界 |
| --- | --- | --- |
| 360：标准100、填真实桌面登记、开始60秒、锁参、采样中响应/停止 | [原始JSON](./built-manual-stop-360.json) | manual-stop，1835样本/12.7431秒；保留中断，无完成声明 |
| 重新测量，再实际变更390×844视口 | [原始JSON](./built-resize-interruption.json) | 新轮次0样本，viewport-resized，在预热中中断，未继承旧数组 |
| 390：200/降低像素密度/15秒 | [原始JSON](./built-completed-200-reduced-390.json) | 2160样本/15.0001秒，median6.9/P95 7/max7.3ms；本轮没有测量期响应记录，不补填 |
| 实际点击复制、导出JSON并取得下载文件 | [下载JSON](./built-downloaded-200-reduced-390.json) | UI显示完整JSON已复制，导出文件与公开原始JSON相同 |
| 720：最终逐实例报告300/标准/15秒，采样中实际点响应 | [原始JSON](./built-completed-300-standard-720.json) / [完成图](./built-completed-300-standard-720.jpg) | 1845样本/15秒，median7/P95 13.9/max14.1ms；300 mixer/可见/动作运行/中心在镜头内，全部逐实例时间推进；实际响应事件保留 |
| 360/390/720/1366×768布局与组成 | `built-layout-{360,390,720,desktop}.json` / `.jpg` | 全部交互控件至少44px；100/200/300各档实际组成存在；两画质保留接地投影，没有减单位 |
| 构建临时移走唯一arrow_tower_low.glb，正常reload | [失败DOM](./built-loading-failed.txt) / [状态](./built-loading-failed.json) / [图](./built-loading-failed.jpg) | 明确文件不可用，开始/config禁用，无占位场景冒充成功 |
| 恢复同SHA后真实点击重试 | [就绪JSON](./built-retry-ready.json) | 加载完成、开始/config可用、主城1/建筑15；临时dist文件已恢复 |
| 真实点击可玩样板→原版入口 | `built-playable-retained.txt` / `.jpg`、`built-default-retained.txt` / `.jpg` | 真实样板运行资源、波次、15格与暂停UI；默认原版大厅仍可访问 |
| 正常最终压力页console | [日志](./built-normal-console.json) | 0 warnings/errors；资源缺失轮次有预期失败，未混为正常路径 |

SHA核对：[unchanged-assets.json](./unchanged-assets.json) 显示12份来源、12份public GLB、12份dist GLB全部匹配 #4 清单。缺失测试仅临时移动自己的dist文件，public/source不变。这个任务没有重新执行GLB Validator，沿用 #4 对相同SHA的最终结果。

短测桌面帧率受IAB、144Hz屏幕与当前运行负载影响，不作实体设备目标承诺。字段记录真实Chrome155 UA、window/renderer DPR与CSS视口；低画质的200轮nativeDPR约1，两档因此都约1，不能以此声称已测出高DPR降低收益。最终实际绘制239/439/639 calls及1,955,010/3,351,410/4,747,810 triangles含当前阴影 pass；它们是各档本次renderer读数，不是通用硬编码预算。

## 检查与清理

`npm run check`通过15文件/125测试；`npm run build`通过，只有既有大bundle提示。最终交付前运行全基线 `git diff --check 0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...HEAD`，并合并最新集成基点；结果在项目外交付报告记录。无测试边界扩充。

只创建自有IAB tab1，已关闭；临时viewport已reset。没有操纵原生模拟器、用户页或外部浏览器。开发服务5185、构建预览4191的实际session/PID/命令和移交/最终清理由项目外交付报告登记，不将存活PID固定为项目事实。

## 未执行项

根独立桌面100/300各60秒、200连续300秒，实体中档手机、雷电实际浏览器补测、真实后台切换/context loss（没有通过未支持或合成事件伪装）、正式预算、Art/UI Bible接受修订及所有者逐项接受仍待对应记录。代码具备后台/context loss明确中断处理，但本轮仅用真实resize和手动停止取证。#5保持OPEN，#13仍另需完整混编/核心持续攻击与生命周期；这些短冒烟不填人工勾选。
