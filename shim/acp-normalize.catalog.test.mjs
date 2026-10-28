import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const shim = new URL("./acp-normalize.mjs", import.meta.url).pathname;
const adapter = `require('node:readline').createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line); console.log(JSON.stringify({jsonrpc:'2.0',id:m.id,result:{configOptions:[{id:'model',category:'model',currentValue:'gemini-4-argon-high',options:[]}]}}));
});`;
const fresh = [
  { value: "gemini-4-argon-medium", name: "Gemini 4 Argon (Medium)" },
  { value: "gemini-4-argon-high", name: "Gemini 4 Argon (High)" },
  { value: "gemini-4-argon-low", name: "Gemini 4 Argon (Low)" },
  { value: "new-provider-model", name: "New model" },
];
function fixture(t, { saved, failure = false, empty = false } = {}) {
  const home = mkdtempSync(path.join(os.tmpdir(), "agy-model-catalog-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const cache = path.join(home, ".agy-acp", "models.json");
  mkdirSync(path.dirname(cache));
  if (saved) writeFileSync(cache, JSON.stringify(saved));
  const agy = path.join(home, "agy");
  const count = path.join(home, "calls");
  writeFileSync(agy, `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(count)},'1');
    if(process.argv[2]!=='models')process.exit(2);
    ${failure ? "process.exit(1);" : `console.log(${JSON.stringify(empty ? "" : fresh.map(m => `${m.value}\t${m.name}`).join("\n"))});`}
  `, { mode: 0o755 });
  const run = () => spawnSync(process.execPath, [shim, process.execPath, "-e", adapter], {
    env: { ...process.env, HOME: home, AGY_BIN: agy }, encoding: "utf8", timeout: 5000,
    input: [1, 2].map(id => JSON.stringify({ jsonrpc: "2.0", id, method: "session/new", params: {} })).join("\n") + "\n",
  });
  return { run, cache, count };
}

test("fresh CLI catalog overrides stale cache, normalizes new families and probes only once", t => {
  const f = fixture(t, { saved: [{ value: "removed-model", name: "Removed" }] });
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const responses = result.stdout.trim().split("\n").map(line => JSON.parse(line));
  assert.equal(responses.length, 2);
  for (const response of responses) {
    const options = response.result.configOptions;
    assert.deepEqual(options.find(o => o.id === "model").options.map(o => o.value), ["gemini-4-argon", "new-provider-model"]);
    assert.deepEqual(options.find(o => o.id === "thought_level").options.map(o => o.value), ["medium", "high", "low"]);
  }
  assert.deepEqual(JSON.parse(readFileSync(f.cache, "utf8")), fresh);
  assert.equal(readFileSync(f.count, "utf8"), "1");
});

test("offline discovery uses saved catalog with a warning, never a hardcoded list", t => {
  const f = fixture(t, { saved: fresh, failure: true });
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Could not refresh Antigravity models/);
  assert.match(result.stdout, /gemini-4-argon/);
  assert.deepEqual(JSON.parse(readFileSync(f.cache, "utf8")), fresh);
});

for (const mode of ["failure", "empty"]) {
  test(`no saved catalog and ${mode}: discovery fails instead of inventing models`, t => {
    const f = fixture(t, { failure: mode === "failure", empty: mode === "empty" });
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /model catalog unavailable/);
    assert.equal(result.stdout, "");
    assert.equal(existsSync(f.cache), false);
  });
}
