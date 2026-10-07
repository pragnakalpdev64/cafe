// Builds the team status board (a single HTML page) from doc/STATUS.md, doc/TASKS.md and doc/PLAN.md.
//   node scripts/status-board.mjs <out.html>
// STATUS.md = what works today in everyday words; TASKS.md = the work queue (its `Plain:` lines
// are what the board shows); PLAN.md §5 = questions for the café. Republish after ticking tasks.
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/status-board.mjs <out.html>");
  process.exit(1);
}

const read = (f) => readFileSync(new URL(`../doc/${f}`, import.meta.url), "utf8");
const statusMd = read("STATUS.md");
const tasksMd = read("TASKS.md");
const planMd = read("PLAN.md");

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// tiny inline markdown: `code` and **bold**
const md = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/* ---------- STATUS.md: headline, order steps, what works ---------- */
const statusBody = statusMd.replace(/<!--[\s\S]*?-->/g, "");
const sectionOf = (name) =>
  (statusBody.split(new RegExp(`^## ${name}\\s*$`, "m"))[1] ?? "").split(/^## /m)[0];
const headline = (
  statusBody
    .split(/^## /m)[0]
    .split("\n")
    .find((l) => l.trim() && !l.startsWith("#")) ?? ""
).trim();
const steps = sectionOf("How an order works")
  .split("\n")
  .map((l) => l.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[–-]\s*(.+)$/))
  .filter(Boolean)
  .map(([, name, text]) => ({ name, text }));
const works = sectionOf("What works today")
  .split(/^### /m)
  .slice(1)
  .map((block) => {
    const [title, ...rest] = block.split("\n");
    return {
      title: title.trim(),
      items: rest.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim()),
    };
  });

/* ---------- TASKS.md ---------- */
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
  const t = line.match(/^- \[( |x|~)\] \*\*([A-Z]\d[A-Z]?-\d+) ([^*]+)\*\*\s*(.*)$/);
  if (t && phase) {
    const [, mark, id, title, rest] = t;
    task = {
      id,
      title: title.trim(),
      state: mark === "x" ? "done" : mark === "~" ? "covered" : /⛔/.test(title + rest) ? "blocked" : "todo",
      summary: rest
        .replace(/^[–-]\s*/, "")
        .replace(/⛔[^–]*–?\s*/, "")
        .trim(),
      blocker: (rest.match(/⛔\s*([^–]+)/) || [])[1]?.trim(),
      plain: "",
      why: "",
      details: [],
    };
    phase.tasks.push(task);
    continue;
  }
  if (task && /^\s{2,}\S/.test(line)) {
    const text = line.trim();
    if (text.startsWith("Plain:")) task.plain = text.replace(/^Plain:\s*/, "");
    else if (text.startsWith("↪")) task.why = text.replace(/^↪\s*/, "");
    else task.details.push(text.replace(/^✅\s*/, ""));
  }
}
const shownPhases = phases.filter((p) => p.tasks.length);
const allTasks = shownPhases.flatMap((p) => p.tasks.map((t) => ({ ...t, phase: p })));
const real = allTasks.filter((t) => t.state !== "covered"); // covered tasks don't count either way
const doneCount = real.filter((t) => t.state === "done").length;
const leftCount = real.length - doneCount;
const pct = Math.round((doneCount / real.length) * 100);

const nextLine = tasksMd.match(/\*\*Next up \(in order\):\*\*\s*(.+)/);
const nextIds = nextLine
  ? [...nextLine[1].split(/\.\s+/)[0].matchAll(/P\d[A-Z]?-\d+/g)].map((m) => m[0])
  : [];
const nextNote = nextLine ? (nextLine[1].split(/\.\s+/).slice(1).join(". ") ?? "") : "";
const byId = Object.fromEntries(allTasks.map((t) => [t.id, t]));
const nextTasks = nextIds
  .map((id) => byId[id])
  .filter((t) => t && t.state !== "done" && t.state !== "covered");
// other open tasks, so nothing outstanding is hidden
const laterTasks = real.filter((t) => t.state !== "done" && !nextIds.includes(t.id));

/* ---------- PLAN.md §5: questions for the café ---------- */
const qSection = planMd.split(/^## 5\./m)[1] ?? "";
const questions = qSection
  .split("\n")
  .filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l) && !/Question \(from goal doc\)/.test(l))
  .map((l) =>
    l
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim()),
  )
  .filter((c) => c.length >= 2);
const resolved = (qSection.match(/^Resolved:\s*(.+)$/m) || [])[1];

