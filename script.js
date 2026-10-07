const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const portrait = document.querySelector(".portrait");
const navItems = [...document.querySelectorAll(".main-nav a")];
const sections = [...document.querySelectorAll("main section")];

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
  root.dataset.theme = "dark";
}

function syncThemeColor() {
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", bg);
}

function syncThemeAssets() {
  const isDark = root.dataset.theme === "dark";
  const nextSrc = isDark ? portrait.dataset.darkSrc : portrait.dataset.lightSrc;

  if (nextSrc && portrait.getAttribute("src") !== nextSrc) {
    portrait.src = nextSrc;
  }
}

syncThemeColor();
syncThemeAssets();

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  syncThemeColor();
  syncThemeAssets();
});

const observer = new IntersectionObserver(
  entries => {
    const active = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;

    navItems.forEach(link => {
      const selected = link.getAttribute("href") === "#" + active.target.id;
      link.classList.toggle("active", selected);
      link.classList.toggle("nav-pill", selected);
      link.classList.toggle("nav-link", !selected);
    });
  },
  {
    rootMargin: "-22% 0px -58% 0px",
    threshold: [0.05, 0.2, 0.5]
  }
);

sections.forEach(section => observer.observe(section));
