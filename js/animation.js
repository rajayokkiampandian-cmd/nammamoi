/* ==========================================================================
   NAMMAMOI — animation.js
   IntersectionObserver-driven reveals, animated counters, kolam-divider
   draw-in, and a light parallax on the hero temple silhouette.
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- GENERIC SCROLL REVEAL ---------- */
  var revealTargets = document.querySelectorAll('[data-reveal], [data-reveal-group], .kolam-divider');
  if (reduceMotion) {
    revealTargets.forEach(function (el) { el.classList.add('in-view'); });
  } else if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
    revealTargets.forEach(function (el) { revealObserver.observe(el); });

    // Apply staggered delay to grouped children
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--d', i);
      });
    });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------- ANIMATED COUNTERS (hero stats) ---------- */
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var start = null;

    if (reduceMotion || isNaN(target)) {
      el.textContent = target + suffix;
      return;
    }

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      var value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('en-IN') + suffix;
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { counterObserver.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------- LIGHT PARALLAX (hero temple silhouette + kolam bg) ---------- */
  if (!reduceMotion) {
    var parallaxEls = document.querySelectorAll('[data-parallax]');
    if (parallaxEls.length) {
      var ticking = false;
      var updateParallax = function () {
        var y = window.scrollY;
        parallaxEls.forEach(function (el) {
          var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
          el.style.transform = 'translateY(' + (y * speed) + 'px)';
        });
        ticking = false;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { window.requestAnimationFrame(updateParallax); ticking = true; }
      }, { passive: true });
    }
  }

})();
