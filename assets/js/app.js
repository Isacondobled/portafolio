(function () {
  var THEME_KEY = "portafolio-theme";

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      void error;
    }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      var label = theme === "dark"
        ? window.I18N.t("Cambiar a tema claro", "Switch to light theme")
        : window.I18N.t("Cambiar a tema oscuro", "Switch to dark theme");
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  }

  function initTheme() {
    var stored = getStoredTheme();
    var theme = stored;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    setTheme(theme);
  }

  function initHeader() {
    var header = document.querySelector(".site-header");
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    var menuBtn = document.querySelector("[data-menu-toggle]");
    var mobileNav = document.querySelector("[data-mobile-nav]");
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener("click", function () {
        var open = mobileNav.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("no-scroll", open);
      });
      mobileNav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          mobileNav.classList.remove("is-open");
          menuBtn.setAttribute("aria-expanded", "false");
          document.body.classList.remove("no-scroll");
        });
      });
    }

    var current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a, .mobile-nav a").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href === current || (current === "index.html" && href === "./")) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function initThemeButtons() {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "dark" ? "light" : "dark");
      });
    });
  }

  function initLangButtons() {
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.I18N.set(btn.getAttribute("data-lang-btn"));
      });
    });
    window.addEventListener("languagechange", function () {
      document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
        var theme = document.documentElement.getAttribute("data-theme");
        var label = theme === "dark"
          ? window.I18N.t("Cambiar a tema claro", "Switch to light theme")
          : window.I18N.t("Cambiar a tema oscuro", "Switch to dark theme");
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
      });
    });
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initCopyEmail() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-copy");
        if (!navigator.clipboard) {
          window.UI.toast(
            window.I18N.t("No disponible", "Not available"),
            window.I18N.t("Copia el correo manualmente.", "Copy the email manually."),
            "warn"
          );
          return;
        }
        navigator.clipboard.writeText(value).then(function () {
          window.UI.toast(
            window.I18N.t("Correo copiado", "Email copied"),
            value,
            "ok"
          );
        });
      });
    });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        var id = link.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", id);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initThemeButtons();
    initLangButtons();
    initHeader();
    initReveal();
    initCopyEmail();
    initYear();
    initSmoothAnchors();
  });

  window.Portfolio = { setTheme: setTheme };
})();
