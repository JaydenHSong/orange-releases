(() => {
  const REPO = "JaydenHSong/orange-releases";
  const KO = document.documentElement.lang === "ko";

  document.querySelectorAll("a[data-language]").forEach(link => {
    link.addEventListener("click", () => {
      try { localStorage.setItem("orange.language", link.dataset.language); }
      catch (_) {
        // Private browsing/storage denial: carry this explicit choice through the navigation.
        const url = new URL(link.href);
        url.searchParams.set("lang", link.dataset.language);
        link.href = url.href;
      }
    });
  });

  // Wheel labels follow the rendered page after the inline language routing.
  // Words that change with the page's language. The wheel labels are the app's own (Korean or English UI).
  // Team pages share language choice but have no download button or demo wheel.
  if (!document.getElementById("wheel")) return;

  const T = KO ? {
    get: v => `Orange ${v} 받기`,
    meta: (mb, d) => `DMG 파일, ${mb} MB, ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
    wheelLabel: (name, labels) => `Orange의 ${name} 휠: ${labels.join(", ")}`,
    file: "사진.png",
    wheels: {
      convert: { name: "변환", labels: ["JPG", "WEBP", "HEIC", "TIFF", "BMP", "PDF"], rest: 1 },
      actions: { name: "동작", labels: ["AirDrop", "Float", "복사", "이동", "경로 복사", "터미널"], rest: null },
      presets: { name: "프리셋", labels: ["Web JPG", "썸네일", "인쇄용 TIFF"], rest: 0 },
      tools:   { name: "도구", labels: ["압축", "메타데이터", "편집", "주석", "배경", "자르기", "가리기"], rest: null },
    },
  } : {
    get: v => `Download Orange ${v}`,
    meta: (mb, d) => `DMG, ${mb} MB, ${d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    wheelLabel: (name, labels) => `Orange's ${name} wheel: ${labels.join(", ")}`,
    file: "photo.png",
    wheels: {
      convert: { name: "Convert", labels: ["JPG", "WEBP", "HEIC", "TIFF", "BMP", "PDF"], rest: 1 },
      actions: { name: "Actions", labels: ["AirDrop", "Float", "Copy", "Move", "Copy Path", "Terminal"], rest: null },
      presets: { name: "Presets", labels: ["Web JPG", "Thumbnail", "Print TIFF"], rest: 0 },
      tools:   { name: "Tools", labels: ["Compress", "Metadata", "Edit", "Annotate", "Add BG", "Crop", "Redact"], rest: null },
    },
  };

  // The download button points at the newest DMG once GitHub says which it is. Without that it keeps the release page.
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(release => {
      const dmg = (release.assets || []).find(a => a.name.endsWith(".dmg"));
      if (!dmg) return;
      document.getElementById("get").href = dmg.browser_download_url;
      document.getElementById("get-label").textContent = T.get(release.tag_name.replace(/^v/, ""));
      document.getElementById("get-meta").textContent = T.meta((dmg.size / 1e6).toFixed(1), new Date(release.published_at));
    })
    .catch(() => {});

  // The wheel: the same shape as Orange's, segments from twelve o'clock, clockwise.
  const NS = "http://www.w3.org/2000/svg";
  const C = 170, INNER = 64, OUTER = 146, HALF_GAP = 8.5, LIFT = 9;
  const WHEELS = T.wheels;
  const svg = document.getElementById("wheel");
  const segs = document.getElementById("segs");
  const center = document.getElementById("center");
  const buttons = [...document.querySelectorAll("#keys button")];
  const panels = [...document.querySelectorAll(".panel")];
  let kind = null, hovered = null;

  const point = (r, deg) => {
    const a = deg * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  // An annulus segment whose straight edges run parallel, HALF_GAP away from the boundary line, as in the app.
  const segmentPath = (mid, span) => {
    const a0 = mid - span / 2, a1 = mid + span / 2;
    const off = r => Math.asin(HALF_GAP / r) * 180 / Math.PI;
    const [o0, o1] = [a0 + off(OUTER), a1 - off(OUTER)];
    const [i0, i1] = [a0 + off(INNER), a1 - off(INNER)];
    const large = o1 - o0 > 180 ? 1 : 0;
    const p = (r, d) => point(r, d).map(v => v.toFixed(2)).join(" ");
    return `M${p(OUTER, o0)}A${OUTER} ${OUTER} 0 ${large} 1 ${p(OUTER, o1)}L${p(INNER, i1)}A${INNER} ${INNER} 0 ${large} 0 ${p(INNER, i0)}Z`;
  };

  function drawCenter() {
    center.replaceChildren();
    const wheel = WHEELS[kind];
    const lifted = hovered ?? wheel.rest;
    if (lifted !== null) {
      const chip = el("g", { class: "chip" }, center);
      const rect = el("rect", { y: C - 11, height: 22, rx: 11 }, chip);
      const text = el("text", { x: C, y: C + 0.5 }, chip);
      text.textContent = `→ ${wheel.labels[lifted]}`;
      const width = Math.max(56, text.getComputedTextLength() + 22);
      rect.setAttribute("x", C - width / 2);
      rect.setAttribute("width", width);
      return;
    }
    // The dragged file, as the wheel's middle shows it.
    el("rect", { x: C - 16, y: C - 34, width: 32, height: 32, rx: 7, fill: "url(#thumb)" }, center);
    el("path", { d: `M${C - 11} ${C - 7}l7-9 5 6 3-3 7 6z`, fill: "#ffffff", opacity: "0.92" }, center);
    el("circle", { cx: C + 6, cy: C - 25, r: 3, fill: "#ffffff", opacity: "0.92" }, center);
    el("text", { class: "file-name", x: C, y: C + 14 }, center).textContent = T.file;
    el("text", { class: "file-size", x: C, y: C + 28 }, center).textContent = "1.2 MB";
  }

  function draw(opening) {
    const wheel = WHEELS[kind];
    segs.replaceChildren();
    const n = wheel.labels.length;
    wheel.labels.forEach((label, i) => {
      const mid = -90 + i * 360 / n;
      // The outer group opens with the wheel; the inner one lifts the chosen segment.
      const g = el("g", { class: "seg" }, segs);
      g.style.transformOrigin = `${C}px ${C}px`;
      if (opening) g.style.animationDelay = `${i * 45}ms`;
      const body = el("g", { class: "body" }, g);
      el("path", { d: segmentPath(mid, 360 / n) }, body);
      const [x, y] = point((INNER + OUTER) / 2, mid);
      el("text", { x: x.toFixed(1), y: y.toFixed(1) }, body).textContent = label;
      g.addEventListener("pointerenter", () => { hovered = i; paint(); });
      g.addEventListener("pointerleave", () => { if (hovered === i) { hovered = null; paint(); } });
    });
    svg.setAttribute("aria-label", T.wheelLabel(wheel.name, wheel.labels));
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    panels.forEach(p => p.classList.toggle("on", p.dataset.kind === kind));
    paint();
  }

  // The chosen segment lifts outward, like the 2 o'clock segment of the app icon.
  function paint() {
    const wheel = WHEELS[kind];
    const lifted = hovered ?? wheel.rest;
    [...segs.querySelectorAll(".seg")].forEach((g, i) => {
      const on = i === lifted;
      g.classList.toggle("lift", on);
      const mid = (-90 + i * 360 / wheel.labels.length) * Math.PI / 180;
      g.firstChild.style.transform = on ? `translate(${(LIFT * Math.cos(mid)).toFixed(2)}px, ${(LIFT * Math.sin(mid)).toFixed(2)}px)` : "";
    });
    drawCenter();
  }

  function choose(next, opening = true) {
    if (next === kind) return;
    kind = next;
    hovered = null;
    svg.classList.toggle("opening", opening);
    draw(opening);
  }

  buttons.forEach(b => b.addEventListener("click", () => choose(b.dataset.kind)));
  const KEYS = { Shift: "convert", Control: "actions", Alt: "presets", Meta: "tools" };
  document.addEventListener("keydown", e => {
    if (!e.repeat && KEYS[e.key]) choose(KEYS[e.key]);
  });
  choose("convert", false);

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(n => n.classList.add("in"));
    return;
  }
  // The panel in the middle of the screen picks the wheel, as a modifier tap would.
  const panelWatch = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) choose(e.target.dataset.kind); });
  }, { rootMargin: "-45% 0px -45% 0px" });
  panels.forEach(p => panelWatch.observe(p));

  const revealWatch = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      revealWatch.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".reveal").forEach(n => revealWatch.observe(n));

  // The hero scene plays while it is on screen.
  const stage = document.getElementById("stage");
  const beats = document.querySelector(".beats");
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      stage.classList.toggle("playing", e.isIntersecting);
      beats.classList.toggle("playing", e.isIntersecting);
    });
  }).observe(stage);
})();
