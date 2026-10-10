# 制作人实际画面接受：炮击对比度

代码固定 d2fcc75d1c39fc8460884ea60baa8c6ae14f7ed8；5362 frozen product-cannon-contrast-dist。经公开 UI 建造箭塔、改造火炮/连弩、付费升级选择扩爆/燃烧/穿透。画面始终标识 arcane 开发演示条件：600生命、无攻墙伤害、授予资源；不能充当正式战役胜利或性能证据。

第5波真实 rAF 截图连续28帧约1.95秒、44帧约2.87秒。新 frame25 清楚显示饱和橙色地面爆炸圈、目标上方紧凑橙色爆炸与金色箭；frame04 可见小深色弹体及轨迹。first frame00 可见橙圈与金色后续箭段；燃烧双火焰持续可见，冰圈与链电不被遮住。相较 old product-siege-short-frame-10 的淡骨色炮弹/低对比圈，本批攻击类型更易辨识；制作人接受本批视觉改进。

截图和 UI 流程未通过 private Scene 或核心状态注入制作。标准暂停→流畅：公开敌人呈现与 arcane 数据逐项相等，warn/error=[]，20 live 的暂停页面。此处不是200混编性能、实体手机或所有者最终审美接受。

归档建议保留 old frame10、new first frame00、new frame04/new frame25、公开 UI 操作、两份原始暂停 JSON、frame audit 和本记录。其他短帧临时原件无需全部入库。
