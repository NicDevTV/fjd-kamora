// Scrolls a passage of the codex into the middle of the screen and briefly highlights it.
// What gets highlighted is the unit a reader takes in: the article card, the table row,
// or, for a whole part, its heading.

// Calls back once scrolling has come to rest: no scroll event for a short pause, or right away
// if nothing scrolls at all.
function whenScrollSettles(callback: () => void) {
  let timer = window.setTimeout(done, 120);
  const giveUp = window.setTimeout(done, 2500);

  function onScroll() {
    window.clearTimeout(timer);
    timer = window.setTimeout(done, 140);
  }

  function done() {
    window.clearTimeout(timer);
    window.clearTimeout(giveUp);
    window.removeEventListener("scroll", onScroll);
    callback();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}

function highlightHost(target: HTMLElement) {
  if (target.tagName === "TR") return target;
  return (
    target.closest<HTMLElement>("[data-article]") ??
    (target.tagName === "SECTION" ? target.querySelector<HTMLElement>("h2") : null) ??
    target
  );
}

export function flashTarget(id: string, { scroll = true, instant = false } = {}) {
  const target = document.getElementById(decodeURIComponent(id));
  if (!target) return;
  const host = highlightHost(target);

  if (scroll) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Centered in the free area below the floating header. A card taller than most of that
    // area starts just below the header instead, so its heading is not cut off.
    const headerBottom = document.querySelector("header .glass-dark")?.getBoundingClientRect().bottom ?? 0;
    const free = window.innerHeight - headerBottom;
    const rect = host.getBoundingClientRect();
    const offset =
      rect.height > free * 0.85
        ? rect.top - headerBottom - 24
        : rect.top + rect.height / 2 - (headerBottom + free / 2);
    window.scrollTo({
      top: window.scrollY + offset,
      behavior: reduced || instant ? "instant" : "smooth",
    });
  }

  // The highlight starts on arrival, so a long smooth scroll does not eat up its bright phase.
  whenScrollSettles(() => {
    // Remove the class, read layout, add it again: this restarts the animation on repeat jumps.
    host.classList.remove("is-flash");
    host.getBoundingClientRect();
    host.classList.add("is-flash");
    window.setTimeout(() => host.classList.remove("is-flash"), 3500);
  });
}
