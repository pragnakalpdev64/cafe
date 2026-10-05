// Builds the team status board (a single HTML page) from doc/TASKS.md + doc/PLAN.md.
//   node scripts/status-board.mjs <out.html>
// The task file is the source of truth; republish the page after ticking tasks.
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/status-board.mjs <out.html>");
  process.exit(1);
}

const tasksMd = readFileSync(new URL("../doc/TASKS.md", import.meta.url), "utf8");
const planMd = readFileSync(new URL("../doc/PLAN.md", import.meta.url), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// tiny inline markdown: `code` and **bold**
const md = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/* ---------- parse tasks ---------- */
const phases = [];
let phase = null;
let task = null;
for (const line of tasksMd.split("\n")) {
  const ph = line.match(/^## (Phase \d+[A-Z]?) – (.+)$/);
  if (ph) {
    phase = { key: ph[1], title: ph[2].trim(), tasks: [] };
    phases.push(phase);
    task = null;
    continue;
  }
  const t = line.match(/^- \[( |x)\] \*\*([A-Z]\d[A-Z]?-\d+) ([^*]+)\*\*\s*(.*)$/);
  if (t && phase) {
    const [, mark, id, title, rest] = t;
    task = {
      id,
      title: title.trim(),
      done: mark === "x",
      blocked: /⛔/.test(title + rest),
      summary: rest.replace(/^[–-]\s*/, "").replace(/⛔[^–]*–?\s*/, "").trim(),
      blocker: (rest.match(/⛔\s*([^–]+)/) || [])[1]?.trim(),
      details: [],
      notes: [],
    };
    phase.tasks.push(task);
    continue;
  }
  if (task && /^\s{2,}\S/.test(line)) {
    const text = line.trim();
    if (text.startsWith("✅")) task.notes.push(text.replace(/^✅\s*/, ""));
    else task.details.push(text);
  } else if (!line.trim()) {
    // blank lines end nothing; tasks end at the next "- [" or heading
  }
}

const nextLine = tasksMd.match(/\*\*Next up \(in order\):\*\*\s*(.+)/);
// ids in the first sentence are the queue; later sentences are side notes
const nextIds = nextLine ? [...nextLine[1].split(/\.\s+/)[0].matchAll(/P\d[A-Z]?-\d+/g)].map((m) => m[0]) : [];
const nextExtra = nextLine ? (nextLine[1].split(/\.\s+/)[1] ?? "") : "";
const allTasks = phases.flatMap((p) => p.tasks.map((t) => ({ ...t, phase: p })));
const byId = Object.fromEntries(allTasks.map((t) => [t.id, t]));
const nextTasks = nextIds.map((id) => byId[id]).filter((t) => t && !t.done);

const total = allTasks.length;
const doneCount = allTasks.filter((t) => t.done).length;

/* ---------- parse open questions ---------- */
const qSection = planMd.split(/^## 5\./m)[1] ?? "";
const questions = qSection
  .split("\n")
  .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/Question \(from goal doc\)/.test(l))
  .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
  .filter((c) => c.length >= 2);
const resolved = (qSection.match(/^Resolved:\s*(.+)$/m) || [])[1];

/* ---------- render ---------- */
const status = (t) => (t.done ? "done" : t.blocked ? "blocked" : "todo");
const statusLabel = { done: "Done", blocked: "Waiting on answer", todo: "To do" };

const taskCard = (t, { showPhase = false } = {}) => `
  <li class="task" data-status="${status(t)}">
    <div class="task-head">
      <span class="tid">${t.id}</span>
      <span class="tname">${md(t.title)}</span>
      <span class="pill pill-${status(t)}">${statusLabel[status(t)]}</span>
    </div>
    ${showPhase ? `<p class="tphase">${esc(t.phase.key)} · ${esc(t.phase.title)}</p>` : ""}
    ${t.summary ? `<p class="tsum">${md(t.summary)}</p>` : ""}
    ${t.blocker ? `<p class="tblock">Needs: ${md(t.blocker)}</p>` : ""}
    ${t.details.map((d) => `<p class="tdet">${md(d)}</p>`).join("")}
    ${t.notes.map((n) => `<p class="tnote">${md(n)}</p>`).join("")}
  </li>`;

const phaseRows = phases
  .map((p) => {
    const d = p.tasks.filter((t) => t.done).length;
    const b = p.tasks.filter((t) => !t.done && t.blocked).length;
    const pct = p.tasks.length ? Math.round((d / p.tasks.length) * 100) : 0;
    return `
    <a class="prow" href="#${p.key.replace(" ", "-").toLowerCase()}">
      <span class="pname"><span class="pkey">${p.key}</span> ${esc(p.title)}</span>
      <span class="bar" role="img" aria-label="${d} of ${p.tasks.length} done"><span style="width:${pct}%"></span></span>
      <span class="pnum">${d}/${p.tasks.length}</span>
      <span class="pblk">${b ? `${b} waiting` : ""}</span>
    </a>`;
  })
  .join("");

const phaseSections = phases
  .map((p) => {
    const open = p.tasks.filter((t) => !t.done);
    const done = p.tasks.filter((t) => t.done);
    return `
    <section class="phase" id="${p.key.replace(" ", "-").toLowerCase()}">
      <h3><span class="pkey">${p.key}</span> ${esc(p.title)}</h3>
      ${open.length ? `<ul class="tasks">${open.map((t) => taskCard(t)).join("")}</ul>` : `<p class="allgood">Everything in this phase is built.</p>`}
      ${
        done.length
          ? `<details class="donelist"><summary>${done.length} done</summary><ul class="tasks">${done.map((t) => taskCard(t)).join("")}</ul></details>`
          : ""
      }
    </section>`;
  })
  .join("");

const updated = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const html = `<title>Healthy Hunger Build Board</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Layout: one reading column – summary first (next up, progress, questions), full task list below. */
:root {
  --bg: #fff8ee; --surface: #ffffff; --ink: #1c2b22; --muted: #566b5d; --line: #eadfce;
  --green: #15803d; --green-soft: #e7f4ea; --orange: #ff8a00; --orange-text: #c2410c; --orange-soft: #fff0dc;
  --track: #f1e7d8;
  --display: "Baloo 2", "Trebuchet MS", system-ui, sans-serif;
  --body: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e1a13; --surface: #16251b; --ink: #eef5ef; --muted: #a7b8ac; --line: #24392b;
  --green: #22c55e; --green-soft: #173a24; --orange: #ff8a00; --orange-text: #ffa933; --orange-soft: #33240f;
  --track: #24392b; color-scheme: dark;
} }
:root[data-theme="dark"] {
  --bg: #0e1a13; --surface: #16251b; --ink: #eef5ef; --muted: #a7b8ac; --line: #24392b;
  --green: #22c55e; --green-soft: #173a24; --orange: #ff8a00; --orange-text: #ffa933; --orange-soft: #33240f;
  --track: #24392b; color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--body); padding: 0 16px; }
.wrap { max-width: 860px; margin: 0 auto; padding-block: 32px 64px; display: grid; gap: 40px; }
h1, h2, h3 { font-family: var(--display); line-height: 1.1; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; }
h1 .h { color: var(--orange-text); }
h2 { font-size: 1.5rem; font-weight: 700; }
h3 { font-size: 1.2rem; font-weight: 700; display: flex; gap: 8px; align-items: baseline; }
code { font-family: var(--mono); font-size: 0.82em; background: var(--track); padding: 1px 5px; border-radius: 5px; overflow-wrap: anywhere; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; border-radius: 6px; }
.eyebrow { font-weight: 700; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--green); margin: 0 0 6px; }
header p.lede { color: var(--muted); max-width: 62ch; margin: 10px 0 0; }
.overall { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; margin-top: 18px; }
.overall .big { font-family: var(--display); font-size: 2.2rem; font-weight: 800; color: var(--green); line-height: 1; font-variant-numeric: tabular-nums; }
.overall .bar { flex: 1 1 220px; height: 12px; }
.meta { color: var(--muted); font-size: 0.85rem; }
section > h2 { margin-bottom: 14px; }
.section-note { color: var(--muted); margin: -6px 0 14px; max-width: 62ch; }

/* next up: a real sequence, so it is numbered */
ol.next { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; counter-reset: n; }
ol.next > li { counter-increment: n; display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; }
ol.next > li::before { content: counter(n); font-family: var(--display); font-weight: 800; font-size: 1.4rem; color: var(--ink);
  background: var(--orange); border-radius: 12px; width: 40px; height: 40px; display: grid; place-items: center; color: #1c2b22; }
ol.next > li:first-child { border-color: var(--orange); box-shadow: 0 10px 30px -18px rgba(255, 138, 0, 0.6); }
ol.next .task { list-style: none; }
.next-body { min-width: 0; }

.prows { display: grid; gap: 2px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 6px; }
.prow { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(80px, 2fr) 3.2em 6.5em; gap: 12px; align-items: center;
  padding: 10px; border-radius: 10px; text-decoration: none; }
.prow:hover { background: var(--green-soft); }
.pname { font-weight: 600; min-width: 0; }
.pkey { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); font-weight: 500; }
.bar { display: block; height: 8px; background: var(--track); border-radius: 99px; overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--green); border-radius: inherit; }
.pnum { font-variant-numeric: tabular-nums; text-align: right; font-weight: 600; }
.pblk { font-size: 0.78rem; color: var(--orange-text); font-weight: 600; }
@media (max-width: 560px) {
  .prow { grid-template-columns: minmax(0, 1fr) 3em; }
  .prow .bar { grid-column: 1 / -1; grid-row: 2; }
  .prow .pblk { grid-column: 1 / -1; }
  .prow .pblk:empty { display: none; }
}

.qs { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.qs li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; padding: 12px 14px; border-radius: 12px;
  background: var(--orange-soft); }
.qs .need { font-size: 0.8rem; color: var(--orange-text); font-weight: 600; text-align: right; }
@media (max-width: 560px) { .qs li { grid-template-columns: 1fr; } .qs .need { text-align: left; } }
.resolved { color: var(--muted); font-size: 0.85rem; margin: 10px 0 0; }

.phase { display: grid; gap: 12px; scroll-margin-top: 16px; }
.phase + .phase { border-top: 1px solid var(--line); padding-top: 24px; }
ul.tasks { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.phase ul.tasks > .task { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
.task-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.tid { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); }
.tname { font-weight: 700; flex: 1 1 200px; min-width: 0; }
.task p { margin: 6px 0 0; min-width: 0; overflow-wrap: anywhere; }
.tsum, .tdet { color: var(--muted); font-size: 0.9rem; }
.tphase { font-size: 0.78rem; color: var(--muted); }
.tblock { font-size: 0.85rem; font-weight: 600; color: var(--orange-text); }
.tnote { font-size: 0.85rem; color: var(--green); }
.pill { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; padding: 2px 9px; border-radius: 99px; white-space: nowrap; }
.pill-done { background: var(--green-soft); color: var(--green); }
.pill-todo { background: var(--track); color: var(--muted); }
.pill-blocked { background: var(--orange-soft); color: var(--orange-text); }
.task[data-status="done"] .tname { color: var(--muted); }
details.donelist summary { cursor: pointer; color: var(--green); font-weight: 600; padding: 4px 0; }
details.donelist ul { margin-top: 8px; }
.allgood { color: var(--green); font-weight: 600; margin: 0; }
footer { color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); padding-top: 16px; }
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">Café website · QR menu · staff dashboard</p>
    <h1>Healthy <span class="h">Hunger</span> build board</h1>
    <p class="lede">What is built, what comes next, and what we need from the café to keep going. Generated from the project's task list on ${esc(updated)}.</p>
    <div class="overall">
      <span class="big">${doneCount}/${total}</span>
      <span class="bar" role="img" aria-label="${doneCount} of ${total} tasks done"><span style="width:${Math.round((doneCount / total) * 100)}%"></span></span>
      <span class="meta">tasks done</span>
    </div>
  </header>

  <section aria-labelledby="next-h">
    <h2 id="next-h">Next up</h2>
    <p class="section-note">Built in this order, one task per working session. ${md(nextExtra)}</p>
    <ol class="next">
      ${nextTasks.map((t) => `<li><div class="next-body"><ul class="tasks">${taskCard(t, { showPhase: true })}</ul></div></li>`).join("")}
    </ol>
  </section>

  <section aria-labelledby="prog-h">
    <h2 id="prog-h">Progress by phase</h2>
    <div class="prows">${phaseRows}</div>
  </section>

  <section aria-labelledby="q-h">
    <h2 id="q-h">Waiting on the café</h2>
    <p class="section-note">Answers to these unblock the tasks marked “Waiting on answer”.</p>
    <ul class="qs">
      ${questions.map(([q, need]) => `<li><span>${md(q)}</span><span class="need">${md(need)}</span></li>`).join("")}
    </ul>
    ${resolved ? `<p class="resolved">Resolved: ${md(resolved)}</p>` : ""}
  </section>

  <section aria-labelledby="all-h">
    <h2 id="all-h">Everything still to build</h2>
    <div style="display:grid;gap:24px">${phaseSections}</div>
  </section>

  <footer>Source of truth: <code>doc/TASKS.md</code> and <code>doc/PLAN.md</code> in the repository. Regenerate with <code>node scripts/status-board.mjs</code>.</footer>
</div>
`;

writeFileSync(out, html);
console.log(`Wrote ${out}: ${doneCount}/${total} done, ${nextTasks.length} next, ${questions.length} open questions.`);
