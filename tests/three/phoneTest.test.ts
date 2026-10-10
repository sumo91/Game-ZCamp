import { describe, expect, it } from "vitest";
import { PhoneTestSequence, phoneEntry, phoneStartRound } from "../../src/three/phoneTest";

describe("phone quick entry", () => {
  it.each([["1", 1], ["2", 2], ["3", 3], ["0", 1], ["4", 1], ["2.5", 1], ["02", 1], ["", 1], ["other", 1]])("limits the explicit starting round %s to %s", (from, expected) => {
    expect(phoneStartRound(new URLSearchParams({ from }))).toBe(expected);
  });
  it("prefills the known phone without inventing a system version or phone acceptance", () => {
    expect(phoneEntry(new URLSearchParams("phone=iqoo-z10-turbo&session=sample-session"))).toEqual({
      model: "iQOO Z10 Turbo", deviceCategory: "physical-phone", os: "Android（具体版本待核实）",
      notes: "已连接 Vivo 办公套件（用户提供）；实际投屏负载待核实",
      declarationSource: "项目所有者提供的设备预设；扫码入口预填，可在高级设置修正",
      osVersionVerified: false, projectionLoadVerified: false, physicalDeviceVerified: false,
      sessionToken: "sample-session",
    });
    expect(phoneEntry(new URLSearchParams("phone=unknown"))).toBeNull();
  });
});

