import { SoundDirector } from "../audio/SoundDirector";
import { createBattlePressureSession, PRESSURE_CONDITIONS, PRESSURE_SEED, type BattlePressureCount } from "./battlePressureConfig";
import { GRAPHICS_QUALITY, type GraphicsQuality } from "./graphicsQuality";
import { mountBattlePresentation } from "./WhiteboxPreview";
import type { GameEvent } from "../core/types";
import "./battlePressure.css";

function environment() {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return { device: "Intel Core i7-12700KF / NVIDIA RTX 4060 Ti / Windows 11 (registered desktop; browser does not verify model)",
    userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, nativeDpr: devicePixelRatio, hardwareConcurrencyHint: navigator.hardwareConcurrency,
    jsHeapBytes: memory ? { used: memory.usedJSHeapSize, allocated: memory.totalJSHeapSize, limit: memory.jsHeapSizeLimit } : null };
}
function summary(frames: number[]) {
  const sorted = [...frames].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { samples: frames.length, medianMs: sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1]! + sorted[middle]!) / 2 : null,
    p95Ms: sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : null, maxMs: sorted.at(-1) ?? null };
}

/** Development-only real BattleSession workload. No collector, injected state or asset substitute. */
export function mountBattlePressure(app: HTMLElement): () => void {
  const params = new URLSearchParams(location.search);
  const requestedCount = Number(params.get("count"));
  const count: BattlePressureCount = requestedCount === 100 || requestedCount === 300 ? requestedCount : 200;
  let quality: GraphicsQuality = params.get("quality") === "low" ? "low" : "standard";
  const seconds = params.get("seconds") === "15" ? 15 : params.get("seconds") === "60" ? 60 : 300;
  const session = createBattlePressureSession(count);
  const sound = new SoundDirector();
  const initial = environment();
  const frames: number[] = [], resourceSamples: unknown[] = [], responses: Array<{ eventTimestamp: number; handlerMs: number; nextFrameMs: number | null }> = [];
  const eventCounts: Partial<Record<GameEvent["type"], number>> = {};
  let first: number | null = null, started: number | null = null, previous: number | null = null, latest = 0, published = 0;
  let completed = false, endedAt: number | null = null, completedCore: unknown = null, interrupted: string | null = null, minActive: number = count, maxActive: number = count, metrics: unknown = null;
  const disposeBattle = mountBattlePresentation(app, { session, sound, quality, qualityChanged: (next) => { quality = next; interrupted ??= "quality-changed"; },
    observeFrame: (timestamp, state, events, snapshot) => {
      latest = timestamp; if (!completed) metrics = snapshot;
      first ??= timestamp;
      if (state.phase !== "RUNNING") { if (started !== null && !completed) interrupted ??= `phase-${state.phase}`; previous = null; return; }
      for (const response of responses) if (response.nextFrameMs === null) response.nextFrameMs = performance.now() - response.eventTimestamp;
      if (!completed) {
        for (const event of events) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
        minActive = Math.min(minActive, state.enemies.length); maxActive = Math.max(maxActive, state.enemies.length);
      }
      if (timestamp - first >= 5000 && started === null) { started = timestamp; previous = timestamp; }
      else if (started !== null && !completed) {
        if (previous !== null) frames.push(timestamp - previous);
        previous = timestamp;
        if (timestamp - started >= seconds * 1000) { completed = true; endedAt = timestamp; completedCore = { step: session.getStepIndex(), phase: state.phase, effectiveSeconds: state.effectiveBattleTimeSeconds, wallHp: state.wallHp }; writeResult(); }
      }
      if (timestamp - published >= 1000) {
        published = timestamp;
        if (!completed) resourceSamples.push({ milliseconds: timestamp - first, ...environment(), ...snapshot });
        status.textContent = `开发压力 · ${count}活动 / ${snapshot.activeModels}模型 · ${GRAPHICS_QUALITY[quality].label} · ${started === null ? "预热5秒" : `${Math.min(seconds, (timestamp-started)/1000).toFixed(0)}/${seconds}秒`} · 绘制${snapshot.calls} · ${completed ? "完成" : interrupted ? `中断标记 ${interrupted}` : "持续真实攻击"}`;
      }
    } });
  const panel = document.createElement("details"); panel.className = "battle-pressure-panel";
  panel.innerHTML = `<summary>开发压力 · ${count}活动单位 · 展开记录</summary><p>${PRESSURE_CONDITIONS}</p><nav>${[100, 200, 300].map((size) => `<a href="?dev=pressure&count=${size}&quality=${quality}&seconds=${seconds}">${size}单位</a>`).join("")}<a href="${import.meta.env.BASE_URL}">正式游戏</a></nav><p data-pressure-status></p><button type="button" data-pressure-response>响应检查</button><button type="button" data-pressure-record>记录当前结果</button><span data-pressure-response-count>0次响应</span><label>原始帧间隔与观察结果<textarea readonly data-pressure-result rows="6"></textarea></label><p>保持前台；切后台、暂停或更改画质会保留中断标记。rAF包含调度与全部负载；没有独立CPU/GPU计时。JS堆为浏览器非标准全页统计；geometry/texture计数不代表GPU字节。实体手机复验与人工接受留给#13。</p>`;
  app.querySelector(".preview-field")!.append(panel);
  const status = panel.querySelector<HTMLElement>("[data-pressure-status]")!;
  const resultText = panel.querySelector<HTMLTextAreaElement>("[data-pressure-result]")!;
  const writeResult = () => {
    resultText.value = JSON.stringify({ schema: 1, experiment: "ZCamp #12 mixed real battle", completed, interruption: interrupted, seed: PRESSURE_SEED,
      configuration: { count, quality, requestedSeconds: seconds, conditions: PRESSURE_CONDITIONS, fixedStepHz: 30, occupiedPlots: 15 }, environmentAtStart: initial, environmentAtEnd: environment(),
      measuredSeconds: started === null ? 0 : ((endedAt ?? latest)-started)/1000, frames: summary(frames), rawFrameIntervalsMs: frames,
      liveCount: { min: minActive, max: maxActive, actual: session.getState().enemies.length }, composition: Object.fromEntries([...new Set(session.getState().enemies.map((enemy) => enemy.definitionId))].map((id) => [id, session.getState().enemies.filter((enemy) => enemy.definitionId === id).length])),
      eventCounts, resources: resourceSamples, finalMetrics: metrics, responses, core: completedCore ?? { step: session.getStepIndex(), phase: session.getState().phase, effectiveSeconds: session.getState().effectiveBattleTimeSeconds, wallHp: session.getState().wallHp } }, null, 2);
  };
  const click = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-pressure-response]")) {
      responses.push({ eventTimestamp: event.timeStamp, handlerMs: performance.now() - event.timeStamp, nextFrameMs: null });
      panel.querySelector<HTMLElement>("[data-pressure-response-count]")!.textContent = `${responses.length}次响应`;
    }
    if (target.closest("[data-pressure-record]")) writeResult();
    event.stopPropagation();
  };
  panel.addEventListener("click", click);
  const visibility = () => { if (document.hidden && started !== null && !completed) interrupted ??= "background"; };
  document.addEventListener("visibilitychange", visibility);
  return () => { document.removeEventListener("visibilitychange", visibility); panel.removeEventListener("click", click); disposeBattle(); sound.dispose(); };
}
