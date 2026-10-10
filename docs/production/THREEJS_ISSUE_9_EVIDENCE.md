# 双 Boss 正式模型与核心驱动表现

`charger_boss` 使用原创 `charger_lord.blend` / GLB，宽重甲、角盔、盾斧剪影；`overlord_boss` 使用原创 `undead_king.blend` / GLB，高冠、长披袍、权杖剪影。两者在 GLB Y-up 中高约 3.16 / 3.18 米，相比约 1.37 米的普通骷髅超过 1.8 倍。材质沿用紫灰亡灵、受控幽绿、512 PBR 图集，14 关节、脚底零点、三语义锚点。每件提供 walk/attack/hit/death；冲锋领主增加 warning/charge，君王增加 inspire。源保留可编辑分件、纹理、Actions 和 runtime 面，没有导入第三方角色。

冲锋方向与时长来自核心事件的只读字段，预警/冲锋姿态和地面箭头由当前敌人剩余秒数控制；不等动画结束决定移动、伤害或结束。君王只给 `overlord_inspire.targetIds` 的存活对象绘制绿色足环，来源使用紫色大足环；结束依据 `overlordInspireRemainingSeconds`，来源死亡不会提前清除核心仍有效的鼓舞。单位移除、战斗重试和退出清理对应标记。实际 `enemy_wall_attack` 驱动 Boss 重击动作与城墙闪击；普通攻击、价格、敌人属性、波次及胜负计算不变。

关键箭头和足环位于尸潮地面及城墙外，HTML 警告位于 HUD，不铺满营地、不占 15 个格位的选取层。不以装饰权杖增加远程施法、召唤或治疗。

最短入口：`?preview=threejs&demo=boss`。该入口通过独立开发 catalog（普通及精英 HP 1、所有敌人攻墙伤害 0）与真实建造命令、固定模拟步准备第三关第 15 波。Boss 原 HP、移动与技能值保留；初始按正常战术暂停停在双 Boss 的预警及鼓舞同时存在时。点击“继续”观察冲锋，之后仍可使用正常暂停、建造、升级和重试。开发 catalog 的数值不进入正式入口，不能将该演示的无损城墙当作正式难度或完整通关证据。

核心测试使用 `BattleSession` 的命令、状态、事件，经过红→绿证明：2 秒预警给出实际目标，0.8 秒冲锋时长；战术/系统暂停冻结且返回不跳过预警；真实冲锋领主攻墙扣 28 点时才产生对应事件。既有三关组成、最后 Boss、成长和胜负回归继续使用正式 catalog。

资产实际 SHA、大小、三角形、锚点、动作见 `evidence/issue-9/boss-asset-manifest.json`；Khronos Validator 两件各 0 errors / 0 warnings，3 个空语义节点 info。格式检查不替代固定游戏镜头美术接受；独立浏览器截图与双轴审查由总制作人收尾登记。手机验收仍延期到最终候选。
