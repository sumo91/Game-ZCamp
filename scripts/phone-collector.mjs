import { createServer } from "node:http";
import { mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { join, relative, isAbsolute, extname, sep } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const BASE = "/Game-ZCamp/";
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const outside = (root, path) => { const rel = relative(root, path); return rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel); };

function validEvidence(value, session) {
  return object(value) && value.schema === 1 && value.experiment === "ZCamp #5 early presentation-only asset pressure"
    && ["completed", "interrupted"].includes(value.outcome)
    && (value.outcome === "completed" ? value.interruptionReason === null : typeof value.interruptionReason === "string")
    && object(value.scope) && value.scope.ownerAccepted === false && value.scope.physicalDeviceAccepted === false
    && object(value.configuration) && [100, 200, 300].includes(value.configuration.count)
    && ["standard", "reduced"].includes(value.configuration.quality)
    && ["desktop", "physical-phone", "emulator"].includes(value.configuration.deviceCategory)
    && typeof value.configuration.declaredModel === "string" && typeof value.configuration.declaredOs === "string"
    && object(value.environmentAtStart) && object(value.environmentAtEnd)
    && object(value.timing) && Number.isInteger(value.timing.sampleCount)
    && Array.isArray(value.timing.rawFrameIntervalsMs) && value.timing.sampleCount === value.timing.rawFrameIntervalsMs.length
    && value.timing.rawFrameIntervalsMs.every(frame => Number.isFinite(frame) && frame >= 0)
    && Number.isFinite(value.timing.durationSecondsRequested) && value.timing.durationSecondsRequested > 0
    && Number.isFinite(value.timing.warmupSecondsRequested)
    && object(value.sceneAtStart) && object(value.sceneAtEnd) && object(value.measuredRendering)
    && Array.isArray(value.responseChecks) && object(value.assets) && typeof value.assets.manifestSource === "string"
    && /^[a-f0-9]{64}$/i.test(value.assets.manifestSha256) && Array.isArray(value.assets.modelAssets)
    && object(value.collectorSession) && value.collectorSession.sessionId === session.sessionId && value.collectorSession.buildSha === session.buildSha;
}

async function writeExclusive(file, data) {
  const handle = await open(file, "wx");
  try { await handle.writeFile(data); await handle.sync(); }
  catch (error) { await handle.close(); await unlink(file).catch(() => {}); throw error; }
  await handle.close();
}

/** Standalone local receiver. The returned HTTP server is also the public test seam. */
export async function createPhoneCollector({ dist, output, token, buildSha, maxBytes = 8 * 1024 * 1024 }) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{24,128}$/.test(token)) throw new Error("A 24–128 character session token is required");
  if (typeof buildSha !== "string" || !/^[a-f0-9]{40}$/i.test(buildSha)) throw new Error("The full candidate build SHA is required");
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) throw new Error("Invalid result size limit");
  const distRoot = await realpath(dist);
  await mkdir(output, { recursive: true });
  const outputRoot = await realpath(output);
  if (!outside(distRoot, outputRoot)) throw new Error("Evidence output must be outside the public dist");
  const session = { schema: 1, sessionId: randomUUID(), buildSha };
  await writeExclusive(join(outputRoot, `session-build-${session.sessionId}.json`), JSON.stringify({ ...session, dist: distRoot, createdAt: new Date().toISOString(), buildIdentitySource: "operator-supplied candidate build SHA" }, null, 2));
  const server = createServer(async (request, response) => {
    const reply = (status, value) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); };
    try {
      const pathname = request.url?.split("?")[0];
      if (pathname === `${BASE}__phone-session` || pathname === `${BASE}__phone-results`) {
        if (request.headers["x-zcamp-token"] !== token) { reply(403, { error: "Invalid session token" }); return; }
        if (pathname.endsWith("__phone-session") && request.method === "GET") { reply(200, session); return; }
        if (pathname.endsWith("__phone-results") && request.method === "POST") {
          if (!request.headers["content-type"]?.startsWith("application/json")) { reply(415, { error: "JSON required" }); request.resume(); return; }
          if (Number(request.headers["content-length"]) > maxBytes) { reply(413, { error: "Result too large" }); request.resume(); return; }
          const chunks = []; let bytes = 0;
          for await (const chunk of request) { bytes += chunk.length; if (bytes <= maxBytes) chunks.push(chunk); }
          if (bytes > maxBytes) { reply(413, { error: "Result too large" }); return; }
          const raw = Buffer.concat(chunks);
          let value;
          try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
          catch { reply(400, { error: "Invalid JSON" }); return; }
          if (!validEvidence(value, session)) { reply(400, { error: "Missing or invalid raw measurement fields or session identity" }); return; }
          const file = `result-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`;
          await writeExclusive(join(outputRoot, file), raw);
          reply(201, { saved: true, file, sessionId: session.sessionId, buildSha }); return;
        }
        reply(405, { error: "Method not allowed" }); return;
      }
      if (pathname?.startsWith(BASE) && ["GET", "HEAD"].includes(request.method)) {
        let path;
        try { path = decodeURIComponent(pathname.slice(BASE.length)) || "index.html"; }
        catch { reply(400, { error: "Invalid path" }); return; }
        if (path.includes("\\") || path.includes("\0") || path.split("/").some(part => part === "." || part === "..")) { reply(403, { error: "Path outside candidate" }); return; }
        let file;
        try { file = await realpath(join(distRoot, path)); }
        catch { reply(404, { error: "Not found" }); return; }
        if (outside(distRoot, file)) { reply(403, { error: "Path outside candidate" }); return; }
        let data;
        try { data = await readFile(file); }
        catch { reply(404, { error: "Not found" }); return; }
        const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".glb": "model/gltf-binary" }[extname(file).toLowerCase()] ?? "application/octet-stream";
        response.writeHead(200, { "Content-Type": mime, "Content-Length": data.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
        response.end(request.method === "HEAD" ? undefined : data); return;
      }
      reply(404, { error: "Not found" });
    } catch { reply(500, { error: "Unable to persist result" }); }
  });
  server.requestTimeout = 30_000;
  return { server, session };
}

async function main() {
  const { values } = parseArgs({ options: { host: { type: "string" }, port: { type: "string" }, dist: { type: "string" }, output: { type: "string" }, "build-sha": { type: "string" }, token: { type: "string" } } });
  const assignedLanAddress = Object.values(networkInterfaces()).flat().some(address => address && !address.internal && address.address === values.host);
  if (!assignedLanAddress) throw new Error("--host must be an explicitly assigned LAN address on this computer; wildcard binding is not allowed");
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port must be 1–65535");
  if (!values.dist || !values.output) throw new Error("--dist and --output are required");
  const token = values.token ?? randomBytes(32).toString("base64url");
  const { server, session } = await createPhoneCollector({ dist: values.dist, output: values.output, token, buildSha: values["build-sha"] });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, values.host, resolve); });
  const host = values.host.includes(":") ? `[${values.host}]` : values.host;
  console.log(JSON.stringify({ url: `http://${host}:${port}${BASE}?preview=asset-pressure&phone=iqoo-z10-turbo&session=${encodeURIComponent(token)}`, ...session, host: values.host, port, output: values.output }, null, 2));
  const close = () => server.close(() => process.exit(0));
  process.on("SIGINT", close); process.on("SIGTERM", close);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
