const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

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
const services = document.getElementById("services");
const tiers = services.querySelectorAll(".tier-stair");
const tierHoverable = window.matchMedia(
  "(hover: hover) and (min-width: 701px)",
);

tiers.forEach((tier) => {
  tier.addEventListener("mouseenter", () => {
    if (!tierHoverable.matches) return;
    services.dataset.expanded = tier.dataset.tier;
    tiers.forEach((t) => t.classList.toggle("is-open", t === tier));
  });
});

services.addEventListener("mouseleave", () => {
  delete services.dataset.expanded;
  tiers.forEach((t) => t.classList.remove("is-open"));
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

      const rect = roadmap.getBoundingClientRect();
      // the trail only starts once the map is properly on screen
      // (section top reaches 55% of the viewport) and finishes about
      // three-quarters of a screen of scrolling later
      const progress = Math.min(
        Math.max((vh * 0.55 - rect.top) / (vh * 0.75), 0),
        1,
      );
      updateRoadmap(progress);
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}
