const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const mainNav = document.querySelector(".main-nav");
const navIndicator = document.querySelector(".nav-indicator");
const portraitRing = document.querySelector(".portrait-ring");
const navItems = [...document.querySelectorAll(".main-nav a")];
const sections = [...document.querySelectorAll("main section")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
  root.dataset.theme = "dark";
} else {
  root.dataset.theme = "light";
}

function syncThemeColor() {
  const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", bg);
}

syncThemeColor();

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  syncThemeColor();
});

let activeNav = navItems.find(link => link.classList.contains("active")) || navItems[0];

function moveNavIndicator(link, instant = false) {
  if (!link || !mainNav || !navIndicator) return;

  if (instant) navIndicator.style.transition = "none";

  mainNav.style.setProperty("--indicator-x", `${link.offsetLeft}px`);
  mainNav.style.setProperty("--indicator-width", `${link.offsetWidth}px`);

  if (instant) {
    requestAnimationFrame(() => {
      navIndicator.style.transition = "";
    });
  }
}

function setActiveNav(link) {
  if (!link) return;
  activeNav = link;

  navItems.forEach(item => {
    item.classList.toggle("active", item === link);
  });

  moveNavIndicator(link);
}

navItems.forEach(link => {
  link.addEventListener("mouseenter", () => moveNavIndicator(link));
  link.addEventListener("focus", () => moveNavIndicator(link));
  link.addEventListener("click", () => {
    activeNav = link;
    moveNavIndicator(link);
  });
});

mainNav.addEventListener("mouseleave", () => moveNavIndicator(activeNav));
mainNav.addEventListener("focusout", event => {
  if (!mainNav.contains(event.relatedTarget)) moveNavIndicator(activeNav);
});

const sectionObserver = new IntersectionObserver(
  entries => {
    const active = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!active) return;

    const matchingLink = navItems.find(
      link => link.getAttribute("href") === "#" + active.target.id
    );

    setActiveNav(matchingLink);
  },
  {
    rootMargin: "-22% 0px -58% 0px",
    threshold: [0.05, 0.2, 0.5]
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

  sections.forEach(section => revealObserver.observe(section));
} else {
  sections.forEach(section => section.classList.add("revealed"));
}

let scrollTicking = false;

function updatePortraitParallax() {
  const shift = Math.min(window.scrollY * 0.10, 30);
  const scale = 1 - Math.min(window.scrollY / 12000, 0.014);

  root.style.setProperty("--portrait-shift", `${-shift}px`);
  root.style.setProperty("--portrait-scale", scale.toFixed(4));
  scrollTicking = false;
}

function requestPortraitUpdate() {
  if (reduceMotion.matches || scrollTicking || !portraitRing) return;
  scrollTicking = true;
  requestAnimationFrame(updatePortraitParallax);
}

window.addEventListener("scroll", requestPortraitUpdate, { passive: true });
window.addEventListener("resize", () => {
  moveNavIndicator(activeNav, true);
  requestPortraitUpdate();
});

reduceMotion.addEventListener("change", event => {
  if (event.matches) {
    root.style.setProperty("--portrait-shift", "0px");
    root.style.setProperty("--portrait-scale", "1");
  } else {
    requestPortraitUpdate();
  }
});

const currentYear = document.getElementById("current-year");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

requestAnimationFrame(() => {
  moveNavIndicator(activeNav, true);
  requestPortraitUpdate();
});
