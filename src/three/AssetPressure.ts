import "./pressure.css";
import { ModelLibrary } from "./ModelLibrary";
import { AssetPressureField, type PressureQuality } from "./AssetPressureField";
import metadata from "./sampleAssetMetadata.json";
import { SAMPLE_ASSETS } from "./assetCatalog";

type RunPhase = "warming" | "measuring";
type Run = {
  phase: RunPhase; requestedSeconds: number; warmupStarted: number; started: number | null; lastFrame: number | null;
  frames: number[]; configuration: Record<string, unknown>; environment: Record<string, unknown>;
  sceneAtStart: ReturnType<AssetPressureField["snapshot"]>; responseChecks: Array<Record<string, unknown>>;
  renderSamples: number; callsMin: number; callsMax: number; trianglesMin: number; trianglesMax: number;
};
const WARMUP_SECONDS = 5;

function environment() {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return {
    userAgent: navigator.userAgent, platformHint: navigator.platform, language: navigator.language,
    cssViewport: { width: window.innerWidth, height: window.innerHeight }, nativeDpr: window.devicePixelRatio,
    hardwareConcurrencyHint: navigator.hardwareConcurrency, visibility: document.visibilityState,
    jsHeapBytes: memory ? { used: memory.usedJSHeapSize, allocated: memory.totalJSHeapSize, limit: memory.jsHeapSizeLimit } : null,
    jsHeapBoundary: "浏览器非标准 performance.memory（若支持）；非单场景内存，不能独立证明无泄漏；geometry/texture计数不是GPU字节",
  };
}

function downloads() {
  return SAMPLE_ASSETS.map(asset => {
    const url = new URL(`${import.meta.env.BASE_URL}assets/threejs/${asset.file}`, window.location.href).href;
    const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
    return { file: asset.file, observations: entries.map(entry => ({ transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize, durationMs: entry.duration })) };
  });
}

function frameSummary(frames: number[]) {
  if (!frames.length) return { medianMs: null, p95Ms: null, maxMs: null };
  const sorted = [...frames].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { medianMs: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted[sorted.length - 1] };
}

