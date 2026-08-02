const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* ===================== */
/* FULL-SCREEN MENU      */
/* ===================== */
const menuToggle = document.getElementById("menu-toggle");
const siteMenu = document.getElementById("site-menu");

if (menuToggle && siteMenu) {
  const menuCloseBtn = siteMenu.querySelector(".menu-close");

  function openMenu() {
    siteMenu.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-locked");
    menuCloseBtn.focus();
  }

  function closeMenu() {
    siteMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-locked");
  }

  menuToggle.addEventListener("click", openMenu);
  menuCloseBtn.addEventListener("click", () => {
    closeMenu();
    menuToggle.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && siteMenu.classList.contains("open")) {
      closeMenu();
      menuToggle.focus();
    }
  });

  // menu links: jump instantly, then FADE the section in — reads as
  // the section loading in rather than a long glide across the page
  siteMenu.querySelectorAll(".menu-links a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return; // let the browser handle a bad href
      e.preventDefault();
      closeMenu();

      target.scrollIntoView({ behavior: "instant", block: "start" });

      if (!prefersReducedMotion) {
        target.classList.remove("fade-arrive");
        void target.offsetWidth; // restart the animation if re-visited
        target.classList.add("fade-arrive");
        target.addEventListener(
          "animationend",
          () => target.classList.remove("fade-arrive"),
          { once: true },
        );
      }
    });
  });
}

/* ===================== */
/* ABOUT CARDS + DIALOG  */
/* ===================== */
const dialog = document.getElementById("about-dialog");
const dialogContent = document.getElementById("dialog-content");
const closeBtn = dialog.querySelector(".dialog-close");
const cards = document.querySelectorAll(".about-card");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const detailId = card.getAttribute("aria-controls");
    const detail = document.getElementById(detailId);

    dialogContent.replaceChildren();

    // header: reuse the card's own title inside the dialog
    const title = document.createElement("h3");
    title.className = "dialog-title";
    title.textContent = card.querySelector("h3").textContent;

    const divider = document.createElement("span");
    divider.className = "dialog-divider";
    divider.setAttribute("aria-hidden", "true");

    // clone the detail's real nodes in (no innerHTML, no XSS surface)
    const body = document.createElement("div");
    body.className = "dialog-body";
    detail.childNodes.forEach((node) => {
      body.appendChild(node.cloneNode(true));
    });

    dialogContent.append(title, divider, body);
    dialog.showModal();
  });
});

// the exit animation is pure CSS (transition + allow-discrete), so a
// plain .close() is all the JS needs — Escape works the same way
dialog.addEventListener("click", (e) => {
  if (!dialogContent.contains(e.target) && !closeBtn.contains(e.target)) {
    dialog.close();
  }
});

closeBtn.addEventListener("click", () => dialog.close());

/* ===================== */
/* SERVICES TIER EXPAND  */
/* ===================== */
// mouseenter commits to a tier; only leaving the whole section resets.
// Combined with pointer-events:none on collapsed tiers (CSS), the grid
// transition can no longer re-target hover mid-flight — the old glitch.
const tierGrid = document.getElementById("tier-grid");
const servicesClose = document.getElementById("services-close");
const tiers = tierGrid.querySelectorAll(".tier-stair");

// CLICK, not hover. Hover-driven expansion fought itself: the grid
// re-layout moves tiles under a stationary cursor, so the pointer kept
// re-targeting whichever tile slid beneath it. A click is a single
// deliberate event that nothing can retrigger.
function expandTier(tier) {
  tierGrid.dataset.expanded = tier.dataset.tier;
  tiers.forEach((t) => {
    t.classList.toggle("is-open", t === tier);
    t.setAttribute("aria-expanded", String(t === tier));
  });
}

function collapseTiers() {
  delete tierGrid.dataset.expanded;
  tiers.forEach((t) => {
    t.classList.remove("is-open");
    t.setAttribute("aria-expanded", "false");
  });
}

