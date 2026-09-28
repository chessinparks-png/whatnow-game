// Content + engine check. No dependencies, no browser.
//
//   node tools/check.mjs          # validate and simulate 30 sessions
//   node tools/check.mjs --quiet  # only print problems and the verdict
//
// Loads the same scripts the browser loads into a sandbox with a fake
// localStorage, then (1) checks that every piece of the pack is playable and
// (2) simulates many sessions to check the session generator's behavior.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quiet = process.argv.includes("--quiet");
const log = (...a) => { if (!quiet) console.log(...a); };
const problems = [];
const fail = (msg) => problems.push(msg);

// ---------------------------------------------------------------- sandbox
const storage = new Map();
const sandbox = {
  console,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ["content/interactions.js", "js/store.js", "js/engine.js"]) {
  vm.runInContext(readFileSync(join(root, f), "utf8"), sandbox, { filename: f });
}
const pack = JSON.parse(readFileSync(join(root, "content/what_now_v1_vertical_slice.json"), "utf8"));

// pack.js must match the JSON (file:// launches use it).
const embedded = readFileSync(join(root, "content/pack.js"), "utf8");
const embeddedPack = JSON.parse(embedded.slice(embedded.indexOf("=") + 1).trim().replace(/;$/, ""));
if (JSON.stringify(embeddedPack) !== JSON.stringify(pack)) {
  fail("content/pack.js is out of date — run: node tools/embed-content.mjs");
}

const WN = sandbox.WN;
const C = WN.Content.init(pack, sandbox.WN_INTERACTIONS);
const ix = sandbox.WN_INTERACTIONS;

// ---------------------------------------------------------------- content
const STAGES = WN.Mastery.STAGES;
for (const c of C.concepts) {
  for (const st of STAGES) {
    const play = C.levelPlay(c.id, st);
    const L = c.levels[st];
    if (!play) { fail(`${c.id}/${st}: no play config`); continue; }
    if (play.format === "choice") {
      if (!Array.isArray(play.options) || play.options[play.correct] == null) fail(`${c.id}/${st}: bad correct index`);
      if (L.answerType === "reflection" && !play.reflection) fail(`${c.id}/${st}: reflection prompt is graded`);
    }
    if (play.format === "teach" && !play.includes) fail(`${c.id}/${st}: teach without includes`);
  }
  for (const s of c.scenarios) {
    const play = C.scenarioPlay(s.id);
    if (!play) { fail(`scenario ${s.id}: no play config`); continue; }
    const ids = play.options.map((o) => (typeof o === "string" ? o : o.id));
    const correct = s.supported.filter((t) => ids.includes(t));
    if (!correct.length) fail(`scenario ${s.id}: no option matches supported ${s.supported}`);
    if (new Set(ids).size !== ids.length) fail(`scenario ${s.id}: duplicate option ids`);
    for (const t of s.supported) if (!ix.tags[t]) fail(`scenario ${s.id}: tag "${t}" has no label`);
    if (!play.missing) fail(`scenario ${s.id}: missing information not written`);
  }
  if (!ix.contrasts[c.id]) fail(`${c.id}: no library contrast`);
  for (const sid of c.sourceIds) if (!C.sources[sid]) fail(`${c.id}: unknown source ${sid}`);
  for (const r of c.connections) if (!C.byId[r]) fail(`${c.id}: unknown connection ${r}`);
}
for (const t of C.threads) {
  if (!C.byId[t.to]) fail(`thread ${t.id}: unknown target`);
  if (!["app_synthesis", "historical_connection", "source_connection"].includes(t.type)) fail(`thread ${t.id}: type ${t.type}`);
}
for (const b of C.bosses) {
  const play = C.bossPlay(b.id);
  if (!play) { fail(`boss ${b.id}: no play config`); continue; }
  for (const s of b.steps) if (!play.steps[s.label]) fail(`boss ${b.id}: step ${s.label} has no play config`);
  for (const id of play.used) if (!C.byId[id]) fail(`boss ${b.id}: unknown used concept ${id}`);
}
for (const [cid, list] of Object.entries(ix.practice)) {
  if (!C.byId[cid]) fail(`practice: unknown concept ${cid}`);
  for (const ex of list) {
    if (ex.type === "sort") for (const it of ex.items) if (!ex.bins.includes(it.bin)) fail(`practice ${ex.id}: bad bin ${it.bin}`);
    if (ex.type === "speech") for (const x of ex.correct) if (!ix.speechOptions.some((o) => o.id === x)) fail(`practice ${ex.id}: bad option ${x}`);
    if (ex.type === "level") for (const x of ex.correct) if (!ix.levelOptions.some((o) => o.id === x)) fail(`practice ${ex.id}: bad option ${x}`);
  }
}
for (const e of ix.firstSession) {
  if (e.conceptId && !C.byId[e.conceptId]) fail(`firstSession: unknown ${e.conceptId}`);
  if (e.kind === "thread" && !C.threadFor(e.from, e.to)) fail(`firstSession: no thread ${e.from}→${e.to}`);
  if (e.kind === "practice" && !C.exercise(e.exerciseId)) fail(`firstSession: no exercise ${e.exerciseId}`);
}
log(`Content: ${C.concepts.length} concepts, ${C.scenarios.length} scenarios, ${C.threads.length} threads, ${C.bosses.length} boss cases, ${Object.keys(C.exercises).length} practice exercises`);

