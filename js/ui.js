// WHAT NOW? — small DOM helpers and shared interface pieces.
(function (WN) {
  "use strict";

  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // Seeded shuffle so a given encounter keeps a stable order.
  function hash(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function shuffle(list, seed) {
    var a = list.slice(), s = hash(String(seed)) || 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      var j = s % (i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var NEE = "Not enough evidence";
  function isNee(label, id) { return id === "not_enough_evidence" || label === NEE; }

  var UI = {
    h: h,
    clear: clear,
    shuffle: shuffle,
    isNee: isNee,

    // Moves focus to a screen's heading so keyboard and screen-reader users land
    // at the start of the new thought.
    focus: function (root) {
      var t = root.querySelector("[data-focus]") || root.querySelector("h1, h2");
      if (t) {
        if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
        try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
      }
    },

    reveal: function (el) {
      el.classList.add("reveal");
      return el;
    },

    kicker: function (text) { return h("p", { class: "kicker", text: text }); },

    prompt: function (text, extra) {
      return h("h2", { class: "prompt" + (extra ? " " + extra : ""), "data-focus": true, text: text });
    },

    // A column of answer buttons. options: [{label, id, nee}]
    choices: function (options, onPick, opts) {
      opts = opts || {};
      var list = h("div", { class: "choices" + (opts.multi ? " multi" : ""), role: opts.multi ? "group" : null });
      var n = 0;
      options.forEach(function (o) {
        n += 1;
        var btn = h("button", {
          type: "button",
          class: "choice" + (o.nee ? " nee" : ""),
          "data-key": String(n),
          "data-id": o.id,
          "aria-pressed": opts.multi ? "false" : null
        },
          h("span", { class: "choice-key", "aria-hidden": "true", text: String(n) }),
          h("span", { class: "choice-label", text: o.label })
        );
        btn.addEventListener("click", function () { onPick(o, btn); });
        if (o.nee) list.appendChild(h("div", { class: "nee-rule", "aria-hidden": "true" }));
        list.appendChild(btn);
      });
      return list;
    },

    lockChoices: function (list) {
      Array.prototype.forEach.call(list.querySelectorAll(".choice"), function (b) {
        b.disabled = true;
        b.removeAttribute("data-key");
      });
      list.classList.add("locked");
    },

    mark: function (list, id, state) {
      var b = list.querySelector('.choice[data-id="' + CSS.escape(String(id)) + '"]');
      if (b) b.classList.add(state);
    },

    textarea: function (placeholder, label) {
      var id = "t" + Math.random().toString(36).slice(2, 8);
      return h("div", { class: "field" },
        h("label", { class: "sr-only", for: id, text: label || placeholder }),
        h("textarea", { id: id, rows: "3", placeholder: placeholder, spellcheck: "true" })
      );
    },

    button: function (label, onClick, cls) {
      var b = h("button", { type: "button", class: "btn " + (cls || "primary"), text: label });
      b.addEventListener("click", onClick);
      return b;
    },

    actions: function () {
      var row = h("div", { class: "actions" });
      for (var i = 0; i < arguments.length; i++) append(row, arguments[i]);
      return row;
    },

    headline: function (text, tone) {
      return h("p", { class: "headline " + (tone || ""), role: "status", text: text });
    },

    // "Integration asks: Can I enter?"
    anchorLine: function (conceptId) {
      var c = WN.Content.concept(conceptId);
      return h("div", { class: "anchor" },
        h("span", { class: "anchor-name", text: c.title + " asks" }),
        h("span", { class: "anchor-q", text: WN.Content.anchor(conceptId) })
      );
    },

    // Quiet, expandable source attribution.
    source: function (conceptIds, extraStatus) {
      var ids = [].concat(conceptIds);
      var concept = WN.Content.concept(ids[0]);
      var srcIds = [];
      ids.forEach(function (id) {
        var c = WN.Content.concept(id);
        (c ? c.sourceIds : []).forEach(function (s) { if (srcIds.indexOf(s) === -1) srcIds.push(s); });
      });
      var srcs = srcIds.map(function (s) { return WN.Content.sources[s]; }).filter(Boolean);
      if (!srcs.length) return null;
      var short = srcs[0].title.split(":")[0];
      var panelId = "src" + Math.random().toString(36).slice(2, 8);
      var panel = h("div", { class: "source-panel", id: panelId, hidden: true },
        srcs.map(function (s) {
          return h("div", { class: "source-item" },
            h("p", { class: "source-title", text: s.title }),
            h("p", { class: "source-meta", text: WN.Content.statusLabel(s.status) + " · " + s.locator })
          );
        }),
        h("p", { class: "source-meta framing", text: "How this idea is framed here: " +
          WN.Content.statusLabel(extraStatus || (concept && concept.sourceStatus)) + "." })
      );
      var toggle = h("button", {
        type: "button", class: "source-toggle", "aria-expanded": "false", "aria-controls": panelId
      }, "Source · " + short + (srcs.length > 1 ? " +" + (srcs.length - 1) : ""));
      toggle.addEventListener("click", function () {
        var open = panel.hidden;
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
      });
      return h("div", { class: "source" }, toggle, panel);
    },

    selfAssess: function (labels, onPick, question) {
      var row = h("div", { class: "assess", role: "group", "aria-label": question || "How did you do?" });
      if (question) row.appendChild(h("p", { class: "assess-q", text: question }));
      var btns = h("div", { class: "assess-row" });
      [["incorrect", labels[0]], ["partial", labels[1]], ["correct", labels[2]]].forEach(function (pair, i) {
        var b = h("button", { type: "button", class: "btn quiet", "data-key": String(i + 1), text: pair[1] });
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(btns.children, function (x) { x.disabled = true; x.removeAttribute("data-key"); });
          b.classList.add("chosen");
          onPick(pair[0]);
        });
        btns.appendChild(b);
      });
      row.appendChild(btns);
      return row;
    },

    confidence: function (onPick) {
      var row = h("div", { class: "assess confidence", role: "group", "aria-label": "How sure are you?" },
        h("p", { class: "assess-q", text: "How sure?" }));
      var btns = h("div", { class: "assess-row" });
      [["guess", "Guessing"], ["think", "Think so"], ["know", "Know it"]].forEach(function (pair, i) {
        var b = h("button", { type: "button", class: "btn quiet", "data-key": String(i + 1), text: pair[1] });
        b.addEventListener("click", function () {
          row.remove();
          onPick(pair[0]);
        });
        btns.appendChild(b);
      });
      row.appendChild(btns);
      return row;
    },

    // Pair list used in SEE IT reveals: [["SUPPORTED", "…"], …]
    facts: function (rows) {
      var dl = h("dl", { class: "facts" });
      rows.forEach(function (r) {
        if (!r[1]) return;
        dl.appendChild(h("dt", { text: r[0] }));
        dl.appendChild(h("dd", { text: r[1] }));
      });
      return dl;
    },

    // Soft completion tone — only when the player turned sound on.
    tone: function () {
      if (WN.Store.get().soundPreference !== "on") return;
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        var ctx = UI._audio || (UI._audio = new Ctx());
        var now = ctx.currentTime;
        [[528, 0.05], [792, 0.02]].forEach(function (p) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = p[0];
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(p[1], now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.7);
        });
      } catch (e) { console.warn("[WHAT NOW] tone unavailable", e); }
    },

    plural: function (n, one, many) { return n + " " + (n === 1 ? one : many); }
  };

  WN.UI = UI;
})(window.WN = window.WN || {});