tiers.forEach((tier) => {
  tier.setAttribute("role", "button");
  tier.setAttribute("tabindex", "0");
  tier.setAttribute("aria-expanded", "false");

  tier.addEventListener("click", () => {
    // clicking the open tier again closes it
    if (tier.classList.contains("is-open")) collapseTiers();
    else expandTier(tier);
  });

  // keyboard parity with the click
  tier.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tier.click();
    }
  });
});

servicesClose.addEventListener("click", (e) => {
  e.stopPropagation(); // don't let the click fall through to the tier
  collapseTiers();
});

// Escape closes an open tier
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && tierGrid.dataset.expanded) collapseTiers();
});

/* ===================== */
/* COMPARISON TABLE      */
/* ===================== */
const tableRows = document.querySelectorAll(".comparison-table tbody tr");

// tag every ✓ / ✕ span so CSS can color them
document
  .querySelectorAll(".comparison-table td span[aria-hidden]")
  .forEach((mark) => {
    const glyph = mark.textContent.trim();
    if (glyph === "✓") mark.classList.add("mark-yes");
    if (glyph === "✕") mark.classList.add("mark-no");
  });

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  tableRows.forEach((row) => row.classList.add("row-in"));
} else {
  // reveal: a row fades up the first time it enters the viewport
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("row-in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );

  tableRows.forEach((row) => revealObserver.observe(row));
}

// the row nearest the focal line (~55% down the viewport) rises and
// its marks glow; it drifts back as the scroll moves on — runs inside
// the shared scroll handler below
function updateFocusedRow(vh) {
  const focalY = vh * 0.55;
  let best = null;
  let bestDist = Infinity;

  tableRows.forEach((row) => {
    const r = row.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return; // off-screen
    const dist = Math.abs(r.top + r.height / 2 - focalY);
    if (dist < bestDist) {
      bestDist = dist;
      best = row;
    }
  });

  tableRows.forEach((row) => {
    row.classList.toggle("row-active", row === best && bestDist < 120);
  });
}

/* ===================== */
/* EXAMPLES — GSAP TILT  */
/* ===================== */
// non-affine "held-up panel": perspective rotation anchored on the
// right edge, so the far (left) corners shrink and lift with the mouse
if (
  typeof gsap !== "undefined" &&
  !prefersReducedMotion &&
  window.matchMedia("(hover: hover)").matches
) {
  document.querySelectorAll(".example figure").forEach((fig) => {
    const img = fig.querySelector("img");
    gsap.set(img, {
      transformPerspective: 900,
      transformOrigin: "right center",
    });

    // quickTo reuses one tween per property — smooth at mousemove rates
    const rotY = gsap.quickTo(img, "rotationY", {
      duration: 0.5,
      ease: "power3.out",
    });
    const rotX = gsap.quickTo(img, "rotationX", {
      duration: 0.5,
      ease: "power3.out",
    });

    fig.addEventListener("mousemove", (e) => {
      const r = fig.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width; // 0 (left) .. 1 (right)
      const ny = (e.clientY - r.top) / r.height; // 0 (top)  .. 1 (bottom)
      // negative rotationY recedes the left edge (top-left shrinks);
      // rotationX follows the cursor so the bottom-left rises
      rotY(-4 - nx * 10);
      rotX((0.5 - ny) * 8);
    });

    fig.addEventListener("mouseleave", () => {
      rotY(0);
      rotX(0);
    });
  });
}

/* ===================== */
/* PARALLAX + ROADMAP    */
/* ===================== */
const clouds = [
  { el: document.querySelector(".p-cloud--1"), speed: 0.05 },
  { el: document.querySelector(".p-cloud--2"), speed: 0.1 },
  { el: document.querySelector(".p-cloud--3"), speed: 0.16 },
].filter((c) => c.el);

const roadmap = document.getElementById("roadmap");
const mapProgress = document.getElementById("map-progress");
const mapX = document.querySelector(".map-x");
const mapStages = [...document.querySelectorAll(".map-stage")];
const statusStage = document.getElementById("map-status-stage");
const statusDesc = document.getElementById("map-status-desc");

const stageInfo = {
  Discovery: "— we learn your business.",
  Design: "— you approve a mockup.",
  Build: "— we construct your site.",
  Revise: "— your feedback shapes the polish.",
  Launch: "— X marks the spot. You're live.",
};

function updateRoadmap(progress) {
  mapProgress.style.strokeDashoffset = String(1 - progress);

  let current = null;
  mapStages.forEach((stage) => {
    const reached = progress >= parseFloat(stage.dataset.at);
    stage.classList.toggle("reached", reached);
    if (reached) current = stage;
  });

  // current = the marker just hit (big + gold); everything before it
  // is passed and earns its strikethrough
  mapStages.forEach((stage) => {
    stage.classList.toggle("current", stage === current);
    stage.classList.toggle(
      "passed",
      stage.classList.contains("reached") && stage !== current,
    );
  });

  if (current) {
    const name = current.querySelector("text").textContent;
    statusStage.textContent = name;
    statusDesc.textContent = stageInfo[name] ?? "";
  }

  // stamp the X once the trail reaches the destination
  mapX.classList.toggle("stamped", progress >= 0.97);
}

if (prefersReducedMotion) {
  // no scroll choreography: show the finished map and still sky
  updateRoadmap(1);
} else {
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;

      clouds.forEach(({ el, speed }) => {
        el.style.transform = `translate3d(0, ${-(y * speed)}px, 0)`;
      });

      const vh = window.innerHeight;
      updateFocusedRow(vh);

      // progress is measured against the section's own scroll runway
      // (its height minus one screen), so the tall sticky section gives
      // the trail a long, slow draw instead of finishing in half a screen
      const rect = roadmap.getBoundingClientRect();
      const runway = Math.max(rect.height - vh, 1);
      const travelled = Math.min(Math.max(-rect.top / runway, 0), 1);
      // dead zone up front (nothing draws while you're still reading the
      // heading) and a settled tail once the X is stamped
      const LEAD_IN = 0.2;
      const DRAW = 0.62;
      const progress = Math.min(
        Math.max((travelled - LEAD_IN) / DRAW, 0),
        1,
      );
      updateRoadmap(progress);
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

/* ===================== */
/* WEB PRESENCE SECTION  */
/* ===================== */
// reason cards and illustrations fade/scale in as they arrive
const revealTargets = document.querySelectorAll(
  ".gi-item, .gi-shot, .services-intro, .tier-grid, .who-wrap",
);

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((el) => el.classList.add("in-view"));
} else {
  const giObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        giObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 },
  );
  revealTargets.forEach((el) => giObserver.observe(el));
}

