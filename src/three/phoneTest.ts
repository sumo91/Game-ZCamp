/** The preset is a declaration, never evidence of the browser's actual device. */
export function phoneEntry(params: URLSearchParams) {
  if (params.get("phone") !== "iqoo-z10-turbo") return null;
  return {
    model: "iQOO Z10 Turbo", deviceCategory: "physical-phone", os: "Android（具体版本待核实）",
    notes: "已连接 Vivo 办公套件（用户提供）；实际投屏负载待核实",
    declarationSource: "项目所有者提供的设备预设；扫码入口预填，可在高级设置修正",
    osVersionVerified: false, projectionLoadVerified: false, physicalDeviceVerified: false,
    sessionToken: params.get("session"),
  };
}

/** This selects work for this page; it makes no claim about earlier evidence. */
export function phoneStartRound(params: URLSearchParams): number {
  const from = params.get("from");
  return from === "2" ? 2 : from === "3" ? 3 : 1;
}

export type PhoneRound = { count: number; seconds: number; quality: "standard"; warmupSeconds: number };
export type PhoneRecord = { round: number; attempt: number; outcome: "completed" | "interrupted"; json: string; delivery: "sending" | "received" | "failed"; receipt: string | null; error: string | null };
const ROUNDS: readonly PhoneRound[] = [
  { count: 100, seconds: 60, quality: "standard", warmupSeconds: 5 },
  { count: 200, seconds: 300, quality: "standard", warmupSeconds: 5 },
  { count: 300, seconds: 60, quality: "standard", warmupSeconds: 5 },
];

/** Each immutable JSON is kept before delivery; only a durable receipt advances the sequence. */
export class PhoneTestSequence {
  public phase: "idle" | "running" | "sending" | "stopped" | "completed" = "idle";
  public readonly records: PhoneRecord[] = [];
  public haltReason: string | null = null;
  private currentRound: number;

  public constructor(private readonly persist: (json: string) => Promise<string>, fromRound = 1) {
    this.currentRound = fromRound === 2 || fromRound === 3 ? fromRound : 1;
  }

  public get round(): number { return this.currentRound; }
  public get attempt(): number { return this.records.filter(record => record.round === this.round).length + 1; }
  public get canContinue(): boolean { return this.phase === "stopped" && this.round <= 3 && this.records.every(record => record.delivery === "received"); }

  public begin(): PhoneRound | null {
    if (this.phase !== "idle") return null;
    this.phase = "running";
    return { ...ROUNDS[this.round - 1] };
  }

  public continue(): PhoneRound | null {
    if (!this.canContinue) return null;
    this.haltReason = null; this.phase = "running";
    return { ...ROUNDS[this.round - 1] };
  }

  public async complete(json: string, outcome: "completed" | "interrupted"): Promise<PhoneRound | null> {
    if (this.phase !== "running") return null;
    const record: PhoneRecord = { round: this.round, attempt: this.attempt, outcome, json, delivery: "sending", receipt: null, error: null };
    this.records.push(record);
    this.phase = "sending";
    await this.deliver(record);
    if (record.delivery === "failed") { this.phase = "stopped"; return null; }
    if (outcome === "completed") this.currentRound++;
    if (this.round > 3) { this.phase = "completed"; return null; }
    if (this.haltReason) { this.phase = "stopped"; return null; }
    if (outcome === "interrupted") { this.phase = "stopped"; return null; }
    const next = ROUNDS[this.round - 1];
    this.phase = next ? "running" : "completed";
    return next ? { ...next } : null;
  }

  public halt(reason: string): void {
    if (this.phase === "running" || this.phase === "sending") { this.haltReason = reason; this.phase = "stopped"; }
  }

  public async retryFailed(): Promise<void> {
    if (this.phase !== "stopped" || this.records.some(record => record.delivery === "sending")) return;
    for (const record of this.records.filter(record => record.delivery === "failed")) {
      await this.deliver(record);
      if (record.delivery === "received" && record.outcome === "completed" && this.round === record.round) this.currentRound++;
    }
    if (this.round > 3) this.phase = "completed";
  }

  private async deliver(record: PhoneRecord): Promise<void> {
    record.delivery = "sending"; record.error = null;
    try { record.receipt = await this.persist(record.json); record.delivery = "received"; }
    catch (error) { record.delivery = "failed"; record.error = error instanceof Error ? error.message : "回传失败"; }
  }
}

export type CollectorSession = { schema: number; sessionId: string; buildSha: string };

async function collectorRequest(base: string, token: string, endpoint: string, body?: string) {
  const response = await fetch(`${base}${endpoint}`, {
    method: body === undefined ? "GET" : "POST", credentials: "omit", cache: "no-store",
    headers: { "X-ZCamp-Token": token, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`电脑收件失败（HTTP ${response.status}）`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function connectPhoneCollector(base: string, token: string): Promise<CollectorSession> {
  const value = await collectorRequest(base, token, "__phone-session");
  if (value.schema !== 1 || typeof value.sessionId !== "string" || typeof value.buildSha !== "string" || !/^[a-f0-9]{40}$/i.test(value.buildSha)) throw new Error("扫码入口的电脑收件服务无效");
  return { schema: 1, sessionId: value.sessionId, buildSha: value.buildSha };
}

export async function sendPhoneResult(base: string, token: string, session: CollectorSession, json: string): Promise<string> {
  const value = await collectorRequest(base, token, "__phone-results", json);
  if (value.saved !== true || value.sessionId !== session.sessionId || value.buildSha !== session.buildSha || typeof value.file !== "string") throw new Error("电脑未确认完整保存，本轮结果仍保留");
  return value.file;
}
