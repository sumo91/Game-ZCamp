# 根独立补测入口验证

2026-10-10。固定source02e26aa4814b3424b3063a6c7e91e5a09d052ee2，实际Windows桌面Codex IAB Chrome155，360×703 CSS视口。使用真实公开按钮与收件服务器，不注入游戏/计时/响应事件。扫码preset仍是iQOO/Android声明，不能当本轮设备证据；本轮明确是桌面操作验证，与真实手机两原件分开。

- from=2实际呈现“补测第二、三轮约6分10秒”“开始剩余两轮”；第一轮标“本入口不测，使用电脑已保存记录”，未伪造PhoneRecord或receipt。
- 第二轮第一次预热5秒，测量中真实响应→手动停止，客户端显示已中断记录已保存1次/未完整完成，继续按钮可用。server记录round2/attempt1，300秒请求，66.7434秒有效采样、9611帧、median6.9/P957.0/max7.1ms，439calls/3,351,410triangles。
- 点击继续，仍为round2/attempt2并重新预热；旧中断记录显示保留。第二次响应→停止，完整server记录97.3200秒/14014帧、6.9/7.0/7.2ms，页面已保存两次中断，未进第三轮，未拼接为300秒。两原件独立文件/hash/时间戳在公开audit。
- 随后独立from=3页，第一/二轮仅“本入口不测”未伪造完成；300活动、完整5秒预热+60.0003秒/8565帧，median6.9/P957.0/max14ms、639calls/4,747,810triangles，测量中一次真实响应。server成功保存后页面显示“本入口补测完成”，无start/continue/stop按钮。不把单独补测说成全三轮完成。
- 三份全部原始rAF间隔、慢帧和中断保留；sum时长/count/偶数median/nearest-rankP95/max/render样本数独立复算一致。raw文件保存在外部，公开只净化指标、bytes与SHA；未将桌面记录归为实体手机成功。
- 公开页面最后console errors/warnings=[]。真实后台/resize/context loss未在本轮额外触发；既有手机page-hidden原件与新sequence竞态TDD分别保留，不宣称新页面后台实测通过。

实际截图phone-continuation-stopped.jpg/phone-continuation-done.jpg仅页面内容、无私有连接token。首次CLI将host设为loopback被已分配LAN校验拒绝，无进程启动，随后指定已分配LAN地址成功；原失败事实保留。开发子任务CUA无surface未进行UI，以上由根接手实测。旧source/root dist固定27文件保持，integration构建单独外部输出；旧手机原始collector身份未更改。

当前真机只有100完整、200 page-hidden134.3627秒中断、300未测；Root桌面补测流程通过不改变这一事实。#5仍OPEN，owner/physicalDevice接受false、预算/Bible/模拟器补测和完整样板审阅仍待，#6–9未启动，Goal工具blocked原范围不变。可交付新from=2入口供真实手机补两轮，每轮完整持续时间不缩减。