/* --- the globe: idle spin + drag to bobble --- */
// The meridians are ellipses whose rx shrinks/grows to fake rotation;
// stepping their rx through a sine wave reads as a sphere turning.
const globeStage = document.getElementById("globe-stage");
const globeSvg = globeStage ? globeStage.querySelector(".globe") : null;
const meridians = document.querySelectorAll("#globe-meridians ellipse");
const latitudes = document.querySelectorAll("#globe-lines ellipse");

if (globeStage && meridians.length && typeof gsap !== "undefined") {
  const R = 82;
  // angle = spin around the vertical axis, tilt = how far it's pitched
  // toward/away from you, swing = the pendulum lean of the whole ball
  const globe = { angle: 0, tilt: 0, swing: 0 };
  // the latitudes' resting heights, used as the basis for the tilt
  const baseRy = [...latitudes].map((l) =>
    parseFloat(l.getAttribute("ry") || R),
  );

  function drawGlobe() {
    meridians.forEach((m, i) => {
      // evenly spaced around the sphere, offset by the current angle
      const phase = globe.angle + (i * Math.PI) / meridians.length;
      const rx = Math.abs(Math.cos(phase)) * R;
      m.setAttribute("rx", Math.max(rx, 0.5).toFixed(2));
      // meridians on the far side are dimmer
      m.style.opacity = (0.35 + Math.abs(Math.sin(phase)) * 0.45).toFixed(2);
    });

    // pitching the globe flattens the latitude rings toward ellipses,
    // which is what sells vertical rotation
    const pitch = Math.cos(globe.tilt);
    latitudes.forEach((l, i) => {
      if (l.tagName !== "ellipse") return;
      const ry = Math.abs(baseRy[i] * pitch);
      l.setAttribute("ry", Math.max(ry, 0.5).toFixed(2));
    });

    // the ball tilts about its OWN centre — a spinning globe leaning on
    // its axis, not a pendulum hanging from a point above it
    gsap.set(globeSvg, { rotation: globe.swing, transformOrigin: "50% 50%" });
  }

  // Rotation is velocity-driven rather than a fixed tween, so it never
  // stops: a flick just adds to the speed, and the speed eases back to
  // the resting drift while continuing in whichever way you swiped.
  const IDLE_VEL = (Math.PI * 2) / (14 * 60); // one turn per ~14s at 60fps
  const spin = { vel: IDLE_VEL };

  // drag any direction: sideways spins, vertical pitches, and the throw
  // leaves the globe rocking on its axis
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;

  function tick() {
    if (!dragging) globe.angle += spin.vel;
    drawGlobe();
  }

  if (!prefersReducedMotion) gsap.ticker.add(tick);
  drawGlobe();

  globeStage.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velX = 0;
    globeStage.setPointerCapture(e.pointerId);
    gsap.killTweensOf([globe, spin]);
  });

  globeStage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    velX = dx;

    globe.angle += dx * 0.012;
    // clamp the pitch so it can't turn inside out
    globe.tilt = Math.max(Math.min(globe.tilt + dy * 0.01, 1.2), -1.2);
    globe.swing = Math.max(Math.min(globe.swing + dx * 0.14, 26), -26);
    drawGlobe();
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    if (e.pointerId !== undefined && globeStage.hasPointerCapture(e.pointerId)) {
      globeStage.releasePointerCapture(e.pointerId);
    }
    if (prefersReducedMotion) return;

    // carry the throw: spin keeps going the way you swiped, then bleeds
    // back down to the idle drift (signed, so a left swipe keeps left)
    const thrown = Math.max(Math.min(velX * 0.0035, 0.18), -0.18);
    spin.vel = thrown || IDLE_VEL;
    gsap.to(spin, {
      vel: velX < 0 ? -IDLE_VEL : IDLE_VEL,
      duration: 2.6,
      ease: "power2.out",
    });

    // the ball rocks level again, overshooting either side as it settles
    gsap.to(globe, {
      swing: 0,
      tilt: 0,
      duration: 2.2,
      ease: "elastic.out(1.1, 0.28)",
      onUpdate: drawGlobe,
    });
  };

  globeStage.addEventListener("pointerup", endDrag);
  globeStage.addEventListener("pointercancel", endDrag);
}