/* ---------- render ---------- */
const STATE = {
  done: { label: "Done", cls: "done" },
  todo: { label: "To do", cls: "todo" },
  blocked: { label: "Waiting on café", cls: "blocked" },
  covered: { label: "Covered", cls: "covered" },
};
const pill = (state) => `<span class="pill pill-${STATE[state].cls}">${STATE[state].label}</span>`;
const words = (t) => t.plain || t.title;

const comingItem = (t) => `
      <li class="next-item">
        <div class="next-main">
          <p class="next-title">${md(t.title)} <span class="tid">${t.id}</span></p>
          <p class="next-plain">${md(words(t))}</p>
        </div>
        ${t.state === "blocked" ? `<p class="needs">Needs: ${md(t.blocker ?? "an answer")}</p>` : ""}
      </li>`;

const technical = (t) => {
  const lines = [t.summary, ...t.details].filter(Boolean);
  return lines.length
    ? `<details class="tech"><summary>Technical notes</summary>${lines.map((l) => `<p>${md(l)}</p>`).join("")}</details>`
    : "";
};

const taskRow = (t) => `
        <li class="task" data-state="${t.state}">
          <div class="task-head">
            <span class="tname">${md(t.title)}</span>
            <span class="tid">${t.id}</span>
            ${pill(t.state)}
          </div>
          ${t.state === "covered" ? `<p class="tplain">${md(t.why)}</p>` : t.plain ? `<p class="tplain">${md(t.plain)}</p>` : ""}
          ${t.state === "blocked" ? `<p class="needs">Needs: ${md(t.blocker ?? "an answer")}</p>` : ""}
          ${technical(t)}
        </li>`;

const phaseBlock = (p) => {
  const counted = p.tasks.filter((t) => t.state !== "covered");
  const d = counted.filter((t) => t.state === "done").length;
  const open = counted.length - d;
  const ppct = counted.length ? Math.round((d / counted.length) * 100) : 100;
  const order = { blocked: 0, todo: 1, done: 2, covered: 3 };
  const sorted = [...p.tasks].sort((a, b) => order[a.state] - order[b.state]);
  return `
      <details class="phase" ${open ? "open" : ""}>
        <summary>
          <span class="chev" aria-hidden="true">›</span>
          <span class="pname">${esc(p.title)}</span>
          <span class="meter" role="img" aria-label="${d} of ${counted.length} done"><span style="width:${ppct}%"></span></span>
          <span class="pcount">${open ? `${open} left` : "All done"}</span>
        </summary>
        <ul class="tasks">${sorted.map(taskRow).join("")}</ul>
      </details>`;
};

