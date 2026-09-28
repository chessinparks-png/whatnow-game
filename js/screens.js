// WHAT NOW? — screens outside the daily run: home, first launch, library, map,
// practice, settings, session end, error.
(function (WN) {
  "use strict";

  var UI = WN.UI, h = UI.h, C = WN.Content;

  function page(cls) {
    return h("div", { class: "page enter " + (cls || "") });
  }

  function backLink(label, href) {
    return h("a", { class: "back", href: href || "#/" }, h("span", { "aria-hidden": "true", text: "← " }), label || "Home");
  }

  function masteryDots(m) {
    var lvl = Math.floor(m + 1e-9);
    var wrap = h("span", { class: "dots", "aria-hidden": "true" });
    for (var i = 0; i < 5; i++) wrap.appendChild(h("span", { class: "dot" + (i < lvl ? " on" : "") }));
    return wrap;
  }

  function clarityRing(value) {
    var r = 15, circ = 2 * Math.PI * r;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 36 36");
    svg.setAttribute("class", "ring");
    svg.setAttribute("aria-hidden", "true");
    var bg = document.createElementNS(ns, "circle");
    bg.setAttribute("cx", "18"); bg.setAttribute("cy", "18"); bg.setAttribute("r", String(r));
    bg.setAttribute("class", "ring-bg");
    var fg = document.createElementNS(ns, "circle");
    fg.setAttribute("cx", "18"); fg.setAttribute("cy", "18"); fg.setAttribute("r", String(r));
    fg.setAttribute("class", "ring-fg");
    fg.setAttribute("stroke-dasharray", (circ * value / 100).toFixed(2) + " " + circ.toFixed(2));
    fg.setAttribute("transform", "rotate(-90 18 18)");
    svg.appendChild(bg); svg.appendChild(fg);
    return svg;
  }

  var Screens = {};

  // ---------------------------------------------------------------------------
  Screens.onboarding = function (root, onBegin) {
    var p = page("onboard");
    var lines = ["See clearly.", "Know what came before.", "Choose what comes next."];
    p.appendChild(h("h1", { class: "wordmark", "data-focus": true, text: "WHAT NOW?" }));
    p.appendChild(h("div", { class: "creed" }, lines.map(function (l, i) {
      return h("p", { class: "creed-line", style: "animation-delay:" + (500 + i * 650) + "ms", text: l });
    })));
    var b = UI.button("Begin", onBegin);
    b.setAttribute("data-primary", "");
    var row = UI.actions(b);
    row.classList.add("creed-line");
    row.style.animationDelay = (500 + lines.length * 650) + "ms";
    p.appendChild(row);
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  Screens.home = function (root, opts) {
    var st = WN.Store.get();
    var clarity = WN.Clarity.compute(st);
    var p = page("home");
    p.appendChild(h("a", { class: "corner", href: "#/settings", "aria-label": "Settings" },
      h("span", { "aria-hidden": "true", class: "corner-dots" }, "· · ·")));
    var inner = h("div", { class: "home-center" });
    if (opts.welcomeBack) inner.appendChild(h("p", { class: "welcome", text: C.pack.uiCopy.returning || "Welcome back." }));
    inner.appendChild(h("h1", { class: "wordmark", "data-focus": true, text: "WHAT NOW?" }));

    var active = st.activeSession;
    var sub, label;
    if (active) {
      var left = active.plan.length - active.index;
      sub = "Paused · " + UI.plural(left, "step", "steps") + " left";
      label = "Continue";
    } else {
      var today = new Date().toDateString();
      var last = st.sessionLog[st.sessionLog.length - 1];
      var doneToday = last && new Date(last.t).toDateString() === today;
      sub = (doneToday ? "Another · " : "Today · ") + WN.Sessions.estimateMinutes(st) + " min";
      label = "Begin";
    }
    inner.appendChild(h("p", { class: "today", text: sub }));
    var begin = UI.button(label, opts.onBegin, "primary wide");
    begin.setAttribute("data-primary", "");
    inner.appendChild(UI.actions(begin));
    inner.appendChild(h("div", { class: "clarity", title: "Clarity grows as your understanding strengthens and connects." },
      clarityRing(clarity),
      h("p", { class: "clarity-n" }, h("span", { class: "clarity-word", text: "Clarity" }), " " + clarity)
    ));
    p.appendChild(inner);
    p.appendChild(h("nav", { class: "home-nav", "aria-label": "Secondary" },
      h("a", { href: "#/library", text: "Library" }),
      h("a", { href: "#/map", text: "Map" }),
      h("a", { href: "#/practice", text: "Practice" })
    ));
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  Screens.done = function (root, summary, onContinue) {
    var p = page("done");
    p.appendChild(h("h1", { class: "done-word", "data-focus": true, text: C.pack.uiCopy.finish || "Done." }));
    var lines = [UI.plural(summary.minutes, "minute", "minutes")];
    if (summary.strengthened) lines.push(UI.plural(summary.strengthened, "idea strengthened", "ideas strengthened"));
    if (summary.connections) lines.push(UI.plural(summary.connections, "connection discovered", "connections discovered"));
    if (summary.newIdea) lines.push("New idea · " + summary.newIdea);
    p.appendChild(h("ul", { class: "done-lines" }, lines.map(function (l) { return h("li", { text: l }); })));
    var b = UI.button("Continue", onContinue);
    b.setAttribute("data-primary", "");
    p.appendChild(UI.actions(b));
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  Screens.error = function (root, onRetry) {
    var p = page("home");
    var inner = h("div", { class: "home-center" },
      h("h1", { class: "wordmark", "data-focus": true, text: "WHAT NOW?" }),
      h("p", { class: "today", text: "Content couldn't be loaded." }),
      UI.actions(UI.button("Try again", onRetry)));
    p.appendChild(inner);
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  function visibleConcepts() {
    var st = WN.Store.get();
    return C.unlockOrder().filter(function (id) { return st.unlockedObjects.indexOf(id) !== -1; });
  }

  Screens.library = function (root) {
    var st = WN.Store.get();
    var ids = visibleConcepts();
    var p = page("library");
    p.appendChild(backLink());
    p.appendChild(h("h1", { class: "title", "data-focus": true, text: "Library" }));
    var list = h("ul", { class: "lib-list" });
    ids.forEach(function (id) {
      var cs = st.concepts[id];
      var seen = cs && cs.timesSeen > 0;
      var m = cs ? cs.mastery : 0;
      list.appendChild(h("li", {},
        h("a", { class: "lib-row", href: "#/library/" + id },
          h("span", { class: "lib-name", text: C.title(id) }),
          seen
            ? h("span", { class: "lib-m" }, masteryDots(m), h("span", { class: "sr-num", text: Math.floor(m) + "/5" }))
            : h("span", { class: "lib-new", text: "New" })
        )));
    });
    p.appendChild(list);
    var hidden = C.concepts.length - ids.length;
    if (hidden > 0) p.appendChild(h("p", { class: "quiet-note", text: UI.plural(hidden, "more idea", "more ideas") + " ahead." }));
    root.appendChild(p);
  };

  Screens.concept = function (root, id) {
    var c = C.concept(id);
    var st = WN.Store.get();
    if (!c || st.unlockedObjects.indexOf(id) === -1) { location.hash = "#/library"; return; }
    var cs = st.concepts[id];
    var m = cs ? cs.mastery : 0;
    var p = page("concept");
    p.appendChild(backLink("Library", "#/library"));
    p.appendChild(h("h1", { class: "title", "data-focus": true, text: c.title }));
    p.appendChild(h("p", { class: "plain", text: c.plainLanguage }));
    p.appendChild(h("p", { class: "core", text: c.coreIdea }));

    var sec = function (label, body) { return h("section", { class: "lib-sec" }, h("h2", { class: "label", text: label }), body); };
    if (C.ix.contrasts[id]) p.appendChild(sec("Key distinction", h("p", { text: C.ix.contrasts[id] })));
    p.appendChild(sec("Common mistakes", h("ul", { class: "mistakes" },
      c.commonMistakes.map(function (x) { return h("li", { text: x }); }))));

    var related = (c.connections || []).filter(function (r) { return st.unlockedObjects.indexOf(r) !== -1; });
    if (related.length) {
      p.appendChild(sec("Related", h("p", { class: "related" }, related.map(function (r) {
        return h("a", { href: "#/library/" + r, text: C.title(r) });
      }))));
    }
    p.appendChild(sec("Source", h("div", {},
      c.sourceIds.map(function (sid) {
        var s = C.sources[sid];
        return h("div", { class: "source-item" },
          h("p", { class: "source-title", text: s.title }),
          h("p", { class: "source-meta", text: C.statusLabel(s.status) + " · " + s.locator }));
      }),
      h("p", { class: "source-meta framing", text: "Framed here as: " + C.statusLabel(c.sourceStatus) + "." })
    )));
    var lvl = Math.floor(m + 1e-9);
    p.appendChild(sec("Mastery", h("p", { class: "lib-m" }, masteryDots(m),
      h("span", { text: " " + WN.Mastery.LABELS[lvl] + " · " + lvl + "/5" }))));
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  // MAP — a quiet constellation. Nodes cluster by hidden path.
  var PATH_CENTERS = { see: [118, 128], power: [326, 126], lineage: [340, 326], self: [118, 330] };

  function layout(ids) {
    var byPath = {};
    ids.forEach(function (id) {
      var path = C.concept(id).path;
      (byPath[path] = byPath[path] || []).push(id);
    });
    var pos = {};
    // Lay out every concept (not only visible ones) so positions never shift as ideas unlock.
    var all = {};
    C.concepts.forEach(function (c) { (all[c.path] = all[c.path] || []).push(c.id); });
    Object.keys(all).forEach(function (path, pi) {
      var center = PATH_CENTERS[path] || [210 + 120 * Math.cos(pi), 230 + 120 * Math.sin(pi)];
      var group = all[path];
      var r = group.length === 1 ? 0 : 46 + group.length * 6;
      group.forEach(function (id, i) {
        var a = (i / group.length) * Math.PI * 2 + pi * 0.9 + 0.4;
        pos[id] = [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)];
      });
    });
    return pos;
  }

  Screens.map = function (root) {
    var st = WN.Store.get();
    var ids = visibleConcepts();
    var pos = layout(ids);
    var ns = "http://www.w3.org/2000/svg";
    var p = page("map");
    p.appendChild(backLink());
    p.appendChild(h("h1", { class: "title", "data-focus": true, text: "Map" }));

    function svgEl(tag, attrs) {
      var el = document.createElementNS(ns, tag);
      Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      return el;
    }
    var svg = svgEl("svg", { viewBox: "0 0 440 440", class: "constellation", role: "group", "aria-label": "Knowledge map" });
    var edgeLayer = svgEl("g", { class: "edges" });
    var nodeLayer = svgEl("g", { class: "nodes" });
    svg.appendChild(edgeLayer); svg.appendChild(nodeLayer);

    function m(id) { var cs = st.concepts[id]; return cs ? cs.mastery : 0; }
    var edgeEls = [];
    C.edges.forEach(function (e) {
      if (ids.indexOf(e.a) === -1 || ids.indexOf(e.b) === -1) return;
      var strength = Math.min(m(e.a), m(e.b));
      var discovered = st.connectionsDiscovered.indexOf(e.key) !== -1;
      var line = svgEl("line", {
        x1: pos[e.a][0].toFixed(1), y1: pos[e.a][1].toFixed(1),
        x2: pos[e.b][0].toFixed(1), y2: pos[e.b][1].toFixed(1),
        class: "edge" + (discovered ? " found" : ""),
        style: "opacity:" + (discovered ? 0.85 : (0.1 + strength * 0.11)).toFixed(2)
      });
      line._ends = [e.a, e.b];
      edgeLayer.appendChild(line);
      edgeEls.push(line);
    });
    // Thread connections the player has discovered but that are not in `connections`.
    C.threads.forEach(function (t) {
      var key = [t.from, t.to].sort().join("|");
      if (st.connectionsDiscovered.indexOf(key) === -1) return;
      if (edgeEls.some(function (l) { return l._ends.slice().sort().join("|") === key; })) return;
      if (ids.indexOf(t.from) === -1 || ids.indexOf(t.to) === -1) return;
      var line = svgEl("line", { x1: pos[t.from][0], y1: pos[t.from][1], x2: pos[t.to][0], y2: pos[t.to][1], class: "edge found", style: "opacity:.85" });
      line._ends = [t.from, t.to];
      edgeLayer.appendChild(line);
      edgeEls.push(line);
    });

    var caption = h("div", { class: "map-caption", "aria-live": "polite" });
    var nodeEls = {};
    var focused = null;

    function focusNode(id) {
      focused = focused === id ? null : id;
      var neighbors = {};
      if (focused) {
        neighbors[focused] = true;
        edgeEls.forEach(function (l) {
          if (l._ends.indexOf(focused) !== -1) { neighbors[l._ends[0]] = true; neighbors[l._ends[1]] = true; }
        });
      }
      Object.keys(nodeEls).forEach(function (nid) {
        nodeEls[nid].classList.toggle("dim", !!focused && !neighbors[nid]);
        nodeEls[nid].classList.toggle("active", nid === focused);
        nodeEls[nid].setAttribute("aria-pressed", String(nid === focused));
      });
      edgeEls.forEach(function (l) {
        var on = focused && l._ends.indexOf(focused) !== -1;
        l.classList.toggle("dim", !!focused && !on);
        l.classList.toggle("lit", !!on);
      });
      UI.clear(caption);
      if (focused) {
        var c = C.concept(focused);
        caption.appendChild(h("p", { class: "cap-title", text: c.title }));
        caption.appendChild(h("p", { class: "cap-plain", text: c.plainLanguage }));
        caption.appendChild(h("a", { href: "#/library/" + focused, class: "cap-link", text: "Open in Library" }));
      } else {
        caption.appendChild(h("p", { class: "quiet-note", text: "Choose an idea to see what it touches." }));
      }
    }

    ids.forEach(function (id) {
      var c = C.concept(id);
      var cs = st.concepts[id];
      var seen = cs && cs.timesSeen > 0;
      var r = 4 + Math.floor(m(id)) * 1.1;
      var g = svgEl("g", {
        class: "node" + (seen ? "" : " unseen"), tabindex: "0", role: "button",
        "aria-label": c.title + (seen ? ", mastery " + Math.floor(m(id)) + " of 5" : ", new"),
        "aria-pressed": "false",
        transform: "translate(" + pos[id][0].toFixed(1) + " " + pos[id][1].toFixed(1) + ")"
      });
      g.appendChild(svgEl("circle", { r: "18", class: "hit" }));
      g.appendChild(svgEl("circle", { r: String(r), class: "star" }));
      var label = svgEl("text", { y: String(r + 15), "text-anchor": "middle", class: "node-label" });
      label.textContent = c.title;
      g.appendChild(label);
      g.addEventListener("click", function () { focusNode(id); });
      g.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); focusNode(id); }
      });
      nodeLayer.appendChild(g);
      nodeEls[id] = g;
    });

    p.appendChild(h("div", { class: "map-wrap" }, svg));
    p.appendChild(caption);
    focusNode(null);
    var hidden = C.concepts.length - ids.length;
    p.appendChild(h("p", { class: "quiet-note legend" },
      "Lines brighten as understanding grows. Accent lines are connections you have drawn." +
      (hidden > 0 ? " " + UI.plural(hidden, "idea is", "ideas are") + " not yet visible." : "")));
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  Screens.practice = function (root, onPick) {
    var st = WN.Store.get();
    var p = page("practice");
    p.appendChild(backLink());
    p.appendChild(h("h1", { class: "title", "data-focus": true, text: "Practice" }));
    var list = h("ul", { class: "lib-list" });
    Object.keys(C.ix.practice).forEach(function (id) {
      if (st.unlockedObjects.indexOf(id) === -1) return;
      var c = C.concept(id);
      var b = h("button", { type: "button", class: "lib-row" },
        h("span", { class: "lib-name", text: c.title }),
        h("span", { class: "lib-sub", text: c.plainLanguage }));
      b.addEventListener("click", function () { onPick(id); });
      list.appendChild(h("li", {}, b));
    });
    p.appendChild(list);
    root.appendChild(p);
  };

  Screens.practiceEnd = function (root, onAnother) {
    var p = page("done");
    p.appendChild(h("h1", { class: "done-word", "data-focus": true, text: C.pack.uiCopy.finish || "Done." }));
    var another = UI.button("Another", onAnother);
    another.setAttribute("data-primary", "");
    var home = h("a", { class: "btn quiet", href: "#/", text: "Home" });
    p.appendChild(UI.actions(another, home));
    root.appendChild(p);
  };

  // ---------------------------------------------------------------------------
  Screens.settings = function (root, api) {
    var st = WN.Store.get();
    var p = page("settings");
    p.appendChild(backLink());
    p.appendChild(h("h1", { class: "title", "data-focus": true, text: "Settings" }));

    function segmented(label, name, options, current, onChange) {
      var group = h("div", { class: "seg", role: "radiogroup", "aria-label": label });
      options.forEach(function (o) {
        var b = h("button", { type: "button", role: "radio", class: "seg-b", "aria-checked": String(o[0] === current), text: o[1] });
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(group.children, function (x) { x.setAttribute("aria-checked", "false"); });
          b.setAttribute("aria-checked", "true");
          onChange(o[0]);
        });
        group.appendChild(b);
      });
      return h("section", { class: "set-row" }, h("h2", { class: "label", text: label }), group);
    }

    p.appendChild(segmented("Theme", "theme", [["light", "Light"], ["dark", "Dark"], ["system", "System"]],
      st.themePreference, function (v) { WN.Store.setPreference("themePreference", v); api.applyTheme(); }));
    p.appendChild(segmented("Sound", "sound", [["off", "Off"], ["on", "On"]],
      st.soundPreference, function (v) { WN.Store.setPreference("soundPreference", v); if (v === "on") UI.tone(); }));

    var resetZone = h("div", { class: "reset-zone" });
    function resetIdle() {
      UI.clear(resetZone);
      var b = UI.button("Reset progress", function () {
        UI.clear(resetZone);
        resetZone.appendChild(h("p", { class: "stem", text: "Erase all progress on this device? This cannot be undone." }));
        var yes = UI.button("Reset", function () { api.reset(); }, "danger");
        var no = UI.button("Cancel", resetIdle, "quiet");
        resetZone.appendChild(UI.actions(no, yes));
        no.focus();
      }, "quiet");
      resetZone.appendChild(b);
    }
    resetIdle();
    p.appendChild(h("section", { class: "set-row" }, h("h2", { class: "label", text: "Progress" }), resetZone));
    p.appendChild(h("p", { class: "quiet-note", text: "Everything stays on this device. No account, no network." }));
    root.appendChild(p);
  };

  WN.Screens = Screens;
})(window.WN = window.WN || {});