/* --- footer social carousel ---
   JS owns the rotation outright: an idle spin while unattended, and a
   tween that swings whichever icon the mouse reaches to the front —
   tracking the pointer instead of freezing the whole ring. */
const socialCarousel = document.querySelector(".social-carousel");
const carouselRing = document.querySelector(".carousel-ring");

if (socialCarousel && carouselRing && typeof gsap !== "undefined") {
  const ringCards = [...carouselRing.querySelectorAll(".social-card")];
  const ringFaces = ringCards.map((c) => c.querySelector(".social-face"));
  const stations = ringCards.map((_, i) => (360 / ringCards.length) * i);
  const radius =
    parseFloat(
      getComputedStyle(carouselRing).getPropertyValue("--ring-radius"),
    ) || 150;

  const ring = { angle: 0 };
  let engaged = false; // pointer is inside the carousel area

  function drawRing() {
    ringCards.forEach((card, i) => {
      const total = ring.angle + stations[i];
      card.style.transform = `rotateY(${total}deg) translateZ(${radius}px)`;
      // faces counter-rotate so the icons always read upright
      ringFaces[i].style.transform = `rotateY(${-total}deg)`;
    });
  }

  const IDLE_DEG = 360 / (16 * 60); // one lap every ~16s at 60fps

  if (!prefersReducedMotion) {
    gsap.ticker.add(() => {
      if (!engaged) ring.angle += IDLE_DEG;
      drawRing();
    });
  }
  drawRing();

  // swing station i to the front along the shortest arc
  let lastTarget = null;
  function targetStation(i) {
    engaged = true;
    if (i === lastTarget) return; // already headed there
    lastTarget = i;
    const target = -stations[i];
    const delta = ((((target - ring.angle) % 360) + 540) % 360) - 180;
    gsap.to(ring, {
      angle: ring.angle + delta,
      duration: prefersReducedMotion ? 0 : 0.8,
      ease: "power3.out",
      overwrite: "auto",
      onUpdate: drawRing,
    });
  }

  // Track the MOUSE POSITION, not the cards. Targeting cards created a
  // feedback loop: the rotation slid cards under the pointer, refiring
  // mouseenter, retargeting, and spinning the ring wildly. Mapping the
  // pointer's x across the carousel to a station is deterministic — the
  // same mouse spot always means the same icon, so nothing can loop.
  socialCarousel.addEventListener("mousemove", (e) => {
    const r = socialCarousel.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    // left third, centre third, right third of the area
    const i =
      nx < -1 / 6
        ? 2 // the station that swings in from the left
        : nx > 1 / 6
          ? 1 // and from the right
          : 0;
    targetStation(i);
  });

  ringCards.forEach((card, i) => {
    card.addEventListener("focusin", () => targetStation(i)); // keyboard
  });

  socialCarousel.addEventListener("mouseleave", () => {
    engaged = false; // the idle spin resumes from wherever we are
    lastTarget = null;
  });
}

