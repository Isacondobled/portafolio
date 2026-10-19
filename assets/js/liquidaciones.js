(function () {
  var data = window.MOCK.liquidaciones;
  var initialOperators = JSON.parse(JSON.stringify(data.operators));
  var initialActivity = data.activity.slice();

  var state = {
    period: data.periods[0].id,
    query: "",
    status: "all",
    selected: {},
    operators: JSON.parse(JSON.stringify(initialOperators)),
    activity: initialActivity.slice()
  };

  function t(es, en) {
    return window.I18N.t(es, en);
  }

  function escape(value) {
    return window.UI.escape(value);
  }

  function signedMoney(value) {
    var number = Number(value || 0);
    return (number < 0 ? "-" : "") + window.UI.money(Math.abs(number));
  }

  function period() {
    return data.periods.filter(function (item) {
      return item.id === state.period;
    })[0] || data.periods[0];
  }

  function totalOf(operator) {
    var other = operator.other.reduce(function (sum, item) {
      return sum + item.amount;
    }, 0);
    return operator.perceptions + operator.deductions + operator.advances + operator.expenses + other;
  }

  function statusMeta(status) {
    var map = {
      sent: { es: "Enviado", en: "Sent", cls: "is-sent" },
      pending: { es: "Pendiente", en: "Pending", cls: "is-pending" },
      generated: { es: "PDF generado", en: "PDF generated", cls: "is-generated" },
      error: { es: "Error de envío", en: "Delivery error", cls: "is-error" }
    };
    return map[status] || map.pending;
  }

  function statusPill(status) {
    var meta = statusMeta(status);
    return '<span class="status-pill ' + meta.cls + '">' + escape(t(meta.es, meta.en)) + "</span>";
  }

  function filteredOperators() {
    var q = state.query.trim().toLowerCase();
    return state.operators.filter(function (operator) {
      if (state.status !== "all" && operator.status !== state.status) return false;
      if (!q) return true;
      return (operator.id + " " + operator.name + " " + operator.email).toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderPeriodSelect() {
    var select = document.getElementById("liq-period");
    select.innerHTML = data.periods
      .map(function (item) {
        return '<option value="' + escape(item.id) + '"' + (item.id === state.period ? " selected" : "") + ">" + escape(item.label) + "</option>";
      })
      .join("");
  }

  function renderKpis() {
    var total = state.operators.reduce(function (sum, operator) {
      return sum + totalOf(operator);
    }, 0);
    var sent = state.operators.filter(function (operator) { return operator.status === "sent"; }).length;
    var pending = state.operators.filter(function (operator) {
      return operator.status === "pending" || operator.status === "error" || operator.status === "generated";
    }).length;
    document.getElementById("liq-kpis").innerHTML =
      '<div class="kpi"><span class="num">' + state.operators.length + '</span><span class="label">' + escape(t("Operadores del periodo", "Operators in period")) + "</span></div>" +
      '<div class="kpi k-accent"><span class="num">' + window.UI.money(total, 0) + '</span><span class="label">' + escape(t("Total del periodo", "Period total")) + "</span></div>" +
      '<div class="kpi k-ok"><span class="num">' + sent + '</span><span class="label">' + escape(t("Enviados", "Sent")) + "</span></div>" +
      '<div class="kpi k-warn"><span class="num">' + pending + '</span><span class="label">' + escape(t("Pendientes por enviar", "Pending delivery")) + "</span></div>";
  }

  function renderTable() {
    var rows = filteredOperators();
    document.getElementById("liq-count").textContent = t(
      "Mostrando " + rows.length + " de " + state.operators.length + " operadores.",
      "Showing " + rows.length + " of " + state.operators.length + " operators."
    );

    var tbody = document.getElementById("liq-tbody");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><strong>' + escape(t("Sin resultados", "No results")) + "</strong>" + escape(t("Ajusta la búsqueda o el estatus.", "Adjust the search or status.")) + "</div></td></tr>";
    } else {
      tbody.innerHTML = rows
        .map(function (operator) {
          var total = totalOf(operator);
          var sentLabel = operator.status === "sent" ? t("Reenviar", "Resend") : t("Enviar", "Send");
          return (
            "<tr>" +
            '<td><input class="check-cell" type="checkbox" data-liq-select="' + escape(operator.id) + '"' + (state.selected[operator.id] ? " checked" : "") + "></td>" +
            "<td><strong>" + escape(operator.name) + '</strong><span class="status-sub" style="display:block">' + escape(operator.email) + "</span></td>" +
            '<td class="center">' + operator.trips + "</td>" +
            '<td class="num">' + window.UI.money(operator.perceptions) + "</td>" +
            '<td class="num">' + signedMoney(operator.deductions) + "</td>" +
            '<td class="num">' + signedMoney(operator.advances) + "</td>" +
            '<td class="num">' + window.UI.money(operator.expenses) + "</td>" +
            '<td class="num strong">' + window.UI.money(total) + "</td>" +
            "<td>" + statusPill(operator.status) + "</td>" +
            '<td><div class="row-actions"><button class="link-btn" type="button" data-liq-pdf="' + escape(operator.id) + '">' + escape(t("Ver PDF", "View PDF")) + '</button><button class="link-btn ' + (operator.status === "sent" ? "is-muted" : "") + '" type="button" data-liq-send="' + escape(operator.id) + '">' + escape(sentLabel) + "</button></div></td>" +
            "</tr>"
          );
        })
        .join("");
    }

    var filteredIds = rows.map(function (operator) { return operator.id; });
    var selectedCount = filteredIds.filter(function (id) { return state.selected[id]; }).length;
    var all = document.getElementById("liq-select-all");
    all.checked = filteredIds.length > 0 && selectedCount === filteredIds.length;
    all.indeterminate = selectedCount > 0 && selectedCount < filteredIds.length;
  }

  function renderActivity() {
    document.getElementById("liq-activity").innerHTML = state.activity
      .map(function (item) {
        return '<div class="activity-row"><time>' + escape(item.time) + "</time><span>" + escape(item.text) + "</span></div>";
      })
      .join("");
  }

  function renderEmailPreview() {
    var p = period();
    document.getElementById("liq-email-subject").textContent =
      t("Resúmenes de liquidación ", "Settlement summaries ") + p.label;
    document.getElementById("liq-email-attachment").innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>' +
      "Resumenes_Operadores_" + p.start + "_a_" + p.end + ".zip";
  }

  function render() {
    renderPeriodSelect();
    renderKpis();
    renderTable();
    renderActivity();
    renderEmailPreview();
  }

  function addActivity(text) {
    var now = new Date();
    var time = now.toLocaleTimeString(window.I18N.lang === "en" ? "en-GB" : "es-MX", {
      hour: "2-digit",
      minute: "2-digit"
    });
    state.activity.unshift({ time: time, text: text });
    state.activity = state.activity.slice(0, 12);
  }

  function generateAll() {
    var targets = state.operators.filter(function (operator) {
      return operator.status === "pending" || operator.status === "error";
    });
    if (!targets.length) {
      window.UI.toast(t("Sin pendientes", "Nothing pending"), t("Todos los operadores ya tienen su PDF generado o enviado.", "Every operator already has a generated or sent PDF."), "warn");
      return;
    }
    var button = document.getElementById("liq-generate");
    button.disabled = true;
    window.setTimeout(function () {
      targets.forEach(function (operator) {
        operator.status = "generated";
      });
      addActivity(t(
        targets.length === 1
          ? "Se generó 1 resumen en PDF y el comprimido del periodo."
          : "Se generaron " + targets.length + " resúmenes en PDF y el comprimido del periodo.",
        targets.length === 1
          ? "1 PDF summary and the period archive were generated."
          : targets.length + " PDF summaries and the period archive were generated."
      ));
      render();
      button.disabled = false;
      window.UI.toast(t("PDFs generados", "PDFs generated"), t("El ZIP está listo para enviarse. Todo es simulado.", "The ZIP is ready to send. Everything is simulated."), "ok");
    }, 850);
  }

  function sendBatch(ids) {
    var list = state.operators.filter(function (operator) {
      return ids.indexOf(operator.id) !== -1;
    });
    if (!list.length) {
      window.UI.toast(t("Nada seleccionado", "Nothing selected"), t("Selecciona al menos un operador.", "Select at least one operator."), "warn");
      return;
    }

    list.forEach(function (operator) {
      if (operator.status !== "sent") operator.status = "generated";
    });

    var rowsHtml = list
      .map(function (operator) {
        return '<div class="reparto-trip" data-send-row="' + escape(operator.id) + '"><div><strong>' + escape(operator.name) + '</strong><span style="display:block">' + escape(operator.email) + '</span></div><span class="status-pill is-pending" data-send-status>' + escape(t("En espera", "Waiting")) + "</span></div>";
      })
      .join("");

    var modal = window.UI.openModal({
      title: t("Enviando resúmenes", "Sending summaries"),
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      backdropClose: false,
      escapeClose: false,
      bodyHtml:
        '<p class="muted" style="margin-top:0">' + escape(t("Simulación de envío. No se conecta a ningún servidor de correo.", "Delivery simulation. No email server is contacted.")) + "</p>" +
        '<div class="progress-track"><span class="progress-fill is-ok" id="liq-send-progress" style="width:0%"></span></div>' +
        '<div class="reparto-trips" style="margin-top:14px">' + rowsHtml + "</div>",
      footHtml: '<button class="btn btn-secondary" type="button" data-close-send disabled>' + escape(t("Cerrar", "Close")) + "</button>",
      onMount: function (box) {
        var progress = box.querySelector("#liq-send-progress");
        var close = box.querySelector("[data-close-send]");
        var index = 0;
        close.addEventListener("click", window.UI.closeModal);
        var timer = window.setInterval(function () {
          var operator = list[index];
          var row = box.querySelector('[data-send-row="' + operator.id + '"]');
          var status = row ? row.querySelector("[data-send-status]") : null;
          operator.status = "sent";
          operator.sentAt = new Date().toLocaleString(window.I18N.lang === "en" ? "en-GB" : "es-MX", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
          if (status) {
            status.className = "status-pill is-sent";
            status.textContent = t("Enviado", "Sent");
          }
          index += 1;
          progress.style.width = Math.round((index / list.length) * 100) + "%";
          if (index >= list.length) {
            window.clearInterval(timer);
            addActivity(t(
              list.length === 1
                ? "Se envió 1 correo con resumen de liquidación."
                : "Se enviaron " + list.length + " correos con resúmenes de liquidación.",
              list.length === 1
                ? "1 settlement summary email was sent."
                : list.length + " settlement summary emails were sent."
            ));
            render();
            close.disabled = false;
            close.classList.remove("btn-secondary");
            close.classList.add("btn");
            window.UI.toast(
              t("Envío completado", "Delivery complete"),
              t(
                list.length === 1
                  ? "Se simuló 1 envío correctamente."
                  : "Se simularon " + list.length + " envíos correctamente.",
                list.length === 1
                  ? "1 delivery was simulated successfully."
                  : list.length + " deliveries were simulated successfully."
              ),
              "ok"
            );
          }
        }, 380);
      }
    });

    modal.layer.addEventListener("click", function (event) {
      if (event.target === modal.layer) {
        event.stopPropagation();
      }
    });
  }

  function sendSelected() {
    var ids = Object.keys(state.selected).filter(function (id) {
      return state.selected[id];
    });
    sendBatch(ids);
  }

  function pdfHtml(operator) {
    var p = period();
    var other = operator.other
      .map(function (item) {
        return "<tr><td>" + escape(item.label) + '</td><td>' + window.UI.money(item.amount) + "</td></tr>";
      })
      .join("");
    var otherTotal = operator.other.reduce(function (sum, item) { return sum + item.amount; }, 0);
    var total = totalOf(operator);

    return (
      '<div class="pdf-doc">' +
      '<div class="pdf-brand"><strong>Resumen de liquidación</strong><span>DEMO · DATOS FICTICIOS</span></div>' +
      "<h1>RESUMEN</h1>" +
      '<table class="pdf-meta">' +
      "<tr><td>" + escape(t("Operador", "Operator")) + "</td><td>" + escape(operator.name) + "</td></tr>" +
      "<tr><td>" + escape(t("Periodo", "Period")) + "</td><td>" + escape(p.label) + "</td></tr>" +
      "<tr><td>" + escape(t("Liquidaciones incluidas", "Included settlements")) + "</td><td>" + escape(operator.trips) + " " + escape(t("viajes", "trips")) + "</td></tr>" +
      "<tr><td>" + escape(t("Correo", "Email")) + "</td><td>" + escape(operator.email) + "</td></tr>" +
      "</table>" +
      '<table class="pdf-table"><thead><tr><th>' + escape(t("Concepto", "Concept")) + "</th><th>" + escape(t("Importe", "Amount")) + "</th></tr></thead><tbody>" +
      "<tr><td>" + escape(t("Percepciones", "Earnings")) + "</td><td>" + window.UI.money(operator.perceptions) + "</td></tr>" +
      "<tr><td>" + escape(t("Deducciones", "Deductions")) + "</td><td>" + signedMoney(operator.deductions) + "</td></tr>" +
      "<tr><td>" + escape(t("Anticipos", "Advances")) + "</td><td>" + signedMoney(operator.advances) + "</td></tr>" +
      "<tr><td>" + escape(t("Gastos", "Expenses")) + "</td><td>" + window.UI.money(operator.expenses) + "</td></tr>" +
      '<tr><td><strong>' + escape(t("Total general", "Grand total")) + "</strong></td><td><strong>" + window.UI.money(operator.perceptions + operator.deductions + operator.advances + operator.expenses) + "</strong></td></tr>" +
      "</tbody></table>" +
      "<h2 style=\"margin:18px 0 6px;font-size:0.78rem;color:#156082;text-transform:uppercase\">" + escape(t("Otros", "Other")) + "</h2>" +
      '<table class="pdf-table"><tbody>' + other + '<tr><td><strong>' + escape(t("Total otros", "Other total")) + "</strong></td><td><strong>" + window.UI.money(otherTotal) + "</strong></td></tr></tbody></table>" +
      '<div class="pdf-total"><span>TOTAL</span><span>' + window.UI.money(total) + "</span></div>" +
      '<p class="pdf-small">' + escape(t("Documento de demostración sin validez fiscal. Todos los nombres y montos son ficticios.", "Demo document with no fiscal validity. All names and amounts are fictional.")) + "</p>" +
      "</div>"
    );
  }

  function viewPdf(id) {
    var operator = state.operators.filter(function (item) { return item.id === id; })[0];
    if (!operator) return;
    window.UI.openModal({
      title: t("Resumen de ", "Summary for ") + operator.name,
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      bodyHtml: pdfHtml(operator),
      footHtml:
        '<button class="btn btn-secondary" type="button" data-print-pdf>' + escape(t("Imprimir / Guardar PDF", "Print / Save PDF")) + "</button>" +
        '<button class="btn" type="button" data-close-pdf>' + escape(t("Cerrar", "Close")) + "</button>",
      onMount: function (box) {
        box.querySelector("[data-close-pdf]").addEventListener("click", window.UI.closeModal);
        box.querySelector("[data-print-pdf]").addEventListener("click", function () {
          document.body.classList.add("print-pdf");
          window.print();
          window.setTimeout(function () {
            document.body.classList.remove("print-pdf");
          }, 600);
        });
      }
    });
  }

  function viewEmail() {
    var p = period();
    var generated = state.operators.filter(function (operator) {
      return operator.status === "generated";
    });
    var attachment = "Resumenes_Operadores_" + p.start + "_a_" + p.end + ".zip";
    window.UI.openModal({
      title: t("Correo del periodo", "Period email"),
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      bodyHtml:
        '<div class="email-preview"><div class="email-head">' +
        "<div><span>" + escape(t("De", "From")) + "</span><strong>notificaciones@example.com</strong></div>" +
        "<div><span>" + escape(t("Para", "To")) + "</span><strong>facturacion@example.com · administracion@example.com</strong></div>" +
        "<div><span>" + escape(t("Asunto", "Subject")) + "</span><strong>" + escape(t("Resúmenes de liquidación ", "Settlement summaries ") + p.label) + "</strong></div>" +
        "</div>" +
        '<div class="email-body"><p>' + escape(t("Buen día, se adjunta el archivo comprimido con los resúmenes de liquidación de los operadores correspondientes al periodo indicado.", "Good morning, attached is the compressed file with the operator settlement summaries for the indicated period.")) + "</p>" +
        '<div class="email-attachment"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>' + escape(attachment) + "</div></div></div>" +
        '<div class="tech-note" style="margin-top:14px">' + escape(t("No se enviará ningún correo real. El botón simula el lote con los PDFs generados.", "No real email will be sent. The button simulates the batch with generated PDFs.")) + "</div>",
      footHtml:
        '<button class="btn btn-secondary" type="button" data-close-email>' + escape(t("Cerrar", "Close")) + "</button>" +
        '<button class="btn" type="button" data-send-email>' + escape(t("Simular envío del lote", "Simulate batch delivery")) + "</button>",
      onMount: function (box) {
        box.querySelector("[data-close-email]").addEventListener("click", window.UI.closeModal);
        box.querySelector("[data-send-email]").addEventListener("click", function () {
          var ids = generated.map(function (operator) { return operator.id; });
          if (!ids.length) {
            var notSent = state.operators.filter(function (operator) { return operator.status !== "sent"; });
            ids = notSent.map(function (operator) { return operator.id; });
          }
          if (!ids.length) {
            window.UI.toast(t("Sin pendientes", "Nothing pending"), t("Todos los operadores ya fueron enviados.", "All operators have already been sent."), "warn");
            return;
          }
          window.UI.closeModal();
          sendBatch(ids);
        });
      }
    });
  }

  function openTech() {
    var body =
      '<div class="tech-summary">' +
      '<div class="tech-block"><h4>' + escape(t("Problema", "Problem")) + "</h4><p>" +
      escape(t("Cada semana había que reunir las liquidaciones de todos los operadores, generar un resumen legible, empaquetar los archivos y enviarlos por correo. El proceso era repetitivo y propenso a omitir operadores o enviar versiones distintas.", "Every week, settlements for every operator had to be gathered, turned into a readable summary, packaged and emailed. The process was repetitive and prone to missing operators or sending inconsistent versions.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Solución", "Solution")) + "</h4><p>" +
      escape(t("Automatización en Python que consulta las liquidaciones del periodo, clasifica conceptos, agrupa por operador, genera un PDF con ReportLab, crea un ZIP y envía el consolidado por correo. Cada ejecución deja un reporte de envíos y una bitácora de estatus.", "Python automation that reads the period settlements, classifies concepts, groups by operator, generates a ReportLab PDF, creates a ZIP and emails the consolidated file. Each run produces a delivery report and a status log.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Stack", "Stack")) + '</h4><div class="tech-stack"><span>Python</span><span>pandas</span><span>ReportLab</span><span>smtplib</span><span>openpyxl</span><span>ZIP</span></div></div>' +
      '<div class="tech-block"><h4>' + escape(t("Mi rol", "My role")) + "</h4><p>" +
      escape(t("Diseñé el flujo completo: consulta de datos, reglas de clasificación, formato del PDF, empaquetado, envío, manejo de errores y bitácora. El proceso está pensado para ejecutarse con un .bat y un programador de tareas.", "I designed the complete flow: data query, classification rules, PDF layout, packaging, delivery, error handling and logging. The process is designed to run from a .bat file and a task scheduler.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Privacidad en esta demo", "Privacy in this demo")) + "</h4><p>" +
      escape(t("Los operadores, correos y montos son ficticios. La demo no consulta bases de datos, no genera archivos reales y no envía correos.", "Operators, emails and amounts are fictional. The demo does not query databases, generate real files or send emails.")) +
      "</p></div>" +
      '<div class="tech-note">' + escape(t("La bandeja reproduce el ciclo semanal: generar PDFs, revisar el correo y simular el envío con estados por operador.", "The inbox reproduces the weekly cycle: generate PDFs, review the email and simulate delivery with per-operator statuses.")) + "</div>" +
      "</div>";
    window.UI.openModal({
      title: t("Resúmenes de liquidación", "Settlement summaries"),
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      bodyHtml: body,
      footHtml: '<button class="btn btn-secondary" type="button" data-close-tech>' + escape(t("Cerrar", "Close")) + "</button>",
      onMount: function (box) {
        box.querySelector("[data-close-tech]").addEventListener("click", window.UI.closeModal);
      }
    });
  }

  function resetDemo() {
    state = {
      period: data.periods[0].id,
      query: "",
      status: "all",
      selected: {},
      operators: JSON.parse(JSON.stringify(initialOperators)),
      activity: initialActivity.slice()
    };
    document.getElementById("liq-search").value = "";
    document.getElementById("liq-status").value = "all";
    render();
    window.UI.toast(t("Demo reiniciada", "Demo reset"), t("La bandeja volvió a su estado inicial.", "The inbox returned to its initial state."), "ok");
  }

  function routeFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    if (hash === "tech") openTech();
    else if (hash.indexOf("pdf=") === 0) viewPdf(hash.split("=")[1]);
    else if (hash === "correo") viewEmail();
  }

  function init() {
    render();

    document.getElementById("liq-period").addEventListener("change", function (event) {
      state.period = event.target.value;
      render();
      window.UI.toast(t("Periodo actualizado", "Period updated"), period().label, "ok");
    });
    document.getElementById("liq-search").addEventListener("input", window.UI.debounce(function (event) {
      state.query = event.target.value;
      renderTable();
    }, 120));
    document.getElementById("liq-status").addEventListener("change", function (event) {
      state.status = event.target.value;
      renderTable();
    });
    document.getElementById("liq-select-all").addEventListener("change", function (event) {
      filteredOperators().forEach(function (operator) {
        state.selected[operator.id] = event.target.checked;
      });
      renderTable();
    });
    document.getElementById("liq-generate").addEventListener("click", generateAll);
    document.getElementById("liq-send").addEventListener("click", sendSelected);
    document.getElementById("liq-email-btn").addEventListener("click", viewEmail);
    document.getElementById("liq-email-btn-2").addEventListener("click", viewEmail);
    document.getElementById("liq-reset").addEventListener("click", resetDemo);

    document.addEventListener("click", function (event) {
      var tech = event.target.closest("[data-tech-open]");
      if (tech) {
        openTech();
        return;
      }
      var pdf = event.target.closest("[data-liq-pdf]");
      if (pdf) {
        viewPdf(pdf.getAttribute("data-liq-pdf"));
        return;
      }
      var send = event.target.closest("[data-liq-send]");
      if (send) {
        sendBatch([send.getAttribute("data-liq-send")]);
      }
    });

    document.addEventListener("change", function (event) {
      var checkbox = event.target.closest("[data-liq-select]");
      if (checkbox) {
        state.selected[checkbox.getAttribute("data-liq-select")] = checkbox.checked;
        renderTable();
      }
    });

    window.addEventListener("languagechange", function () {
      window.UI.closeModal();
      render();
    });

    window.addEventListener("hashchange", routeFromHash);
    routeFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
