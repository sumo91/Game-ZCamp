import { BattleSession } from "../core/battleSession";
import { starterCatalog } from "../core/content";
import { getGrowthBuildingPresentation, type GrowthSpecialTowerId } from "../core/buildingGrowth";
import { getWoodProductionPerSecond, MAIN_CITY_WOOD_INCOME } from "../core/resources";
import { CAMP_SLOT_IDS, type GameCommand } from "../core/types";
import { decideGrowthControl, initialGrowthUiState, type GrowthControlInput } from "../ui/growthControls";
import { deriveBuildingDetail, deriveEmptySlotActions, deriveGrowthPauseControl, deriveGrowthWaveTime, deriveTraitOptions, deriveTransformOptions, formatGrowthTraitEffectAtStacks, getGrowthInputPriority, type GrowthStatsView } from "../ui/growthUi";
import { Battlefield } from "./Battlefield";
import { isWallInDanger } from "./whiteboxCatalog";
import { ModelLibrary } from "./ModelLibrary";
import { buildingAsset, SAMPLE_COVERAGE } from "./assetCatalog";
import { withFantasySiegePresentation } from "./fantasySiegePresentation";
import { createSiegeDemoSession, SIEGE_DEMO_LABEL } from "./siegeDemo";
import "./preview.css";

const content = withFantasySiegePresentation(starterCatalog.buildingGrowth);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const number = (value: number | undefined) => Number((value ?? 0).toFixed(2));
const statsText = (stats: GrowthStatsView) => stats.kind === "lumberyard"
  ? `产木 ${number(stats.woodPerSecond)}/秒`
  : `伤害 ${number(stats.damage)} · 间隔 ${number(stats.attackIntervalSeconds)}秒 · 射程 ${number(stats.range)}`;

