import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, rename, symlink } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPhoneCollector } from "../scripts/phone-collector.mjs";

const token = "test-session-token-1234567890";
const buildSha = "a".repeat(40);
const evidence = () => ({
  schema: 1, experiment: "ZCamp #5 early presentation-only asset pressure", outcome: "completed", interruptionReason: null,
  scope: { ownerAccepted: false, physicalDeviceAccepted: false },
  configuration: { count: 100, quality: "standard", deviceCategory: "desktop", declaredModel: "Desktop QA", declaredOs: "test" },
  environmentAtStart: { userAgent: "test" }, environmentAtEnd: { userAgent: "test" },
  timing: { warmupSecondsRequested: 5, durationSecondsRequested: 60, sampleCount: 3, rawFrameIntervalsMs: [16, 1100, 17] },
  sceneAtStart: { activeUnits: 100 }, sceneAtEnd: { activeUnits: 100 },
  measuredRendering: { samples: 3 }, responseChecks: [],
  assets: { manifestSource: "fixture", manifestSha256: "a".repeat(64), modelAssets: [] },
  phoneTest: { round: 1, totalRounds: 3 }, collectorSession: null,
});

async function fixture(t, extra = {}) {
  const root = await mkdtemp(join(tmpdir(), "zcamp-collector-test-"));
  const dist = join(root, "dist"), output = join(root, "received");
  await mkdir(dist); await writeFile(join(dist, "index.html"), "<h1>candidate</h1>");
  const collector = await createPhoneCollector({ dist, output, token, buildSha, ...extra });
  await new Promise(resolve => collector.server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${collector.server.address().port}/Game-ZCamp/`;
  t.after(async () => { await new Promise(resolve => collector.server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  return { ...collector, root, dist, output, url };
}

test("the receiver persists the identical full JSON before acknowledging each unique file", async t => {
  const { url, output } = await fixture(t);
  const session = await fetch(`${url}__phone-session`, { headers: { "X-ZCamp-Token": token } }).then(response => response.json());
  assert.equal(session.buildSha, buildSha);
  const payload = evidence(); payload.collectorSession = session;
  const raw = JSON.stringify(payload, null, 2);
  const submit = () => fetch(`${url}__phone-results`, { method: "POST", headers: { "Content-Type": "application/json", "X-ZCamp-Token": token }, body: raw });
  const first = await submit(); assert.equal(first.status, 201);
  const receipt = await first.json();
  assert.equal(await readFile(join(output, receipt.file), "utf8"), raw);
  const second = await submit(); assert.equal(second.status, 201);
  assert.notEqual((await second.json()).file, receipt.file);
  const files = await readdir(output);
  assert.equal(files.filter(file => file.startsWith("result-")).length, 2);
});

test("the receiver rejects wrong tokens, invalid JSON, omitted raw data and oversized bodies", async t => {
  const { url, output, session } = await fixture(t, { maxBytes: 4096 });
  const payload = evidence(); payload.collectorSession = session;
  const submit = (body, suppliedToken = token) => fetch(`${url}__phone-results`, { method: "POST", headers: { "Content-Type": "application/json", "X-ZCamp-Token": suppliedToken }, body });
  assert.equal((await submit(JSON.stringify(payload), "wrong")).status, 403);
  assert.equal((await submit("not JSON")).status, 400);
  delete payload.timing.rawFrameIntervalsMs;
  assert.equal((await submit(JSON.stringify(payload))).status, 400);
  assert.equal((await submit(" ".repeat(4097))).status, 413);
  assert.equal((await readdir(output)).filter(file => file.startsWith("result-")).length, 0);
});

test("a failed disk write produces no success receipt and retains previously saved evidence", async t => {
  const { url, output, session, root } = await fixture(t);
  const payload = evidence(); payload.collectorSession = session;
  const body = JSON.stringify(payload);
  const submit = () => fetch(`${url}__phone-results`, { method: "POST", headers: { "Content-Type": "application/json", "X-ZCamp-Token": token }, body });
  const previous = await submit().then(response => response.json());
  const archive = join(root, "retained");
  await rename(output, archive);
  await writeFile(output, "unwritable directory boundary");
  const failed = await submit();
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).saved, undefined);
  assert.equal(await readFile(join(archive, previous.file), "utf8"), body);
});

test("candidate static paths remain inside the selected dist, including encoded traversal and symlinks", async t => {
  const { url, root, dist } = await fixture(t);
  await mkdir(join(dist, "assets"));
  await writeFile(join(dist, "assets", "candidate.js"), "candidate module");
  const outside = join(root, "outside");
  await mkdir(outside); await writeFile(join(outside, "secret.txt"), "outside the candidate");
  await symlink(outside, join(dist, "linked"), "junction");
  assert.equal(await fetch(url).then(response => response.text()), "<h1>candidate</h1>");
  assert.equal(await fetch(`${url}assets/candidate.js`).then(response => response.text()), "candidate module");
  const rawStatus = path => new Promise((resolve, reject) => {
    const origin = new URL(url);
    get({ hostname: origin.hostname, port: origin.port, path }, response => { response.resume(); response.on("end", () => resolve(response.statusCode)); }).on("error", reject);
  });
  for (const path of ["/Game-ZCamp/%2e%2e/outside/secret.txt", "/Game-ZCamp/%2e%2e%5coutside%5csecret.txt", "/Game-ZCamp/linked/secret.txt", "/outside/secret.txt"]) {
    assert.notEqual(await rawStatus(path), 200, path);
  }
});
