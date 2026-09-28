# WHAT NOW?

A quiet daily thinking game. Deep material, quiet interface.

Each run takes about five to ten minutes and has five encounters, one screen at a time. The game trains you to see clearly, remember what came before, tell similar ideas apart, find where power actually sits, and choose a response. The ideas come from Black history and liberation thought, Buddhism, Stoicism, and institutional analysis.

This is the **V1 vertical slice**: 10 core concepts, 30 SEE IT scenarios, 10 threads, 2 WHAT NOW? boss cases, and 17 practice exercises. It's all offline, with no accounts and no dependencies.

---

## Play it

**Option 1: open the file.** Download or clone the folder and open `index.html` in any modern browser. That's all. It works from `file://` with no network access.

**Option 2: serve it locally** (optional). Serving it means edits to the JSON show up without regenerating anything:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Progress is saved in the browser's `localStorage` on your device.

---

## How a run works

| Slot | What it is |
|---|---|
| **Memory** | Spaced repetition. The idea that most needs review, at the stage your mastery calls for. |
| **See it** | A realistic situation. Name only what the evidence supports. *Not enough evidence* is a real answer. |
| **New** | At most one new idea per run. When none are left, this slot becomes **Sharpen**. |
| **Practice** | The inward path: Fact · Story · Action, Right View, Right Speech, where a problem lives. |
| **Thread** | Two ideas. Find the connection, then reveal it and assess yourself. |

About every third run, the Thread is replaced by **WHAT NOW?**, a dark, slower boss case taken one step at a time. It is never scored.

The first run is curated: Integration, Representation, Institutional Power, Fact · Story · Action, then the Integration + Institutional Power thread.

Outside the run you have:

- **Library**: the ideas you have unlocked, with a definition, the key distinction, common mistakes, related ideas, sources, and mastery.
- **Map**: a quiet constellation. Lines get brighter as mastery grows. Select a node to focus on its neighbors.
- **Practice**: pick Right View, Right Speech, or Perception to start a short exercise right away.
- **Settings** (the `· · ·` in the corner of the home screen): Light / Dark / System theme, sound on or off, and reset progress.

Keyboard: `1`–`9` picks an option, `Enter` continues, `Ctrl/⌘+Enter` submits from a text box, and `Esc` pauses.

---

## Architecture

```
index.html                 shell; loads scripts in order (classic scripts, so file:// works)
styles.css                 all visual design; light, dark, and boss tokens
app.js                     boot, content loading, router, daily-run controller, keyboard
js/store.js                player state + localStorage (the only file that touches storage)
js/engine.js               Content index · Mastery + spaced repetition · Clarity · Session generator
js/ui.js                   DOM helpers and shared pieces (choices, source toggle, self-assessment…)
js/encounters.js           renderers: level, scenario (SEE IT), practice, thread, boss
js/screens.js              home, first launch, done, library, map, practice, settings, error
content/
  what_now_v1_vertical_slice.json   the authoritative content pack (unchanged)
  pack.js                  generated copy of the JSON for file:// launches
  interactions.js          interaction layer: how each pack prompt is played
tools/
  embed-content.mjs        regenerates content/pack.js from the JSON
  check.mjs                validates content and simulates 30 sessions
```

**Content is data, not UI.** The renderers only know interaction patterns such as choice, recall, teach-back, SEE IT, sort, thread, and boss step. Every word the player reads comes from the pack or from `interactions.js`.

**The interaction layer.** The pack says *what* each prompt asks and what the answer is. It does not say *how* the prompt is played. `content/interactions.js` adds that part:

- answer choices and trap options for each concept stage
- SEE IT option lists (option ids are the pack's own `supported` tags) and a short *missing information* line
- which stages are free recall or teach-back, plus "a strong answer includes" points
- practice exercises
- structured formats for the boss steps
- the unlock order and the curated first session

Correct answers always come from the pack. Adding a concept means adding its object to the JSON and its play config to `interactions.js`. Nothing in the UI changes.

**Why a generated `pack.js`?** Browsers block `fetch()` for `file://` pages. Over http(s) the app fetches the JSON directly. From `file://` it uses `content/pack.js`. After editing the JSON, run `node tools/embed-content.mjs`. `tools/check.mjs` fails if the two copies drift apart.

### Mastery and review

- Mastery belongs to each concept: 0 New · 1 Familiar · 2 Recall · 3 Explain · 4 Connect · 5 Use.
- The stage served rises with mastery: **recognize → recall → distinguish → apply → teach**. Early stages are multiple choice. Later stages are free recall and teach-back.
- Passing a stage moves mastery to the next level. A miss drops it one level. Scenarios, practice, and threads add or remove fractions of a level. Using an idea in a boss case completes the last level.
- Review intervals by mastery are 0 / 1 / 3 / 7 / 14 / 30 days. A *Guessing* correct answer halves the interval. A *Know it* correct answer stretches it. A confidently wrong answer comes back first. Repeated misses shorten future intervals.
- **Clarity** = 85% average mastery across all ten concepts + 15% of threads discovered, shown as 0–100 (`Clarity.compute` in `js/engine.js`).

### Grading honesty

- **Exact** prompts are scored.
- **Evidence-based** prompts are scored only when the interaction is structured (for example, choosing supported concepts). Free-text prose is never graded. You type, see a strong answer, and assess yourself: *Missed it · Partly · Got it*.
- **Reflection** prompts and **boss cases** are never scored. They show a model or the pack's expected considerations for comparison.
- Source status is kept and shown: primary source, source argument, source history, app synthesis. App-made connections are labeled as such.

---

## Assumptions

- **Answer choices are app-authored.** The pack has no distractors, so `interactions.js` supplies them, using the pack's `commonMistakes` as traps where they fit. Two scenario prompts get a clearer stem when the pack text already lists its options inline (`perception_s1`). The pack JSON itself is unchanged.
- A few pack `supported` tags are rationale rather than choosable answers, for example `structural_fact_can_be_real`. They are shown under **Supported** in the reveal but are not offered as options.
- `integration_s3` (a partnership that keeps its own board) is scored as the pack says, *Not enough evidence*, and does not offer a bare "No".
- **Unlocking:** Integration, Representation, Institutional Power, Right View, and Perception are visible from the start. Right View, then Assimilation, Collective Capacity, Organizing, Mutual Aid, and Right Speech arrive one per run. Practice lists only unlocked ideas.
- **Boss timing:** a boss case can appear from run 3 on, at least three runs apart, and only once about 70% of the concepts it uses have been met. In simulation this lands on runs 3, 6, 9, and so on.
- Practice exercises, level-of-analysis prompts, the Right View four-part mapping, and the boss "unresolved questions" are app applications. They are labeled as such, not presented as source text.
- "Welcome back." appears after 14 days away. There are no streaks.

## Deferred until after playtesting

Four Hundred Souls and other history decks, a timeline, policing and legal material, and quote cards (the model supports them, but the pack has no quotes yet). Also deferred: AI grading or chat, voice, accounts or sync, cross-device progress, export/import of progress, richer map layouts, per-scenario difficulty tuning, and same-session requeue of missed items (misses currently return next run).

## Development

```sh
node tools/check.mjs          # validate the content pack + simulate 30 sessions
node tools/embed-content.mjs  # after editing the JSON
```

To reset progress during development, open `index.html?reset`. You can also use these in the browser console:

```js
WN.dev.reset()        // wipe progress
WN.dev.state()        // inspect saved state
WN.dev.unlockAll()    // show every concept in Library / Map
WN.dev.ageDays(21)    // pretend three weeks passed (reload to see "Welcome back.")
```
