// WHAT NOW? — player state and persistence (localStorage).
// All reads/writes go through this module. Nothing else touches localStorage.
(function (WN) {
  "use strict";

  var KEY = "whatnow.v1";
  var VERSION = 1;
  var memoryFallback = null; // used when localStorage is unavailable

  function blankConcept() {
    return {
      mastery: 0,          // 0–5, may hold fractions; stage = floor(mastery)
      timesSeen: 0,
      timesCorrect: 0,
      lastSeen: 0,         // ms timestamp
      nextReview: 0,       // ms timestamp; 0 = never scheduled
      confidence: null,    // last stated confidence: "guess" | "think" | "know"
      lapses: 0,           // confidently wrong / repeated misses
      lastStage: null,
      lastResult: null
    };
  }

  function blankState() {
    return {
      version: VERSION,
      createdAt: Date.now(),
      lastActive: 0,
      onboarded: false,
      concepts: {},
      responseHistory: [],
      connectionsDiscovered: [],
      completedSessions: 0,
      sessionLog: [],
      unlockedObjects: [],
      bossProgress: {},
      scenarioLog: {},
      practiceLog: {},
      threadLog: {},
      lastBossSession: 0,
      themePreference: "system",
      soundPreference: "off",
      activeSession: null
    };
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("[WHAT NOW] could not read saved progress", e);
      return memoryFallback;
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("[WHAT NOW] could not save progress; keeping it in memory", e);
      memoryFallback = state;
    }
  }

  var state = null;

  var Store = {
    load: function () {
      var saved = read();
      state = blankState();
      if (saved && saved.version === VERSION) {
        for (var k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) state[k] = saved[k];
      }
      return state;
    },

    get: function () { return state || Store.load(); },

    save: function () {
      state.lastActive = Date.now();
      write(state);
    },

    concept: function (id) {
      var s = Store.get();
      if (!s.concepts[id]) s.concepts[id] = blankConcept();
      return s.concepts[id];
    },

    logResponse: function (entry) {
      var s = Store.get();
      entry.t = Date.now();
      if (entry.response && entry.response.length > 600) entry.response = entry.response.slice(0, 600);
      s.responseHistory.push(entry);
      if (s.responseHistory.length > 400) s.responseHistory.splice(0, s.responseHistory.length - 400);
    },

    unlock: function (id) {
      var s = Store.get();
      if (s.unlockedObjects.indexOf(id) === -1) s.unlockedObjects.push(id);
    },

    discoverConnection: function (a, b) {
      var s = Store.get();
      var key = [a, b].sort().join("|");
      if (s.connectionsDiscovered.indexOf(key) === -1) {
        s.connectionsDiscovered.push(key);
        return true;
      }
      return false;
    },

    setPreference: function (name, value) {
      Store.get()[name] = value;
      Store.save();
    },

    reset: function () {
      var keep = { themePreference: state.themePreference, soundPreference: state.soundPreference };
      state = blankState();
      state.themePreference = keep.themePreference;
      state.soundPreference = keep.soundPreference;
      Store.save();
      return state;
    },

    // Developer helper: WN.Store.dump() in the console.
    dump: function () { return JSON.parse(JSON.stringify(Store.get())); }
  };

  WN.Store = Store;
})(window.WN = window.WN || {});
