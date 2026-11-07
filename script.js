const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const dockLinks = [...document.querySelectorAll(".dock-link")];
const sections = [...document.querySelectorAll("main .section")];
const revealTargets = [...document.querySelectorAll(".reveal-target")];
const interactiveCards = [...document.querySelectorAll(".interactive-card")];
const heroArt = document.querySelector(".hero-art");
const floatingDock = document.querySelector(".floating-dock");
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

// SVG displacement on live backdrops works in Chromium; Safari/WebKit and
// Firefox use the layered CSS lens instead, without a broken SVG filter.
const chromiumEngine = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent);
const svgBackdropSupported = typeof CSS !== "undefined"
  && CSS.supports("backdrop-filter", "url('#dock-refraction')");
if (floatingDock && chromiumEngine && svgBackdropSupported) {
  floatingDock.classList.add("has-liquid-refraction");
}

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

  if (!reduceMotion.matches && heroArt) {
    // Finish the full 0%-100% panorama while the hero is still on screen.
    // Including the hero's page offset also accommodates compact layouts.
    const heroRect = heroArt.getBoundingClientRect();
    const heroTop = heroRect.top + window.scrollY;
    const panEndScroll = Math.max(1, heroTop + heroRect.height * 0.55);
    const panProgress = Math.min(Math.max(window.scrollY / panEndScroll, 0), 1);
    const heroX = 100 * panProgress;
    const heroShift = 8 * panProgress;
    const heroScale = 1 + (0.010 * panProgress);

    root.style.setProperty("--hero-x", `${heroX.toFixed(2)}%`);
    root.style.setProperty("--hero-y", `${heroShift.toFixed(2)}px`);
    root.style.setProperty("--hero-scale", heroScale.toFixed(4));
  }

  ticking = false;
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateScrollEffects);
}

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);

function resetHeroMotion() {
  root.style.setProperty("--hero-x", "50%");
  root.style.setProperty("--hero-y", "0px");
  root.style.setProperty("--hero-scale", "1");
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

requestAnimationFrame(updateScrollEffects);
