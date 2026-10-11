# #4 首对第二版独立复测（仍待骨架修正）

日期：2026-10-09。开发冻结 src/public/dist 与导出源后，从真实入口 http://127.0.0.1:5184/?preview=threejs 新开独立浏览器页。此次只评估首对，不构成 #4 完整范围或 #5 人工接受。

## 实测结果

- 请求360×640后实际读取 documentElement 为360×640，field=360×371、Y=97。自然seed1337会话暂停时木材131，r1c3双击建造40后木材91、Lv1；无资金、单位或时间注入。
- 15个格位实际44×44像素，零矩形重叠；逐一真实点击，data-selected-slot全部与请求格位一致。记录 root-atlas-grid-360.json / root-atlas-selections-360.json。
- 实际390×844与1366×768，十五个热区仍均44×44、零重叠；各从第一行第一列、第二行第三列、第三行第五列验证正确选择。记录 root-atlas-layout-cases.json。
- 720×1280实际游戏截图中，标签移到基座下方，石质塔身、驻守者与蓝金分色更清楚；骷髅胸腔和腿部投影较第一版可读。720真实屋顶[356,683]、弓手/金饰[369,694]两次从r1c1改选r1c3均成功；使用当前 cua.createBrowserTab 返回原生 Tab.click API，并在点击前读真实截图，未合成事件或使用未文档化 locator position 参数。记录 root-atlas-roof-attachment-720.jpg。以前DOM-only绑定的坐标限制不能用来推断本次原生绑定无此能力。
- 浏览器UA：Chrome/155.0.0.0，Windows NT10.0 Win64；运行pixelRatio=1.5。720暂停采样4骨架（含1个死亡保留）+1塔+4特效，95 calls /81630 triangles。与第一版5骨架/1塔帧组成不同，不作同场景百分比改善声明，不代替200单位实体手机取证。
- 同一暂停状态改变上述视口，资源/倒计时/独立mixer时间保持；console零warning/零error，原PCFSoftShadowMap警告消失。

截图：root-atlas-pair-360.jpg、root-atlas-pair-720.jpg、root-atlas-pair-390.jpg、root-atlas-pair-1366.jpg。原始第一版截图保留为 red/待修参照，不覆盖或冒充第二版。

## 当前资产校验

官方Khronos 2.0.0-dev.3.10：四个当前GLB全0error/0warning、3 NODE_EMPTY挂点info；均1material，骷髅4clips/skin。GLB含baseColor与合并AO/roughness/metallic两张PNG；材质JSON同时引用occlusionTexture与metallicRoughnessTexture，确认不是合材质时丢失表面属性。第一版塔10material/骷髅9material。

| 文件 | SHA256 |
| --- | --- |
| arrow_tower_low.glb | bc1d013108aad3aa5411b1d283d728273da50896e26d8b0344476950c7d36b90 |
| arrow_tower_medium.glb | 812273f4e741620e3ddaa14482606a390d90aae2f2e2f3408d963da3235c3e35 |
| arrow_tower_high.glb | 4cb5d435114acdf49aa1e990c2400a162975a2afb4c7ca6fad7dd59271cd520c |
| skeleton_infantry.glb | bebf905433e46cf0e547322e378e5b1939dc13453466ed0443e00ad760c9fcd8 |

## 待修与交接

开发在冻结期间只读发现144个眼窝布尔新增顶点绑定到neutral_bone，动作时有残片风险。必须明确绑定head后重导并自然复验死亡；格式校验通过不能证明形变正确。薄旗须补厚度防止单面消失。本轮没有宣称死亡形变已最终通过。

360末行热区底467.73、field底468，余量仅0.27px；后续木材厂/主城label_anchor应使用同一投影标准或保证边界，不把热区移到footer。根任务已把该具体边界交开发。

首对镜头/标签/atlas方向可用于继续制作本Issue剩余样板。木材厂三档、主城、城墙、树木/岩石尚未齐备；完整样板、加载失败独立复测、最终自然成长各档及死亡复验仍待完成。根任务关闭自己的临时tab8、reset viewport并释放冻结；开发先修骨架/薄旗，再补齐#4，完成后重新冻结给最终QA与固定基线审查。#5/#13仍没有项目所有者接受及实体手机证据。
