# #5 修复提交的独立公开短回归

2026-10-10。运行固定源码 `5252f732e0dc2fd377af5ccf774991b3841d4577` 的实际构建子路径 `/Game-ZCamp/?preview=asset-pressure`；根未改源码。此前100/300各60秒、200连续300秒的原始证据仍属于 `d26b800`，没有重跑或改写测量身份。

- 360×640公开样式：容器overflow-y auto、容器及canvas touch-action pan-y。实际从画布向下scroll一页，稳定状态scrollTop从0到640，配置顶部从657.35到17.35，进入视口。滚动工具刚返回时的立即观察仍为0；保留 `root-final-wheel-immediate.json`，随后AX状态及截图确认滚动完成，最终记录为 `root-final-scroll-after.json/.jpg`。
- 公开选择300及降低像素密度，开始后AX明确全部配置禁用、停止和响应可用。实际活动/独立动画/镜头中心各300，绘制639、triangles4747810，未因低画质删减。真实响应一次，公开计数只增加一次；手动停止恢复配置，完整结果通过真实导出JSON下载保存。
- `root-final-manual-stop.json` 为中断短验：有效10.1389秒、1453样本，median6.9/P957.1/max14ms；1次measuring响应、近似处理器延迟0.2ms。全部原始间隔、组成和范围经独立 `verify-public-pressure-result.py` 复算通过。设备声明故意未填写，公开JSON如实标记incomplete；不是新容量基准。
- 重新测量清空结果为0。首个DOM检查误以select自身的`.disabled`判断fieldset继承禁用，故保存的 `root-final-restart-cleared.json` 内allConfigsLocked为false；这不能表示控件可用。补充真实公开操作，以locator.isEnabled及CSS :disabled检查：countEnabled=false、qualityEnabled=false、fieldsetDisabled=true、selectMatchesDisabled=true、stopEnabled=true、结果仍0，见 `root-final-restart-effective-disabled.json`。没有更改原记录或应用。
- 正常控制台0 warnings/errors，见 `root-final-normal-console.json`。所有根自建最终短验tab4/5已关闭，临时viewport reset；4191 loopback预览服务仍归根管理。

两轴最终全量固定head审查：Standards 0硬违例/0剩余启发式，Spec 0未解决发现。lab滚动级联和重复DPR规则已修；真实游戏输入规则没有改动，开发的实际样板回归另存post-review-playable-style.json。

#5仍OPEN。实体手机、雷电真实浏览器补测、owner逐项接受、正式制作预算/群体方案及Art/UI Bible接受仍pending；本次桌面滚动不等于真触摸，不宣称后台/context-loss或#13完整混编/核心持续攻击通过。#6–9不启动。

短验后核对当前服务库存：旧来源代理交接的PID46284/session89062已不存在，4191无Listener；其旧报告保留当时事实。根从同一固定source/dist重启loopback预览，新的exec session10463；可运行入口不依赖旧PID。服务身份及存活状态以新的实际库存/最终交付记录为准，不停止用户雷电或其他服务。
