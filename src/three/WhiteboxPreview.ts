import { BattleSession } from "../core/battleSession";
import { starterCatalog } from "../core/content";
import { getWoodProductionPerSecond } from "../core/resources";
import { CAMP_SLOT_IDS } from "../core/types";
import { deriveEmptySlotActions, deriveGrowthPauseControl, getGrowthInputPriority } from "../phaser/growthUi";
import { Battlefield } from "./Battlefield";
import { isWallInDanger } from "./whiteboxCatalog";
import "./preview.css";

/** Deliberately limited Stage A UI. Full building growth follows in Issue #3. */
export function mountWhiteboxPreview(app: HTMLElement): () => void {
  app.classList.add("whitebox-app");
  // Read-only evidence metadata, confined to this explicitly marked preview.
  app.dataset.browserUserAgent = navigator.userAgent;
  app.dataset.renderPixelRatio = String(Math.min(window.devicePixelRatio, 2));
  app.innerHTML = `
    <header class="preview-hud">
      <div class="preview-title"><strong>开发白模 · Three.js</strong><a href="${import.meta.env.BASE_URL}">原版入口</a></div>
      <div class="preview-resources"><span data-view="wood"></span><span data-view="gold"></span></div>
      <div class="preview-wall"><span data-view="wall"></span><span data-view="shield"></span></div>
      <div class="preview-wave"><span data-view="wave"></span><span data-view="time"></span></div>
    </header>
    <section class="preview-field" aria-label="白模防线">
      <div class="preview-zone">亡灵推进区 ↓</div>
      <div class="preview-slots" aria-label="5×3 营地格位"></div>
      <div class="preview-overlay" hidden><div class="preview-dialog"><h2></h2><p></p><button type="button" data-action="restart">重新开始</button></div></div>
    </section>
    <footer class="preview-controls">
      <div class="preview-status"><span data-view="phase"></span><button type="button" data-action="pause">暂停</button></div>
      <div class="preview-context" aria-live="polite"><strong data-view="selection">点击营地空格建造</strong><span data-view="detail">固定主城在第三行第三列</span></div>
      <button class="preview-build" type="button" data-action="build" hidden></button>
      <div class="preview-notice" role="status"></div>
    </footer>`;
  const session = new BattleSession({ seed: 1337, config: { heroId: "camp_warden", levelId: "first_defense" } });
  const field = app.querySelector<HTMLElement>(".preview-field")!;
  let battlefield: Battlefield;
  try { battlefield = new Battlefield(field); }
  catch {
    app.innerHTML = `<div class="preview-error"><h1>开发白模暂时无法显示</h1><p>请使用支持 WebGL 2 的浏览器，或重新加载后重试。</p><a href="${import.meta.env.BASE_URL}">返回原版入口</a></div>`;
    session.dispose();
    return () => { app.replaceChildren(); app.classList.remove("whitebox-app"); };
  }
  const view = (name: string) => app.querySelector<HTMLElement>(`[data-view="${name}"]`)!;
  const pauseButton = app.querySelector<HTMLButtonElement>("[data-action=pause]")!;
  const buildButton = app.querySelector<HTMLButtonElement>("[data-action=build]")!;
  const overlay = app.querySelector<HTMLElement>(".preview-overlay")!;
  const notice = app.querySelector<HTMLElement>(".preview-notice")!;
  const slots = app.querySelector<HTMLElement>(".preview-slots")!;
  const slotButtons = new Map<string, HTMLButtonElement>();
  let selected: string | null = null;
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

  const selectSlot = (slotId: string) => {
    if (getGrowthInputPriority(session.getState().phase, false) !== "building") return;
    selected = slotId;
    notice.textContent = "";
    render(0);
  };

  function render(deltaSeconds: number): void {
    const state = session.getState();
    battlefield.render(state, session.drainEvents(), deltaSeconds, selected);
    view("wood").textContent = `木材 ${Math.floor(state.wood)} · +${getWoodProductionPerSecond(state).toFixed(1)}/秒`;
    view("gold").textContent = `金币 ${Number(state.gold.toFixed(2))}`;
    const wallInDanger = isWallInDanger(state);
    view("wall").textContent = `城墙 ${Math.ceil(state.wallHp)} / ${state.wallMaxHp}${wallInDanger ? " · 危险" : ""}`;
    view("wall").classList.toggle("danger", wallInDanger);
    view("shield").textContent = `护盾 ${Math.ceil(state.wallShield)} / ${state.wallShieldMax}`;
    view("wave").textContent = `波次 ${state.wave} / ${state.maxWave} · 敌人 ${state.enemies.length}`;
    view("time").textContent = state.phase === "OPENING_COUNTDOWN" || state.pausedFromPhase === "OPENING_COUNTDOWN" || state.systemPausedFromPhase === "OPENING_COUNTDOWN"
      ? `首波 ${Math.ceil(state.openingCountdownRemainingSeconds)} 秒`
      : state.wave < state.maxWave ? `下一波 ${Math.ceil(state.nextWaveTimeRemainingSeconds)} 秒` : "最后一波";
    view("phase").textContent = state.phase === "TACTICAL_PAUSE" ? "战术暂停 · 可建造" : state.phase === "OPENING_COUNTDOWN" ? "准备防线" : `战斗 ${Math.floor(state.effectiveBattleTimeSeconds)} 秒 · 击杀 ${state.defeatedEnemies}`;
    const pause = deriveGrowthPauseControl(state.phase);
    pauseButton.textContent = pause.label;
    pauseButton.disabled = !pause.enabled;
    pauseButton.hidden = !pause.visible;
    for (const [slotId, button] of slotButtons) {
      const building = state.buildings.find((candidate) => candidate.slotId === slotId);
      const label = building?.kind === "main_city" ? "主城" : building ? `箭塔 Lv.${building.level}` : `${button.dataset.row}·${button.dataset.column}`;
      button.textContent = label;
      button.setAttribute("aria-label", `第${button.dataset.row}行第${button.dataset.column}列，${building ? label : "空格"}`);
      button.setAttribute("aria-pressed", String(slotId === selected));
      button.disabled = getGrowthInputPriority(state.phase, false) !== "building";
      button.classList.toggle("occupied", Boolean(building));
      const point = battlefield.projectSlot(slotId);
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
    }
    const building = state.buildings.find((candidate) => candidate.slotId === selected);
    buildButton.hidden = true;
    if (!selected) {
      view("selection").textContent = "点击营地空格建造";
      view("detail").textContent = "固定主城在第三行第三列";
    } else if (building) {
      view("selection").textContent = building.kind === "main_city" ? "固定主城" : `箭塔 Lv.${building.level}`;
      view("detail").textContent = building.kind === "main_city" ? "主城不可建造或拆除 · 持续生产木材" : "单体攻击 · 升级与改造界面在后续阶段接入";
    } else {
      const action = deriveEmptySlotActions(starterCatalog.buildingGrowth, state, selected)[0]!;
      view("selection").textContent = `已选第 ${slotButtons.get(selected)!.dataset.row} 行第 ${slotButtons.get(selected)!.dataset.column} 列`;
      view("detail").textContent = `${action.description} · ${action.reason || action.statusLabel}`;
      buildButton.textContent = action.label;
      buildButton.disabled = !action.affordable || !action.command || getGrowthInputPriority(state.phase, false) !== "building";
      buildButton.hidden = false;
    }
    const systemPaused = state.phase === "SYSTEM_PAUSE";
    const ended = state.phase === "VICTORY" || state.phase === "DEFEAT";
    overlay.hidden = !systemPaused && !ended;
    overlay.querySelector("h2")!.textContent = systemPaused ? "系统暂停" : state.phase === "VICTORY" ? "防守成功" : "城墙失守";
    overlay.querySelector("p")!.textContent = systemPaused ? "后台期间停止战斗，返回后从当前时刻继续。" : `击杀 ${state.defeatedEnemies} · 金币 ${Number(state.gold.toFixed(2))}`;
    overlay.querySelector<HTMLButtonElement>("button")!.hidden = systemPaused;
  }

  const click = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const slot = target.closest<HTMLElement>("[data-slot]");
    if (slot) { selectSlot(slot.dataset.slot!); return; }
    const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "pause") {
      const pause = deriveGrowthPauseControl(session.getState().phase);
      if (pause.enabled) session.dispatch({ type: pause.label === "暂停" ? "pause" : "resume" });
    } else if (action === "build" && selected) {
      const state = session.getState();
      if (!state.buildings.some((building) => building.slotId === selected) && getGrowthInputPriority(state.phase, false) === "building") {
        const build = deriveEmptySlotActions(starterCatalog.buildingGrowth, state, selected)[0]!;
        if (build.command && build.affordable) {
          const result = session.dispatch(build.command);
          notice.textContent = result.accepted ? "箭塔已建造 · 木材扣费一次" : result.reason ?? "操作不可用";
        }
      }
    } else if (action === "restart") {
      session.dispatch({ type: "restart" });
      battlefield.reset();
      selected = null;
      notice.textContent = "";
    } else if (target.tagName === "CANVAS") {
      const slotId = battlefield.pick(event.clientX, event.clientY);
      if (slotId) selectSlot(slotId);
      return;
    }
    render(0);
  };
  const systemPause = () => { session.dispatch({ type: "system_pause" }); render(0); };
  const systemResume = () => { if (!document.hidden) { session.dispatch({ type: "system_resume" }); render(0); } };
  const visibility = () => document.hidden ? systemPause() : systemResume();
  const resize = () => { battlefield.resize(); render(0); };
  const observer = new ResizeObserver(resize);
  observer.observe(field);
  app.addEventListener("click", click);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", systemPause);
  window.addEventListener("focus", systemResume);
  battlefield.resize();
  if (document.hidden) session.dispatch({ type: "system_pause" });
  render(0);
  const frame = (timestamp: number) => {
    if (disposed) return;
    render(session.advanceFrame(timestamp) / 30);
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    app.removeEventListener("click", click);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", systemPause);
    window.removeEventListener("focus", systemResume);
    window.removeEventListener("pagehide", pageHide);
    window.removeEventListener("pageshow", pageShow);
    session.dispose();
    battlefield.dispose();
    app.replaceChildren();
    app.classList.remove("whitebox-app");
    delete app.dataset.browserUserAgent;
    delete app.dataset.renderPixelRatio;
  };
  const pageHide = (event: PageTransitionEvent) => { if (event.persisted) systemPause(); else dispose(); };
  const pageShow = (event: PageTransitionEvent) => { if (event.persisted) systemResume(); };
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  return dispose;
}
