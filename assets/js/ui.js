(function () {
  var activeModal = null;
  var lastFocused = null;

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value, decimals) {
    var digits = decimals === undefined ? 0 : decimals;
    return Number(value || 0).toLocaleString("es-MX", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function money(value, decimals) {
    var digits = decimals === undefined ? 2 : decimals;
    return "$" + number(value, digits);
  }

  function pct(value) {
    return number(value, 0) + "%";
  }

  function parseDate(value) {
    if (!value) return null;
    var date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
    return isNaN(date.getTime()) ? null : date;
  }

  function dateLabel(value, includeTime) {
    var date = parseDate(value);
    if (!date) return String(value || "—");
    var lang = window.I18N && window.I18N.lang === "en" ? "en-GB" : "es-MX";
    var options = { day: "2-digit", month: "short", year: "numeric" };
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    return date.toLocaleDateString(lang, options).replace(".", "");
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function storageGet(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      void error;
    }
  }

  function toast(title, text, type) {
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }

    var el = document.createElement("div");
    el.className = "toast" + (type ? " is-" + type : "");
    el.innerHTML =
      '<div><span class="toast-title">' + escapeHtml(title) + "</span>" +
      '<span class="toast-text">' + escapeHtml(text) + "</span></div>" +
      '<button class="toast-close" type="button" aria-label="Cerrar">×</button>';

    function remove() {
      if (!el.parentNode) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      window.setTimeout(function () {
        el.remove();
      }, 180);
    }

    el.querySelector(".toast-close").addEventListener("click", remove);
    stack.appendChild(el);
    window.setTimeout(remove, 5200);
  }

  function trapFocus(container, event) {
    if (event.key !== "Tab") return;
    var focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openModal(options) {
    closeModal();
    lastFocused = document.activeElement;
    var layer = document.createElement("div");
    layer.className = "modal-layer";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    if (options.label) layer.setAttribute("aria-label", options.label);

    var box = document.createElement("div");
    box.className = "modal-box" + (options.className ? " " + options.className : "");

    var head = document.createElement("div");
    head.className = "modal-head";
    head.innerHTML =
      "<h3>" + escapeHtml(options.title || "") + "</h3>" +
      '<button class="icon-btn modal-close" type="button" aria-label="' +
      escapeHtml(options.closeLabel || "Cerrar") + '">✕</button>';

    var body = document.createElement("div");
    body.className = "modal-body";
    if (options.bodyHtml !== undefined) body.innerHTML = options.bodyHtml;
    else if (options.bodyNode) body.appendChild(options.bodyNode);

    box.appendChild(head);
    box.appendChild(body);

    if (options.footHtml) {
      var foot = document.createElement("div");
      foot.className = "modal-foot";
      foot.innerHTML = options.footHtml;
      box.appendChild(foot);
    }

    layer.appendChild(box);
    document.body.appendChild(layer);
    document.body.classList.add("no-scroll");
    activeModal = layer;

    layer.addEventListener("mousedown", function (event) {
      if (event.target === layer && options.backdropClose !== false) closeModal();
    });

    layer.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && options.escapeClose !== false) {
        event.preventDefault();
        closeModal();
      } else {
        trapFocus(box, event);
      }
    });

    head.querySelector(".modal-close").addEventListener("click", closeModal);

    if (options.onMount) options.onMount(box);

    var focusTarget = box.querySelector("[autofocus], .modal-close");
    window.setTimeout(function () {
      if (focusTarget) focusTarget.focus();
    }, 20);

    return { layer: layer, box: box, close: closeModal };
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.remove();
    activeModal = null;
    document.body.classList.remove("no-scroll");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var acceptLabel = options.acceptLabel || "Confirmar";
      var cancelLabel = options.cancelLabel || "Cancelar";
      var modal = openModal({
        title: options.title || "Confirmar",
        bodyHtml: "<p class=\"muted\" style=\"margin:0\">" + escapeHtml(options.text || "") + "</p>",
        footHtml:
          '<button class="btn btn-secondary" type="button" data-cancel>' + escapeHtml(cancelLabel) + "</button>" +
          '<button class="btn ' + (options.danger ? "btn-danger" : "") + '" type="button" data-accept>' +
          escapeHtml(acceptLabel) + "</button>",
        onMount: function (box) {
          box.querySelector("[data-cancel]").addEventListener("click", function () {
            closeModal();
            resolve(false);
          });
          box.querySelector("[data-accept]").addEventListener("click", function () {
            closeModal();
            resolve(true);
          });
        }
      });
      modal.layer.addEventListener("click", function (event) {
        if (event.target === modal.layer) resolve(false);
      });
    });
  }

  function downloadBlob(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadCsv(filename, rows) {
    var csv = rows
      .map(function (row) {
        return row
          .map(function (cell) {
            var value = String(cell === null || cell === undefined ? "" : cell);
            return '"' + value.replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\r\n");
    downloadBlob(filename, "\uFEFF" + csv, "text/csv;charset=utf-8");
  }

  function setPressedGroup(container, active) {
    if (!container) return;
    container.querySelectorAll("[aria-pressed]").forEach(function (el) {
      el.setAttribute("aria-pressed", String(el === active));
    });
  }

  function scrollToEl(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.UI = {
    escape: escapeHtml,
    number: number,
    money: money,
    pct: pct,
    date: dateLabel,
    debounce: debounce,
    store: { get: storageGet, set: storageSet, remove: storageRemove },
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmDialog,
    downloadBlob: downloadBlob,
    downloadCsv: downloadCsv,
    setPressedGroup: setPressedGroup,
    scrollTo: scrollToEl
  };
})();
