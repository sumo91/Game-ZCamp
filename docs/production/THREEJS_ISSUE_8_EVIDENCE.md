# Issue #8 — 五种亡灵混编候选

四个新亡灵来源和 GLB 在真实 Three.js 战场通过稳定内容 ID 接入，walker 继续使用原样板骷髅。runner 双爪、tank 宽躯铁拳、armored 全身装甲与大盾、brute 大腹刺肩和铁锤，体型与装备共同区分，均有 walk/attack/hit/death。

只在原 `applyWallDamage` 后新增 `enemy_wall_attack` 只读事件（单位 ID、定义 ID、position、既有伤害和攻击间隔）。没有改变伤害、推进、减伤、金币、事件前的计算顺序或玩法随机。动画、墙边短冲击和重击反馈监听真实事件；显示后移不进入射程与寻敌。

开发入口：`/Game-ZCamp/?preview=threejs&demo=undead`。普通 `?preview=threejs` 同样使用全部正式普通/精英亡灵。开发入口以种子 1337、camp_warden、first_defense 创建同一个 BattleSession，只派发既有建造、升级、词条、拆除命令和固定步 advance，完全没有写入 GameState 或修改正式关卡。加载完成后快进至第一关第十波约 579.3 秒，24 个活动单位覆盖五类型，战术暂停供检查。点“继续”可看到实际推进、攻墙、驻守英雄命中与死亡；可再次暂停。两种 Boss 和英雄目前仍按批次明确标记开发占位；本节点不宣称完整迁移完成。

验证：既有公开 GameCommand/GameState/GameEvent 与 BattleSession seam。攻墙事件测试先红（缺失事件），后绿，证明五种单位合计 18.25 原伤害、护盾 10 消耗后墙血 91.75、攻击不重复、暂停不结算。开发演示回归证明同一核心真实运行到五种混编并暂停，继续六秒出现实际攻墙、命中和死亡事件。`npm run check` 通过 149 Vitest（18文件）和 4 HTTP/磁盘回归；类型通过。生产构建通过，既有大 chunk/外部 outDir 提示保留。

本开发任务 CUA 返回 apps=[]、browsers=[]，没有浏览器截图或艺术接受声明。总制作人负责独立玩家入口检查与实际运行截图。实际资源统计见 [本批清单](evidence/issue-8/asset-manifest.json)，不会覆盖 #4 历史清单；模型制作说明见 [亡灵来源](../../art/threejs/README_UNDEAD.md)。

根任务实际打开静态候选，已观察五类24单位与恢复后的真实失守；发现演示“重新开始”回到了普通开局但仍显示第十波说明。本次仅对显式 `demo=undead` 的已接受 restart 重新执行同一真实命令准备流程，恢复第十波混编暂停；普通入口依旧普通开局。公开 BattleSession 重启后再准备与初次状态一致的回归通过，实际 UI 复验由根负责。
