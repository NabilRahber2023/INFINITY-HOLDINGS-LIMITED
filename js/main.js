/* ============================================================
   INFINITY HOLDINGS LIMITED — interaction layer
   Vanilla JS. No build step. Progressive enhancement.
   ------------------------------------------------------------
   Modules: preloader · smooth scroll (Lenis w/ fallback) ·
   scroll reveals · split-text · parallax · sticky/hiding nav ·
   fullscreen menu · custom cursor · counters · marquee ·
   sector hover thumbnails · form UX · footer year.
   ============================================================ */
(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.remove("no-js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, n) => (1 - n) * a + n * b;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* --------------------------------------------------------
     1. PRELOADER  (word reveal + count)
  -------------------------------------------------------- */
  function preloader() {
    const pre = $(".preloader");
    if (!pre) { document.body.classList.remove("no-scroll"); return start(); }
    const chars = $$(".preloader__mark .ch", pre);
    const bar = $(".preloader__bar", pre);
    const count = $(".preloader__count", pre);
    const sub = $(".preloader__sub", pre);

    if (reduceMotion) { finish(); return; }

    document.body.classList.add("no-scroll");

    chars.forEach((c, i) => {
      c.animate(
        [{ transform: "translateY(115%)" }, { transform: "translateY(0)" }],
        { duration: 900, delay: 120 + i * 55, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }
      );
    });
    if (sub) sub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 700, fill: "both" });

    let p = 0;
    const dur = 1500, t0 = performance.now();
    (function tick(now) {
      p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (bar) bar.style.width = (eased * 100) + "%";
      if (count) count.textContent = Math.round(eased * 100).toString().padStart(2, "0");
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 260);
    })(t0);

    function finish() {
      pre.classList.add("is-done");
      pre.animate([{ transform: "translateY(0)" }, { transform: "translateY(-101%)" }],
        { duration: 1000, easing: "cubic-bezier(.85,0,.15,1)", fill: "forwards" })
        .onfinish = () => { pre.style.display = "none"; };
      document.body.classList.remove("no-scroll");
      start();
    }
  }

  /* --------------------------------------------------------
     2. SMOOTH SCROLL  (Lenis if present, else native)
  -------------------------------------------------------- */
  let lenis = null;
  function smoothScroll() {
    if (reduceMotion || isTouch) return;
    if (typeof window.Lenis === "undefined") return;
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      lerp: 0.09,
      wheelMultiplier: 1,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    root.classList.add("lenis");
  }
  function scrollToY(target) {
    if (lenis) lenis.scrollTo(target, { offset: 0 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  }

  /* --------------------------------------------------------
     3. SCROLL REVEALS (IntersectionObserver)
  -------------------------------------------------------- */
  function reveals() {
    const targets = $$("[data-reveal], .img-reveal, .reveal-lines, .split");
    if (!("IntersectionObserver" in window)) { targets.forEach(t => t.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(t => io.observe(t));
  }

  /* --------------------------------------------------------
     4. SPLIT TEXT — wrap words for masked reveal
  -------------------------------------------------------- */
  function splitText() {
    $$("[data-split]").forEach((el) => {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = "1";
      el.classList.add("split");
      const words = el.textContent.trim().split(/\s+/);
      el.setAttribute("aria-label", el.textContent.trim());
      el.textContent = "";
      words.forEach((w, i) => {
        const wrap = document.createElement("span");
        wrap.className = "word"; wrap.setAttribute("aria-hidden", "true");
        const inner = document.createElement("span");
        inner.textContent = w;
        inner.style.transitionDelay = (i * 0.045) + "s";
        wrap.appendChild(inner);
        el.appendChild(wrap);
        el.appendChild(document.createTextNode(" "));
      });
    });
  }

  /* --------------------------------------------------------
     5. PARALLAX + hero scale (rAF, scroll-linked)
  -------------------------------------------------------- */
  function parallax() {
    if (reduceMotion) return;
    const items = $$("[data-parallax]").map((el) => ({
      el, speed: parseFloat(el.dataset.parallax) || 0.15, y: 0, ty: 0,
    }));
    const heroImgs = $$(".hero__media img, .subhero__media img");
    if (!items.length && !heroImgs.length) return;

    let vh = window.innerHeight;
    const onResize = () => { vh = window.innerHeight; };
    window.addEventListener("resize", onResize);

    function loop() {
      const sy = window.scrollY || window.pageYOffset;
      items.forEach((it) => {
        const rect = it.el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - vh / 2;
        it.ty = -center * it.speed;
        it.y = lerp(it.y, it.ty, 0.08);
        it.el.style.transform = `translate3d(0, ${it.y.toFixed(2)}px, 0)`;
      });
      // hero image subtle zoom-out + drift on scroll
      heroImgs.forEach((img) => {
        const rect = img.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const prog = clamp(sy / vh, 0, 1);
        const scale = 1.15 - prog * 0.12;
        img.style.transform = `scale(${scale.toFixed(3)}) translate3d(0, ${(prog * 40).toFixed(1)}px, 0)`;
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* --------------------------------------------------------
     6. HEADER — solid on scroll + hide on scroll-down
  -------------------------------------------------------- */
  function header() {
    const h = $(".header");
    if (!h) return;
    let last = 0;
    function update() {
      const y = window.scrollY || window.pageYOffset;
      h.classList.toggle("is-solid", y > 40);
      if (!document.body.classList.contains("menu-open")) {
        if (y > last && y > 300) h.classList.add("is-hidden");
        else h.classList.remove("is-hidden");
      }
      last = y;
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* --------------------------------------------------------
     7. FULLSCREEN MENU
  -------------------------------------------------------- */
  function menu() {
    const burger = $(".burger");
    const menuEl = $(".menu");
    if (!burger || !menuEl) return;
    const close = () => {
      document.body.classList.remove("menu-open");
      if (lenis) lenis.start();
    };
    const toggle = () => {
      const open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { if (lenis) lenis.stop(); }
      else { if (lenis) lenis.start(); }
    };
    burger.addEventListener("click", toggle);
    $$(".menu__link", menuEl).forEach(a => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* --------------------------------------------------------
     8. CUSTOM CURSOR
  -------------------------------------------------------- */
  function cursor() {
    if (isTouch || reduceMotion) return;
    const ring = document.createElement("div"); ring.className = "cursor is-hidden";
    const label = document.createElement("span"); label.className = "cursor__label";
    ring.appendChild(label);
    const dot = document.createElement("div"); dot.className = "cursor-dot is-hidden";
    document.body.append(ring, dot);

    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.classList.remove("is-hidden"); dot.classList.remove("is-hidden");
    });
    document.addEventListener("mouseleave", () => { ring.classList.add("is-hidden"); dot.classList.add("is-hidden"); });

    (function follow() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();

    const hoverSel = "a, button, .btn, .link, input, textarea, select, .burger, [data-cursor]";
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest(hoverSel);
      if (!t) return;
      const lbl = t.getAttribute("data-cursor");
      if (lbl) { ring.classList.add("is-label"); label.textContent = lbl; }
      else ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.target.closest(hoverSel)) return;
      ring.classList.remove("is-hover", "is-label"); label.textContent = "";
    });
  }

  /* --------------------------------------------------------
     9. COUNTERS  (count-up when visible)
  -------------------------------------------------------- */
  function counters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const to = parseFloat(el.dataset.count);
        const dec = (el.dataset.count.split(".")[1] || "").length;
        const dur = 1600, t0 = performance.now();
        if (reduceMotion) { el.textContent = format(to); return; }
        (function step(now) {
          const p = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = format(to * eased);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        function format(v) {
          return dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
        }
      });
    }, { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  /* --------------------------------------------------------
     10. MARQUEE  (duplicate + drift, subtle scroll velocity)
  -------------------------------------------------------- */
  function marquee() {
    $$(".marquee").forEach((m) => {
      const track = $(".marquee__track", m);
      if (!track) return;
      // duplicate content for seamless loop
      const clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      m.appendChild(clone);
      const speed = parseFloat(m.dataset.speed) || 0.4;
      let x = 0, w = track.offsetWidth;
      window.addEventListener("resize", () => { w = track.offsetWidth; });
      [track, clone].forEach(t => t.style.willChange = "transform");
      (function move() {
        x -= speed; if (Math.abs(x) >= w + 48) x = 0;
        const tf = `translate3d(${x.toFixed(1)}px,0,0)`;
        track.style.transform = tf; clone.style.transform = `translate3d(${(x + w + 48).toFixed(1)}px,0,0)`;
        requestAnimationFrame(move);
      })();
    });
  }

  /* --------------------------------------------------------
     11. SECTOR ROWS — floating hover thumbnail
  -------------------------------------------------------- */
  function sectorThumbs() {
    if (isTouch) return;
    const list = $(".sector-list");
    if (!list) return;
    const thumb = $(".sector-row__thumb");
    if (!thumb) return;
    const img = $("img", thumb);
    let tx = 0, ty = 0, cx = 0, cy = 0, active = false;

    $$(".sector-row", list).forEach((row) => {
      row.addEventListener("mouseenter", () => {
        active = true;
        img.src = row.dataset.img;
        thumb.style.opacity = "1";
        thumb.style.transform = "translate(-50%,-50%) scale(1)";
      });
      row.addEventListener("mouseleave", () => {
        active = false;
        thumb.style.opacity = "0";
        thumb.style.transform = "translate(-50%,-50%) scale(.85)";
      });
    });
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
      if (active) thumb.style.left = cx + "px", thumb.style.top = cy + "px";
      requestAnimationFrame(loop);
    })();
  }

  /* --------------------------------------------------------
     12. FORM UX — floating labels + fake submit
  -------------------------------------------------------- */
  function forms() {
    // footer newsletter
    const nf = $(".footer__form");
    if (nf) nf.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input", nf);
      if (input && input.value.trim()) { input.value = ""; input.placeholder = "Thank you — you're subscribed."; }
    });

    const cf = $("#contactForm");
    if (cf) {
      cf.addEventListener("submit", (e) => {
        e.preventDefault();
        const ok = $(".form-success", cf.closest("section") || document);
        cf.style.display = "none";
        if (ok) ok.classList.add("show");
      });
      // keep filled state for selects
      $$("select", cf).forEach(s => {
        const sync = () => s.closest(".field")?.classList.toggle("filled", !!s.value);
        s.addEventListener("change", sync); sync();
      });
    }
  }

  /* --------------------------------------------------------
     13. ANCHOR SMOOTH SCROLL
  -------------------------------------------------------- */
  function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      a.addEventListener("click", (e) => {
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + (window.scrollY || 0) - 60;
        scrollToY(y);
      });
    });
  }

  /* --------------------------------------------------------
     14. tilt on data-tilt (subtle)
  -------------------------------------------------------- */
  function tilt() {
    if (isTouch || reduceMotion) return;
    $$("[data-tilt]").forEach((el) => {
      const strength = parseFloat(el.dataset.tilt) || 6;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* --------------------------------------------------------
     BOOT
  -------------------------------------------------------- */
  function start() {
    smoothScroll();
    splitText();
    reveals();
    parallax();
    header();
    menu();
    cursor();
    counters();
    marquee();
    sectorThumbs();
    forms();
    anchors();
    tilt();
    const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", preloader);
  } else { preloader(); }
})();
