// WHAT NOW? — boot, routing, and the daily-run controller.
(function (WN) {
  "use strict";

  var UI = WN.UI, h = UI.h, Store = WN.Store;
  var app = document.getElementById("app");
  var welcomeBack = false;
  var SLOT_LABELS = {
    memory: "Memory", see: "See it", "new": "New", sharpen: "Sharpen",
    practice: "Practice", thread: "Thread", boss: "What now?"
  };

  WN.reducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  // ---------------------------------------------------------------------------
  // Theme
  function applyTheme() {
    var pref = Store.get().themePreference;
    var root = document.documentElement;
    if (pref === "light" || pref === "dark") root.setAttribute("data-theme", pref);
    else root.removeAttribute("data-theme");
  }

  // ---------------------------------------------------------------------------
  // Content loading. Served over http(s), the JSON is fetched directly (so an
  // edited pack is picked up immediately). Opened from file://, browsers block
  // fetch, so the pre-embedded copy in content/pack.js is used.
  function loadContent() {
    var embedded = window.WN_PACK;
    if (/^https?:$/.test(location.protocol)) {
      return fetch("content/what_now_v1_vertical_slice.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .catch(function (err) {
          if (embedded) { console.info("[WHAT NOW] using embedded content pack:", err.message); return embedded; }
          throw err;
        });
    }
    return embedded ? Promise.resolve(embedded) : Promise.reject(new Error("content/pack.js did not load"));
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers
  function mount(builder) {
    document.body.classList.remove("boss");
    UI.clear(app);
    builder(app);
    UI.focus(app);
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Daily run
  function startSession() {
    var st = Store.get();
    var plan = WN.Sessions.build(st, Date.now());
    var before = {};
    WN.Content.concepts.forEach(function (c) { before[c.id] = st.concepts[c.id] ? st.concepts[c.id].mastery : 0; });
    st.activeSession = {
      plan: plan, index: 0, startedAt: Date.now(), before: before,
      connections: 0, newIdeas: [], number: WN.Sessions.sessionNumber(st)
    };
    Store.save();
  }

  function renderPlay() {
    var st = Store.get();
    var s = st.activeSession;
    if (!s) { location.hash = "#/"; return; }
    if (s.index >= s.plan.length) { finishSession(); return; }
    var enc = s.plan[s.index];

    UI.clear(app);
    document.body.classList.toggle("boss", enc.kind === "boss");
    var kicker = h("p", { class: "bar-kicker", text: SLOT_LABELS[enc.slot] || "" });
    var dots = h("div", { class: "progress", role: "img", "aria-label": "Step " + (s.index + 1) + " of " + s.plan.length });
    for (var i = 0; i < s.plan.length; i++) {
      dots.appendChild(h("span", { class: "pdot" + (i < s.index ? " done" : i === s.index ? " now" : "") }));
    }
    var close = h("a", { class: "bar-close", href: "#/", "aria-label": "Pause and return home" },
      h("span", { "aria-hidden": "true", text: "×" }));
    var bar = h("header", { class: "bar" }, kicker, dots, close);
    var stage = h("main", { class: "stage enter", id: "stage" });
    app.appendChild(h("div", { class: "play" }, bar, stage));

    var ctx = makeContext(stage, kicker, function () {
      s.index += 1;
      Store.save();
      renderPlay();
    });
    try {
      WN.Encounters[enc.kind](enc, ctx);
    } catch (e) {
      console.error("[WHAT NOW] encounter failed; skipping", enc, e);
      ctx.done();
      return;
    }
    UI.focus(stage);
    window.scrollTo(0, 0);
  }

  function makeContext(stage, kicker, onDone, opts) {
    opts = opts || {};
    var finished = false;
    return {
      root: stage,
      record: function (conceptId, result, how, o) {
        o = o || {};
        var st = Store.get();
        var wasNew = !(st.concepts[conceptId] && st.concepts[conceptId].timesSeen > 0);
        WN.Mastery.record(conceptId, result, how, o);
        Store.logResponse({
          type: how, conceptId: conceptId, result: result, stage: o.stage || null,
          confidence: o.confidence || null, ref: o.scenarioId || o.exerciseId || o.thread || null,
          choice: o.choice || null, response: o.response || null, selfAssessed: !!o.selfAssessed
        });
        if (how === "scenario") {
          var log = st.scenarioLog[o.scenarioId] || { shown: 0, correct: 0 };
          log.shown += 1;
          if (result === "correct") log.correct += 1;
          log.lastResult = result;
          log.last = Date.now();
          st.scenarioLog[o.scenarioId] = log;
        }
        if (wasNew && st.activeSession && !opts.practice) st.activeSession.newIdeas.push(conceptId);
        Store.save();
      },
      noteConnection: function (fresh) {
        var st = Store.get();
        if (fresh && st.activeSession && !opts.practice) st.activeSession.connections += 1;
        Store.save();
      },
      setKicker: function (t) { kicker.textContent = t; },
      setBoss: function (on) { document.body.classList.toggle("boss", on); },
      completeBoss: function (bossId, used, responses) {
        var st = Store.get();
        var p = st.bossProgress[bossId] || { completed: 0 };
        p.completed += 1;
        p.lastSession = st.activeSession ? st.activeSession.number : st.completedSessions;
        p.lastPlayed = Date.now();
        p.responses = responses;
        st.bossProgress[bossId] = p;
        st.lastBossSession = p.lastSession;
        used.forEach(function (id) {
          var cs = st.concepts[id];
          if (!cs || cs.timesSeen === 0) return;
          if (cs.mastery >= 4) cs.mastery = 5; // using an idea in a hard case is the last stage
          WN.Mastery.record(id, "engaged", "boss", {});
        });
        Store.logResponse({ type: "boss", ref: bossId, response: JSON.stringify(responses) });
        Store.save();
      },
      done: function () {
        if (finished) return;
        finished = true;
        onDone();
      }
    };
  }

  function finishSession() {
    var st = Store.get();
    var s = st.activeSession;
    var strengthened = 0, concepts = [], scenarios = [];
    WN.Content.concepts.forEach(function (c) {
      var now = st.concepts[c.id] ? st.concepts[c.id].mastery : 0;
      if (now > (s.before[c.id] || 0) + 1e-9) strengthened += 1;
    });
    s.plan.forEach(function (e) {
      [e.conceptId, e.from, e.to].forEach(function (id) { if (id && concepts.indexOf(id) === -1) concepts.push(id); });
      if (e.scenarioId) scenarios.push(e.scenarioId);
    });
    var minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    st.completedSessions += 1;
    st.sessionLog.push({
      t: Date.now(), number: s.number, durationMs: Date.now() - s.startedAt,
      concepts: concepts, scenarios: scenarios,
      boss: (s.plan.filter(function (e) { return e.kind === "boss"; })[0] || {}).bossId || null
    });
    if (st.sessionLog.length > 60) st.sessionLog.splice(0, st.sessionLog.length - 60);
    st.activeSession = null;
    Store.save();
    UI.tone();
    mount(function (root) {
      WN.Screens.done(root, {
        minutes: minutes,
        strengthened: strengthened,
        connections: s.connections,
        newIdea: s.newIdeas.length === 1 && s.number > 1 ? WN.Content.title(s.newIdeas[0]) : null
      }, function () { location.hash = "#/"; route(); });
    });
  }

  // ---------------------------------------------------------------------------
  // Practice (outside the daily run): one exercise at a time.
  function renderPracticeRun(conceptId) {
    var st = Store.get();
    if (st.unlockedObjects.indexOf(conceptId) === -1 || !WN.Content.exercisesFor(conceptId).length) {
      location.hash = "#/practice"; return;
    }
    var list = WN.Content.exercisesFor(conceptId).slice().sort(function (a, b) {
      var la = st.practiceLog[a.id] || { done: 0, last: 0 };
      var lb = st.practiceLog[b.id] || { done: 0, last: 0 };
      return la.done - lb.done || la.last - lb.last;
    });
    var ex = list[0];
    UI.clear(app);
    document.body.classList.remove("boss");
    var kicker = h("p", { class: "bar-kicker", text: "Practice" });
    var close = h("a", { class: "bar-close", href: "#/practice", "aria-label": "Back to Practice" },
      h("span", { "aria-hidden": "true", text: "×" }));
    var stage = h("main", { class: "stage enter" });
    app.appendChild(h("div", { class: "play" }, h("header", { class: "bar" }, kicker, h("div"), close), stage));
    var ctx = makeContext(stage, kicker, function () {
      mount(function (root) {
        WN.Screens.practiceEnd(root, function () { renderPracticeRun(conceptId); });
      });
    }, { practice: true });
    WN.Encounters.practice({ kind: "practice", exerciseId: ex.id, conceptId: conceptId }, ctx);
    UI.focus(stage);
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Router
  function route() {
    var st = Store.get();
    var parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    var view = parts[0] || "";

    if (!st.onboarded && view !== "settings") {
      mount(function (root) {
        WN.Screens.onboarding(root, function () {
          st.onboarded = true;
          startSession();
          if (location.hash === "#/play") route(); else location.hash = "#/play";
        });
      });
      return;
    }

    switch (view) {
      case "play": renderPlay(); break;
      case "library":
        mount(function (root) {
          if (parts[1]) WN.Screens.concept(root, decodeURIComponent(parts[1]));
          else WN.Screens.library(root);
        });
        break;
      case "map": mount(function (root) { WN.Screens.map(root); }); break;
      case "practice":
        if (parts[1]) renderPracticeRun(decodeURIComponent(parts[1]));
        else mount(function (root) {
          WN.Screens.practice(root, function (id) { location.hash = "#/practice/" + id; });
        });
        break;
      case "settings":
        mount(function (root) {
          WN.Screens.settings(root, {
            applyTheme: applyTheme,
            reset: function () {
              Store.reset();
              seedUnlocks();
              applyTheme();
              location.hash = "#/";
              route();
            }
          });
        });
        break;
      default:
        mount(function (root) {
          WN.Screens.home(root, {
            welcomeBack: welcomeBack,
            onBegin: function () {
              if (!Store.get().activeSession) startSession();
              location.hash = "#/play";
            }
          });
        });
        welcomeBack = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard: number keys pick options, Enter continues, Escape pauses.
  function onKey(ev) {
    if (ev.altKey || (ev.metaKey && ev.key !== "Enter") || (ev.ctrlKey && ev.key !== "Enter")) return;
    var t = ev.target;
    var typing = t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT");
    var visible = function (el) { return el.offsetParent !== null && !el.disabled; };
    if (typing) {
      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
        var p = Array.prototype.filter.call(app.querySelectorAll("[data-primary]"), visible).pop();
        if (p) { ev.preventDefault(); p.click(); }
      }
      return;
    }
    if (/^[1-9]$/.test(ev.key)) {
      var keyed = Array.prototype.filter.call(app.querySelectorAll('[data-key="' + ev.key + '"]'), visible).pop();
      if (keyed) { ev.preventDefault(); keyed.click(); }
      return;
    }
    if (ev.key === "Enter") {
      var tag = t && t.tagName;
      if (tag === "BUTTON" || tag === "A" || (t && t.getAttribute && t.getAttribute("role") === "button")) return;
      var primary = Array.prototype.filter.call(app.querySelectorAll("[data-primary]"), visible).pop();
      if (primary) { ev.preventDefault(); primary.click(); }
      return;
    }
    if (ev.key === "Escape" && /^#\/(play|practice\/)/.test(location.hash)) {
      location.hash = /^#\/practice/.test(location.hash) ? "#/practice" : "#/";
    }
  }

  function seedUnlocks() {
    WN.Content.ix.unlock.initial.forEach(function (id) { Store.unlock(id); });
  }

  // ---------------------------------------------------------------------------
  // Developer helpers (console only; nothing is shown in the interface).
  WN.dev = {
    reset: function () { Store.reset(); seedUnlocks(); location.hash = "#/"; route(); },
    state: function () { return Store.dump(); },
    unlockAll: function () {
      WN.Content.concepts.forEach(function (c) { Store.unlock(c.id); });
      Store.save(); route();
    },
    ageDays: function (days) {
      // Pretend `days` have passed: shifts every timestamp back.
      var st = Store.get(), d = days * WN.DAY;
      Object.keys(st.concepts).forEach(function (id) {
        var c = st.concepts[id]; c.lastSeen -= d; c.nextReview -= d;
      });
      st.sessionLog.forEach(function (s) { s.t -= d; });
      st.lastActive -= d;
      window.localStorage.setItem("whatnow.v1", JSON.stringify(st));
    }
  };

  // ---------------------------------------------------------------------------
  function boot() {
    Store.load();
    if (/[?&]reset\b/.test(location.search)) {
      Store.reset();
      history.replaceState(null, "", location.pathname + location.hash);
    }
    applyTheme();
    var st = Store.get();
    welcomeBack = st.completedSessions > 0 && st.lastActive && Date.now() - st.lastActive > 14 * WN.DAY;

    loadContent().then(function (pack) {
      WN.Content.init(pack, window.WN_INTERACTIONS);
      seedUnlocks();
      Store.save();
      window.addEventListener("hashchange", route);
      route();
    }).catch(function (err) {
      console.error("[WHAT NOW] content failed to load", err);
      mount(function (root) { WN.Screens.error(root, function () { location.reload(); }); });
    });
  }

  document.addEventListener("keydown", onKey);
  boot();
})(window.WN = window.WN || {});