/* --- sunbeams behind the contact form --- */
const contactSection = document.getElementById("contact-us");
const submitBtn = document.querySelector('#contact-form button[type="submit"]');

if (contactSection && submitBtn) {
  const sunOn = () => contactSection.classList.add("sun-on");
  const sunOff = () => contactSection.classList.remove("sun-on");
  submitBtn.addEventListener("mouseenter", sunOn);
  submitBtn.addEventListener("mouseleave", sunOff);
  submitBtn.addEventListener("focus", sunOn);
  submitBtn.addEventListener("blur", sunOff);
}

/* ===================== */
/* CONTACT FORM          */
/* ===================== */
// phone: format North American numbers as you type so the field never
// reads as one long digit string
const phoneInput = document.getElementById("phone");

if (phoneInput) {
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    // leading 1 is treated as the country code
    const cc = digits.length === 11 && digits[0] === "1";
    const d = cc ? digits.slice(1) : digits;
    const prefix = cc ? "+1 " : "";

    if (d.length <= 3) return prefix + d;
    if (d.length <= 6) return `${prefix}(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `${prefix}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  };

  phoneInput.addEventListener("input", () => {
    // don't fight the user while they're deleting
    const atEnd =
      phoneInput.selectionStart === phoneInput.value.length;
    const formatted = formatPhone(phoneInput.value);
    phoneInput.value = formatted;
    if (atEnd) {
      phoneInput.setSelectionRange(formatted.length, formatted.length);
    }
  });

  // accepts (513) 399-4566 and +1 (513) 399-4566
  phoneInput.setAttribute(
    "pattern",
    "^(\\+1 )?\\(\\d{3}\\) \\d{3}-\\d{4}$",
  );
  phoneInput.setAttribute("title", "Format: (513) 399-4566");

  phoneInput.addEventListener("blur", () => {
    const digits = phoneInput.value.replace(/\D/g, "");
    // a partial number is worse than none — flag it rather than submit it
    phoneInput.setCustomValidity(
      phoneInput.value && digits.length < 10
        ? "Please enter a complete 10-digit phone number."
        : "",
    );
  });
}

// live character counter on the message field
const messageField = document.getElementById("message");
const charUsed = document.getElementById("char-used");

