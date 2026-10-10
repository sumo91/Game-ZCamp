import { BattleSession } from "../core/battleSession";
import { starterCatalog } from "../core/content";
import { getGrowthBuildingPresentation, type GrowthSpecialTowerId } from "../core/buildingGrowth";
import { getWoodProductionPerSecond, MAIN_CITY_WOOD_INCOME } from "../core/resources";
import { CAMP_SLOT_IDS, type GameCommand, type GameEvent, type GameState } from "../core/types";
import { decideGrowthControl, initialGrowthUiState, type GrowthControlInput } from "../ui/growthControls";
import { deriveBuildingDetail, deriveEmptySlotActions, deriveGrowthPauseControl, deriveGrowthWaveTime, deriveTraitOptions, deriveTransformOptions, formatGrowthTraitEffectAtStacks, getGrowthInputPriority, type GrowthStatsView } from "../ui/growthUi";
import { Battlefield } from "./Battlefield";
import { isWallInDanger } from "./whiteboxCatalog";
import { ModelLibrary } from "./ModelLibrary";
import { SAMPLE_COVERAGE } from "./assetCatalog";
import { createBossDemo } from "./bossDemo";
import { withFantasySiegePresentation } from "./fantasySiegePresentation";

import type { SoundDirector } from "../audio/SoundDirector";
import { fantasyHeroContent } from "../ui/fantasyHeroPresentation";
import type { CampaignResult } from "../ui/campaign";
import { createSiegeDemoSession, prepareSiegeDemo, SIEGE_DEMO_LABEL } from "./siegeDemo";
import { fantasyArcanePresentation } from "./fantasyArcanePresentation";
import { ARCANE_DEMO_CATALOG, ARCANE_DEMO_RESOURCES, prepareArcaneDemo } from "./arcaneDemo";
import { prepareUndeadDemo } from "./undeadDemo";
import { replayCampaignBattle } from "./campaignReplay";
import "./preview.css";
import { GRAPHICS_QUALITY, readGraphicsQuality, saveGraphicsQuality, type GraphicsQuality } from "./graphicsQuality";

const content = fantasyArcanePresentation(withFantasySiegePresentation(starterCatalog.buildingGrowth));
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const number = (value: number | undefined) => Number((value ?? 0).toFixed(2));
const woodIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#986032" stroke="#51361f" stroke-width="2" d="M7 26 2 15 21 4 28 15Z"/><path fill="#c38a44" stroke="#593923" stroke-width="2" d="m7 26 20-10 3 4-20 10Z"/><ellipse fill="#daa45b" stroke="#664525" stroke-width="2" cx="7" cy="21" rx="6" ry="8" transform="rotate(-25 7 21)"/><ellipse fill="none" stroke="#906032" cx="7" cy="21" rx="2.5" ry="4" transform="rotate(-25 7 21)"/></svg>';
const goldIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#eab549" stroke="#8d5d1c" stroke-width="2"/><circle cx="16" cy="16" r="10" fill="none" stroke="#ffe28a" stroke-width="2"/><path fill="#fff1aa" d="m16 8 3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1Z"/></svg>';
const skullIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#e5e8e8" d="M6 17C0 1 32 1 26 17l-4 5v7h-5v-5h-2v5h-5v-7Z"/><path fill="#172133" d="M6 13c0-4 7-4 7 0s-7 5-7 0m13 0c0-4 7-4 7 0s-7 5-7 0m-3 2-3 6h6Z"/></svg>';
const statsText = (stats: GrowthStatsView) => stats.kind === "lumberyard"
  ? `产木 ${number(stats.woodPerSecond)}/秒`
  : `伤害 ${number(stats.damage)} · 间隔 ${number(stats.attackIntervalSeconds)}秒 · 射程 ${number(stats.range)}`;

