/* =========================================================================
   NammaMoi — main.js
   Site-wide interactivity: mobile navigation, FAQ accordion, device-tab
   switcher, smooth-scroll anchors, and the contact form handler.
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     1. Mobile navigation toggle
     --------------------------------------------------------------------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        navToggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------------
     2. Smooth scroll for same-page anchor links
     --------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 84;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ---------------------------------------------------------------------
     3. FAQ accordion
     --------------------------------------------------------------------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const isOpen = item.getAttribute("data-open") === "true";
      // Close siblings for a single-open accordion within the same list
      const list = item.closest("[data-faq-list]");
      if (list) {
        list.querySelectorAll(".faq-item").forEach((sib) => {
          if (sib !== item) {
            sib.setAttribute("data-open", "false");
            sib.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          }
        });
      }
      item.setAttribute("data-open", String(!isOpen));
      question.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  /* ---------------------------------------------------------------------
     4. Device mockup tabs (Section 6 — Dashboard preview)
     --------------------------------------------------------------------- */
  const deviceTabs = document.querySelectorAll("[data-device-tab]");
  const deviceFrames = document.querySelectorAll("[data-device-frame]");
  deviceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-device-tab");
      deviceTabs.forEach((t) => t.classList.toggle("active", t === tab));
      deviceTabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      deviceFrames.forEach((f) =>
        f.classList.toggle("active", f.getAttribute("data-device-frame") === target)
      );
    });
  });

  /* ---------------------------------------------------------------------
     5. Contact form submission (uses NammaMoiAPI from app.js)
     --------------------------------------------------------------------- */
  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = contactForm.querySelector(".form-status");
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const formData = new FormData(contactForm);
      const fields = Object.fromEntries(formData.entries());

      if (!fields.name || !fields.email || !fields.message) {
        if (statusEl) {
          statusEl.textContent = "தயவுசெய்து அனைத்து தேவையான புலங்களையும் நிரப்பவும் (please fill all required fields).";
          statusEl.className = "form-status error";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "அனுப்புகிறது...";
      }

      const result = await window.NammaMoiAPI.sendContactMessage(fields);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "செய்தி அனுப்பு";
      }

      if (statusEl) {
        if (result.ok) {
          statusEl.textContent = "நன்றி! உங்கள் செய்தி பெறப்பட்டது. விரைவில் தொடர்பு கொள்கிறோம்.";
          statusEl.className = "form-status success";
          contactForm.reset();
        } else {
          statusEl.textContent =
            "தற்போது இணைப்பு கட்டமைக்கப்படவில்லை. உங்கள் Apps Script URL-ஐ js/app.js இல் சேர்க்கவும்.";
          statusEl.className = "form-status error";
        }
      }
    });
  }

  /* ---------------------------------------------------------------------
     6. Current-year footer stamp
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------------------------------------------------------------
     7. Set aria-current on nav link matching current page
     --------------------------------------------------------------------- */
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });
})();
