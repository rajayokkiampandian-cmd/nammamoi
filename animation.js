/* =========================================================================
   NammaMoi — animation.js
   IntersectionObserver-driven reveals, sticky header, back-to-top,
   scroll counters, parallax, and the timeline thread draw-in.
   ========================================================================= */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     1. Page loader
     --------------------------------------------------------------------- */
  window.addEventListener("load", () => {
    const loader = document.querySelector(".page-loader");
    if (loader) {
      setTimeout(() => loader.classList.add("is-hidden"), 250);
    }
  });

  /* ---------------------------------------------------------------------
     2. Sticky header on scroll
     --------------------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  const backToTop = document.querySelector(".back-to-top");

  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (backToTop) backToTop.classList.toggle("is-visible", y > 600);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------------------
     3. Scroll reveal via IntersectionObserver
     --------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-revealed"));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.18, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach((el) => revealObserver.observe(el));
    }
  }

  /* ---------------------------------------------------------------------
     4. Animated counters (hero stats)
     --------------------------------------------------------------------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const animateCount = (el) => {
      const target = parseFloat(el.getAttribute("data-count"));
      const suffix = el.getAttribute("data-suffix") || "";
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(eased * target);
        el.textContent = value.toLocaleString("en-IN") + suffix;
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = target.toLocaleString("en-IN") + suffix;
          el.classList.add("counted");
        }
      }
      if (prefersReducedMotion) {
        el.textContent = target.toLocaleString("en-IN") + suffix;
      } else {
        requestAnimationFrame(tick);
      }
    };

    if ("IntersectionObserver" in window) {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => countObserver.observe(el));
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ---------------------------------------------------------------------
     5. Timeline thread draw-in
     --------------------------------------------------------------------- */
  const thread = document.querySelector(".timeline-thread");
  if (thread) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      thread.classList.add("is-drawn");
    } else {
      const threadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              thread.classList.add("is-drawn");
              threadObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      threadObserver.observe(thread);
    }
  }

  /* ---------------------------------------------------------------------
     6. Gentle parallax on hero temple silhouette + lamps
     --------------------------------------------------------------------- */
  const parallaxEls = document.querySelectorAll(".parallax-layer");
  if (parallaxEls.length && !prefersReducedMotion) {
    let ticking = false;
    document.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const y = window.scrollY;
            parallaxEls.forEach((el) => {
              const speed = parseFloat(el.getAttribute("data-speed") || "0.08");
              el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
            });
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }
})();
