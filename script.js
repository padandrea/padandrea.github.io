const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const dockLinks = [...document.querySelectorAll(".dock-link")];
const sections = [...document.querySelectorAll("main .section")];
const revealTargets = [...document.querySelectorAll(".reveal-target")];
const interactiveCards = [...document.querySelectorAll(".interactive-card")];
const heroArt = document.querySelector(".hero-art");

// Resolve panorama geometry only on load and resize. Scroll updates a transform,
// avoiding expensive repaints from changing CSS background-position.
let heroImageAspect = 0;
let heroPan = { endScroll: 1, travel: 0 };

function measureHeroPan() {
  if (!heroArt) return;
  const rect = heroArt.getBoundingClientRect();
  const viewportWidth = rect.width + 36;
  const imageWidth = Math.max(viewportWidth, heroImageAspect * (rect.height + 36));
  heroPan = {
    endScroll: Math.max(1, rect.top + window.scrollY + rect.height * 0.55),
    travel: Math.max(0, imageWidth - viewportWidth)
  };
  root.style.setProperty("--hero-image-width", `${imageWidth.toFixed(1)}px`);
  root.style.setProperty("--hero-start-offset", `${Math.min(65, heroPan.travel * .25).toFixed(1)}px`);
  root.style.setProperty("--hero-travel", `${heroPan.travel.toFixed(1)}px`);
  root.style.setProperty("--hero-pan-end", `${heroPan.endScroll.toFixed(1)}px`);
}

if (heroArt) {
  const panorama = new Image();
  panorama.addEventListener("load", () => {
    heroImageAspect = panorama.naturalWidth / panorama.naturalHeight;
    measureHeroPan();
    requestScrollUpdate();
  });
  panorama.src = "assets/images/theme/hero_light.png";
}
const floatingDock = document.querySelector(".floating-dock");
const cssScrollMotion = window.CSS && CSS.supports("animation-timeline: scroll(root block)")
  && CSS.supports("animation-range: 0px 300px");
root.dataset.scrollTimeline = cssScrollMotion ? "native" : "fallback";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

const savedTheme = localStorage.getItem("theme");
root.dataset.theme = savedTheme || (systemTheme.matches ? "dark" : "light");

function syncThemeUI() {
  const dark = root.dataset.theme === "dark";
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();

  document.querySelector('meta[name="theme-color"]').setAttribute("content", bg);
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

syncThemeUI();

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  syncThemeUI();
});

systemTheme.addEventListener("change", event => {
  if (localStorage.getItem("theme")) return;
  root.dataset.theme = event.matches ? "dark" : "light";
  syncThemeUI();
});

let activeDockId = null;

function setActiveDock(sectionId) {
  if (sectionId === activeDockId) return;
  activeDockId = sectionId;

  dockLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + sectionId);
  });
}

// Use one fixed viewport reference for every section, rather than comparing
// individual IntersectionObserver entry batches (which can arrive out of order).
function updateActiveDock() {
  const activationY = window.innerHeight * 0.42;
  let activeSection = sections[0];

  for (const section of sections) {
    if (section.getBoundingClientRect().top > activationY) break;
    activeSection = section;
  }

  if (activeSection) setActiveDock(activeSection.id);
}

if (!reduceMotion.matches) {
  root.classList.add("motion-ready");

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08
    }
  );

  revealTargets.forEach(target => revealObserver.observe(target));
} else {
  revealTargets.forEach(target => target.classList.add("revealed"));
}

interactiveCards.forEach(card => {
  card.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;

    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
});

// The dock's reflections follow a precise pointer, without moving the dock or
// its links. The inactive state stays still for touch and reduced-motion users.
if (floatingDock) {
  floatingDock.addEventListener("pointermove", event => {
    if (reduceMotion.matches || event.pointerType !== "mouse") return;

    const rect = floatingDock.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));

    floatingDock.style.setProperty("--dock-shine-x", `${x.toFixed(1)}%`);
    floatingDock.style.setProperty("--dock-shine-y", `${y.toFixed(1)}%`);
  });

  floatingDock.addEventListener("pointerleave", () => {
    floatingDock.style.removeProperty("--dock-shine-x");
    floatingDock.style.removeProperty("--dock-shine-y");
  });
}

let ticking = false;

function updateScrollEffects() {
  updateActiveDock();
  // Modern Safari and Chromium animate the panorama on their compositor thread.
  // Only older browsers use this JavaScript transform fallback.
  if (!cssScrollMotion && !reduceMotion.matches && heroArt) {
    const progress = Math.min(Math.max(window.scrollY / heroPan.endScroll, 0), 1);
    const eased = progress * progress * (3 - 2 * progress);
    const start = Math.min(65, heroPan.travel * .25);
    heroArt.style.setProperty("--hero-pan-x", `${(start - (heroPan.travel + start) * eased).toFixed(2)}px`);
  }
  ticking = false;
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollEffects);
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", () => {
  measureHeroPan();
  requestScrollUpdate();
});
window.addEventListener("load", () => {
  measureHeroPan();
  requestScrollUpdate();
});

function resetHeroMotion() {
  if (heroArt) heroArt.style.removeProperty("--hero-pan-x");
}

if (reduceMotion.matches) resetHeroMotion();

reduceMotion.addEventListener("change", event => {
  if (event.matches) resetHeroMotion();
  requestScrollUpdate();
});

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

measureHeroPan();
requestAnimationFrame(updateScrollEffects);
