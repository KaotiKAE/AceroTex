(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---------- Welcome gate (click to enter) ---------- */
  function initSplash() {
    var gate = $("[data-welcome]");
    if (!gate) return;
    var root = document.documentElement;
    root.classList.add("is-gated"); // lock scroll behind the gate
    var done = false;
    var enter = function () {
      if (done) return;
      done = true;
      gate.classList.add("is-out");
      root.classList.add("is-entered"); // triggers the page rise-in
      root.classList.remove("is-gated");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, 1400);
    };
    var onKey = function (e) {
      // Any real key press enters; leave Tab for keyboard focus navigation.
      if (["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"].indexOf(e.key) !== -1) return;
      e.preventDefault();
      enter();
    };
    gate.addEventListener("click", enter);
    document.addEventListener("keydown", onKey, true);
    // Move focus to the prompt so keyboard/space works and the CTA reads out.
    var btn = $("[data-welcome-continue]", gate);
    if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    // Safety: never trap a visitor if something goes wrong — free scroll after 20s.
    setTimeout(function () { root.classList.remove("is-gated"); }, 20000);
  }

  /* ---------- Nav: solid on scroll + mobile menu ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("is-solid", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("[data-nav-toggle]");
    if (!toggle) return;

    // Build the mobile menu once from the primary links
    var panel = document.createElement("nav");
    panel.className = "nav-mobile";
    panel.setAttribute("aria-label", "Mobile");
    var links = $$(".nav-links a").map(function (a) {
      return '<a href="' + a.getAttribute("href") + '">' + a.textContent + "</a>";
    });
    links.push('<a href="#contact">Request a quote →</a>');
    panel.innerHTML = links.join("");
    nav.insertAdjacentElement("afterend", panel);

    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      panel.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () { setOpen(!panel.classList.contains("is-open")); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  }

  /* ---------- Smooth anchor scroll (native) ---------- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#" || id === "#top") {
        if (id === "#top") { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); }
        return;
      }
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navH = 84;
      var top = el.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------- Reveals ---------- */
  function initReveals() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window) || reduced) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -4% 0px" });
    items.forEach(function (el) { io.observe(el); });

    // Safety: reveal anything still hidden after 6s
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight + 200) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------- Count-up numbers ---------- */
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var target = parseFloat(el.getAttribute("data-count-to"));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var comma = el.getAttribute("data-format") === "comma";
    var fmt = function (n) {
      var v = decimals ? n.toFixed(decimals) : String(Math.round(n));
      if (comma) v = Number(v).toLocaleString("en-US");
      return v;
    };
    if (reduced) { el.textContent = fmt(target); return; }
    var dur = 1400, start = null;
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = fmt(target * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  }
  function initCounters() {
    var nums = $$("[data-count-to]");
    if (!nums.length) return;
    if (!("IntersectionObserver" in window)) { nums.forEach(animateCount); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Custom cursor: dot + trailing ring ---------- */
  function initCursor() {
    if (!fineHover) return;
    var cursor = $(".cursor");
    var dot = $(".cursor-dot");
    var ring = $(".cursor-ring");
    if (!cursor || !dot || !ring) return;
    document.body.classList.add("has-cursor");

    var mx = 0, my = 0, rx = 0, ry = 0, firstMove = false, running = false;

    var loop = function () {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx.toFixed(2) + "px," + ry.toFixed(2) + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
      if (!firstMove) {
        firstMove = true; rx = mx; ry = my;
        cursor.classList.add("is-ready");
        if (!running) { running = true; requestAnimationFrame(loop); }
      }
    }, { passive: true });

    var hot = "a, button, .project, .cap-figure, .hero-figure, .featured-media, input, select, textarea, .btn, label";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hot)) cursor.classList.add("is-hot"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest(hot)) cursor.classList.remove("is-hot"); });
    window.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });
    document.addEventListener("mouseleave", function () { cursor.classList.remove("is-ready"); });
    document.addEventListener("mouseenter", function () { if (firstMove) cursor.classList.add("is-ready"); });
  }

  /* ---------- Contact form → mailto ---------- */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;
    var note = $("[data-form-note]");
    var c = data.contact || {};
    var to = c.email || "jcantu@redblackeg.com";
    var endpoint = data.formEndpoint || "";

    var get = function (n) { var f = form.elements[n]; return f ? String(f.value || "").trim() : ""; };

    var mailtoFallback = function (name, company, email, type, message) {
      var subject = "Quote request — " + (company || name || "New project") + " (" + (type || "Project") + ")";
      var body = "Name: " + name + "\nCompany: " + company + "\nEmail: " + email +
        "\nProject type: " + type + "\n\nScope & location:\n" + message + "\n\n— Sent from acerotex website";
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (get("website")) return; // honeypot: silently drop bots
      var name = get("name"), company = get("company"), email = get("email"), type = get("type"), message = get("message");

      // No database endpoint configured yet → open the visitor's email client.
      if (!endpoint) { form.classList.add("is-sent"); if (note) note.hidden = false; mailtoFallback(name, company, email, type, message); return; }

      // Send the submission to the Google Sheet (via Apps Script Web App).
      var btn = form.querySelector(".btn-submit"); if (btn) btn.disabled = true;
      var payload = new URLSearchParams({ name: name, company: company, email: email, type: type, message: message, source: "acerotex.com" });
      fetch(endpoint, { method: "POST", mode: "no-cors", body: payload })
        .then(function () {
          form.classList.add("is-sent");
          if (note) { note.textContent = "Thanks — your request was sent. We'll get back to you shortly."; note.hidden = false; }
          form.reset();
        })
        .catch(function () { mailtoFallback(name, company, email, type, message); })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function boot() {
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initReveals, "initReveals");
    safe(initCounters, "initCounters");
    safe(initCursor, "initCursor");
    safe(initForm, "initForm");
    safe(initYear, "initYear");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
