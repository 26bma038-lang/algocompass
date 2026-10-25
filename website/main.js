// AlgoCompass website: download link, theme, and the motion. No dependencies.
(() => {
  "use strict";
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const lightMq = matchMedia("(prefers-color-scheme: light)");

  /* ---------- Download: always the newest setup.exe ---------- */
  const API = "https://api.github.com/repos/26bma038-lang/algocompass/releases/latest";
  const CACHE_KEY = "ac-release";
  const fmtSize = (bytes) => (bytes / 1048576).toFixed(1) + " MB";
  const applyRelease = (r) => {
    $$("a[data-dl-link]").forEach((a) => {
      if (a.classList.contains("nav-dl")) return; // the nav button scrolls to the hero
      a.href = r.url;
    });
    $$("[data-dl-meta]").forEach((el) => {
      el.textContent = `Version ${r.version.replace(/^v/, "")}, ${fmtSize(r.size)}. Free, for Windows 10 and 11.`;
    });
  };
  const loadRelease = async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < 3600e3) return applyRelease(cached);
    } catch {}
    try {
      const res = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return; // keep the releases/latest fallback already in the markup
      const rel = await res.json();
      const asset = (rel.assets || []).find((a) => /-setup\.exe$/i.test(a.name));
      if (!asset) return;
      const r = { url: asset.browser_download_url, version: rel.tag_name, size: asset.size, at: Date.now() };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(r)); } catch {}
      applyRelease(r);
    } catch {}
  };
  if (!root.classList.contains("is-phone")) loadRelease();

  // Phones: copy the site link instead of a download that can't run there.
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = $("[data-copy-status]");
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Link copied";
        if (status) status.textContent = "Paste it into a message to yourself and open it on your PC.";
      } catch {
        if (status) status.textContent = btn.dataset.copy;
      }
    });
  });

  /* ---------- Theme: follows the system, a manual pick overrides it ---------- */
  const toggle = $("[data-theme-toggle]");
  const systemTheme = () => (lightMq.matches ? "light" : "dark");
  const syncPictures = (pinned) => {
    // Themed screenshots use <source media="(prefers-color-scheme: light)">. A manual pick
    // overrides the media query so the picture matches the page.
    $$("picture[data-themed] source").forEach((s) => {
      s.media = pinned ? (pinned === "light" ? "all" : "not all") : "(prefers-color-scheme: light)";
    });
  };
  const label = () => {
    const t = root.getAttribute("data-theme");
    toggle.setAttribute("aria-label", t === "light" ? "Switch to dark theme" : "Switch to light theme");
  };
  let pinned = null;
  try { pinned = localStorage.getItem("ac-theme"); } catch {}
  if (pinned !== "light" && pinned !== "dark") pinned = null;
  if (pinned) syncPictures(pinned);
  label();

  const setTheme = (next) => {
    const apply = () => {
      root.setAttribute("data-theme", next);
      // Picking what the system already shows means "follow the system" again.
      pinned = next === systemTheme() ? null : next;
      try { pinned ? localStorage.setItem("ac-theme", pinned) : localStorage.removeItem("ac-theme"); } catch {}
      syncPictures(pinned);
      label();
    };
    if (reduced.matches) return apply();
    if (document.startViewTransition) return document.startViewTransition(apply);
    root.classList.add("theme-fade");
    apply();
    setTimeout(() => root.classList.remove("theme-fade"), 450);
  };
  toggle.addEventListener("click", () => setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"));
  lightMq.addEventListener("change", () => {
    if (!pinned) { root.setAttribute("data-theme", systemTheme()); label(); }
  });

  /* ---------- Nav: blurred background once the page scrolls ---------- */
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => root.classList.toggle("scrolled", !e.isIntersecting)).observe(sentinel);

  // Off-screen loops pause (the hero glow, the marquee, the demo).
  const whileVisible = (el, onChange) =>
    new IntersectionObserver(([e]) => onChange(e.isIntersecting), { rootMargin: "80px" }).observe(el);
  const glow = $(".glow");
  if (glow) whileVisible(glow, (v) => glow.classList.toggle("paused", !v));
  const marquee = $("[data-marquee]");
  if (marquee) whileVisible(marquee, (v) => marquee.classList.toggle("paused", !v));

  /* ---------- Scroll reveals, staggered within a group ---------- */
  $$("[data-reveal-group]").forEach((g) => $$("[data-reveal]", g).forEach((el, i) => el.style.setProperty("--i", i)));
  const revealIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* ---------- Count-ups ---------- */
  const countIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target;
      const to = Number(el.dataset.count);
      if (reduced.matches || to === 0) { el.textContent = String(to); return; }
      const start = performance.now();
      const dur = 1100 + Math.min(to, 150) * 4;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 4))));
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    }),
    { threshold: 0.6 },
  );
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Hero screenshot: a soft tilt that follows the cursor ---------- */
  const tilt = $("[data-tilt]");
  const hero = $(".hero");
  if (tilt && hero) {
    let raf = 0;
    let px = 0;
    let py = 0;
    const MAX = 6;
    const render = () => {
      raf = 0;
      tilt.style.setProperty("--ry", (px * MAX).toFixed(2) + "deg");
      tilt.style.setProperty("--rx", (-py * MAX * 0.7).toFixed(2) + "deg");
    };
    hero.addEventListener("pointermove", (e) => {
      if (!finePointer.matches || reduced.matches) return;
      const r = tilt.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      if (!raf) raf = requestAnimationFrame(render);
    });
    hero.addEventListener("pointerleave", () => { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(render); });
  }

  /* ---------- Magnetic download button ---------- */
  $$("[data-magnet]").forEach((m) => {
    const PULL = 0.22;
    const LIMIT = 8;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const set = () => { raf = 0; m.style.transform = tx || ty ? `translate3d(${tx}px, ${ty}px, 0)` : ""; };
    const zone = m.parentElement;
    zone.addEventListener("pointermove", (e) => {
      if (!finePointer.matches || reduced.matches) return;
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
      tx = near ? Math.max(-LIMIT, Math.min(LIMIT, dx * PULL)) : 0;
      ty = near ? Math.max(-LIMIT, Math.min(LIMIT, dy * PULL)) : 0;
      if (!raf) raf = requestAnimationFrame(set);
    });
    zone.addEventListener("pointerleave", () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(set); });
  });

  /* ---------- Feature showcase: the item in the middle of the screen picks the screenshot ---------- */
  const items = $$("[data-feature]");
  const shots = $$("[data-shot]");
  const dots = $$(".show-dots li");
  let active = 0;
  const activate = (i) => {
    if (i === active && items[i].classList.contains("on")) return;
    active = i;
    items.forEach((el, k) => el.classList.toggle("on", k === i));
    shots.forEach((el, k) => el.classList.toggle("on", k === i));
    dots.forEach((el, k) => el.classList.toggle("on", k === i));
  };
  if (items.length) {
    items[0].classList.add("on");
    const featIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) activate(Number(e.target.dataset.feature)); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((el) => featIO.observe(el));
  }

  /* ---------- How it works: the looping mini-demo ---------- */
  const demo = $("[data-demo]");
  const steps = $$("[data-step]");
  if (demo) {
    // Phase -> which of the three steps it illustrates.
    const STEP_OF = [1, 1, 2, 2];
    const HOLD = [1600, 1900, 1500, 2600];
    let phase = 0;
    let timer = 0;
    let running = false;
    const show = (p) => {
      phase = p;
      demo.dataset.phase = String(p);
      steps.forEach((s, k) => s.classList.toggle("on", k === STEP_OF[p]));
    };
    const tick = () => {
      if (!running) return;
      if (phase === 3) {
        // Snap back without animating backwards, then start over.
        demo.classList.add("resetting");
        show(0);
        void demo.offsetWidth;
        demo.classList.remove("resetting");
      } else {
        show(phase + 1);
      }
      timer = setTimeout(tick, HOLD[phase]);
    };
    const start = () => { if (running) return; running = true; timer = setTimeout(tick, HOLD[phase]); };
    const stop = () => { running = false; clearTimeout(timer); };
    if (reduced.matches) {
      show(3); // the finished state, no loop
    } else {
      show(0);
      let inView = false;
      whileVisible(demo, (v) => { inView = v; v ? start() : stop(); });
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : inView && start()));
    }
  }
})();