describe("one-click phone sequence", () => {
  it("keeps stopped pending rounds continuable only after receipt and prevents stop/delivery races from skipping work", async () => {
    let receive!: (receipt: string) => void;
    const sequence = new PhoneTestSequence(() => new Promise(resolve => { receive = resolve; }), 2);
    sequence.begin();
    const pending = sequence.complete('{"round":2,"outcome":"completed"}', "completed");
    sequence.halt("page-hidden");
    expect(sequence.canContinue).toBe(false);
    expect(sequence.continue()).toBeNull();
    receive("received.json"); await pending;
    expect(sequence.phase).toBe("stopped");
    expect(sequence.round).toBe(3);
    expect(sequence.continue()?.count).toBe(300);
    sequence.halt("page-hidden");
    expect(sequence.records.map(record => record.round)).toEqual([2]);
    expect(sequence.canContinue).toBe(true);
    expect(sequence.continue()?.seconds).toBe(60);
  });

  it("retries an interrupted failed delivery before continuing the same round and ends after a received final completion", async () => {
    let fail = true;
    const sequence = new PhoneTestSequence(async () => { if (fail) throw new Error("offline"); return "received.json"; }, 3);
    sequence.begin();
    await sequence.complete('{"round":3,"outcome":"interrupted"}', "interrupted");
    expect(sequence.continue()).toBeNull();
    fail = false; await sequence.retryFailed();
    expect(sequence.continue()?.count).toBe(300);
    fail = true; await sequence.complete('{"round":3,"outcome":"completed"}', "completed");
    expect(sequence.canContinue).toBe(false);
    fail = false; await sequence.retryFailed();
    expect(sequence.phase).toBe("completed");
    expect(sequence.canContinue).toBe(false);
    expect(sequence.continue()).toBeNull();
    expect(sequence.records.map(record => [record.round, record.attempt])).toEqual([[3, 1], [3, 2]]);
  });

  it("blocks continuation until a failed completed attempt has a receipt, then resumes the next round", async () => {
    let fail = true;
    const sent: string[] = [];
    const sequence = new PhoneTestSequence(async json => { sent.push(json); if (fail) throw new Error("offline"); return "received.json"; }, 2);
    sequence.begin();
    const raw = '{"round":2,"outcome":"completed","frames":[16,1600]}';
    await sequence.complete(raw, "completed");
    expect(sequence.canContinue).toBe(false);
    expect(sequence.continue()).toBeNull();
    fail = false; await sequence.retryFailed();
    expect(sequence.canContinue).toBe(true);
    expect(sequence.continue()).toEqual({ count: 300, seconds: 60, quality: "standard", warmupSeconds: 5 });
    expect(sent).toEqual([raw, raw]);
    expect(sequence.records.map(record => [record.round, record.attempt, record.json])).toEqual([[2, 1, raw]]);
  });

  it("explicitly retries an interrupted round with fresh full sampling and keeps each attempt intact", async () => {
    const sequence = new PhoneTestSequence(async () => "received.json", 2);
    sequence.begin();
    const interrupted = '{"round":2,"outcome":"interrupted","frames":[16,800]}';
    await sequence.complete(interrupted, "interrupted");
    expect(sequence.canContinue).toBe(true);
    expect(sequence.continue()).toEqual({ count: 200, seconds: 300, quality: "standard", warmupSeconds: 5 });
    expect(sequence.attempt).toBe(2);
    const completed = '{"round":2,"outcome":"completed","frames":[17,18]}';
    await sequence.complete(completed, "completed");
    expect(sequence.records.map(record => [record.round, record.attempt, record.json])).toEqual([[2, 1, interrupted], [2, 2, completed]]);
    expect(sequence.round).toBe(3);
  });

  it("starts the restricted remainder at round two and never creates a completed first-round record", async () => {
    const sequence = new PhoneTestSequence(async () => "received.json", 2);
    expect(sequence.begin()).toEqual({ count: 200, seconds: 300, quality: "standard", warmupSeconds: 5 });
    expect(sequence.records).toEqual([]);
    expect(sequence.round).toBe(2);
    expect(await sequence.complete('{"round":2,"outcome":"completed"}', "completed")).toEqual({ count: 300, seconds: 60, quality: "standard", warmupSeconds: 5 });
    await sequence.complete('{"round":3,"outcome":"completed"}', "completed");
    expect(sequence.records.map(record => record.round)).toEqual([2, 3]);
    expect(sequence.phase).toBe("completed");
    expect(sequence.canContinue).toBe(false);
  });

  it.each(["page-hidden", "viewport-resized", "webgl-context-lost", "manual-stop"])("keeps prior received rounds and the interrupted round after %s", async reason => {
    const sequence = new PhoneTestSequence(async () => "received.json");
    sequence.begin();
    await sequence.complete('{"outcome":"completed","round":1}', "completed");
    const interrupted = JSON.stringify({ outcome: "interrupted", reason, rawFrameIntervalsMs: [17, 800] });
    expect(await sequence.complete(interrupted, "interrupted")).toBeNull();
    expect(sequence.phase).toBe("stopped");
    expect(sequence.records.map(record => record.json)).toEqual(['{"outcome":"completed","round":1}', interrupted]);
    expect(sequence.records.map(record => record.delivery)).toEqual(["received", "received"]);
  });

  it("does not start the next round if the page is interrupted while delivery is pending", async () => {
    let receive!: (receipt: string) => void;
    const sequence = new PhoneTestSequence(() => new Promise(resolve => { receive = resolve; }));
    sequence.begin();
    const pending = sequence.complete('{"outcome":"completed"}', "completed");
    sequence.halt("page-hidden");
    receive("received.json");
    expect(await pending).toBeNull();
    expect(sequence.phase).toBe("stopped");
    expect(sequence.haltReason).toBe("page-hidden");
    expect(sequence.records[0].delivery).toBe("received");
  });

  it("stops on delivery failure and retries the identical JSON without repeating or skipping a round", async () => {
    const sent: string[] = [];
    const sequence = new PhoneTestSequence(async json => {
      sent.push(json);
      if (sent.length === 1) throw new Error("disk unavailable");
      return "saved.json";
    });
    sequence.begin();
    const raw = '{"outcome":"completed","timing":{"rawFrameIntervalsMs":[16,1500]}}';
    expect(await sequence.complete(raw, "completed")).toBeNull();
    expect(sequence.phase).toBe("stopped");
    expect(sequence.records[0]).toMatchObject({ json: raw, delivery: "failed", error: "disk unavailable" });
    await sequence.retryFailed();
    expect(sent).toEqual([raw, raw]);
    expect(sequence.records[0]).toMatchObject({ json: raw, delivery: "received", receipt: "saved.json" });
    expect(sequence.phase).toBe("stopped");
    expect(sequence.begin()).toBeNull();
  });

  it("preserves complete rounds and advances only after the computer confirms persistence", async () => {
    let receive!: (receipt: string) => void;
    const sent: string[] = [];
    const sequence = new PhoneTestSequence(json => {
      sent.push(json);
      return new Promise(resolve => { receive = resolve; });
    });
    expect(sequence.begin()).toEqual({ count: 100, seconds: 60, quality: "standard", warmupSeconds: 5 });
    const raw = '{"outcome":"completed","timing":{"rawFrameIntervalsMs":[16,900,17]}}';
    const pending = sequence.complete(raw, "completed");
    expect(sequence.phase).toBe("sending");
    expect(sequence.begin()).toBeNull();
    expect(sequence.records[0].json).toBe(raw);
    receive("first.json");
    expect(await pending).toEqual({ count: 200, seconds: 300, quality: "standard", warmupSeconds: 5 });
    const second = sequence.complete('{"outcome":"completed","round":2}', "completed");
    receive("second.json");
    expect(await second).toEqual({ count: 300, seconds: 60, quality: "standard", warmupSeconds: 5 });
    const third = sequence.complete('{"outcome":"completed","round":3}', "completed");
    receive("third.json");
    expect(await third).toBeNull();
    expect(sequence.phase).toBe("completed");
    expect(sequence.records.map(record => record.delivery)).toEqual(["received", "received", "received"]);
    expect(sent[0]).toBe(raw);
  });
});