/** Shared battle presentation; loading and animation never write simulation state. */
export interface BattlePresentationOptions {
  session?: BattleSession;
  library?: ModelLibrary;
  sound?: SoundDirector;
  result?: () => CampaignResult | null;
  retry?: () => boolean;
  returnToLobby?: () => void;
  developmentReplay?: boolean;
  quality?: GraphicsQuality;
  qualityChanged?: (quality: GraphicsQuality) => void;
  observeFrame?: (timestamp: number, state: GameState, events: readonly GameEvent[], metrics: ReturnType<Battlefield["snapshot"]>) => void;
}
export function mountBattlePresentation(app: HTMLElement, options: BattlePresentationOptions = {}): () => void {
  const demo = options.session ? null : new URLSearchParams(window.location.search).get("demo");
  const siegeDemo = demo === "siege";
  const arcaneDemo = demo === "arcane";
  const undeadDemo = demo === "undead";
  const bossDemo = demo === "boss";
  let quality = options.quality ?? readGraphicsQuality();
  app.classList.add("battle-app");
  app.dataset.browserUserAgent = navigator.userAgent;
  app.dataset.renderPixelRatio = String(Math.min(window.devicePixelRatio, 2));
  app.innerHTML = `
    <header class="preview-hud">
      <div class="preview-wave-card"><div class="preview-wave">${skullIcon}<strong data-view="wave"></strong></div><div class="preview-time" data-view="time"></div><div class="preview-phase"><span data-view="phase"></span><span data-view="threat"></span></div></div>
      <div class="preview-top-actions"><button type="button" data-action="toggle_pause" aria-label="暂停战斗">暂停</button><button type="button" data-action="quality" aria-label="切换画质">画质</button><button type="button" data-action="mute" aria-label="切换声音">声音</button></div>
      <div class="preview-boss" data-view="boss" aria-live="polite"></div>
    </header>
    <section class="preview-field" aria-label="人类堡垒与亡灵防线">
      <div class="preview-zone" hidden></div>
      <div class="preview-wall" aria-label="城墙防线"><strong data-view="wall"></strong><div class="preview-wall-bar"><span data-view="wall-fill"></span></div><span data-view="shield"></span></div>
      <div class="preview-slots" aria-label="5×3 营地格位"></div>
      ${options.developmentReplay ? '<aside class="preview-replay"><strong>开发演示 · 真实战役加速</strong><p>原始关卡与费用 · 结果记录进度</p><button type="button" data-action="replay_victory">回放防守</button><button type="button" data-action="replay_defeat">回放失守</button></aside>' : ""}
    </section>
    <footer class="preview-controls">
      <div class="preview-resources"><span class="preview-resource">${woodIcon}<span data-view="wood"></span></span><span class="preview-resource">${goldIcon}<span data-view="gold"></span></span></div>
      <div class="preview-context preview-scroll" aria-label="所选建筑详情" tabindex="0"></div>
      <div class="preview-actions"></div>
      <div class="preview-notice" role="status" aria-live="polite"></div>
    </footer>
    <div class="preview-overlay" hidden><section class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="growth-dialog-title">
      <div class="preview-dialog-content preview-scroll"></div><div class="preview-modal-notice" role="status" aria-live="polite"></div>
    </section></div>
    <div class="preview-loading" data-loading role="status" aria-live="polite"><section><h2>准备营地</h2><p data-loading-progress>准备英雄与防线…</p>${siegeDemo ? `<p>${SAMPLE_COVERAGE}</p>` : ""}<button type="button" data-action="retry_assets" hidden>重试加载</button></section></div>`;
  const session = options.session ?? (bossDemo ? createBossDemo() : siegeDemo ? createSiegeDemoSession() : new BattleSession({ seed: 1337, config: { heroId: "camp_warden", levelId: "first_defense" }, ...(arcaneDemo ? { catalog: ARCANE_DEMO_CATALOG, initialResources: ARCANE_DEMO_RESOURCES } : {}) }));
  const showDemoLabel = (label: string) => { const zone = app.querySelector<HTMLElement>(".preview-zone")!; zone.hidden = false; zone.textContent = label; };
  if (siegeDemo) showDemoLabel(SIEGE_DEMO_LABEL);
  if (arcaneDemo) prepareArcaneDemo(session);
  if (bossDemo) {
    showDemoLabel("双 Boss 开发演示");
    app.querySelector(".preview-zone")!.innerHTML = "双 Boss<small>演示：普通/精英 HP 1，所有攻墙伤害 0 · Boss 原生命与技能</small>";
  }
  if (arcaneDemo || undeadDemo) {
    showDemoLabel(arcaneDemo ? "开发演示 · 寒霜与雷电三档" : "开发演示 · 五种亡灵");
    app.querySelector<HTMLElement>(".preview-zone")!.innerHTML = arcaneDemo ? "寒霜与雷电<small>演示配置：600生命目标、无攻墙伤害、授予资源。正式战役不使用此配置。</small>" : "亡灵混编<small>真实第一关第10波 · 点继续观察攻墙</small>";
  }
  const muteButton = app.querySelector<HTMLButtonElement>("[data-action=mute]")!;
  muteButton.hidden = !options.sound;
  const updateMute = () => {
    const muted = options.sound?.isMuted() ?? true;
    muteButton.textContent = muted ? "静音" : "声音";
    muteButton.setAttribute("aria-label", muted ? "开启声音" : "关闭声音");
    muteButton.setAttribute("aria-pressed", String(muted));
  };
  updateMute();
  const field = app.querySelector<HTMLElement>(".preview-field")!;
  let battlefield: Battlefield;
  try { battlefield = new Battlefield(field, quality); }
  catch {
    app.innerHTML = `<div class="preview-error"><h1>战场暂时无法显示</h1><p>请使用支持 WebGL 2 的浏览器，或重新加载后重试。</p>${options.returnToLobby ? '<button type="button" data-return-error>返回营地</button>' : `<a href="${import.meta.env.BASE_URL}">返回营地</a>`}</div>`;
    session.dispose();
    const back = app.querySelector<HTMLButtonElement>("[data-return-error]");
    const returnToLobby = () => options.returnToLobby?.();
    back?.addEventListener("click", returnToLobby);
    return () => { back?.removeEventListener("click", returnToLobby); app.replaceChildren(); app.classList.remove("battle-app"); };
  }
  const view = (name: string) => app.querySelector<HTMLElement>(`[data-view="${name}"]`)!;
  const hud = app.querySelector<HTMLElement>(".preview-hud")!;
  const controls = app.querySelector<HTMLElement>(".preview-controls")!;
  const wallHud = app.querySelector<HTMLElement>(".preview-wall")!;
  const context = app.querySelector<HTMLElement>(".preview-context")!;
  const actions = app.querySelector<HTMLElement>(".preview-actions")!;
  const pauseButton = app.querySelector<HTMLButtonElement>("[data-action=toggle_pause]")!;
  const qualityButton = app.querySelector<HTMLButtonElement>("[data-action=quality]")!;
  const updateQuality = () => { qualityButton.textContent = `画质·${GRAPHICS_QUALITY[quality].label}`; app.dataset.renderPixelRatio = field.dataset.renderPixelRatio; };
  updateQuality();
  const overlay = app.querySelector<HTMLElement>(".preview-overlay")!;
  const dialog = app.querySelector<HTMLElement>(".preview-dialog-content")!;
  const notice = app.querySelector<HTMLElement>(".preview-notice")!;
  const modalNotice = app.querySelector<HTMLElement>(".preview-modal-notice")!;
  const slots = app.querySelector<HTMLElement>(".preview-slots")!;
  const loadingOverlay = app.querySelector<HTMLElement>("[data-loading]")!;
  const loadingProgress = app.querySelector<HTMLElement>("[data-loading-progress]")!;
  const retryAssets = app.querySelector<HTMLButtonElement>("[data-action=retry_assets]")!;
  let library: ModelLibrary | null = null;
  let demoPrepared = false;
  let loading = false;
  const slotButtons = new Map<string, HTMLButtonElement>();
  const commandHistory: Array<{ step: number; command: GameCommand; accepted: boolean; reason?: string }> = [];
  let ui = initialGrowthUiState();
  let lastPriority = "none";
  let previousFocus: HTMLElement | null = null;
  let message = "";
  let messageExpiresAt = 0;
  let disposed = false;
  let frameId = 0;

  for (const [index, slotId] of CAMP_SLOT_IDS.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-slot";
    button.dataset.slot = slotId;
    button.dataset.row = String(Math.floor(index / 5) + 1);
    button.dataset.column = String(index % 5 + 1);
    slots.append(button);
    slotButtons.set(slotId, button);
  }

  const updateHtml = (element: HTMLElement, html: string) => {
    if (element.dataset.rendered === html) return;
    const scrollTop = element.scrollTop;
    const active = element.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset : null;
    element.innerHTML = html;
    element.dataset.rendered = html;
    element.scrollTop = scrollTop;
    if (active?.action) {
      const replacement = Array.from(element.querySelectorAll<HTMLButtonElement>("[data-action]")).find((button) => button.dataset.action === active.action && button.dataset.option === active.option && button.dataset.definition === active.definition);
      replacement?.focus({ preventScroll: true });
    }
  };
  const buttonHtml = (action: string, label: string, affordable = true, extra = "") => `<button type="button" data-action="${action}" ${extra} ${affordable ? "" : 'aria-disabled="true" class="unaffordable"'}>${escapeHtml(label)}</button>`;
  const dispatch = (command: GameCommand) => {
    const result = session.dispatch(command);
    commandHistory.push({ step: session.getStepIndex(), command, ...result });
    if (commandHistory.length > 64) commandHistory.shift();
    // Read-only command evidence in the explicitly marked preview, never a mutable core handle.
    app.dataset.commandHistory = JSON.stringify(commandHistory);
    return result;
  };
  const act = (input: GrowthControlInput) => {
    const decision = decideGrowthControl(content, session.getState(), ui, input);
    const previousUi = ui;
    ui = decision.ui;
    message = decision.reason;
    if (decision.command) {
      const result = dispatch(decision.command);
      if (!result.accepted) {
        ui = { ...previousUi, traitLocked: false };
        message = result.reason ?? "操作不可用";
      } else {
        const type = decision.command.type;
        message = type === "build_building" ? "建筑已建造"
          : type === "upgrade_building" ? "升级完成 · 请选择词条"
          : type === "choose_building_trait" ? "词条已生效"
          : type === "transform_tower" ? "改造完成"
          : type === "destroy_building" ? "建筑已拆除" : "";
        if (type === "restart") {
          battlefield.reset(); options.sound?.resetBattle();
          if (siegeDemo) prepareSiegeDemo(session);
          if (arcaneDemo) prepareArcaneDemo(session);
          if (undeadDemo) prepareUndeadDemo(session);
        }
      }
    }
    messageExpiresAt = message ? performance.now() + 1500 : 0;
    render(0);
  };

  function render(deltaSeconds: number, timestamp?: number): void {
    app.dataset.phase = session.getState().phase;
    app.dataset.clockStep = String(session.getStepIndex());
    app.dataset.openingCountdown = String(session.getState().openingCountdownRemainingSeconds);
    if (!library) {
      hud.inert = true; field.inert = true; controls.inert = true;
      overlay.hidden = true;
      return;
    }
    const state = session.getState();
    if (!state.pendingTraitDraft) ui.traitLocked = false;
    const priority = getGrowthInputPriority(state.phase, ui.transformOpen);
    // Operation feedback expires in real time, including while the battle is frozen.
    if (message && (priority === "system_pause" || priority === "result" || performance.now() >= messageExpiresAt)) {
      message = "";
      messageExpiresAt = 0;
    }
    const modal = priority !== "building" && priority !== "none";
    const events = session.drainEvents();
    for (const event of events) options.sound?.handleEvent(event);
    battlefield.render(state, events, deltaSeconds, ui.selectedSlot);
    if (timestamp !== undefined) options.observeFrame?.(timestamp, state, events, battlefield.snapshot());
    app.dataset.phase = state.phase;
    app.dataset.selectedSlot = ui.selectedSlot ?? "";
    view("wood").innerHTML = `<strong>${Math.floor(state.wood)}</strong><small>+${getWoodProductionPerSecond(state).toFixed(1)}/秒</small>`;
    view("wood").parentElement!.setAttribute("aria-label", `木材 ${Math.floor(state.wood)}，产量每秒 ${getWoodProductionPerSecond(state).toFixed(1)}`);
    view("gold").textContent = `${Number(state.gold.toFixed(2))}`;
    view("gold").parentElement!.setAttribute("aria-label", `金币 ${Number(state.gold.toFixed(2))}`);
    const wallInDanger = isWallInDanger(state);
    view("wall").textContent = `城墙 ${Math.ceil(state.wallHp)}/${state.wallMaxHp}${wallInDanger ? " · 危险" : ""}`;
    view("wall").classList.toggle("danger", wallInDanger);
    view("wall-fill").style.width = `${Math.max(0, state.wallHp / state.wallMaxHp) * 100}%`;
    view("wall-fill").classList.toggle("danger", wallInDanger);
    view("shield").textContent = state.wallShield > 0 ? `护盾 ${Math.ceil(state.wallShield)}/${state.wallShieldMax}` : "";
    const wallPoint = battlefield.projectWall();
    wallHud.style.left = `${wallPoint.x}px`; wallHud.style.top = `${wallPoint.y}px`;
    view("wave").textContent = `第 ${state.wave} 波 / ${state.maxWave}`;
    view("threat").textContent = `亡灵 ${state.enemies.length}`;
    view("time").textContent = deriveGrowthWaveTime(state);
    const charging = state.enemies.find((enemy) => enemy.chargeWarningRemainingSeconds > 0 || enemy.chargeRemainingSeconds > 0);
    view("boss").textContent = [charging ? charging.chargeWarningRemainingSeconds > 0 ? `领主蓄力 ${charging.chargeWarningRemainingSeconds.toFixed(1)}秒 · 即将冲锋` : "领主冲锋中" : "", state.overlordInspireRemainingSeconds > 0 ? `君王鼓舞 ${state.overlordInspireRemainingSeconds.toFixed(1)}秒 · 亡灵强化` : ""].filter(Boolean).join(" · ");
    view("phase").textContent = state.phase === "TACTICAL_PAUSE" ? "战术暂停" : state.phase === "OPENING_COUNTDOWN" ? "准备防线" : `击退 ${state.defeatedEnemies}`;
    const pause = deriveGrowthPauseControl(state.phase);
    pauseButton.textContent = pause.label;
    pauseButton.setAttribute("aria-label", pause.label === "暂停" ? "暂停战斗" : "继续战斗");
    pauseButton.disabled = !pause.enabled || priority !== "building";
    pauseButton.hidden = !pause.visible;
    for (const [slotId, button] of slotButtons) {
      const building = state.buildings.find((candidate) => candidate.slotId === slotId);
      const name = building?.kind === "main_city" ? "主城" : building?.growthDefinitionId ? getGrowthBuildingPresentation(content, building.growthDefinitionId)?.displayName : null;
      const label = building?.kind === "main_city" ? "主城" : building ? `${name ?? "建筑"} Lv.${building.level}` : "+";
      button.textContent = building?.kind === "main_city" ? "主城" : building ? `Lv.${building.level}` : "+";
      button.setAttribute("aria-label", `第${button.dataset.row}行第${button.dataset.column}列，${building ? label.replace("\n", " ") : "空格"}`);
      button.setAttribute("aria-pressed", String(slotId === ui.selectedSlot));
      button.disabled = priority !== "building";
      button.classList.toggle("occupied", Boolean(building));
      button.dataset.definition = building?.growthDefinitionId ?? building?.definitionId ?? "";
      button.dataset.level = building ? String(building.level) : "";
      const point = battlefield.projectSlot(slotId);
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
    }
    const building = state.buildings.find((candidate) => candidate.slotId === ui.selectedSlot);
    let contextHtml = "<strong>部署你的防线</strong><p>选择空地建造，或查看已有建筑。</p>";
    let actionHtml = "";
    if (ui.selectedSlot && !building) {
      const choices = deriveEmptySlotActions(content, state, ui.selectedSlot);
      contextHtml = `<strong>空地 · 建造防线</strong>${choices.map((choice) => `<p>${escapeHtml(getGrowthBuildingPresentation(content, choice.definitionId)?.displayName ?? choice.definitionId)}：${escapeHtml(choice.description)} · ${escapeHtml(choice.reason)}</p>`).join("")}`;
      actionHtml = choices.map((choice) => buttonHtml("build", choice.label, choice.affordable && Boolean(choice.command), `data-definition="${choice.definitionId}"`)).join("");
    } else if (building?.kind === "main_city") {
      const heroName = fantasyHeroContent.heroes.find((hero) => hero.id === state.hero?.definitionId)?.displayName ?? "驻守英雄";
      contextHtml = `<strong>主城 · ${escapeHtml(heroName)}</strong><p>守住城墙 · 基础产木 ${MAIN_CITY_WOOD_INCOME}/秒</p><p>不可升级、改造或拆除</p>`;
    } else if (building) {
      const detail = deriveBuildingDetail(content, state, building);
      if (detail) {
        contextHtml = `<strong>${escapeHtml(detail.name)} · Lv.${detail.level}/${detail.maxLevel}</strong><p>${escapeHtml(detail.role)}</p><p>当前：${statsText(detail.current)}</p><p>${detail.next ? `下级：${statsText(detail.next)}` : "已满级 · 无下级属性"} · ${escapeHtml(detail.upgrade.reason)}</p>`;
        contextHtml += detail.traits.length ? detail.traits.map((trait) => `<p>${escapeHtml(trait.name)} ×${trait.currentStacks} · ${escapeHtml(formatGrowthTraitEffectAtStacks(content, trait.id, trait.currentStacks))}</p>`).join("") : "<p>升级后选择词条</p>";
        if (ui.destroyConfirm) {
          contextHtml = `<strong>确认拆除 ${escapeHtml(detail.name)}？</strong><p>不返还木材或金币，永久失去等级与词条。</p>`;
          actionHtml = buttonHtml("cancel_destroy", "取消拆除") + buttonHtml("confirm_destroy", "确认拆除 · 零返还", true, 'class="destructive"');
        } else {
          actionHtml = buttonHtml("upgrade", detail.upgrade.label, detail.upgrade.affordable);
          if (detail.canTransform) actionHtml += buttonHtml("open_transform", `改造 · 金币 ${detail.transformCostLabel}`);
          actionHtml += buttonHtml("request_destroy", "拆除", true, 'class="destructive"');
        }
      } else contextHtml = "<strong>建筑内容不可用</strong><p>暂无合法成长操作</p>";
    }
    updateHtml(context, contextHtml);
    updateHtml(actions, actionHtml);
    actions.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = priority !== "building"; });
    hud.inert = modal;
    field.inert = modal;
    controls.inert = modal;
    overlay.hidden = !modal;
    let dialogHtml = "";
    if (priority === "trait_draft") {
      const draft = state.pendingTraitDraft;
      const target = state.buildings.find((candidate) => candidate.id === draft?.buildingId);
      const targetName = target?.growthDefinitionId ? getGrowthBuildingPresentation(content, target.growthDefinitionId)?.displayName ?? "建筑" : "建筑";
      dialogHtml = `<h2 id="growth-dialog-title">${escapeHtml(targetName)} · Lv.${target?.level} 词条三选一</h2><p>选择一个以完成升级成长</p><p>仅当前建筑生效 · 选择后恢复原阶段</p><div class="preview-options">${deriveTraitOptions(content, state, draft).map((option, index) => `<button type="button" data-action="choose_trait" data-option="${index}" ${ui.traitLocked ? "disabled" : ""}><strong>${escapeHtml(option.name)} · ${option.currentStacks} → ${option.nextStacks} 层</strong><span>${escapeHtml(option.categoryLabel)}</span><span>${escapeHtml(option.effectText)}</span></button>`).join("")}</div>`;
    } else if (priority === "transform") {
      const options = building ? deriveTransformOptions(content, state, building) : [];
      dialogHtml = `<h2 id="growth-dialog-title">选择改造方向</h2><p>保留当前格位、等级与合法词条</p><div class="preview-options">${options.map((option) => `<button type="button" data-action="transform" data-definition="${option.targetTowerId}" ${option.affordable ? "" : 'aria-disabled="true" class="unaffordable"'}><strong>${escapeHtml(option.name)} · 金币 ${option.goldCost}</strong><span>${escapeHtml(option.role)}</span><span>${escapeHtml(option.reason)}</span></button>`).join("")}</div>${buttonHtml("close_transform", "关闭改造")}`;
    } else if (priority === "system_pause") {
      dialogHtml = '<h2 id="growth-dialog-title" tabindex="-1">系统暂停</h2><p>后台期间停止战斗，返回后保持原阶段与当前操作。</p>';
    } else if (priority === "result") {
      const result = options.result?.();
      const unlocks = result ? [...result.rewards.newlyUnlockedHeroes.map((id) => fantasyHeroContent.heroes.find((hero) => hero.id === id)!.displayName), ...result.rewards.newlyUnlockedLevels.map((id) => fantasyHeroContent.levels.find((level) => level.id === id)!.displayName)] : [];
      dialogHtml = `<h2 id="growth-dialog-title">${state.phase === "VICTORY" ? "防守成功" : "城墙失守"}</h2><p>第 ${state.wave} 波 · 击杀 ${state.defeatedEnemies} · 金币 ${Number(state.gold.toFixed(2))}</p>${unlocks.length ? `<p>新解锁：${escapeHtml(unlocks.join("、"))}</p>` : ""}${buttonHtml("restart", "再战")}${options.returnToLobby ? buttonHtml("return_lobby", "返回营地") : ""}`;
    }
    updateHtml(dialog, dialogHtml);
    notice.textContent = modal ? "" : message;
    modalNotice.textContent = modal ? message : "";
    if (priority !== lastPriority) {
      if (modal) {
        if (lastPriority === "building" || lastPriority === "none") previousFocus = document.activeElement as HTMLElement;
        (dialog.querySelector<HTMLElement>("button:not([disabled])") ?? dialog.querySelector<HTMLElement>("h2"))?.focus({ preventScroll: true });
      } else if (previousFocus?.isConnected && !previousFocus.closest("[inert]")) previousFocus.focus({ preventScroll: true });
      lastPriority = priority;
    }
  }

  const click = (event: MouseEvent) => {
    // A build button becomes an upgrade button at the same screen position.
    // Treat the follow-up click in a multi-click gesture as the same input.
    if (event.detail > 1) return;
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-action]");
    options.sound?.unlock();
    if (button?.dataset.action === "mute") { options.sound?.toggleMuted(); updateMute(); return; }
    if (button?.dataset.action === "retry_assets") { void loadAssets(); return; }
    if (!library) return;
    if (button?.dataset.action === "quality") {
      if (!overlay.hidden) return;
      quality = quality === "standard" ? "low" : "standard"; battlefield.setQuality(quality); saveGraphicsQuality(quality); options.qualityChanged?.(quality); updateQuality(); render(0); return;
    }
    if (button) {
      event.stopPropagation();
      const action = button.dataset.action!;
      if (action === "replay_victory" || action === "replay_defeat") {
        if (options.developmentReplay && getGrowthInputPriority(session.getState().phase, ui.transformOpen) === "building") {
          battlefield.reset(); options.sound?.resetBattle();
          app.dataset.replayEvidence = JSON.stringify(replayCampaignBattle(session, action === "replay_victory" ? "victory" : "defeat"));
          ui = initialGrowthUiState(); render(0);
        }
        return;
      }
      if (action === "return_lobby") { options.returnToLobby?.(); return; }
      if (action === "restart" && options.retry) { if (options.retry()) { battlefield.reset(); ui = initialGrowthUiState(); options.sound?.resetBattle(); options.sound?.playUi("battle_start"); render(0); } return; }
      if (action === "build") act({ type: "build", definitionId: button.dataset.definition as "arrow_tower" | "lumberyard" });
      else if (action === "transform") act({ type: "transform", targetTowerId: button.dataset.definition as GrowthSpecialTowerId });
      else if (action === "choose_trait") act({ type: "choose_trait", index: Number(button.dataset.option) });
      else act({ type: action as Exclude<GrowthControlInput["type"], "select_slot" | "build" | "transform" | "choose_trait"> });
      return;
    }
    if (target.closest(".preview-overlay")) return;
    const slot = target.closest<HTMLElement>("[data-slot]");
    if (slot) act({ type: "select_slot", slotId: slot.dataset.slot! });
    else if (target.tagName === "CANVAS") {
      const slotId = battlefield.pick(event.clientX, event.clientY);
      act(slotId ? { type: "select_slot", slotId } : { type: "clear_selection" });
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (overlay.hidden || event.key !== "Tab") return;
    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!buttons.length) { event.preventDefault(); return; }
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1)!.focus(); }
    else if (!event.shiftKey && (index === buttons.length - 1 || index === -1)) { event.preventDefault(); buttons[0]!.focus(); }
  };
  const systemPause = () => { dispatch({ type: "system_pause" }); options.sound?.suspend(); render(0); };
  const systemResume = () => { if (!document.hidden) { dispatch({ type: "system_resume" }); options.sound?.resume(); render(0); } };
  const visibility = () => document.hidden ? systemPause() : systemResume();
  const resize = () => { battlefield.resize(); render(0); };
  const observer = new ResizeObserver(resize);
  observer.observe(field);
  app.addEventListener("click", click);
  app.addEventListener("keydown", keydown);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", systemPause);
  window.addEventListener("focus", systemResume);
  battlefield.resize();
  if (document.hidden) dispatch({ type: "system_pause" });
  render(0);
  async function loadAssets(): Promise<void> {
    if (loading || disposed) return;
    loading = true;
    app.dataset.assetState = "loading";
    retryAssets.hidden = true;
    loadingProgress.textContent = "准备英雄与防线 · 0%";
    try {
      const loaded = options.library ?? await ModelLibrary.load(({ loaded, total }) => {
        if (!disposed) loadingProgress.textContent = `准备英雄与防线 · ${Math.round(loaded / total * 100)}%`;
      });
      if (disposed) { if (!options.library) loaded.dispose(); return; }
      library = loaded;
      if (undeadDemo && !demoPrepared) { prepareUndeadDemo(session); demoPrepared = true; }
      battlefield.setModels(loaded);
      loadingOverlay.hidden = true;
      app.dataset.assetState = "ready";
      render(0);
    } catch {
      if (!disposed) {
        app.dataset.assetState = "failed";
        loadingProgress.textContent = "资源加载中断，请检查网络后重试。";
        retryAssets.hidden = false;
      }
    } finally { loading = false; }
  }
  void loadAssets();
  const frame = (timestamp: number) => {
    if (disposed) return;
    // The session sees its first timestamp only after all required assets are ready.
    if (library) render(session.advanceFrame(timestamp) / 30, timestamp);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    app.removeEventListener("click", click);
    app.removeEventListener("keydown", keydown);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", systemPause);
    window.removeEventListener("focus", systemResume);
    window.removeEventListener("pagehide", pageHide);
    window.removeEventListener("pageshow", pageShow);
    session.dispose();
    battlefield.dispose();
    if (!options.library) library?.dispose();
    app.replaceChildren();
    app.classList.remove("battle-app");
    for (const key of ["browserUserAgent", "renderPixelRatio", "phase", "selectedSlot", "commandHistory", "assetState", "clockStep", "openingCountdown"]) delete app.dataset[key];
  };
  const pageHide = (event: PageTransitionEvent) => { if (event.persisted) systemPause(); else dispose(); };
  const pageShow = (event: PageTransitionEvent) => { if (event.persisted) systemResume(); };
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  return dispose;
}

/** Compatibility for explicitly marked historical development entries. */
export const mountWhiteboxPreview = mountBattlePresentation;

