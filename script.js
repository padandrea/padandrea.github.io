const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const dockLinks = [...document.querySelectorAll(".dock-link")];
const sections = [...document.querySelectorAll("main .section")];
const revealTargets = [...document.querySelectorAll(".reveal-target")];
const interactiveCards = [...document.querySelectorAll(".interactive-card")];
const scrollProgress = document.querySelector(".scroll-progress span");
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

function setActiveDock(sectionId) {
  dockLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + sectionId);
  });
}

dockLinks.forEach(link => {
  link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    setActiveDock(id);
  });
});

const sectionObserver = new IntersectionObserver(
  entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) setActiveDock(visible.target.id);
  },
  {
    rootMargin: "-18% 0px -58% 0px",
    threshold: [0.05, 0.2, 0.45]
  }
);

sections.forEach(section => sectionObserver.observe(section));

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

let ticking = false;

function updateScrollEffects() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  scrollProgress.style.transform = `scaleX(${progress})`;

  if (!reduceMotion.matches) {
    const heroShift = Math.min(window.scrollY * 0.035, 18);
    const heroScale = 1 + Math.min(window.scrollY / 18000, 0.018);
    root.style.setProperty("--hero-y", `${heroShift}px`);
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

reduceMotion.addEventListener("change", event => {
  if (event.matches) {
    root.style.setProperty("--hero-y", "0px");
    root.style.setProperty("--hero-scale", "1");
  }
  requestScrollUpdate();
});

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

requestAnimationFrame(updateScrollEffects);
