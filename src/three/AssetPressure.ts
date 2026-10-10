import "./pressure.css";
import { ModelLibrary } from "./ModelLibrary";
import { AssetPressureField, type PressureQuality } from "./AssetPressureField";
import metadata from "./sampleAssetMetadata.json";
import { SAMPLE_ASSETS } from "./assetCatalog";
import { PhoneTestSequence, phoneEntry, phoneStartRound, connectPhoneCollector, sendPhoneResult, type CollectorSession, type PhoneRound } from "./phoneTest";

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
  const params = new URLSearchParams(window.location.search);
  const preset = phoneEntry(params);
  const quick = preset !== null;
  const firstRound = quick ? phoneStartRound(params) : 1;
  const plan = firstRound === 2 ? "补测第二、三轮 · 约6分10秒" : firstRound === 3 ? "补测第三轮 · 约1分5秒" : "三轮约7分15秒";
  const startLabel = firstRound === 2 ? "开始剩余两轮" : firstRound === 3 ? "开始剩余一轮" : "开始手机测试";
  app.classList.add("pressure-app");
  app.classList.toggle("phone-quick", quick);
  app.innerHTML = `<header><h1>${quick ? "手机快速测试" : "表现资产压力实验 · #5 候选"}</h1>${quick ? `<p data-device-summary></p><p>${plan} · 请保持前台，期间可随时触摸响应按钮。</p><ol data-phone-rounds aria-label="三轮测试进度"><li>100单位 · 60秒 · 未开始</li><li>200单位 · 300秒 · 未开始</li><li>300单位 · 60秒 · 未开始</li></ol><p data-delivery-status role="status">正在连接电脑…</p>` : '<p>只展示已完成模型，不运行核心战斗。初期单骷髅结果不能替代完整混编验收或实体手机接受。</p>'}</header>
    <div class="pressure-sticky"><button type="button" data-action="start" disabled>${quick ? startLabel : "开始测量"}</button>${quick ? '<button type="button" data-action="continue" hidden disabled>继续未完成测试</button>' : ""}<button type="button" data-action="stop" disabled ${quick ? "hidden" : ""}>停止测试</button><button type="button" data-action="response">${quick ? "触摸响应检查" : "响应检查"}</button><span data-response role="status">响应 0 次</span><span data-run-status role="status">尚未测量</span></div>
    <p data-status role="status" aria-live="polite">准备加载…</p><button type="button" data-action="retry" hidden>重试加载</button>
    <div class="pressure-layout"><section class="pressure-field" aria-label="固定游戏镜头"></section><section class="pressure-panel">
    ${quick ? '<section data-phone-recovery hidden><p data-phone-recovery-status role="status"></p><button type="button" data-action="retry-send">重试发送</button><button type="button" data-action="backup">导出全部备援JSON</button></section><details data-advanced><summary>高级设置与原始结果</summary>' : ""}
    <nav><a href="${import.meta.env.BASE_URL}?preview=threejs">可玩美术样板</a><a href="${import.meta.env.BASE_URL}">原版游戏</a></nav>
    <fieldset disabled><legend>实验配置</legend><label>活动骷髅数量<select data-count><option>100</option><option>200</option><option>300</option></select></label><label>画质<select data-quality><option value="standard">标准 · DPR上限2</option><option value="reduced">降低像素密度 · DPR上限1</option></select></label>
    <label>测量时长<select data-duration><option value="60">60秒 · 初期取证</option><option value="300">300秒 · 连续取证</option><option value="15">15秒 · 操作冒烟</option></select></label>
    <label>设备类别<select data-device><option value="desktop">桌面电脑</option><option value="physical-phone">实体手机</option><option value="emulator">模拟器</option></select></label>
    <label>设备型号<input data-model placeholder="请填写真实型号；模拟器请写名称" maxlength="160"></label><label>系统与版本<input data-os placeholder="请填写实际系统和版本" maxlength="160"></label><label>网络、后台负载与备注<input data-notes placeholder="缓存/网络、其他负载、操作观察" maxlength="600"></label></fieldset>
    <p data-scene></p><p>所有单位持续轮换行走、攻墙、受击、死亡动作，不隐藏或删减；降低画质只限制像素密度，保留1024接地投影。</p>
    <p>开始后先预热5秒，再连续记录全部帧间隔。切后台、改变窗口或图形上下文丢失会保留中断结果。CPU/GPU独立计时未提供；rAF帧间隔包含浏览器调度和所有实际负载。</p>
    <section class="pressure-result" aria-label="公开测量结果"><h2>测量结果</h2><p data-summary>尚无结果；设备信息未填写时记录会明确标记。</p><div class="pressure-result-actions"><button type="button" data-action="restart" disabled ${quick ? "hidden" : ""}>重新测量</button><button type="button" data-action="export" disabled>导出JSON</button><button type="button" data-action="copy" disabled>复制结果</button></div><p data-copy-status role="status"></p><label>可复制公开JSON<textarea data-result readonly rows="8" placeholder="完成或中断后显示完整原始结果"></textarea></label></section>${quick ? "</details>" : ""}</section></div>`;
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
  const advanced = app.querySelector<HTMLDetailsElement>("[data-advanced]");
  let collector: CollectorSession | null = null, collectorError: string | null = null;
  const sequence = quick ? new PhoneTestSequence(json => {
    if (!collector || !preset.sessionToken) return Promise.reject(new Error("电脑收件服务未连接，请使用电脑提供的扫码入口"));
    return sendPhoneResult(import.meta.env.BASE_URL, preset.sessionToken, collector, json);
  }, firstRound) : null;
  if (preset) {
    app.querySelector<HTMLSelectElement>("[data-device]")!.value = preset.deviceCategory;
    app.querySelector<HTMLInputElement>("[data-model]")!.value = preset.model;
    app.querySelector<HTMLInputElement>("[data-os]")!.value = preset.os;
    app.querySelector<HTMLInputElement>("[data-notes]")!.value = preset.notes;
    count.value = String(firstRound * 100); duration.value = firstRound === 2 ? "300" : "60";
  }
  let field: AssetPressureField | null = null, library: ModelLibrary | null = null;
  let disposed = false, loading = false, frame = 0, previous = 0, lastPublish = 0, responses = 0;
  let contextLost = false, run: Run | null = null, result: Record<string, unknown> | null = null;
  let removeContextListeners = () => {};
  const publishPhone = () => {
    if (!sequence) return;
    const model = app.querySelector<HTMLInputElement>("[data-model]")!.value.trim();
    const os = app.querySelector<HTMLInputElement>("[data-os]")!.value.trim();
    const device = app.querySelector<HTMLSelectElement>("[data-device]")!;
    app.querySelector<HTMLElement>("[data-device-summary]")!.textContent = `已准备：${device.selectedOptions[0].textContent} · ${model || "型号未填写"} · ${os || "系统未填写"}`;
    const rows = app.querySelectorAll<HTMLElement>("[data-phone-rounds] li");
    const labels = ["100单位 · 60秒", "200单位 · 300秒", "300单位 · 60秒"];
    rows.forEach((row, index) => {
      const attempts = sequence.records.filter(record => record.round === index + 1);
      const record = attempts.at(-1);
      const completed = attempts.some(attempt => attempt.outcome === "completed" && attempt.delivery === "received");
      const savedInterruptions = attempts.filter(attempt => attempt.outcome === "interrupted" && attempt.delivery === "received").length;
      const state = index + 1 < firstRound ? "本入口不测，使用电脑已保存记录" : completed ? "完整完成 · 电脑已收到" : run && index + 1 === sequence.round ? `第${sequence.attempt}次 · ${run.phase === "warming" ? "预热中" : "测量中"}` : record ? record.delivery === "received" ? "未完整完成" : record.delivery === "failed" ? "发送失败 · 结果已保留" : "正在发送" : "未开始";
      row.textContent = `第${index + 1}轮 · ${labels[index]} · ${state}${savedInterruptions ? ` · 已中断记录已保存${savedInterruptions}次` : ""}`;
    });
    const delivery = app.querySelector<HTMLElement>("[data-delivery-status]")!;
    delivery.textContent = collectorError ?? (sequence.phase === "completed" ? `${firstRound > 1 ? "本入口补测完成" : "三轮完成"} · 电脑已收到本入口完整结果；设备与表现仍待人工核实` : sequence.phase === "stopped" ? `测试已停止 · 已保留${sequence.records.length}次记录${sequence.haltReason ? ` · ${sequence.haltReason}` : ""}` : sequence.phase === "sending" ? "本轮完成，正在发送到电脑…" : collector ? "电脑已连接 · 每轮结束后自动保存" : "正在连接电脑…");
    const recovery = app.querySelector<HTMLElement>("[data-phone-recovery]")!;
    recovery.hidden = sequence.phase !== "stopped" || sequence.records.length === 0;
    if (!recovery.hidden) {
      app.querySelector<HTMLElement>("[data-phone-recovery-status]")!.textContent = sequence.records.find(record => record.error)?.error ?? "已完成与中断记录均已保留。继续将重新预热并完整测量未完成轮次。";
      button("retry-send").hidden = !sequence.records.some(record => record.delivery === "failed");
      button("retry-send").disabled = sequence.records.some(record => record.delivery === "sending");
    }
  };
  const updateControls = () => {
    const ready = !!field && !loading && !contextLost;
    const busy = !!run || !!sequence?.records.some(record => record.delivery === "sending");
    configuration.disabled = !ready || busy || !!sequence && sequence.phase !== "idle";
    button("start").disabled = !ready || busy || !!sequence && (sequence.phase !== "idle" || !collector);
    button("stop").disabled = !busy;
    if (quick && sequence) {
      button("stop").hidden = !busy; button("start").hidden = sequence.phase !== "idle";
      button("continue").hidden = sequence.phase !== "stopped" || sequence.round > 3;
      button("continue").disabled = !ready || document.hidden || !sequence.canContinue;
    }
    if (advanced) { advanced.hidden = busy; if (busy) advanced.open = false; }
    button("restart").disabled = !ready || busy || quick;
    button("export").disabled = button("copy").disabled = !result || !!run;
    publishPhone();
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
      ...(sequence ? { phoneTest: { round: sequence.round, attempt: sequence.attempt, entryFromRound: firstRound, totalRounds: 3, protocol: "standard 100/60s, 200/300s, 300/60s; each 5s warmup; independent attempts; advance only after durable receipt" }, collectorSession: collector } : {}),
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
    if (sequence) {
      const delivered = sequence.complete(resultText.value, outcome);
      if (reason) sequence.halt(reason);
      void delivered.then(next => {
        if (disposed) return;
        if (next && !document.hidden && !contextLost) start(next);
        else if (next) sequence.halt(document.hidden ? "page-hidden" : "webgl-context-lost");
        updateControls();
      });
    }
    updateControls(); publish();
  };
  const start = (next?: PhoneRound) => {
    if (!field || loading || contextLost || run || document.hidden || sequence && !collector) return;
    if (sequence) {
      const round = next ?? sequence.begin();
      if (!round || !collector) return;
      count.value = String(round.count); quality.value = round.quality; duration.value = String(round.seconds);
      field.configure(round.count, round.quality); publish();
    }
    const model = app.querySelector<HTMLInputElement>("[data-model]")!.value.trim();
    const os = app.querySelector<HTMLInputElement>("[data-os]")!.value.trim();
    if (!sequence) { result = null; resultText.value = ""; }
    app.dataset.measurementOutcome = "warming";
    app.querySelector<HTMLElement>("[data-copy-status]")!.textContent = "";
    app.querySelector<HTMLElement>("[data-summary]")!.textContent = sequence ? `第${sequence.round}/3轮 · 第${sequence.attempt}次测量中；所有旧记录完整保留。` : "本轮测量中；重新测量已清空上一轮样本，请先导出要保留的结果。";
    run = { phase: "warming", requestedSeconds: Number(duration.value), warmupStarted: performance.now(), started: null, lastFrame: null,
      frames: [], configuration: { count: Number(count.value), quality: quality.value, deviceCategory: app.querySelector<HTMLSelectElement>("[data-device]")!.value,
        declaredModel: model || "未填写", declaredOs: os || "未填写", deviceDeclarationIncomplete: !model || !os || os.includes("待核实"), notes: app.querySelector<HTMLInputElement>("[data-notes]")!.value.trim(),
        ...(preset ? { deviceDeclaration: { source: preset.declarationSource,
          modelSource: model === preset.model ? "owner-preset" : "operator-edited", osSource: os === preset.os ? "owner-preset-incomplete" : "operator-edited",
          notesSource: app.querySelector<HTMLInputElement>("[data-notes]")!.value.trim() === preset.notes ? "owner-preset-incomplete" : "operator-edited",
          osVersionVerified: false, projectionLoadVerified: false, physicalDeviceVerified: false,
          boundary: "预设和手工声明均不能证明当前浏览器位于实体手机；UA只作环境提示，人工接受保持false" } } : {}) },
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
      const lost = () => { interrupt("webgl-context-lost"); contextLost = true; status.textContent = "图形上下文丢失：本轮已中断，请重试加载后重新测量"; retry.hidden = false; updateControls(); };
      canvas.addEventListener("webglcontextlost", lost);
      removeContextListeners = () => canvas.removeEventListener("webglcontextlost", lost);
      status.textContent = quick ? "设备与画面已准备 · 可以开始测试" : "资产就绪 · 十五格含固定主城、箭塔/木材厂低中高档；城墙、树岩静态合批";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "资产无法显示，请使用支持 WebGL 2 的浏览器";
      library?.dispose(); library = null; retry.hidden = false;
    } finally { loading = false; updateControls(); }
  };
  const exportResult = (backup = false) => {
    if (!result) return;
    const json = backup && sequence ? JSON.stringify({ schema: 1, backup: "ZCamp phone sequence; each record.json is the identical original result", records: sequence.records }, null, 2) : resultText.value;
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `zcamp-asset-pressure-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const click = (event: MouseEvent) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]")?.dataset.action;
    if (action === "retry") void load();
    if (action === "start" || action === "restart") start();
    if (action === "continue" && sequence && field && !loading && !contextLost && !run && !document.hidden) {
      const next = sequence.continue();
      if (next) start(next);
    }
    if (action === "stop") interrupt("manual-stop");
    if (action === "export") exportResult();
    if (action === "backup") exportResult(true);
    if (action === "retry-send" && sequence) {
      const pending = sequence.retryFailed(); updateControls();
      void pending.then(() => { if (!disposed) updateControls(); });
    }
    if (action === "copy" && result) {
      const copyStatus = app.querySelector<HTMLElement>("[data-copy-status]")!;
      void (navigator.clipboard ? navigator.clipboard.writeText(resultText.value) : Promise.reject(new Error("Clipboard unavailable"))).then(() => { if (!disposed) copyStatus.textContent = "完整JSON已复制"; }).catch(() => {
        if (!disposed) { resultText.focus(); resultText.select(); copyStatus.textContent = "浏览器未允许自动复制，请复制已选中的JSON"; }
      });
    }
    if (action === "response" && event.isTrusted) {
      const now = performance.now();
      app.querySelector<HTMLElement>("[data-response]")!.textContent = `响应 ${++responses} 次 · ${new Date().toLocaleTimeString()}`;
      run?.responseChecks.push({ phase: run.phase, at: new Date(performance.timeOrigin + now).toISOString(), elapsedSeconds: (now - run.warmupStarted) / 1000,
        eventToHandlerMs: Math.max(0, now - event.timeStamp), trusted: event.isTrusted,
        pointerType: (event as PointerEvent).pointerType || "mouse-or-keyboard", boundary: "真实输入事件时间戳到处理器的近似延迟，非端到端视觉延迟；未合成响应输入" });
    }
  };
  const interrupt = (reason: string) => { finish("interrupted", reason); sequence?.halt(reason); updateControls(); };
  const resize = () => { interrupt("viewport-resized"); field?.resize(); };
  const visibility = () => { if (document.hidden) interrupt("page-hidden"); else updateControls(); previous = 0; };
  const pagehide = () => interrupt("page-hidden");
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
    if (time - lastPublish >= 1000) { publish(); publishPhone(); lastPublish = time; }
    frame = requestAnimationFrame(animate);
  };
  app.addEventListener("click", click); count.addEventListener("change", configure); quality.addEventListener("change", configure);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", pagehide);
  configuration.addEventListener("input", publishPhone);
  if (preset) {
    if (!preset.sessionToken) { collectorError = "需使用电脑提供的扫码入口，才能自动保存结果"; updateControls(); }
    else void connectPhoneCollector(import.meta.env.BASE_URL, preset.sessionToken).then(session => {
      if (!disposed) { collector = session; updateControls(); }
    }).catch(() => { if (!disposed) { collectorError = "未连接电脑收件服务；请使用电脑提供的扫码入口并保持同一局域网"; updateControls(); } });
  }
  void load(); frame = requestAnimationFrame(animate);
  return () => {
    disposed = true; cancelAnimationFrame(frame);
    app.removeEventListener("click", click); count.removeEventListener("change", configure); quality.removeEventListener("change", configure); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pagehide); configuration.removeEventListener("input", publishPhone); removeContextListeners();
    field?.dispose(); library?.dispose(); app.replaceChildren(); app.classList.remove("pressure-app", "phone-quick"); delete app.dataset.pressureScene;
  };
}
