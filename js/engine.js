// WHAT NOW? — content model, mastery, spaced repetition, clarity, sessions.
// No DOM in this file.
(function (WN) {
  "use strict";

  var DAY = 24 * 60 * 60 * 1000;
  var STAGES = ["recognize", "recall", "distinguish", "apply", "teach"];

  // ===========================================================================
  // Content: indexes the pack + interaction layer. The UI asks this module for
  // data; it never reaches into the raw JSON itself.
  // ===========================================================================
  var Content = {
    pack: null,
    ix: null,

    init: function (pack, ix) {
      Content.validate(pack);
      Content.pack = pack;
      Content.ix = ix;
      Content.concepts = pack.objects.filter(function (o) { return o.kind === "concept"; });
      Content.byId = {};
      Content.concepts.forEach(function (c) { Content.byId[c.id] = c; });
      Content.sources = {};
      pack.sources.forEach(function (s) { Content.sources[s.id] = s; });

      Content.scenarios = [];
      Content.scenarioById = {};
      Content.threads = [];
      Content.concepts.forEach(function (c) {
        (c.scenarios || []).forEach(function (s) {
          var entry = { id: s.id, conceptId: c.id, data: s };
          Content.scenarios.push(entry);
          Content.scenarioById[s.id] = entry;
        });
        (c.threadConnections || []).forEach(function (t, i) {
          Content.threads.push({
            id: c.id + ">" + t.to + ">" + i,
            from: c.id, to: t.to, type: t.type,
            prompt: t.prompt, possibleConnection: t.possibleConnection
          });
        });
      });

      // A pair can be threaded from both directions; discovery counts the pair once.
      Content.threadPairs = Content.threads.map(function (t) { return [t.from, t.to].sort().join("|"); })
        .filter(function (k, i, all) { return all.indexOf(k) === i; });

      // Undirected concept graph for the Map.
      var seen = {};
      Content.edges = [];
      Content.concepts.forEach(function (c) {
        (c.connections || []).forEach(function (to) {
          if (!Content.byId[to]) return;
          var key = [c.id, to].sort().join("|");
          if (seen[key]) return;
          seen[key] = true;
          Content.edges.push({ key: key, a: c.id, b: to });
        });
      });

      Content.bosses = pack.bossCases || [];
      Content.bossById = {};
      Content.bosses.forEach(function (b) { Content.bossById[b.id] = b; });

      Content.exercises = {};
      Object.keys(ix.practice).forEach(function (cid) {
        ix.practice[cid].forEach(function (ex) {
          Content.exercises[ex.id] = { conceptId: cid, data: ex };
        });
      });
      return Content;
    },

    validate: function (pack) {
      if (!pack || !Array.isArray(pack.objects) || !Array.isArray(pack.sources)) {
        throw new Error("Content pack is missing objects or sources.");
      }
      pack.objects.forEach(function (o) {
        if (!o.id || !o.title || !o.levels) throw new Error("Object is incomplete: " + (o.id || "?"));
        STAGES.forEach(function (st) {
          if (!o.levels[st]) throw new Error(o.id + " is missing level " + st);
        });
      });
    },

    concept: function (id) { return Content.byId[id]; },
    title: function (id) { var c = Content.byId[id]; return c ? c.title : id; },
    level: function (id, stage) { return Content.byId[id].levels[stage]; },
    levelPlay: function (id, stage) {
      var l = Content.ix.levels[id] && Content.ix.levels[id][stage];
      if (l) return l;
      return { format: stage === "teach" ? "teach" : "recall" };
    },
    scenario: function (id) { return Content.scenarioById[id]; },
    scenarioPlay: function (id) { return Content.ix.scenarios[id]; },
    anchor: function (id) {
      return Content.ix.anchors[id] || (Content.byId[id] && Content.byId[id].plainLanguage);
    },
    tagLabel: function (tag) {
      return Content.ix.tags[tag] || tag.replace(/_/g, " ").replace(/^./, function (m) { return m.toUpperCase(); });
    },
    exercise: function (id) { return Content.exercises[id]; },
    exercisesFor: function (conceptId) { return Content.ix.practice[conceptId] || []; },
    boss: function (id) { return Content.bossById[id]; },
    bossPlay: function (id) { return Content.ix.bosses[id]; },
    isSelf: function (id) { var c = Content.byId[id]; return !!c && c.path === "self"; },
    threadFor: function (from, to) {
      for (var i = 0; i < Content.threads.length; i++) {
        var t = Content.threads[i];
        if (t.from === from && t.to === to) return t;
      }
      return null;
    },
    unlockOrder: function () {
      var order = [];
      Content.ix.unlock.initial.concat(Content.ix.unlock.queue).forEach(function (id) {
        if (order.indexOf(id) === -1 && Content.byId[id]) order.push(id);
      });
      Content.concepts.forEach(function (c) { if (order.indexOf(c.id) === -1) order.push(c.id); });
      return order;
    }
  };

  // Source status → human label. Compound statuses are split and joined.
  var STATUS_PARTS = {
    primary_source: "Primary source",
    source_argument: "Source argument",
    source_history: "Source history / fact",
    verified_fact: "Verified fact",
    app_synthesis: "App synthesis",
    app_framework: "app framework",
    app_application: "app application",
    grounded_in_sources: "grounded in sources",
    reflection: "Reflection"
  };
  Content.statusLabel = function (status) {
    if (!status) return "";
    if (STATUS_PARTS[status]) return STATUS_PARTS[status];
    var m = status.match(/^(.*)_grounded_in_sources$/);
    if (m) return Content.statusLabel(m[1]) + ", grounded in sources";
    var parts = status.split("_plus_");
    if (parts.length > 1) {
      return parts.map(function (p, i) {
        var label = STATUS_PARTS[p] || p.replace(/_/g, " ");
        return i === 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label;
      }).join(" + ");
    }
    return status.replace(/_/g, " ");
  };
  Content.connectionLabel = function (type) {
    return {
      source_connection: "Source connection",
      historical_connection: "Historical connection",
      app_synthesis: "App synthesis"
    }[type] || Content.statusLabel(type);
  };

  // ===========================================================================
  // Mastery + spaced repetition
  // ===========================================================================
  var INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

  var Mastery = {
    STAGES: STAGES,
    LABELS: ["New", "Familiar", "Recall", "Explain", "Connect", "Use"],

    level: function (c) { return Math.max(0, Math.min(5, Math.floor(c.mastery + 1e-9))); },

    // Which cognitive stage to serve next. Assistance falls away as mastery rises.
    stageFor: function (c) {
      var m = Mastery.level(c);
      if (m >= 5) return c.lastStage === "teach" ? "apply" : "teach";
      if (m === 4) return "teach";
      return STAGES[m];
    },

    // result: "correct" | "partial" | "incorrect" | "engaged"
    // how:    "stage" | "scenario" | "practice" | "thread" | "boss"
    record: function (conceptId, result, how, opts) {
      opts = opts || {};
      var Store = WN.Store;
      var c = Store.concept(conceptId);
      var now = opts.now || Date.now();
      var before = c.mastery;
      c.timesSeen += 1;
      c.lastSeen = now;
      if (opts.confidence) c.confidence = opts.confidence;
      var prevResult = c.lastResult;
      if (how === "stage") { c.lastStage = opts.stage; }
      c.lastResult = result;
      Store.unlock(conceptId);

      var stageIdx = how === "stage" ? STAGES.indexOf(opts.stage) : -1;
      if (result === "correct" || (result === "engaged" && how === "stage")) {
        if (result === "correct") c.timesCorrect += 1;
        if (how === "stage") c.mastery = Math.max(c.mastery, Math.min(5, stageIdx + 1));
        else c.mastery = Math.min(5, c.mastery + (how === "thread" ? 0.35 : 0.5));
      } else if (result === "partial") {
        if (how !== "stage") c.mastery = Math.min(5, c.mastery + 0.25);
      } else if (result === "incorrect") {
        if (how === "stage") c.mastery = Math.max(0, Mastery.level(c) - 1);
        else c.mastery = Math.max(0, c.mastery - 0.5);
        if (opts.confidence === "know") c.lapses += 1;
        if (prevResult === "incorrect") c.lapses += 1; // repeated misses
      } else if (result === "engaged") {
        c.mastery = Math.min(5, c.mastery + 0.25);
      }

      Mastery.schedule(c, result, opts.confidence, now);
      return { before: before, after: c.mastery };
    },

    schedule: function (c, result, confidence, now) {
      if (result === "incorrect") {
        // Due again next session. Confidently wrong answers jump the queue.
        c.nextReview = now - (confidence === "know" ? DAY : 0);
        return;
      }
      if (result === "partial") { c.nextReview = now + DAY; return; }
      var days = INTERVAL_DAYS[Mastery.level(c)];
      if (confidence === "guess") days *= 0.5;
      if (confidence === "know" && result === "correct") days *= 1.25;
      if (c.lapses > 1) days *= 0.75;
      c.nextReview = now + Math.max(days, 0) * DAY;
    },

    isDue: function (c, now) { return c.timesSeen > 0 && c.nextReview <= now; }
  };

  // ===========================================================================
  // Clarity — the one visible measure. Kept separate so the formula can change.
  // ===========================================================================
  var Clarity = {
    compute: function (state) {
      var total = Content.concepts.length * 5;
      var sum = 0;
      Content.concepts.forEach(function (c) {
        var cs = state.concepts[c.id];
        if (cs) sum += Math.min(5, cs.mastery);
      });
      var pairs = Content.threadPairs;
      var found = state.connectionsDiscovered.filter(function (k) { return pairs.indexOf(k) !== -1; }).length;
      var conn = pairs.length ? found / pairs.length : 0;
      return Math.round(100 * (0.85 * (sum / total) + 0.15 * conn));
    }
  };

  // ===========================================================================
  // Session generator
  // ===========================================================================
  function seenConcepts(state) {
    return Content.concepts.filter(function (c) {
      var cs = state.concepts[c.id];
      return cs && cs.timesSeen > 0;
    }).map(function (c) { return c.id; });
  }

  function lastSessionConcepts(state) {
    var last = state.sessionLog[state.sessionLog.length - 1];
    return last ? last.concepts || [] : [];
  }

  function pickMax(list, score) {
    var best = null, bestScore = -Infinity;
    list.forEach(function (x, i) {
      var s = score(x) - i * 0.001; // stable tie-break
      if (s > bestScore) { bestScore = s; best = x; }
    });
    return best;
  }

  function daysSince(ts, now) { return ts ? (now - ts) / DAY : 999; }

  var Sessions = {
    sessionNumber: function (state) { return state.completedSessions + 1; },

    bossCandidate: function (state, extraSeen) {
      var seen = seenConcepts(state).concat(extraSeen || []);
      var number = Sessions.sessionNumber(state);
      var lastBoss = state.lastBossSession || 0;
      if (state.completedSessions < 2 || number - lastBoss < 3) return null;
      var candidates = Content.bosses.filter(function (b) {
        var play = Content.bossPlay(b.id);
        if (!play) return false;
        var used = play.used;
        var covered = used.filter(function (id) { return seen.indexOf(id) !== -1; }).length;
        return covered / used.length >= 0.7;
      });
      return pickMax(candidates, function (b) {
        var p = state.bossProgress[b.id];
        return (p ? -p.completed * 100 - (p.lastSession || 0) : 0);
      });
    },

    estimateMinutes: function (state) {
      if (!state.completedSessions) return 6;
      return Sessions.bossCandidate(state, []) ? 9 : 7;
    },

    build: function (state, now) {
      now = now || Date.now();
      if (state.completedSessions === 0 && seenConcepts(state).length === 0) {
        return Content.ix.firstSession.map(function (e) {
          var enc = Object.assign({}, e);
          if (enc.kind === "practice" && !enc.conceptId) enc.conceptId = Content.exercise(enc.exerciseId).conceptId;
          if (enc.kind === "level" && enc.slot === "new") enc.isNew = true;
          return enc;
        });
      }

      var plan = [];
      var used = [];
      var recent = lastSessionConcepts(state);
      var seen = seenConcepts(state);
      var number = Sessions.sessionNumber(state);
      function cs(id) { return state.concepts[id] || { mastery: 0, timesSeen: 0, lapses: 0, nextReview: 0 }; }
      function levelEncounter(slot, id) {
        return { slot: slot, kind: "level", conceptId: id, stage: Mastery.stageFor(cs(id)) };
      }

      // 1 · MEMORY — the concept that most needs review.
      var memory = pickMax(seen, function (id) {
        var c = cs(id);
        var s = (5 - c.mastery) * 6 + c.lapses * 10;
        if (Mastery.isDue(c, now)) s += 100 + Math.min(30, daysSince(c.nextReview, now) * 5);
        if (recent.indexOf(id) !== -1) s -= 25;
        if (Content.isSelf(id)) s -= 8; // practice slot covers the inward path
        return s;
      });
      if (memory) {
        var memEnc = levelEncounter("memory", memory);
        // Ask for confidence occasionally, and only once the idea is familiar.
        memEnc.askConfidence = cs(memory).mastery >= 1 && number % 2 === 0;
        plan.push(memEnc);
        used.push(memory);
      }

      // 2 · SEE IT — a scenario, preferring outward material and weak concepts.
      var lastScenarios = (state.sessionLog[state.sessionLog.length - 1] || {}).scenarios || [];
      var scen = pickMax(Content.scenarios.filter(function (s) {
        return seen.indexOf(s.conceptId) !== -1 && lastScenarios.indexOf(s.id) === -1;
      }), function (s) {
        var log = state.scenarioLog[s.id] || { shown: 0, correct: 0 };
        var c = cs(s.conceptId);
        var score = (5 - c.mastery) * 4;
        if (!log.shown) score += 20;
        score -= log.shown * 6;
        if (log.lastResult === "incorrect") score += 15;
        if (used.indexOf(s.conceptId) !== -1) score -= 18;
        if (Content.isSelf(s.conceptId)) score -= 12;
        // Harder "trap" scenarios wait until the concept is familiar.
        var trap = (s.data.supported || []).indexOf("not_enough_evidence") !== -1;
        if (trap && c.mastery < 1) score -= 10;
        return score;
      });
      if (scen) {
        plan.push({ slot: "see", kind: "scenario", scenarioId: scen.id, conceptId: scen.conceptId });
        used.push(scen.conceptId);
      }

      // 3 · NEW — at most one new idea per session.
      var fresh = Content.unlockOrder().filter(function (id) { return cs(id).timesSeen === 0; })[0];
      if (fresh) {
        plan.push({ slot: "new", kind: "level", conceptId: fresh, stage: "recognize", isNew: true });
        used.push(fresh);
      } else {
        var sharpen = pickMax(seen.filter(function (id) { return used.indexOf(id) === -1; }), function (id) {
          var c = cs(id);
          return (5 - c.mastery) * 5 + Math.min(10, daysSince(c.lastSeen, now)) - (recent.indexOf(id) !== -1 ? 10 : 0);
        });
        if (sharpen) { plan.push(levelEncounter("sharpen", sharpen)); used.push(sharpen); }
      }

      // 4 · PRACTICE — the inward path: an exercise or a self concept question.
      var selfSeen = seen.concat(fresh ? [fresh] : []).filter(Content.isSelf);
      var selfId = pickMax(selfSeen.filter(function (id) { return used.indexOf(id) === -1; }), function (id) {
        var c = cs(id);
        return (5 - c.mastery) * 3 + daysSince(c.lastSeen, now);
      }) || pickMax(selfSeen, function (id) { return -cs(id).timesSeen; });
      if (selfId) {
        var exercises = Content.exercisesFor(selfId);
        if (exercises.length && (number % 2 === 1 || cs(selfId).timesSeen === 0 || used.indexOf(selfId) !== -1)) {
          var ex = pickMax(exercises, function (e) {
            var log = state.practiceLog[e.id] || { done: 0, last: 0 };
            return -log.done * 10 - (log.last ? 1 / (1 + daysSince(log.last, now)) : 0);
          });
          plan.push({ slot: "practice", kind: "practice", exerciseId: ex.id, conceptId: selfId });
        } else {
          plan.push(levelEncounter("practice", selfId));
        }
        used.push(selfId);
      }

      // 5 · THREAD — or, roughly every third session, WHAT NOW?
      var boss = Sessions.bossCandidate(state, fresh ? [fresh] : []);
      if (boss) {
        plan.push({ slot: "boss", kind: "boss", bossId: boss.id });
      } else {
        var available = seen.concat(fresh ? [fresh] : []);
        var thread = pickMax(Content.threads.filter(function (t) {
          return available.indexOf(t.from) !== -1 && available.indexOf(t.to) !== -1;
        }), function (t) {
          var key = [t.from, t.to].sort().join("|");
          var s = state.connectionsDiscovered.indexOf(key) === -1 ? 50 : 0;
          if (used.indexOf(t.from) !== -1 || used.indexOf(t.to) !== -1) s += 10;
          var shown = (state.threadLog || {})[t.id];
          if (shown) s -= 8 * shown.shown + (shown.last ? 20 / (1 + daysSince(shown.last, now)) : 0);
          return s;
        });
        if (thread) plan.push({ slot: "thread", kind: "thread", from: thread.from, to: thread.to });
      }
      return plan;
    }
  };

  WN.Content = Content;
  WN.Mastery = Mastery;
  WN.Clarity = Clarity;
  WN.Sessions = Sessions;
  WN.DAY = DAY;
})(window.WN = window.WN || {});
