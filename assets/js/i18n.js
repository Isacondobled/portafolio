(function () {
  var STORAGE_KEY = "portafolio-lang";

  var I18N = {
    lang: "es",

    init: function () {
      var stored = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        stored = null;
      }
      this.lang = stored === "en" ? "en" : "es";
      this.apply(document);
    },

    t: function (es, en) {
      return this.lang === "en" ? en : es;
    },

    apply: function (root) {
      var scope = root || document;
      var lang = this.lang;

      scope.querySelectorAll("[data-es]").forEach(function (el) {
        var value = el.getAttribute("data-" + lang);
        if (value !== null) el.textContent = value;
      });

      scope.querySelectorAll("[data-es-html]").forEach(function (el) {
        var value = el.getAttribute("data-" + lang + "-html");
        if (value !== null) el.innerHTML = value;
      });

      scope.querySelectorAll("[data-es-placeholder]").forEach(function (el) {
        var value = el.getAttribute("data-" + lang + "-placeholder");
        if (value !== null) el.setAttribute("placeholder", value);
      });

      scope.querySelectorAll("[data-es-aria-label]").forEach(function (el) {
        var value = el.getAttribute("data-" + lang + "-aria-label");
        if (value !== null) el.setAttribute("aria-label", value);
      });

      scope.querySelectorAll("[data-es-title]").forEach(function (el) {
        var value = el.getAttribute("data-" + lang + "-title");
        if (value !== null) el.setAttribute("title", value);
      });

      document.documentElement.setAttribute("lang", lang);

      document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang-btn") === lang));
      });

      window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang: lang } }));
    },

    set: function (lang) {
      if (lang !== "es" && lang !== "en") return;
      if (this.lang === lang) return;
      this.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (error) {
        void error;
      }
      this.apply(document);
    }
  };

  window.I18N = I18N;
  I18N.init();
})();
