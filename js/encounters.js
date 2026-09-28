// WHAT NOW? — encounter renderers.
// Each renderer receives an encounter descriptor and a context:
//   ctx.root      element to render into
//   ctx.record()  report a result for a concept (mastery + history)
//   ctx.done()    move on
// Renderers know interaction patterns, not curriculum. All words come from the
// content pack or the interaction layer.
(function (WN) {
  "use strict";

  var UI = WN.UI, h = UI.h, C = WN.Content;
  var COPY = function () { return C.pack.uiCopy || {}; };

  function continueButton(ctx, label) {
    var b = UI.button(label || COPY().continue || "Continue", function () { ctx.done(); });
    b.setAttribute("data-primary", "");
    return b;
  }

  function afterReveal(ctx, feedback, nodes) {
    nodes.forEach(function (n) { if (n) feedback.appendChild(n); });
    UI.reveal(feedback);
    var btn = feedback.querySelector("[data-primary]");
    if (btn) setTimeout(function () { btn.focus({ preventScroll: true }); }, 30);
    feedback.scrollIntoView && setTimeout(function () {
      feedback.scrollIntoView({ block: "nearest", behavior: WN.reducedMotion() ? "auto" : "smooth" });
    }, 40);
  }

  function selfHeadline(result) {
    return result === "correct" ? COPY().correct : result === "partial" ? "Partly." : COPY().incorrect;
  }

  // Multi-select grading shared by SEE IT, speech, and level exercises.
  function gradeSet(selected, correct, acceptable) {
    acceptable = acceptable || [];
    var hits = selected.filter(function (x) { return correct.indexOf(x) !== -1; });
    var wrong = selected.filter(function (x) { return correct.indexOf(x) === -1 && acceptable.indexOf(x) === -1; });
    if (wrong.length === 0 && hits.length === correct.length) return "correct";
    if (wrong.length === 0 && selected.length > 0) return "partial"; // a subset, or only acceptable
    if (hits.length > 0 && wrong.length <= 1) return "partial";
    return "incorrect";
  }

  // Wires a multi-select choice list with a Check button. `exclusive` ids clear others.
  function multiSelect(options, exclusive, onCheck, checkLabel) {
    var selected = [];
    var list = UI.choices(options, function (o, btn) {
      var i = selected.indexOf(o.id);
      if (i === -1) {
        if (exclusive.indexOf(o.id) !== -1) selected = [];
        else selected = selected.filter(function (x) { return exclusive.indexOf(x) === -1; });
        selected.push(o.id);
      } else {
        selected.splice(i, 1);
      }
      Array.prototype.forEach.call(list.querySelectorAll(".choice"), function (b) {
        var on = selected.indexOf(b.getAttribute("data-id")) !== -1;
        b.classList.toggle("selected", on);
        b.setAttribute("aria-pressed", String(on));
      });
      check.disabled = selected.length === 0;
    }, { multi: true });
    var check = UI.button(checkLabel || "Check", function () {
      UI.lockChoices(list);
      check.remove();
      onCheck(selected.slice(), list);
    });
    check.disabled = true;
    check.setAttribute("data-primary", "");
    return { list: list, check: check };
  }

  // ---------------------------------------------------------------------------
  // One-at-a-time sorter: FACT / STORY, the four parts of Right View, boss reads.
  // graded=false shows the model read without judging.
  function sorter(root, cfg, onFinish) {
    var items = UI.shuffle(cfg.items, cfg.seed || cfg.situation || "sort");
    var i = 0, results = [];
    var box = h("div", { class: "sorter" });
    root.appendChild(box);

    function show() {
      UI.clear(box);
      if (i >= items.length) { onFinish(results, items); return; }
      var item = items[i];
      var card = h("div", { class: "sort-card enter" },
        h("p", { class: "sort-count", text: (i + 1) + " / " + items.length }),
        h("p", { class: "sort-item", "data-focus": true, tabindex: "-1", text: item.text })
      );
      var bins = h("div", { class: "bins bins-" + cfg.bins.length, role: "group", "aria-label": "Place this line" });
      cfg.bins.forEach(function (bin, n) {
        var b = h("button", { type: "button", class: "bin", "data-key": String(n + 1), text: bin });
        b.addEventListener("click", function () { place(bin, b, bins, card); });
        bins.appendChild(b);
      });
      card.appendChild(bins);
      box.appendChild(card);
      UI.focus(card);
    }

    function place(bin, btn, bins, card) {
      var item = items[i];
      var ok = bin === item.bin;
      results.push({ text: item.text, chosen: bin, model: item.bin, ok: ok });
      Array.prototype.forEach.call(bins.children, function (b) {
        b.disabled = true;
        b.removeAttribute("data-key");
        if (b.textContent === item.bin) b.classList.add("right");
      });
      if (!ok) btn.classList.add(cfg.graded === false ? "differs" : "wrong");
      i += 1;
      if (ok) {
        setTimeout(show, WN.reducedMotion() ? 250 : 600);
      } else {
        var note = cfg.graded === false
          ? "The case reads this as " + item.bin + "."
          : "This one is " + item.bin + ".";
        var next = UI.button("Next", show, "quiet");
        next.setAttribute("data-primary", "");
        card.appendChild(h("div", { class: "sort-note reveal" }, h("p", { text: note }), next));
        setTimeout(function () { next.focus({ preventScroll: true }); }, 30);
      }
    }
    show();
  }

  function sortSummary(results) {
    var ok = results.filter(function (r) { return r.ok; }).length;
    return { ok: ok, total: results.length,
      result: ok === results.length ? "correct" : ok >= results.length / 2 ? "partial" : "incorrect" };
  }

  // ===========================================================================
  // LEVEL — a concept at one of its five cognitive stages.
  // ===========================================================================
  function renderLevel(enc, ctx) {
    var concept = C.concept(enc.conceptId);
    var L = C.level(enc.conceptId, enc.stage);
    var play = C.levelPlay(enc.conceptId, enc.stage);
    var root = ctx.root;
    var feedback = h("div", { class: "feedback", "aria-live": "polite" });

    root.appendChild(UI.prompt(L.prompt));
    if (play.stem) root.appendChild(h("p", { class: "stem", text: play.stem }));

    function conceptCoda() {
      var nodes = [UI.anchorLine(enc.conceptId)];
      if (enc.isNew) nodes.push(h("p", { class: "core", text: concept.coreIdea }));
      return nodes;
    }

    if (play.format === "choice") {
      var opts = play.options.map(function (label, idx) {
        return { id: String(idx), label: label, nee: UI.isNee(label) };
      });
      var ordered = UI.shuffle(opts.filter(function (o) { return !o.nee; }),
        enc.conceptId + enc.stage + (WN.Store.concept(enc.conceptId).timesSeen))
        .concat(opts.filter(function (o) { return o.nee; }));
      var list = UI.choices(ordered, function (o) {
        UI.lockChoices(list);
        UI.mark(list, o.id, "chosen");
        if (enc.askConfidence && !play.reflection) {
          root.insertBefore(UI.confidence(function (conf) { resolve(o, conf); }), feedback);
          var first = root.querySelector(".confidence button");
          if (first) first.focus({ preventScroll: true });
        } else resolve(o, null);
      });
      root.appendChild(list);
      root.appendChild(feedback);

      function resolve(o, confidence) {
        var correctId = String(play.correct);
        var answerIsNee = UI.isNee(play.options[play.correct]);
        var nodes = [];
        if (play.reflection) {
          UI.mark(list, correctId, "is-model");
          ctx.record(enc.conceptId, "engaged", "stage", { stage: enc.stage, choice: o.label });
          nodes.push(UI.headline("Consider.", "neutral"));
          nodes.push(h("p", { class: "model", text: L.answer }));
          nodes.push(h("p", { class: "explain", text: L.explanation }));
        } else {
          var ok = o.id === correctId;
          UI.mark(list, correctId, "right");
          if (!ok) UI.mark(list, o.id, "wrong");
          ctx.record(enc.conceptId, ok ? "correct" : "incorrect", "stage",
            { stage: enc.stage, confidence: confidence, choice: o.label });
          nodes.push(UI.headline(ok ? COPY().correct : answerIsNee ? COPY().uncertain : COPY().incorrect,
            ok ? "clear" : "miss"));
          if (!ok && L.answer && L.answer.replace(/\.$/, "") !== play.options[play.correct].replace(/\.$/, "")) {
            nodes.push(h("p", { class: "model", text: L.answer }));
          }
          nodes.push(h("p", { class: "explain", text: L.explanation }));
        }
        nodes = nodes.concat(conceptCoda());
        nodes.push(UI.source(enc.conceptId));
        nodes.push(UI.actions(continueButton(ctx)));
        afterReveal(ctx, feedback, nodes);
      }
      return;
    }

    if (play.format === "action") {
      root.appendChild(h("div", { class: "fsa" },
        h("div", { class: "fsa-row" }, h("span", { class: "fsa-k", text: "FACT" }), h("span", { class: "fsa-v", text: play.fact })),
        h("div", { class: "fsa-row" }, h("span", { class: "fsa-k", text: "STORY" }), h("span", { class: "fsa-v muted", text: play.story })),
        h("div", { class: "fsa-row" }, h("span", { class: "fsa-k", text: "ACTION" }), h("span", { class: "fsa-v", text: "?" }))
      ));
      var field = UI.textarea("One next step…", "Your action");
      root.appendChild(field);
      var go = UI.button("Reveal", function () {
        go.remove();
        var text = field.querySelector("textarea").value.trim();
        field.querySelector("textarea").readOnly = true;
        ctx.record(enc.conceptId, "engaged", "stage", { stage: enc.stage, response: text });
        afterReveal(ctx, feedback, [
          h("p", { class: "model", text: L.answer }),
          h("p", { class: "explain", text: L.explanation }),
          UI.anchorLine(enc.conceptId),
          UI.source(enc.conceptId),
          UI.actions(continueButton(ctx))
        ]);
      });
      go.setAttribute("data-primary", "");
      root.appendChild(UI.actions(go));
      root.appendChild(feedback);
      return;
    }

    // recall + teach: think / type → reveal → self-assess. No fake grading.
    var teach = play.format === "teach";
    var field2 = UI.textarea(teach ? "Explain it in your own words…" : "Say it to yourself, or write it here…",
      "Your answer");
    root.appendChild(field2);
    var reveal = UI.button("Reveal", function () {
      reveal.remove();
      var text = field2.querySelector("textarea").value.trim();
      field2.querySelector("textarea").readOnly = true;
      var nodes = [];
      if (teach && play.includes) {
        nodes.push(h("p", { class: "label", text: "A strong answer includes" }));
        nodes.push(h("ul", { class: "includes" }, play.includes.map(function (x) { return h("li", { text: x }); })));
        nodes.push(h("p", { class: "label", text: "For example" }));
      }
      nodes.push(h("p", { class: "model", text: L.answer }));
      nodes.push(h("p", { class: "explain", text: L.explanation }));
      if (L.answerType === "reflection") {
        ctx.record(enc.conceptId, "engaged", "stage", { stage: enc.stage, response: text });
        nodes.push(UI.source(enc.conceptId));
        nodes.push(UI.actions(continueButton(ctx)));
        afterReveal(ctx, feedback, nodes);
        return;
      }
      nodes.push(UI.selfAssess(["Missed it", "Partly", "Got it"], function (result) {
        ctx.record(enc.conceptId, result, "stage", { stage: enc.stage, response: text, selfAssessed: true });
        var tail = h("div", { class: "reveal" },
          UI.anchorLine(enc.conceptId),
          UI.source(enc.conceptId),
          UI.actions(continueButton(ctx)));
        feedback.appendChild(tail);
        tail.querySelector("[data-primary]").focus({ preventScroll: true });
      }, "How close were you?"));
      afterReveal(ctx, feedback, nodes);
      var first = feedback.querySelector(".assess button");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 40);
    });
    reveal.setAttribute("data-primary", "");
    root.appendChild(UI.actions(reveal));
    root.appendChild(feedback);
  }

  // ===========================================================================
  // SEE IT — a situation; name only what the evidence supports.
  // ===========================================================================
  function renderScenario(enc, ctx) {
    var entry = C.scenario(enc.scenarioId);
    var s = entry.data;
    var play = C.scenarioPlay(enc.scenarioId) || { mode: "multi", options: s.supported.concat(["not_enough_evidence"]) };
    var root = ctx.root;
    var feedback = h("div", { class: "feedback", "aria-live": "polite" });

    var options = play.options.map(function (o) {
      var opt = typeof o === "string" ? { id: o, label: C.tagLabel(o) } : { id: o.id, label: o.label };
      opt.nee = UI.isNee(opt.label, opt.id);
      return opt;
    });
    var ordered = UI.shuffle(options.filter(function (o) { return !o.nee; }), s.id)
      .concat(options.filter(function (o) { return o.nee; }));
    var optionIds = options.map(function (o) { return o.id; });
    var correct = s.supported.filter(function (t) { return optionIds.indexOf(t) !== -1; });
    var reflection = s.answerType === "reflection";

    root.appendChild(UI.prompt(play.stem || s.prompt, "scenario"));
    if (play.mode === "multi") root.appendChild(h("p", { class: "stem", text: "Choose all that the evidence supports." }));

    function finish(selected, list) {
      selected.forEach(function (id) { UI.mark(list, id, "chosen"); });
      correct.forEach(function (id) { UI.mark(list, id, reflection ? "is-model" : "right"); });
      var result;
      if (reflection) result = "engaged";
      else if (play.mode === "single") result = correct.indexOf(selected[0]) !== -1 ? "correct" : "incorrect";
      else result = gradeSet(selected, correct);
      if (!reflection) selected.forEach(function (id) { if (correct.indexOf(id) === -1) UI.mark(list, id, "wrong"); });

      var neeCorrect = correct.indexOf("not_enough_evidence") !== -1;
      var overclaimed = neeCorrect && selected.some(function (id) { return id !== "not_enough_evidence"; });
      var head = reflection ? "Consider." : result === "correct" ? COPY().correct
        : overclaimed ? COPY().uncertain : result === "partial" ? "Partly." : COPY().incorrect;

      var unsupported = ordered.filter(function (o) { return correct.indexOf(o.id) === -1 && !o.nee; })
        .map(function (o) { return o.label; });
      var supportedLabels = s.supported.map(C.tagLabel);

      ctx.record(entry.conceptId, result, "scenario", { scenarioId: s.id, choice: selected.join(",") });
      var nodes = [
        UI.headline(head, reflection ? "neutral" : result === "correct" ? "clear" : "miss"),
        UI.facts([
          ["Supported", supportedLabels.join(" · ")],
          [reflection ? "Also possible" : "Not supported", unsupported.join(" · ")],
          ["Best evidence", s.bestEvidence],
          ["Missing", play.missing]
        ]),
        UI.source(entry.conceptId),
        UI.actions(continueButton(ctx))
      ];
      afterReveal(ctx, feedback, nodes);
    }

    if (play.mode === "single") {
      var list = UI.choices(ordered, function (o) {
        UI.lockChoices(list);
        finish([o.id], list);
      });
      root.appendChild(list);
    } else {
      var ms = multiSelect(ordered, ["not_enough_evidence"], finish);
      root.appendChild(ms.list);
      root.appendChild(UI.actions(ms.check));
    }
    root.appendChild(feedback);
  }

  // ===========================================================================
  // PRACTICE — the inward path.
  // ===========================================================================
  function renderPractice(enc, ctx) {
    var entry = C.exercise(enc.exerciseId);
    var ex = entry.data;
    var cid = entry.conceptId;
    var root = ctx.root;
    var feedback = h("div", { class: "feedback", "aria-live": "polite" });

    function logPractice() {
      var st = WN.Store.get();
      var log = st.practiceLog[ex.id] || { done: 0, last: 0 };
      log.done += 1; log.last = Date.now();
      st.practiceLog[ex.id] = log;
    }

    root.appendChild(UI.kicker(ex.title));
    root.appendChild(UI.prompt(ex.situation, "situation"));

    if (ex.type === "sort") {
      var work = h("div");
      root.appendChild(work);
      root.appendChild(feedback);
      sorter(work, { items: ex.items, bins: ex.bins, seed: ex.id }, function (results) {
        var sum = sortSummary(results);
        logPractice();
        ctx.record(cid, sum.result, "practice", { exerciseId: ex.id });
        UI.clear(work);
        work.appendChild(h("ul", { class: "sorted" }, results.map(function (r) {
          return h("li", { class: r.ok ? "ok" : "off" },
            h("span", { class: "sorted-bin", text: r.model }),
            h("span", { class: "sorted-text", text: r.text }));
        })));
        var nodes = [UI.headline(sum.ok + " of " + sum.total + " placed clearly.", sum.result === "correct" ? "clear" : "neutral")];
        if (ex.action) {
          var chosen = [];
          nodes.push(h("p", { class: "label", text: ex.action.prompt }));
          var list = UI.choices(ex.action.options.map(function (a, i) { return { id: String(i), label: a }; }),
            function (o, btn) {
              var k = chosen.indexOf(o.label);
              if (k === -1) chosen.push(o.label); else chosen.splice(k, 1);
              btn.classList.toggle("selected", k === -1);
              btn.setAttribute("aria-pressed", String(k === -1));
            }, { multi: true });
          nodes.push(list);
          var own = UI.textarea("Or your own…", "Your own action");
          nodes.push(own);
          var done = UI.button("Continue", function () {
            UI.lockChoices(list);
            own.querySelector("textarea").readOnly = true;
            done.remove();
            WN.Store.logResponse({ type: "practice-action", exerciseId: ex.id, conceptId: cid,
              response: chosen.concat([own.querySelector("textarea").value.trim()]).filter(Boolean).join(" | ") });
            var tail = h("div", { class: "reveal" },
              h("p", { class: "note", text: ex.note }),
              UI.source(cid),
              UI.actions(continueButton(ctx)));
            feedback.appendChild(tail);
            tail.querySelector("[data-primary]").focus({ preventScroll: true });
          });
          done.setAttribute("data-primary", "");
          nodes.push(UI.actions(done));
        } else {
          nodes.push(h("p", { class: "note", text: ex.note }));
          nodes.push(UI.source(cid));
          nodes.push(UI.actions(continueButton(ctx)));
        }
        afterReveal(ctx, feedback, nodes);
        var focusTarget = feedback.querySelector("[data-primary]");
        if (focusTarget) setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, 40);
      });
      return;
    }

    // speech / level: multi-select with a model answer
    var isSpeech = ex.type === "speech";
    if (isSpeech) root.appendChild(h("blockquote", { class: "quote" }, h("p", { text: "“" + ex.quote + "”" })));
    root.appendChild(h("p", { class: "stem", text: isSpeech ? "Which concerns apply?" : "Where does this problem live? Choose all that apply." }));
    var options = (isSpeech ? C.ix.speechOptions : C.ix.levelOptions).map(function (o) {
      return { id: o.id, label: o.label };
    });
    var ms = multiSelect(options, isSpeech ? ["none"] : [], function (selected, list) {
      selected.forEach(function (id) { UI.mark(list, id, "chosen"); });
      ex.correct.forEach(function (id) { UI.mark(list, id, "right"); });
      selected.forEach(function (id) {
        if (ex.correct.indexOf(id) === -1 && (ex.acceptable || []).indexOf(id) === -1) UI.mark(list, id, "wrong");
      });
      var result = gradeSet(selected, ex.correct, ex.acceptable);
      logPractice();
      ctx.record(cid, result, "practice", { exerciseId: ex.id, choice: selected.join(",") });
      var labels = ex.correct.map(function (id) {
        return options.filter(function (o) { return o.id === id; })[0].label;
      });
      var answer = isSpeech ? labels.join(" · ")
        : (labels.length > 1 ? "Mixed · " : "") + labels.join(" + ");
      afterReveal(ctx, feedback, [
        UI.headline(selfHeadline(result), result === "correct" ? "clear" : "miss"),
        UI.facts([[isSpeech ? "Concern" : "Level", answer]]),
        h("p", { class: "note", text: ex.note }),
        isSpeech ? h("p", { class: "explain", text: "SN 45.8 names four: lying, divisive speech, abusive speech, idle chatter." }) : null,
        UI.source(cid),
        UI.actions(continueButton(ctx))
      ]);
    });
    root.appendChild(ms.list);
    root.appendChild(UI.actions(ms.check));
    root.appendChild(feedback);
  }

  // ===========================================================================
  // THREAD — two ideas; find the line between them.
  // ===========================================================================
  function renderThread(enc, ctx) {
    var t = C.threadFor(enc.from, enc.to);
    var root = ctx.root;
    var feedback = h("div", { class: "feedback", "aria-live": "polite" });
    root.appendChild(h("div", { class: "pair" },
      h("p", { class: "pair-name", text: C.title(t.from) }),
      h("p", { class: "pair-plus", "aria-hidden": "true", text: "+" }),
      h("p", { class: "pair-name", text: C.title(t.to) })
    ));
    root.appendChild(h("h2", { class: "prompt center", "data-focus": true, text: "What's the connection?" }));
    root.appendChild(h("p", { class: "stem center", text: t.prompt }));
    var field = UI.textarea("Think, or jot a line…", "Your connection");
    root.appendChild(field);
    var reveal = UI.button("Reveal", function () {
      reveal.remove();
      var text = field.querySelector("textarea").value.trim();
      field.querySelector("textarea").readOnly = true;
      var fresh = WN.Store.discoverConnection(t.from, t.to);
      ctx.noteConnection(fresh);
      var st = WN.Store.get();
      var log = st.threadLog[t.id] || { shown: 0, last: 0 };
      log.shown += 1; log.last = Date.now();
      st.threadLog[t.id] = log;
      var nodes = [
        h("p", { class: "model", text: t.possibleConnection }),
        h("p", { class: "tag-line" },
          h("span", { class: "tag", text: C.connectionLabel(t.type) }),
          t.type === "app_synthesis" ? h("span", { class: "tag-note", text: "A connection this app draws — not a claim made by a source." }) : null),
        UI.anchorLine(t.from),
        UI.anchorLine(t.to),
        UI.selfAssess(["Missed it", "Partly", "Saw it clearly"], function (result) {
          ctx.record(t.from, result, "thread", { response: text, thread: t.id });
          ctx.record(t.to, result, "thread", { response: text, thread: t.id, silent: true });
          var tail = h("div", { class: "reveal" }, UI.source([t.from, t.to], t.type), UI.actions(continueButton(ctx)));
          feedback.appendChild(tail);
          tail.querySelector("[data-primary]").focus({ preventScroll: true });
        }, "Did you see it?")
      ];
      afterReveal(ctx, feedback, nodes);
      var first = feedback.querySelector(".assess button");
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 40);
    });
    reveal.setAttribute("data-primary", "");
    root.appendChild(UI.actions(reveal));
    root.appendChild(feedback);
  }

  // ===========================================================================
  // WHAT NOW? — boss mode. One step at a time. Never scored.
  // ===========================================================================
  function renderBoss(enc, ctx) {
    var boss = C.boss(enc.bossId);
    var play = C.bossPlay(enc.bossId);
    var root = ctx.root;
    var step = -1;
    var responses = {};
    ctx.setBoss(true);

    function caseToggle() {
      var id = "case" + Math.random().toString(36).slice(2, 7);
      var panel = h("p", { class: "case-text", id: id, hidden: true, text: boss.scenario });
      var b = h("button", { type: "button", class: "source-toggle", "aria-expanded": "false", "aria-controls": id }, "The case");
      b.addEventListener("click", function () {
        panel.hidden = !panel.hidden;
        b.setAttribute("aria-expanded", String(!panel.hidden));
      });
      return h("div", { class: "case" }, b, panel);
    }

    function screen(builder) {
      UI.clear(root);
      var wrap = h("div", { class: "enter" });
      root.appendChild(wrap);
      builder(wrap);
      UI.focus(wrap);
      window.scrollTo(0, 0);
    }

    function intro() {
      ctx.setKicker("");
      screen(function (w) {
        w.classList.add("boss-intro");
        w.appendChild(h("h2", { class: "boss-mark", "data-focus": true, text: COPY().boss || "WHAT NOW?" }));
        w.appendChild(h("p", { class: "boss-title", text: boss.title }));
        w.appendChild(h("p", { class: "stem center", text: boss.intro }));
        var b = UI.button("Begin", theCase);
        b.setAttribute("data-primary", "");
        w.appendChild(UI.actions(b));
        setTimeout(function () { b.focus({ preventScroll: true }); }, 40);
      });
    }

    function theCase() {
      ctx.setKicker(boss.title);
      screen(function (w) {
        w.appendChild(h("p", { class: "case-lead", "data-focus": true, tabindex: "-1", text: boss.scenario }));
        var b = UI.button("Continue", next);
        b.setAttribute("data-primary", "");
        w.appendChild(UI.actions(b));
      });
    }

    function expectedList(expected) {
      if (Array.isArray(expected)) {
        return h("ul", { class: "includes" }, expected.map(function (x) { return h("li", { text: x }); }));
      }
      return h("p", { class: "explain", text: expected });
    }

    function next() {
      step += 1;
      if (step >= boss.steps.length) { finish(); return; }
      var s = boss.steps[step];
      var sp = (play.steps && play.steps[s.label]) || { format: "open" };
      ctx.setKicker(boss.title + " · " + (step + 1) + " / " + boss.steps.length);
      screen(function (w) {
        w.appendChild(UI.kicker(s.label));
        w.appendChild(UI.prompt(s.prompt));
        var feedback = h("div", { class: "feedback", "aria-live": "polite" });
        function done(response, extra) {
          responses[s.label] = response;
          var nodes = [];
          if (extra) nodes = nodes.concat(extra);
          nodes.push(h("p", { class: "label", text: sp.format === "open" ? "Strong answers consider" : "The case supports" }));
          nodes.push(expectedList(s.expected));
          if (sp.directions) {
            nodes.push(h("ul", { class: "includes quiet" }, sp.directions.map(function (x) { return h("li", { text: x }); })));
          }
          var b = UI.button("Continue", next);
          b.setAttribute("data-primary", "");
          nodes.push(UI.actions(b));
          afterReveal(ctx, feedback, nodes);
        }

        if (sp.format === "sort") {
          var work = h("div");
          w.appendChild(work);
          w.appendChild(feedback);
          sorter(work, { items: sp.items, bins: sp.bins, graded: false, seed: boss.id + s.label }, function (results) {
            UI.clear(work);
            work.appendChild(h("ul", { class: "sorted" }, results.map(function (r) {
              return h("li", { class: r.ok ? "ok" : "differs" },
                h("span", { class: "sorted-bin", text: r.ok ? r.model : r.chosen + " → " + r.model }),
                h("span", { class: "sorted-text", text: r.text }));
            })));
            done(results.map(function (r) { return r.text + ": " + r.chosen; }).join("; "));
          });
        } else if (sp.format === "multi") {
          var opts = sp.options.map(function (o, i) { return { id: String(i), label: o.label }; });
          var ms = multiSelect(UI.shuffle(opts, boss.id + s.label), [], function (selected, list) {
            selected.forEach(function (id) { UI.mark(list, id, "chosen"); });
            sp.options.forEach(function (o, i) { if (o.strong) UI.mark(list, String(i), "is-model"); });
            done(selected.map(function (id) { return sp.options[+id].label; }).join("; "));
          });
          w.appendChild(ms.list);
          w.appendChild(UI.actions(ms.check));
          w.appendChild(feedback);
        } else if (sp.format === "choice") {
          var list = UI.choices(sp.options.map(function (o, i) { return { id: String(i), label: o }; }), function (o) {
            UI.lockChoices(list);
            UI.mark(list, o.id, "chosen");
            UI.mark(list, String(sp.model), "is-model");
            done(o.label);
          });
          w.appendChild(list);
          w.appendChild(feedback);
        } else {
          w.appendChild(h("p", { class: "stem", text: "There may not be one correct answer." }));
          var field = UI.textarea("Your read…", "Your response");
          w.appendChild(field);
          var go = UI.button("Reveal", function () {
            go.remove();
            field.querySelector("textarea").readOnly = true;
            done(field.querySelector("textarea").value.trim());
          });
          go.setAttribute("data-primary", "");
          w.appendChild(UI.actions(go));
          w.appendChild(feedback);
        }
        w.appendChild(caseToggle());
      });
    }

    function finish() {
      ctx.completeBoss(boss.id, play.used, responses);
      ctx.setKicker("");
      screen(function (w) {
        w.classList.add("boss-end");
        w.appendChild(h("p", { class: "label", "data-focus": true, tabindex: "-1", text: "You used" }));
        w.appendChild(h("ul", { class: "used" }, play.used.map(function (id) { return h("li", { text: C.title(id) }); })));
        w.appendChild(h("p", { class: "label", text: "The unresolved question" }));
        w.appendChild(h("p", { class: "unresolved", text: play.unresolved }));
        var b = UI.button("Continue", function () { ctx.setBoss(false); ctx.done(); });
        b.setAttribute("data-primary", "");
        w.appendChild(UI.actions(b));
      });
    }

    intro();
  }

  WN.Encounters = {
    level: renderLevel,
    scenario: renderScenario,
    practice: renderPractice,
    thread: renderThread,
    boss: renderBoss,
    _gradeSet: gradeSet
  };
})(window.WN = window.WN || {});