const updated = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const html = `<title>Healthy Hunger Build Board</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
/* Layout: one column read top to bottom – where we are, how an order works, what works today,
   what's next, what we need from the café; the full task list sits folded at the end. */
:root {
  --bg: #fff8ee; --surface: #ffffff; --ink: #1c2b22; --muted: #566b5d; --line: #eadfce;
  --green: #15803d; --green-soft: #e7f4ea; --orange: #ff8a00; --orange-text: #c2410c; --orange-soft: #fff0dc;
  --track: #f1e7d8; --on-orange: #1c2b22;
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
body { background: var(--bg); color: var(--ink); font: 16px/1.55 var(--body); padding: 0 16px; margin: 0; }
.wrap { max-width: 920px; margin: 0 auto; padding-block: 36px 72px; display: grid; gap: 44px; }
h1, h2, h3 { font-family: var(--display); line-height: 1.1; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(2.1rem, 5vw, 3rem); font-weight: 800; }
h1 .h { color: var(--orange-text); }
h2 { font-size: 1.6rem; font-weight: 700; }
h3 { font-size: 1.2rem; font-weight: 700; }
p { margin: 0; }
code { font-family: var(--mono); font-size: 0.8em; background: var(--track); padding: 1px 5px; border-radius: 5px; overflow-wrap: anywhere; }
:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; border-radius: 6px; }
.eyebrow { font-weight: 700; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--green); margin-bottom: 8px; }
.lede { font-size: 1.12rem; max-width: 60ch; margin-top: 12px; }
.updated { color: var(--muted); font-size: 0.85rem; margin-top: 8px; }
section > h2 { margin-bottom: 6px; }
.note { color: var(--muted); max-width: 62ch; margin-bottom: 16px; }

/* at a glance */
.glance { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; margin-top: 24px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; display: grid; gap: 4px; align-content: start; }
.stat .num { font-family: var(--display); font-size: 2.3rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.stat .lbl { color: var(--muted); font-size: 0.9rem; }
.stat-built .num { color: var(--green); }
.stat-wait .num { color: var(--orange-text); }
.bar { display: block; height: 10px; background: var(--track); border-radius: 99px; overflow: hidden; margin-top: 8px; }
.bar > span { display: block; height: 100%; background: var(--green); border-radius: inherit; }
@media (max-width: 640px) { .glance { grid-template-columns: 1fr 1fr; } .stat-built { grid-column: 1 / -1; } }

/* order flow: a real sequence, so it is numbered */
ol.flow { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 10px; counter-reset: step; }
ol.flow li { counter-increment: step; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px; display: grid; gap: 4px; align-content: start; }
ol.flow li::before { content: counter(step); font-family: var(--display); font-weight: 800; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--green); color: #fff; font-size: 0.95rem; }
.flow .sname { font-family: var(--display); font-weight: 700; font-size: 1.1rem; }
.flow .stext { color: var(--muted); font-size: 0.86rem; line-height: 1.4; }

/* what works today */
.works { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.who { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 18px; min-width: 0; }
.who h3 { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.who h3 .count { font-family: var(--body); font-size: 0.8rem; font-weight: 600; color: var(--muted); }
.who ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 9px; }
.who li { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; font-size: 0.93rem; line-height: 1.45; }
.who li::before { content: "✓"; width: 18px; height: 18px; margin-top: 2px; border-radius: 50%; background: var(--green-soft); color: var(--green);
  font-size: 0.7rem; font-weight: 800; display: grid; place-items: center; }
@media (max-width: 760px) { .works { grid-template-columns: 1fr; } }

/* coming next: order matters, so numbered */
ol.next { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; counter-reset: n; }
.next-item { counter-increment: n; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 4px 14px; align-items: start;
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
.next-item::before { content: counter(n); grid-row: span 2; font-family: var(--display); font-weight: 800; font-size: 1.2rem; width: 36px; height: 36px;
  border-radius: 10px; display: grid; place-items: center; background: var(--orange); color: var(--on-orange); }
ol.next .next-item:first-child { border-color: var(--orange); }
.next-main { min-width: 0; display: grid; gap: 2px; }
.next-title { font-weight: 700; }
.next-plain { color: var(--muted); font-size: 0.93rem; }
.next-item .needs { grid-column: 2 / -1; }
@media (min-width: 640px) { .next-item .needs { grid-column: auto; grid-row: 1; } }
.later { margin-top: 14px; }
.later summary { cursor: pointer; font-weight: 600; color: var(--green); }
.later ul { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 8px; }
.later li { display: grid; gap: 2px; padding: 10px 14px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); }
.later .lt { font-weight: 600; }
.later .lp { color: var(--muted); font-size: 0.9rem; }

/* questions */
.qs { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.qs li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; padding: 12px 16px; border-radius: 12px; background: var(--orange-soft); }
.qs .need { font-size: 0.82rem; color: var(--orange-text); font-weight: 600; text-align: right; }
@media (max-width: 560px) { .qs li { grid-template-columns: 1fr; } .qs .need { text-align: left; } }
.resolved { color: var(--muted); font-size: 0.86rem; margin-top: 10px; }

/* full list */
.phases { display: grid; gap: 10px; }
details.phase { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
details.phase > summary { cursor: pointer; list-style: none; display: grid; grid-template-columns: 14px minmax(0, 1fr) minmax(60px, 160px) 5.5em; gap: 12px; align-items: center; padding: 14px 16px; }
details.phase > summary::-webkit-details-marker { display: none; }
.chev { color: var(--muted); font-weight: 700; transition: transform 0.2s ease; }
details.phase[open] .chev { transform: rotate(90deg); }
.pname { font-weight: 700; }
.meter { display: block; height: 8px; background: var(--track); border-radius: 99px; overflow: hidden; }
.meter > span { display: block; height: 100%; background: var(--green); border-radius: inherit; }
.pcount { text-align: right; font-size: 0.85rem; color: var(--muted); font-variant-numeric: tabular-nums; }
ul.tasks { list-style: none; padding: 0 16px 16px; margin: 0; display: grid; gap: 8px; }
.task { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 4px; }
.task-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
.tname { font-weight: 600; flex: 1 1 220px; min-width: 0; }
.task[data-state="done"] .tname, .task[data-state="covered"] .tname { color: var(--muted); font-weight: 500; }
.tid { font-family: var(--mono); font-size: 0.74rem; color: var(--muted); font-weight: 500; }
.tplain { font-size: 0.92rem; }
.task[data-state="covered"] .tplain { color: var(--muted); }
.needs { font-size: 0.82rem; font-weight: 600; color: var(--orange-text); white-space: nowrap; }
.pill { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; padding: 2px 9px; border-radius: 99px; white-space: nowrap; }
.pill-done { background: var(--green-soft); color: var(--green); }
.pill-todo { background: var(--track); color: var(--ink); }
.pill-blocked { background: var(--orange-soft); color: var(--orange-text); }
.pill-covered { background: transparent; color: var(--muted); box-shadow: inset 0 0 0 1px var(--line); }
details.tech summary { cursor: pointer; font-size: 0.8rem; color: var(--muted); }
details.tech p { font-size: 0.84rem; color: var(--muted); margin-top: 6px; overflow-wrap: anywhere; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; color: var(--muted); font-size: 0.85rem; margin-bottom: 14px; }
.legend span { display: inline-flex; gap: 6px; align-items: center; }
footer { color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); padding-top: 16px; }
@media (prefers-reduced-motion: no-preference) { .bar > span, .meter > span { transition: width 0.4s ease; } }
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">Café website · QR menu · staff dashboard</p>
    <h1>Healthy <span class="h">Hunger</span> build board</h1>
    <p class="lede">${md(headline)}</p>
    <p class="updated">Updated ${esc(updated)}</p>
    <div class="glance">
      <div class="stat stat-built">
        <span class="num">${pct}%</span>
        <span class="lbl">built – ${doneCount} of ${real.length} tasks done</span>
        <span class="bar" role="img" aria-label="${doneCount} of ${real.length} tasks done"><span style="width:${pct}%"></span></span>
      </div>
      <div class="stat"><span class="num">${leftCount}</span><span class="lbl">tasks left</span></div>
      <div class="stat stat-wait"><span class="num">${questions.length}</span><span class="lbl">questions for the café</span></div>
    </div>
  </header>

  <section aria-labelledby="flow-h">
    <h2 id="flow-h">How an order works</h2>
    <p class="note">The whole journey from the guest's phone to the bill. All of these steps work today.</p>
    <ol class="flow">${steps.map((s) => `<li><span class="sname">${md(s.name)}</span><span class="stext">${md(s.text)}</span></li>`).join("")}</ol>
  </section>

  <section aria-labelledby="works-h">
    <h2 id="works-h">What works today</h2>
    <p class="note">Built and tested. Grouped by who uses it.</p>
    <div class="works">
      ${works
        .map(
          (w) =>
            `<div class="who"><h3>${esc(w.title)} <span class="count">${w.items.length}</span></h3><ul>${w.items
              .map((i) => `<li><span>${md(i)}</span></li>`)
              .join("")}</ul></div>`,
        )
        .join("")}
    </div>
  </section>

  <section aria-labelledby="next-h">
    <h2 id="next-h">Coming next</h2>
    <p class="note">In this order, one at a time.${nextNote ? ` ${md(nextNote)}` : ""}</p>
    <ol class="next">${nextTasks.map(comingItem).join("")}</ol>
    ${
      laterTasks.length
        ? `<details class="later"><summary>${laterTasks.length} more after that</summary><ul>${laterTasks
            .map(
              (t) =>
                `<li><span class="lt">${md(t.title)} <span class="tid">${t.id}</span> ${t.state === "blocked" ? pill("blocked") : ""}</span><span class="lp">${md(words(t))}</span></li>`,
            )
            .join("")}</ul></details>`
        : ""
    }
  </section>

  <section aria-labelledby="q-h">
    <h2 id="q-h">Questions for the café</h2>
    <p class="note">Answers to these unblock the tasks marked "Waiting on café".</p>
    <ul class="qs">${questions.map(([q, n]) => `<li><span>${md(q)}</span><span class="need">${md(n)}</span></li>`).join("")}</ul>
    ${resolved ? `<p class="resolved">Already decided: ${md(resolved)}</p>` : ""}
  </section>

  <section aria-labelledby="all-h">
    <h2 id="all-h">Every task, by phase</h2>
    <p class="note">Open a phase to see its tasks. "Technical notes" under each task are for the developers.</p>
    <div class="legend">
      <span>${pill("done")} built</span><span>${pill("todo")} still to build</span><span>${pill("blocked")} needs an answer</span><span>${pill("covered")} done another way, or not needed</span>
    </div>
    <div class="phases">${shownPhases.map(phaseBlock).join("")}</div>
  </section>

  <footer>Made from <code>doc/STATUS.md</code>, <code>doc/TASKS.md</code> and <code>doc/PLAN.md</code> in the project. Regenerate with <code>node scripts/status-board.mjs</code>.</footer>
</div>
`;

writeFileSync(out, html);
console.log(
  `Wrote ${out}: ${doneCount}/${real.length} done (${pct}%), ${nextTasks.length} next, ${laterTasks.length} later, ${questions.length} open questions.`,
);
