import { SoundDirector } from "../audio/SoundDirector";
import { Campaign } from "../ui/campaign";
import { HeroGallery } from "./HeroGallery";
import { ModelLibrary } from "./ModelLibrary";
import { mountBattlePresentation } from "./WhiteboxPreview";
import "./lobby.css";
import { GRAPHICS_QUALITY, readGraphicsQuality, saveGraphicsQuality } from "./graphicsQuality";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** Page owner: one library, one sound director, one campaign, one active screen. */
export function mountThreeGame(app: HTMLElement, options: { developmentReplay?: boolean } = {}): () => void {
  const campaign = new Campaign();
  const sound = new SoundDirector();
  let library: ModelLibrary | null = null;
  let gallery: HeroGallery | null = null;
  let battleDispose: (() => void) | null = null;
  let frameId = 0;
  let disposed = false;
  let loading = false;
  let lobbyMessage = "";
  let lastFrame = 0;
  let quality = readGraphicsQuality();
  let lobbyEvidencePending = false;
  const lifecycleEvidence: unknown[] = [];

  const updateLobby = () => {
    const view = campaign.view();
    for (const card of [...view.heroCards, ...view.levelCards]) {
      const button = app.querySelector<HTMLButtonElement>(`[data-card="${card.id}"]`)!;
      button.classList.toggle("selected", card.selected);
      button.classList.toggle("locked", card.locked);
      button.setAttribute("aria-pressed", String(card.selected));
      button.setAttribute("aria-disabled", String(card.locked));
      button.querySelector<HTMLElement>("[data-lock]")!.textContent = card.locked ? card.lockHint : card.selected ? "已选择" : "可出战";
    }
    app.querySelector<HTMLElement>("[data-hero-detail]")!.innerHTML = `<h3>${escapeHtml(view.selectedHeroName)}</h3>${view.selectedHeroDetailLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}`;
    app.querySelector<HTMLElement>("[data-level-detail]")!.innerHTML = `<h3>${escapeHtml(view.selectedLevelName)}${view.selectedLevelCleared ? " · 已通关" : ""}</h3><p>${escapeHtml(view.selectedLevelDetail)}</p>`;
    app.querySelector<HTMLElement>("[data-start-label]")!.textContent = view.startLabel;
    app.querySelector<HTMLElement>("[data-start-detail]")!.textContent = view.startSublabel;
    app.querySelector<HTMLElement>("[data-lobby-notice]")!.textContent = lobbyMessage;
    app.querySelector<HTMLButtonElement>("[data-lobby-action=start]")!.disabled = !library;
    app.querySelector<HTMLButtonElement>("[data-lobby-action=mute]")!.textContent = sound.isMuted() ? "声音已关闭" : "声音已开启";
    app.querySelector<HTMLButtonElement>("[data-lobby-action=quality]")!.textContent = `画质·${GRAPHICS_QUALITY[quality].label}`;
  };
  const showLobby = () => {
    battleDispose?.(); battleDispose = null;
    sound.resetBattle();
    campaign.returnToLobby();
    app.classList.remove("battle-app"); app.classList.add("lobby-app"); app.dataset.screen = "lobby";
    const view = campaign.view();
    app.innerHTML = `<header class="lobby-header"><div class="lobby-crest" aria-hidden="true">Z</div><div><small>人类堡垒 · 亡灵围城</small><h1>尸潮营地</h1></div><div class="lobby-settings"><button type="button" data-lobby-action="quality">画质</button><button type="button" data-lobby-action="mute">声音</button></div></header>
      <main class="lobby-scroll"><section class="lobby-intro"><span>守住黎明前的最后一道城墙</span><p>${options.developmentReplay ? "开发演示 · 可加速真实战役，结果会记录到本浏览器进度。" : "选择你的驻守英雄，建造并强化防线。"}</p></section>
      <section class="lobby-section"><h2>驻守英雄</h2><div class="lobby-heroes">${view.heroCards.map((card) => `<button type="button" class="lobby-hero-card" data-card="${card.id}" data-kind="hero"><span class="lobby-portrait" data-portrait="${card.id}"></span><strong>${escapeHtml(card.title)}</strong><span class="lobby-role">${escapeHtml(card.subtitle)}</span><small data-lock></small></button>`).join("")}</div><div class="lobby-detail" data-hero-detail></div></section>
      <section class="lobby-section"><h2>前线战役</h2><div class="lobby-levels">${view.levelCards.map((card, index) => `<button type="button" class="lobby-level-card" data-card="${card.id}" data-kind="level"><span class="lobby-level-number" aria-hidden="true">0${index+1}</span><span><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.subtitle)}</span><small data-lock></small></span><span class="lobby-difficulty">${"◆".repeat(card.stars)}<small>${escapeHtml(card.starLabel)}</small></span></button>`).join("")}</div><div class="lobby-detail" data-level-detail></div></section></main>
      <footer class="lobby-footer"><p data-lobby-notice role="status" aria-live="polite"></p><button type="button" class="lobby-start" data-lobby-action="start"><strong data-start-label></strong><span data-start-detail></span></button></footer>
      <div class="lobby-loading" ${library ? "hidden" : ""} role="status"><h2>准备营地</h2><p data-load-progress>正在准备英雄与防线…</p><button type="button" data-lobby-action="retry" hidden>重试加载</button></div>`;
    if (library) {
      try { gallery = new HeroGallery(app.querySelector<HTMLElement>(".lobby-heroes")!, library, quality); }
      catch { lobbyMessage = "英雄预览暂时不可用，仍可正常出战。"; }
    }
    lastFrame = 0; updateLobby();
    lobbyEvidencePending = true;
    for (const panel of Array.from(app.querySelectorAll<HTMLElement>(".lobby-header, .lobby-scroll, .lobby-footer"))) panel.inert = !library;
  };
  const start = () => {
    if (!library || battleDispose || disposed) return;
    const session = campaign.start();
    if (!session) return;
    gallery?.dispose(); gallery = null;
    app.classList.remove("lobby-app"); app.dataset.screen = "battle";
    sound.resetBattle(); sound.playUi("battle_start");
    let announced = false;
    battleDispose = mountBattlePresentation(app, { session, library, sound, developmentReplay: options.developmentReplay, quality, qualityChanged: (next) => { quality = next; saveGraphicsQuality(next); },
      result: () => { const result = campaign.result(); if (result && !announced) { announced = true; sound.playUi(result.victory ? "victory" : "defeat"); } return result; },
      retry: () => { const accepted = campaign.retry(); if (accepted) announced = false; return accepted; },
      returnToLobby: showLobby,
    });
  };
  const click = (event: MouseEvent) => {
    if (battleDispose || disposed || event.detail > 1) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!button) return;
    sound.unlock();
    const action = button.dataset.lobbyAction;
    if (!library && action !== "retry") return;
    if (action === "mute") { sound.toggleMuted(); updateLobby(); return; }
    if (action === "quality") { quality = quality === "standard" ? "low" : "standard"; saveGraphicsQuality(quality); gallery?.setQuality(quality); updateLobby(); return; }
    if (action === "retry") { void load(); return; }
    if (action === "start") { start(); return; }
    if (button.dataset.card) {
      lobbyMessage = campaign.choose({ kind: button.dataset.kind as "hero" | "level", id: button.dataset.card });
      sound.playUi(lobbyMessage ? "error" : "click"); updateLobby();
    }
  };
  async function load(): Promise<void> {
    if (loading || disposed || library) return;
    loading = true;
    const retry = app.querySelector<HTMLButtonElement>("[data-lobby-action=retry]")!; retry.hidden = true;
    try {
      const loaded = await ModelLibrary.load(({ loaded, total }) => {
        if (!disposed) app.querySelector<HTMLElement>("[data-load-progress]")!.textContent = `准备英雄与防线 · ${Math.round(loaded/total*100)}%`;
      });
      if (disposed) { loaded.dispose(); return; }
      library = loaded; gallery?.dispose(); showLobby();
    } catch {
      if (!disposed) { app.querySelector<HTMLElement>("[data-load-progress]")!.textContent = "资源加载中断，请检查网络后重试。"; retry.hidden = false; }
    } finally { loading = false; }
  }
  const visibility = () => document.hidden ? sound.suspend() : sound.resume();
  const pageShow = (event: PageTransitionEvent) => { if (event.persisted && !document.hidden) { sound.resume(); lastFrame = 0; } };
  const frame = (timestamp: number) => {
    if (disposed) return;
    if (gallery && !document.hidden) gallery.render(lastFrame ? Math.min(.1, (timestamp-lastFrame)/1000) : 0);
    if (options.developmentReplay && gallery && lobbyEvidencePending) {
      lobbyEvidencePending = false;
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      lifecycleEvidence.push({ index: lifecycleEvidence.length, jsHeapBytes: memory ? { used: memory.usedJSHeapSize, allocated: memory.totalJSHeapSize } : null, gallery: gallery.snapshot(), library: library?.snapshot(), sound: sound.snapshot(), canvases: app.querySelectorAll("canvas").length });
      app.dataset.lifecycleEvidence = JSON.stringify(lifecycleEvidence);
    }
    lastFrame = document.hidden ? 0 : timestamp;
    frameId = requestAnimationFrame(frame);
  };
  const dispose = () => {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(frameId); battleDispose?.(); gallery?.dispose(); campaign.dispose(); sound.dispose(); library?.dispose();
    app.removeEventListener("click", click); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow);
    app.replaceChildren(); app.classList.remove("lobby-app", "battle-app"); delete app.dataset.screen;
  };
  const pageHide = (event: PageTransitionEvent) => { if (!event.persisted) dispose(); else sound.suspend(); };
  app.addEventListener("click", click); document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", pageHide); window.addEventListener("pageshow", pageShow);
  showLobby(); void load(); frameId = requestAnimationFrame(frame);
  return dispose;
}

