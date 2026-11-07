// Render a real refracted copy of the document behind the fixed navigation.
// SVG filter on SourceGraphic works in WebKit (unlike SVG backdrop-filter).
// The mirrored scene follows the root CSS scroll timeline on modern Safari.
(() => {
  const dock = document.querySelector(".floating-dock");
  const lens = document.querySelector(".dock-glass-lens");
  const page = document.querySelector("body > .site-shell");
  if (!dock || !lens || !page) return;
  if (matchMedia("(prefers-reduced-transparency: reduce)").matches ||
      matchMedia("(forced-colors: active)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const nativeTimeline = typeof CSS !== "undefined" &&
    CSS.supports("animation-timeline: scroll(root block)");

  // One fixed-size viewport is enough; the page underneath stays the actual
  // site and remains scrollable, selectable and keyboard-accessible.
  const surface = document.createElement("span");
  surface.className = "dock-glass-refracted";
  surface.setAttribute("aria-hidden", "true");
  const scene = document.createElement("div");
  scene.className = "dock-glass-scene";
  if (nativeTimeline) scene.classList.add("use-native-scroll");
  scene.setAttribute("aria-hidden", "true");

  const mirror = page.cloneNode(true);
  mirror.removeAttribute("id");
  mirror.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  mirror.querySelectorAll("a, button, input, select, textarea").forEach(node => {
    node.removeAttribute("href");
    node.setAttribute("tabindex", "-1");
  });
  mirror.inert = true;
  scene.appendChild(mirror);
  surface.appendChild(scene);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  const defs = document.createElementNS(svgNS, "defs");
  const filter = document.createElementNS(svgNS, "filter");
  filter.id = "dock-true-refraction";
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("primitiveUnits", "userSpaceOnUse");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const image = document.createElementNS(svgNS, "feImage");
  image.setAttribute("result", "displacement");
  image.setAttribute("preserveAspectRatio", "none");
  const warp = document.createElementNS(svgNS, "feDisplacementMap");
  warp.setAttribute("in", "SourceGraphic");
  warp.setAttribute("in2", "displacement");
  warp.setAttribute("scale", "35");
  warp.setAttribute("xChannelSelector", "R");
  warp.setAttribute("yChannelSelector", "G");
  filter.append(image, warp);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);

  function makeDisplacementMap(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const pixels = context.createImageData(w, h);
    const a = pixels.data;
    const radius = Math.min(h / 2, w / 2);
    const bx = w / 2 - radius;
    const by = h / 2 - radius;
    const depth = 25;
    for (let y = 0; y < h; y++) {
      const cy = y + .5 - h / 2;
      for (let x = 0; x < w; x++) {
        const cx = x + .5 - w / 2;
        const qx = Math.abs(cx) - bx;
        const qy = Math.abs(cy) - by;
        const outsideX = Math.max(qx, 0);
        const outsideY = Math.max(qy, 0);
        const distance = Math.hypot(outsideX, outsideY) +
          Math.min(Math.max(qx, qy), 0) - radius;
        const near = Math.max(0, Math.min(1, (distance + depth) / depth));
        let nx = 0;
        let ny = 0;
        if (outsideX || outsideY) {
          const norm = Math.hypot(outsideX, outsideY) || 1;
          nx = Math.sign(cx) * outsideX / norm;
          ny = Math.sign(cy) * outsideY / norm;
        } else if (qx > qy) {
          nx = Math.sign(cx);
        } else {
          ny = Math.sign(cy);
        }
        const bend = Math.pow(near, 1.8) * .49;
        const i = (y * w + x) * 4;
        a[i] = Math.round(128 - nx * bend * 255);
        a[i + 1] = Math.round(128 - ny * bend * 255);
        a[i + 2] = 128;
        a[i + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  }

  let lastWidth = 0;
  let lastHeight = 0;
  function layout() {
    const r = dock.getBoundingClientRect();
    const width = Math.max(1, Math.round(r.width));
    const height = Math.max(1, Math.round(r.height));
    const scroller = document.scrollingElement || document.documentElement;
    scene.style.width = `${document.documentElement.clientWidth}px`;
    scene.style.height = `${scroller.scrollHeight}px`;
    scene.style.setProperty("--lens-left", `${r.left.toFixed(2)}px`);
    scene.style.setProperty("--lens-top", `${r.top.toFixed(2)}px`);
    scene.style.setProperty("--lens-max-scroll",
      `${Math.max(0, scroller.scrollHeight - scroller.clientHeight)}px`);

    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width;
      lastHeight = height;
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      filter.setAttribute("width", String(width));
      filter.setAttribute("height", String(height));
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      image.setAttribute("width", String(width));
      image.setAttribute("height", String(height));
      const url = makeDisplacementMap(width, height);
      if (url) {
        image.setAttribute("href", url);
        image.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      }
    }
  }

  // Activate the optical layer only after the texture and geometry are ready.
  lens.appendChild(surface);
  layout();
  // If canvas/SVG image creation fails, retain the standard CSS glass fallback.
  if (image.hasAttribute("href")) lens.classList.add("is-refracting");
  if (!nativeTimeline) {
    // Preserve the correct backdrop even when the page opens at #research.
    const syncFallback = () => {
      const x = parseFloat(scene.style.getPropertyValue("--lens-left")) || 0;
      const y = parseFloat(scene.style.getPropertyValue("--lens-top")) || 0;
      scene.style.transform = `translate3d(${-x}px, ${-y - window.scrollY}px, 0)`;
    };
    syncFallback();
    let pending = false;
    window.addEventListener("scroll", () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        scene.style.transform = `translate3d(${-parseFloat(scene.style.getPropertyValue("--lens-left"))}px, ${-parseFloat(scene.style.getPropertyValue("--lens-top")) - window.scrollY}px, 0)`;
        pending = false;
      });
    }, { passive: true });
  }
  let geometryPending = false;
  function scheduleLayout() {
    if (geometryPending) return;
    geometryPending = true;
    requestAnimationFrame(() => {
      geometryPending = false;
      layout();
    });
  }
  window.addEventListener("resize", scheduleLayout, { passive: true });
  window.addEventListener("load", scheduleLayout, { once: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleLayout, { passive: true });
  }
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(dock);
    observer.observe(page);
  }
})();