// ---------------------------------------------------------------- simulation
const Store = WN.Store;
Store.load();
ix.unlock.initial.forEach((id) => Store.unlock(id));
let now = Date.UTC(2026, 0, 1, 9);
let rng = 7;
const rand = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
const covered = { stages: new Set(), scenarios: new Set(), threads: new Set(), bosses: new Set(), exercises: new Set() };
const bossAt = [];

for (let n = 1; n <= 30; n++) {
  const st = Store.get();
  const plan = WN.Sessions.build(st, now);
  if (plan.length < 4 || plan.length > 5) fail(`session ${n}: plan has ${plan.length} encounters`);
  const newCount = plan.filter((e) => e.isNew || (n === 1 && e.slot === "new")).length;
  if (n > 1 && newCount > 1) fail(`session ${n}: ${newCount} new concepts`);
  const keys = plan.map((e) => JSON.stringify(e));
  if (new Set(keys).size !== keys.length) fail(`session ${n}: duplicate encounter`);
  const levelIds = plan.filter((e) => e.kind === "level").map((e) => e.conceptId);
  if (new Set(levelIds).size !== levelIds.length) fail(`session ${n}: same concept asked twice`);

  const desc = plan.map((e) => {
    if (e.kind === "level") { covered.stages.add(e.conceptId + "/" + e.stage); return `${e.slot}:${e.conceptId.replace("concept_", "")}/${e.stage}`; }
    if (e.kind === "scenario") { covered.scenarios.add(e.scenarioId); return `see:${e.scenarioId}`; }
    if (e.kind === "practice") { covered.exercises.add(e.exerciseId); return `practice:${e.exerciseId}`; }
    if (e.kind === "thread") { covered.threads.add(e.from + ">" + e.to); return `thread:${e.from.replace("concept_", "")}+${e.to.replace("concept_", "")}`; }
    covered.bosses.add(e.bossId); bossAt.push(n); return `BOSS:${e.bossId}`;
  });
  log(`#${String(n).padStart(2)} clarity ${String(WN.Clarity.compute(st)).padStart(3)} | ${desc.join("  ")}`);

  // Play it: answer correctly ~75% of the time.
  for (const e of plan) {
    const r = rand() < 0.75 ? "correct" : rand() < 0.5 ? "partial" : "incorrect";
    if (e.kind === "level") WN.Mastery.record(e.conceptId, r, "stage", { stage: e.stage, now });
    if (e.kind === "scenario") {
      WN.Mastery.record(e.conceptId, r, "scenario", { now });
      const lg = st.scenarioLog[e.scenarioId] || { shown: 0, correct: 0 };
      lg.shown++; lg.lastResult = r; lg.last = now; st.scenarioLog[e.scenarioId] = lg;
    }
    if (e.kind === "practice") {
      WN.Mastery.record(e.conceptId, r, "practice", { now });
      const lg = st.practiceLog[e.exerciseId] || { done: 0, last: 0 };
      lg.done++; lg.last = now; st.practiceLog[e.exerciseId] = lg;
    }
    if (e.kind === "thread") {
      Store.discoverConnection(e.from, e.to);
      WN.Mastery.record(e.from, r, "thread", { now });
      WN.Mastery.record(e.to, r, "thread", { now });
      const t = C.threadFor(e.from, e.to);
      const lg = st.threadLog[t.id] || { shown: 0, last: 0 }; lg.shown++; lg.last = now; st.threadLog[t.id] = lg;
    }
    if (e.kind === "boss") {
      const p = st.bossProgress[e.bossId] || { completed: 0 };
      p.completed++; p.lastSession = n; st.bossProgress[e.bossId] = p; st.lastBossSession = n;
    }
  }
  st.completedSessions++;
  st.sessionLog.push({ t: now, number: n, concepts: [...new Set(plan.flatMap((e) => [e.conceptId, e.from, e.to].filter(Boolean)))], scenarios: plan.filter((e) => e.scenarioId).map((e) => e.scenarioId) });
  now += (n % 4 === 0 ? 2 : 1) * WN.DAY; // play most days
}

const st = Store.get();
const unseen = C.concepts.filter((c) => !(st.concepts[c.id] && st.concepts[c.id].timesSeen));
if (unseen.length) fail(`after 30 sessions, never introduced: ${unseen.map((c) => c.id)}`);
if (covered.bosses.size !== C.bosses.length) fail(`boss cases never triggered: ${C.bosses.length - covered.bosses.size}`);
if (!bossAt.length || bossAt[0] > 4) fail(`first boss too late: session ${bossAt[0]}`);
for (let i = 1; i < bossAt.length; i++) if (bossAt[i] - bossAt[i - 1] < 3) fail(`boss too frequent: ${bossAt}`);

log(`\nBoss sessions: ${bossAt.join(", ")}`);
log(`Covered: ${covered.stages.size}/50 concept stages, ${covered.scenarios.size}/${C.scenarios.length} scenarios, ${covered.threads.size}/${C.threads.length} threads, ${covered.exercises.size}/${Object.keys(C.exercises).length} exercises`);
log(`Final clarity: ${WN.Clarity.compute(st)}`);
log("Mastery:", C.concepts.map((c) => `${c.title} ${st.concepts[c.id].mastery.toFixed(2)}`).join(" · "));

if (problems.length) {
  console.log("\nPROBLEMS:");
  problems.forEach((p) => console.log("  - " + p));
  process.exit(1);
}
console.log("\nOK — content playable, session generator behaves.");