export function mountAssetPressure(app: HTMLElement): () => void {
  app.classList.add("pressure-app");
  app.innerHTML = `<header><h1>表现资产压力实验 · #5 候选</h1><p>只展示已完成模型，不运行核心战斗。初期单骷髅结果不能替代完整混编验收或实体手机接受。</p><nav><a href="${import.meta.env.BASE_URL}?preview=threejs">可玩美术样板</a><a href="${import.meta.env.BASE_URL}">原版游戏</a></nav></header>
    <div class="pressure-sticky"><button type="button" data-action="start" disabled>开始测量</button><button type="button" data-action="stop" disabled>停止</button><button type="button" data-action="response">响应检查</button><span data-response role="status">响应 0 次</span><span data-run-status role="status">尚未测量</span></div>
    <div class="pressure-layout"><section class="pressure-field" aria-label="固定游戏镜头"></section><section class="pressure-panel">
    <fieldset disabled><legend>实验配置</legend><label>活动骷髅数量<select data-count><option>100</option><option>200</option><option>300</option></select></label><label>画质<select data-quality><option value="standard">标准 · DPR上限2</option><option value="reduced">降低像素密度 · DPR上限1</option></select></label>
    <label>测量时长<select data-duration><option value="60">60秒 · 初期取证</option><option value="300">300秒 · 连续取证</option><option value="15">15秒 · 操作冒烟</option></select></label>
    <label>设备类别<select data-device><option value="desktop">桌面电脑</option><option value="physical-phone">实体手机</option><option value="emulator">模拟器</option></select></label>
    <label>设备型号<input data-model placeholder="请填写真实型号；模拟器请写名称" maxlength="160"></label><label>系统与版本<input data-os placeholder="请填写实际系统和版本" maxlength="160"></label><label>网络、后台负载与备注<input data-notes placeholder="缓存/网络、其他负载、操作观察" maxlength="600"></label></fieldset>
    <p data-status role="status" aria-live="polite">准备加载…</p><button type="button" data-action="retry" hidden>重试加载</button><p data-scene></p><p>所有单位持续轮换行走、攻墙、受击、死亡动作，不隐藏或删减；降低画质只限制像素密度，保留1024接地投影。</p>
    <p>开始后先预热5秒，再连续记录全部帧间隔。切后台、改变窗口或图形上下文丢失会保留中断结果。CPU/GPU独立计时未提供；rAF帧间隔包含浏览器调度和所有实际负载。</p>
    <section class="pressure-result" aria-label="公开测量结果"><h2>测量结果</h2><p data-summary>尚无结果；设备信息未填写时记录会明确标记。</p><div class="pressure-result-actions"><button type="button" data-action="restart" disabled>重新测量</button><button type="button" data-action="export" disabled>导出JSON</button><button type="button" data-action="copy" disabled>复制结果</button></div><p data-copy-status role="status"></p><label>可复制公开JSON<textarea data-result readonly rows="8" placeholder="完成或中断后显示完整原始结果"></textarea></label></section></section></div>`;
  const host = app.querySelector<HTMLElement>(".pressure-field")!;
  const status = app.querySelector<HTMLElement>("[data-status]")!;
  const count = app.querySelector<HTMLSelectElement>("[data-count]")!;
  const quality = app.querySelector<HTMLSelectElement>("[data-quality]")!;
  const retry = app.querySelector<HTMLButtonElement>("[data-action=retry]")!;
  const configuration = app.querySelector<HTMLFieldSetElement>("fieldset")!;
  const duration = app.querySelector<HTMLSelectElement>("[data-duration]")!;
  const resultText = app.querySelector<HTMLTextAreaElement>("[data-result]")!;
  const runStatus = app.querySelector<HTMLElement>("[data-run-status]")!;
  const button = (action: string) => app.querySelector<HTMLButtonElement>(`[data-action=${action}]`)!;
  let field: AssetPressureField | null = null, library: ModelLibrary | null = null;
  let disposed = false, loading = false, frame = 0, previous = 0, lastPublish = 0, responses = 0;
  let contextLost = false, run: Run | null = null, result: Record<string, unknown> | null = null;
  let removeContextListeners = () => {};
  const updateControls = () => {
    const ready = !!field && !loading && !contextLost;
    configuration.disabled = !ready || !!run;
    button("start").disabled = !ready || !!run;
    button("stop").disabled = !run;
    button("restart").disabled = !ready || !!run;
    button("export").disabled = button("copy").disabled = !result || !!run;
  };
  const publish = () => {
    if (!field) return;
    const scene = field.snapshot();
    app.dataset.pressureScene = JSON.stringify(scene);
    app.querySelector<HTMLElement>("[data-scene]")!.textContent = `实际活动 ${scene.activeUnits} · 独立动画 ${scene.independentMixers} · 镜头内中心 ${scene.centersInView} · 绘制 ${scene.calls} · 三角形 ${scene.triangles}`;
  };
  const configure = () => {
    if (run) finish("interrupted", "configuration-changed");
    field?.configure(Number(count.value), quality.value as PressureQuality); publish();
  };
  const finish = (outcome: "completed" | "interrupted", reason: string | null) => {
    if (!run || !field) return;
    const end = performance.now();
    const endedRun = run; run = null;
    const summary = frameSummary(endedRun.frames);
    const scene = field.snapshot();
    const measuredSeconds = endedRun.started === null || endedRun.lastFrame === null ? 0 : (endedRun.lastFrame - endedRun.started) / 1000;
    const modelAssets = SAMPLE_ASSETS.map(asset => ({ id: asset.id, instances: scene.composition[asset.id] ?? 0,
      ...metadata.assets.find(item => item.asset === asset.file) }));
    result = {
      schema: 1, experiment: "ZCamp #5 early presentation-only asset pressure", outcome, interruptionReason: reason,
      scope: { coreBattleRunning: false, mixedEnemies: false, sustainedCoreAttacks: false, ownerAccepted: false, physicalDeviceAccepted: false,
        boundary: "只测已交付单骷髅与样板建筑/环境表现；不构成#13混编核心持续攻击或#5人工接受" },
      configuration: endedRun.configuration, environmentAtStart: endedRun.environment, environmentAtEnd: environment(),
      timing: {
        warmupSecondsRequested: WARMUP_SECONDS, durationSecondsRequested: endedRun.requestedSeconds,
        warmupStartedAt: new Date(performance.timeOrigin + endedRun.warmupStarted).toISOString(),
        measurementStartedAt: endedRun.started === null ? null : new Date(performance.timeOrigin + endedRun.started).toISOString(),
        samplingEndedAt: endedRun.lastFrame === null ? null : new Date(performance.timeOrigin + endedRun.lastFrame).toISOString(),
        endedAt: new Date(performance.timeOrigin + end).toISOString(), totalWallSeconds: (end - endedRun.warmupStarted) / 1000,
        actualSampleDurationSeconds: measuredSeconds, measurementWallSeconds: endedRun.started === null ? 0 : (end - endedRun.started) / 1000,
        sampleCount: endedRun.frames.length, ...summary, rawFrameIntervalsMs: endedRun.frames,
        method: "预热结束后的首个rAF作为起点，后续连续rAF间隔全部保留；P95为nearest-rank，偶数median取中间均值；慢帧未删，最后一帧允许超过目标时长",
        boundary: "显示帧间隔，非独立CPU/GPU耗时；手动停止到最后rAF之间的尾段不是完整帧样本，分别记录wall与sample时长", cpuTimeMs: null, gpuTimeMs: null,
      },
      sceneAtStart: endedRun.sceneAtStart, sceneAtEnd: scene,
      measuredRendering: { samples: endedRun.renderSamples, callsMin: endedRun.renderSamples ? endedRun.callsMin : null, callsMax: endedRun.renderSamples ? endedRun.callsMax : null,
        trianglesMin: endedRun.renderSamples ? endedRun.trianglesMin : null, trianglesMax: endedRun.renderSamples ? endedRun.trianglesMax : null,
        boundary: "每个测量帧读取实际renderer.info；calls/triangles包含实时阴影绘制，非模型清单推算" },
      responseChecks: endedRun.responseChecks,
      assets: { manifestSource: metadata.source, manifestSha256: metadata.manifestSha256, identityBoundary: metadata.identityBoundary,
        modelAssets, distinctGlbFileBytes: metadata.assets.reduce((sum, asset) => sum + asset.bytes, 0), resourceTiming: downloads(),
        downloadBoundary: "文件字节是清单体积；transferSize是本页ResourceTiming观测（含重复重试），零值可能是缓存或不可获取，不能声称无下载成本；模型材质纹理嵌入GLB；不包含JS/页面体积" },
    };
    resultText.value = JSON.stringify(result, null, 2);
    app.dataset.measurementOutcome = outcome;
    runStatus.textContent = outcome === "completed" ? "测量完成" : `已中断 · ${reason}`;
    app.querySelector<HTMLElement>("[data-summary]")!.textContent = `${runStatus.textContent} · 样本 ${endedRun.frames.length} · 实际 ${measuredSeconds.toFixed(2)}秒 · median ${summary.medianMs?.toFixed(2) ?? "无"}ms · P95 ${summary.p95Ms?.toFixed(2) ?? "无"}ms · max ${summary.maxMs?.toFixed(2) ?? "无"}ms`;
    updateControls(); publish();
  };
  const start = () => {
    if (!field || loading || contextLost || run || document.hidden) return;
    const model = app.querySelector<HTMLInputElement>("[data-model]")!.value.trim();
    const os = app.querySelector<HTMLInputElement>("[data-os]")!.value.trim();
    result = null; resultText.value = ""; app.dataset.measurementOutcome = "warming";
    app.querySelector<HTMLElement>("[data-copy-status]")!.textContent = "";
    app.querySelector<HTMLElement>("[data-summary]")!.textContent = "本轮测量中；重新测量已清空上一轮样本，请先导出要保留的结果。";
    run = { phase: "warming", requestedSeconds: Number(duration.value), warmupStarted: performance.now(), started: null, lastFrame: null,
      frames: [], configuration: { count: Number(count.value), quality: quality.value, deviceCategory: app.querySelector<HTMLSelectElement>("[data-device]")!.value,
        declaredModel: model || "未填写", declaredOs: os || "未填写", deviceDeclarationIncomplete: !model || !os, notes: app.querySelector<HTMLInputElement>("[data-notes]")!.value.trim() },
      environment: environment(), sceneAtStart: field.snapshot(), responseChecks: [], renderSamples: 0,
      callsMin: Infinity, callsMax: 0, trianglesMin: Infinity, trianglesMax: 0 };
    runStatus.textContent = "预热5秒 · 参数已锁定"; updateControls();
  };
  const load = async () => {
    if (loading || disposed) return;
    loading = true; retry.hidden = true;
    removeContextListeners(); field?.dispose(); field = null; library?.dispose(); library = null;
    contextLost = false; updateControls();
    try {
      const loaded = await ModelLibrary.load(progress => { status.textContent = `加载 ${progress.loaded}/${progress.total} · ${progress.name}`; });
      if (disposed) { loaded.dispose(); return; }
      library = loaded;
      field = new AssetPressureField(host, loaded); configure();
      const canvas = field.canvas;
      const lost = () => { finish("interrupted", "webgl-context-lost"); contextLost = true; status.textContent = "图形上下文丢失：本轮已中断，请重试加载后重新测量"; retry.hidden = false; updateControls(); };
      canvas.addEventListener("webglcontextlost", lost);
      removeContextListeners = () => canvas.removeEventListener("webglcontextlost", lost);
      status.textContent = "资产就绪 · 十五格含固定主城、箭塔/木材厂低中高档；城墙、树岩静态合批";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "资产无法显示，请使用支持 WebGL 2 的浏览器";
      library?.dispose(); library = null; retry.hidden = false;
    } finally { loading = false; updateControls(); }
  };
  const exportResult = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([resultText.value], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `zcamp-asset-pressure-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const click = (event: MouseEvent) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]")?.dataset.action;
    if (action === "retry") void load();
    if (action === "start" || action === "restart") start();
    if (action === "stop") finish("interrupted", "manual-stop");
    if (action === "export") exportResult();
    if (action === "copy" && result) {
      const copyStatus = app.querySelector<HTMLElement>("[data-copy-status]")!;
      void (navigator.clipboard ? navigator.clipboard.writeText(resultText.value) : Promise.reject(new Error("Clipboard unavailable"))).then(() => { if (!disposed) copyStatus.textContent = "完整JSON已复制"; }).catch(() => {
        if (!disposed) { resultText.focus(); resultText.select(); copyStatus.textContent = "浏览器未允许自动复制，请复制已选中的JSON"; }
      });
    }
    if (action === "response") {
      const now = performance.now();
      app.querySelector<HTMLElement>("[data-response]")!.textContent = `响应 ${++responses} 次 · ${new Date().toLocaleTimeString()}`;
      run?.responseChecks.push({ phase: run.phase, at: new Date(performance.timeOrigin + now).toISOString(), elapsedSeconds: (now - run.warmupStarted) / 1000,
        eventToHandlerMs: Math.max(0, now - event.timeStamp), boundary: "输入事件时间戳到处理器的近似延迟，非端到端视觉延迟" });
    }
  };
  const resize = () => { finish("interrupted", "viewport-resized"); field?.resize(); };
  const visibility = () => { if (document.hidden) finish("interrupted", "page-hidden"); previous = 0; };
  const animate = (time: number) => {
    if (disposed) return;
    if (!document.hidden && !contextLost) field?.render(previous ? (time - previous) / 1000 : 0);
    previous = time;
    if (run && field) {
      if (run.phase === "warming" && time - run.warmupStarted >= WARMUP_SECONDS * 1000) {
        run.phase = "measuring"; run.started = run.lastFrame = time;
        app.dataset.measurementOutcome = "measuring";
      } else if (run.phase === "measuring") {
        run.frames.push(time - run.lastFrame!); run.lastFrame = time;
        const metrics = field.frameMetrics(); run.renderSamples++;
        run.callsMin = Math.min(run.callsMin, metrics.calls); run.callsMax = Math.max(run.callsMax, metrics.calls);
        run.trianglesMin = Math.min(run.trianglesMin, metrics.triangles); run.trianglesMax = Math.max(run.trianglesMax, metrics.triangles);
        if (time - run.started! >= run.requestedSeconds * 1000) finish("completed", null);
      }
    }
    if (run && time - lastPublish >= 1000) runStatus.textContent = run.phase === "warming" ? `预热 · ${((time - run.warmupStarted) / 1000).toFixed(1)}/5秒` : `测量 · ${((time - run.started!) / 1000).toFixed(1)}/${run.requestedSeconds}秒 · 样本 ${run.frames.length}`;
    if (time - lastPublish >= 1000) { publish(); lastPublish = time; }
    frame = requestAnimationFrame(animate);
  };
  app.addEventListener("click", click); count.addEventListener("change", configure); quality.addEventListener("change", configure);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  void load(); frame = requestAnimationFrame(animate);
  return () => {
    disposed = true; cancelAnimationFrame(frame);
    app.removeEventListener("click", click); count.removeEventListener("change", configure); quality.removeEventListener("change", configure); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", visibility); removeContextListeners();
    field?.dispose(); library?.dispose(); app.replaceChildren(); app.classList.remove("pressure-app"); delete app.dataset.pressureScene;
  };
}