if (messageField && charUsed) {
  const LIMIT = 500;
  const counter = charUsed.parentElement;

  const updateCount = () => {
    const n = messageField.value.length;
    charUsed.textContent = String(n);
    counter.classList.toggle("is-near", n >= LIMIT * 0.8 && n < LIMIT);
    counter.classList.toggle("is-full", n >= LIMIT);
  };

  messageField.addEventListener("input", updateCount);
  updateCount();
}

/* ===================== */
/* CUSTOM SELECT         */
/* ===================== */
// Progressive enhancement: the native <select> stays in the form as the
// real control (and the no-JS fallback); this builds an animatable
// listbox on top of it and keeps the two in sync.
function enhanceSelect(select) {
  const shell = document.createElement("div");
  shell.className = "select-shell";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  // the <label> points at the now-hidden native select, so carry its
  // text over as the trigger's accessible name
  const nativeLabel = document.querySelector(`label[for="${select.id}"]`);
  if (nativeLabel) trigger.setAttribute("aria-label", nativeLabel.textContent);

  const label = document.createElement("span");
  const caret = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  caret.setAttribute("class", "select-caret");
  caret.setAttribute("viewBox", "0 0 24 24");
  caret.setAttribute("aria-hidden", "true");
  const caretPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  caretPath.setAttribute("points", "5 9 12 16 19 9");
  caret.appendChild(caretPath);
  trigger.append(label, caret);

  const menu = document.createElement("ul");
  menu.className = "select-menu";
  menu.setAttribute("role", "listbox");

  const options = [...select.options];
  const items = options.map((opt, i) => {
    const li = document.createElement("li");
    li.className = "select-option";
    li.setAttribute("role", "option");
    li.textContent = opt.textContent;
    li.dataset.index = String(i);
    // the disabled prompt option isn't selectable, it's the placeholder
    if (opt.disabled) li.hidden = true;
    menu.appendChild(li);
    return li;
  });

  select.parentNode.insertBefore(shell, select);
  shell.append(trigger, menu);
  select.classList.add("js-enhanced");
  shell.after(select);

  let activeIndex = select.selectedIndex;

  function syncLabel() {
    const opt = select.options[select.selectedIndex];
    label.textContent = opt ? opt.textContent : "";
    trigger.classList.toggle("is-placeholder", !!opt && opt.disabled);
    items.forEach((li, i) =>
      li.setAttribute("aria-selected", String(i === select.selectedIndex)),
    );
  }

  function setActive(i) {
    activeIndex = i;
    items.forEach((li, idx) => li.classList.toggle("active", idx === i));
  }

  function openMenu() {
    menu.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    setActive(select.selectedIndex);
  }

  function closeMenu() {
    menu.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function choose(i) {
    if (select.options[i].disabled) return;
    select.selectedIndex = i;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    syncLabel();
    closeMenu();
    trigger.focus();
  }

  trigger.addEventListener("click", () => {
    menu.classList.contains("open") ? closeMenu() : openMenu();
  });

  items.forEach((li, i) => {
    li.addEventListener("click", () => choose(i));
    li.addEventListener("mouseenter", () => setActive(i));
  });

  // keyboard: arrows move, Enter/Space commit, Escape closes
  trigger.addEventListener("keydown", (e) => {
    const isOpen = menu.classList.contains("open");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) return openMenu();
      let next = activeIndex;
      do {
        next += e.key === "ArrowDown" ? 1 : -1;
      } while (select.options[next] && select.options[next].disabled);
      if (select.options[next]) setActive(next);
    } else if (e.key === "Enter" || e.key === " ") {
      if (isOpen) {
        e.preventDefault();
        choose(activeIndex);
      }
    } else if (e.key === "Escape" && isOpen) {
      closeMenu();
    }
  });

  document.addEventListener("click", (e) => {
    if (!shell.contains(e.target)) closeMenu();
  });

  syncLabel();
}

document.querySelectorAll("#contact-form select").forEach(enhanceSelect);

