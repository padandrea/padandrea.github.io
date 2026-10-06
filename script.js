const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const tabs = [...document.querySelectorAll(".tab")];
const sections = [...document.querySelectorAll("main section")];

const savedTheme = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "dark" || (!savedTheme && systemDark)) {
  root.dataset.theme = "dark";
}

function updateThemeColor() {
  const color = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", color);
}

updateThemeColor();

toggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
  updateThemeColor();
});

const observer = new IntersectionObserver(
  entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    tabs.forEach(tab => {
      tab.classList.toggle("active", tab.getAttribute("href") === "#" + visible.target.id);
    });
  },
  {
    rootMargin: "-20% 0px -55% 0px",
    threshold: [0.05, 0.25, 0.5]
  }
);

sections.forEach(section => observer.observe(section));