/** Partial art sample; loading and presentation never write simulation state. */
export function mountWhiteboxPreview(app: HTMLElement): () => void {
  const siegeDemo = new URLSearchParams(window.location.search).get("demo") === "siege";
  app.classList.add("whitebox-app");
  app.dataset.browserUserAgent = navigator.userAgent;
  app.dataset.renderPixelRatio = String(Math.min(window.devicePixelRatio, 2));
  app.innerHTML = `
    <header class="preview-hud">
      <div class="preview-title"><strong>精修美术样板 · 部分覆盖</strong><a href="${import.meta.env.BASE_URL}">原版入口</a></div>
      <div class="preview-resources"><span data-view="wood"></span><span data-view="gold"></span></div>
      <div class="preview-wall"><span data-view="wall"></span><span data-view="shield"></span></div>
      <div class="preview-wave"><span data-view="wave"></span><span data-view="time"></span></div>
    </header>
    <section class="preview-field" aria-label="人类堡垒与亡灵防线">
      <div class="preview-zone">亡灵推进区 ↓<small>英雄 / 寒霜雷电 / 其余敌人：开发占位</small></div>
      <div class="preview-slots" aria-label="5×3 营地格位"></div>
    </section>
    <footer class="preview-controls">
      <div class="preview-status"><span data-view="phase"></span><button type="button" data-action="toggle_pause">暂停</button></div>
      <div class="preview-context preview-scroll" aria-label="所选建筑详情" tabindex="0"></div>
      <div class="preview-actions"></div>
      <div class="preview-notice" role="status" aria-live="polite"></div>
    </footer>
    <div class="preview-overlay" hidden><section class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="growth-dialog-title">
      <div class="preview-dialog-content preview-scroll"></div><div class="preview-modal-notice" role="status" aria-live="polite"></div>
    </section></div>
    <div class="preview-loading" data-loading role="status" aria-live="polite"><section><h2>准备营地资产</h2><p data-loading-progress>加载模型…</p><p>${SAMPLE_COVERAGE}</p><button type="button" data-action="retry_assets" hidden>重试加载</button></section></div>`;
  const session = siegeDemo ? createSiegeDemoSession() : new BattleSession({ seed: 1337, config: { heroId: "camp_warden", levelId: "first_defense" } });
  if (siegeDemo) app.querySelector<HTMLElement>(".preview-title strong")!.textContent = SIEGE_DEMO_LABEL;
  const field = app.querySelector<HTMLElement>(".preview-field")!;
  let battlefield: Battlefield;
  try { battlefield = new Battlefield(field); }
  catch {
    app.innerHTML = `<div class="preview-error"><h1>美术样板暂时无法显示</h1><p>请使用支持 WebGL 2 的浏览器，或重新加载后重试。</p><a href="${import.meta.env.BASE_URL}">返回原版入口</a></div>`;
    session.dispose();
    return () => { app.replaceChildren(); app.classList.remove("whitebox-app"); };
  }
  const view = (name: string) => app.querySelector<HTMLElement>(`[data-view="${name}"]`)!;
  const hud = app.querySelector<HTMLElement>(".preview-hud")!;
  const controls = app.querySelector<HTMLElement>(".preview-controls")!;
  const context = app.querySelector<HTMLElement>(".preview-context")!;
  const actions = app.querySelector<HTMLElement>(".preview-actions")!;
  const pauseButton = app.querySelector<HTMLButtonElement>("[data-action=toggle_pause]")!;
  const overlay = app.querySelector<HTMLElement>(".preview-overlay")!;
  const dialog = app.querySelector<HTMLElement>(".preview-dialog-content")!;
  const notice = app.querySelector<HTMLElement>(".preview-notice")!;
  const modalNotice = app.querySelector<HTMLElement>(".preview-modal-notice")!;
  const slots = app.querySelector<HTMLElement>(".preview-slots")!;
  const loadingOverlay = app.querySelector<HTMLElement>("[data-loading]")!;
  const loadingProgress = app.querySelector<HTMLElement>("[data-loading-progress]")!;
  const retryAssets = app.querySelector<HTMLButtonElement>("[data-action=retry_assets]")!;
  let library: ModelLibrary | null = null;
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
        message = type === "build_building" ? "建筑已建造 · 木材扣费一次"
          : type === "upgrade_building" ? "升级扣费一次 · 请选择当前建筑词条"
          : type === "choose_building_trait" ? "词条仅对当前建筑生效"
          : type === "transform_tower" ? "改造完成 · 保留等级与合法词条"
          : type === "destroy_building" ? "建筑已拆除 · 不返还木材或金币" : "";
        if (type === "restart") battlefield.reset();
      }
    }
    messageExpiresAt = message ? performance.now() + 1500 : 0;
    render(0);
  };

  function render(deltaSeconds: number): void {
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
    battlefield.render(state, session.drainEvents(), deltaSeconds, ui.selectedSlot);
    app.dataset.phase = state.phase;
    app.dataset.selectedSlot = ui.selectedSlot ?? "";
    view("wood").textContent = `木材 ${Math.floor(state.wood)} · +${getWoodProductionPerSecond(state).toFixed(1)}/秒`;
    view("gold").textContent = `金币 ${Number(state.gold.toFixed(2))}`;
    const wallInDanger = isWallInDanger(state);
    view("wall").textContent = `城墙 ${Math.ceil(state.wallHp)} / ${state.wallMaxHp}${wallInDanger ? " · 危险" : ""}`;
    view("wall").classList.toggle("danger", wallInDanger);
    view("shield").textContent = `护盾 ${Math.ceil(state.wallShield)} / ${state.wallShieldMax}`;
    view("wave").textContent = `波次 ${state.wave} / ${state.maxWave} · 敌人 ${state.enemies.length}`;
    view("time").textContent = deriveGrowthWaveTime(state);
    view("phase").textContent = state.phase === "TACTICAL_PAUSE" ? "战术暂停 · 可成长" : state.phase === "OPENING_COUNTDOWN" ? "准备防线" : `战斗 ${Math.floor(state.effectiveBattleTimeSeconds)} 秒 · 击杀 ${state.defeatedEnemies}`;
    const pause = deriveGrowthPauseControl(state.phase);
    pauseButton.textContent = pause.label;
    pauseButton.disabled = !pause.enabled || priority !== "building";
    pauseButton.hidden = !pause.visible;
    for (const [slotId, button] of slotButtons) {
      const building = state.buildings.find((candidate) => candidate.slotId === slotId);
      const name = building?.kind === "main_city" ? "主城" : building?.growthDefinitionId ? getGrowthBuildingPresentation(content, building.growthDefinitionId)?.displayName : null;
      const label = building?.kind === "main_city" ? "主城" : building ? `${name ?? "建筑"} Lv.${building.level}` : `${button.dataset.row}·${button.dataset.column}`;
      button.textContent = label;
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
    let contextHtml = "<strong>点击营地格位</strong><p>选择空格建造，或查看已有建筑。</p>";
    let actionHtml = "";
    if (ui.selectedSlot && !building) {
      const choices = deriveEmptySlotActions(content, state, ui.selectedSlot);
      const slotButton = slotButtons.get(ui.selectedSlot)!;
      contextHtml = `<strong>第 ${slotButton.dataset.row} 行第 ${slotButton.dataset.column} 列 · 空格</strong>${choices.map((choice) => `<p>${escapeHtml(getGrowthBuildingPresentation(content, choice.definitionId)?.displayName ?? choice.definitionId)}：${escapeHtml(choice.description)} · ${escapeHtml(choice.reason)}</p>`).join("")}`;
      actionHtml = choices.map((choice) => buttonHtml("build", choice.label, choice.affordable && Boolean(choice.command), `data-definition="${choice.definitionId}"`)).join("");
    } else if (building?.kind === "main_city") {
      contextHtml = `<strong>固定主城 · Lv.1 · 精修 GLB</strong><p>驻守英雄与城墙防线 · 基础产木 ${MAIN_CITY_WOOD_INCOME}/秒</p><p>固定第 3 行第 3 列 · 不可升级、改造或拆除</p>`;
    } else if (building) {
      const detail = deriveBuildingDetail(content, state, building);
      if (detail) {
        const asset = buildingAsset(building.growthDefinitionId ?? "main_city", building.level);
        contextHtml = `<strong>${escapeHtml(detail.name)} · Lv.${detail.level}/${detail.maxLevel} · ${asset ? "精修 GLB" : "开发占位"}</strong><p>${escapeHtml(detail.role)}</p><p>当前：${statsText(detail.current)}</p><p>${detail.next ? `下级：${statsText(detail.next)}` : "已满级 · 无下级属性"} · ${escapeHtml(detail.upgrade.reason)}</p>`;
        contextHtml += detail.traits.length ? detail.traits.map((trait) => `<p>${escapeHtml(trait.name)} ×${trait.currentStacks} · ${escapeHtml(formatGrowthTraitEffectAtStacks(content, trait.id, trait.currentStacks))}</p>`).join("") : "<p>尚无词条 · 升级后强制三选一</p>";
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
      const targetButton = target ? slotButtons.get(target.slotId)! : null;
      dialogHtml = `<h2 id="growth-dialog-title">${escapeHtml(targetName)} · Lv.${target?.level} 词条三选一</h2><p>第 ${targetButton?.dataset.row} 行第 ${targetButton?.dataset.column} 列 · 选择一个以完成升级成长</p><p>仅当前建筑生效 · 选择后恢复原阶段</p><div class="preview-options">${deriveTraitOptions(content, state, draft).map((option, index) => `<button type="button" data-action="choose_trait" data-option="${index}" ${ui.traitLocked ? "disabled" : ""}><strong>${escapeHtml(option.name)} · ${option.currentStacks} → ${option.nextStacks} 层</strong><span>${escapeHtml(option.categoryLabel)}</span><span>${escapeHtml(option.effectText)}</span></button>`).join("")}</div>`;
    } else if (priority === "transform") {
      const options = building ? deriveTransformOptions(content, state, building) : [];
      dialogHtml = `<h2 id="growth-dialog-title">箭塔四路改造 · 开发白模</h2><p>保留当前格位、等级与合法词条 · 不额外暂停战斗</p><div class="preview-options">${options.map((option) => `<button type="button" data-action="transform" data-definition="${option.targetTowerId}" ${option.affordable ? "" : 'aria-disabled="true" class="unaffordable"'}><strong>${escapeHtml(option.name)} · 金币 ${option.goldCost}</strong><span>${escapeHtml(option.role)} · 白模</span><span>${escapeHtml(option.reason)}</span></button>`).join("")}</div>${buttonHtml("close_transform", "关闭改造")}`;
    } else if (priority === "system_pause") {
      dialogHtml = '<h2 id="growth-dialog-title" tabindex="-1">系统暂停</h2><p>后台期间停止战斗，返回后保持原阶段与当前操作。</p>';
    } else if (priority === "result") {
      dialogHtml = `<h2 id="growth-dialog-title">${state.phase === "VICTORY" ? "防守成功" : "城墙失守"}</h2><p>击杀 ${state.defeatedEnemies} · 金币 ${Number(state.gold.toFixed(2))}</p>${buttonHtml("restart", "重新开始")}`;
    }
    updateHtml(dialog, dialogHtml);
    notice.textContent = modal ? "" : message;
    modalNotice.textContent = modal ? message : "";
    if (priority !== lastPriority) {
      if (modal) {
        if (lastPriority === "building") previousFocus = document.activeElement as HTMLElement;
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
    if (button?.dataset.action === "retry_assets") { void loadAssets(); return; }
    if (!library) return;
    if (button) {
      event.stopPropagation();
      const action = button.dataset.action!;
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
  const systemPause = () => { dispatch({ type: "system_pause" }); render(0); };
  const systemResume = () => { if (!document.hidden) { dispatch({ type: "system_resume" }); render(0); } };
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
    loadingProgress.textContent = "0% · 加载模型与材质";
    try {
      const loaded = await ModelLibrary.load(({ loaded, total, name }) => {
        if (!disposed) loadingProgress.textContent = `${Math.round(loaded / total * 100)}% · ${loaded}/${total} · ${name}`;
      });
      if (disposed) { loaded.dispose(); return; }
      library = loaded;
      battlefield.setModels(loaded);
      loadingOverlay.hidden = true;
      app.dataset.assetState = "ready";
      render(0);
    } catch (error) {
      if (!disposed) {
        app.dataset.assetState = "failed";
        loadingProgress.textContent = `加载失败：${error instanceof Error ? error.message : "资源不可用"}。检查连接后重试。`;
        retryAssets.hidden = false;
      }
    } finally { loading = false; }
  }
  void loadAssets();
  const frame = (timestamp: number) => {
    if (disposed) return;
    // The session sees its first timestamp only after all required assets are ready.
    if (library) render(session.advanceFrame(timestamp) / 30);
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
    library?.dispose();
    app.replaceChildren();
    app.classList.remove("whitebox-app");
    for (const key of ["browserUserAgent", "renderPixelRatio", "phase", "selectedSlot", "commandHistory", "assetState", "clockStep", "openingCountdown"]) delete app.dataset[key];
  };
  const pageHide = (event: PageTransitionEvent) => { if (event.persisted) systemPause(); else dispose(); };
  const pageShow = (event: PageTransitionEvent) => { if (event.persisted) systemResume(); };
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  return dispose;
}
