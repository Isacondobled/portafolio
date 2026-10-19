(function () {
  var data = window.MOCK.casetas;
  var state = {
    step: 1,
    file: null,
    calculating: false,
    calculated: false,
    phaseIndex: -1,
    includeSin: false,
    decisions: {},
    applied: false,
    resultQuery: "",
    resultState: "all"
  };
  var timer = null;

  function t(es, en) {
    return window.I18N.t(es, en);
  }

  function escape(value) {
    return window.UI.escape(value);
  }

  function armadoLabel(value) {
    return value;
  }

  function stateLabel(value) {
    var labels = {
      EXISTENTE: t("Existente", "Existing"),
      NUEVA_CON: t("Nueva con casetas", "New with tolls"),
      SIN_CASETAS: t("Sin casetas", "No tolls"),
      MANUAL: t("Manual", "Manual"),
      INDETERMINADO: t("Indeterminado", "Indeterminate")
    };
    return labels[value] || value;
  }

  function stateBadge(value) {
    var cls =
      value === "EXISTENTE"
        ? "badge-ok"
        : value === "NUEVA_CON"
        ? "badge-info"
        : value === "SIN_CASETAS"
        ? "badge-neutral"
        : value === "MANUAL"
        ? "badge-accent"
        : "badge-warn";
    return '<span class="badge ' + cls + '">' + escape(stateLabel(value)) + "</span>";
  }

  function confidenceBadge(value) {
    var cls = value === "ALTA" ? "badge-ok" : value === "MEDIA" ? "badge-warn" : "badge-bad";
    return '<span class="badge ' + cls + '">' + escape(value) + "</span>";
  }

  function reviewRoutes() {
    return data.routes.filter(function (route) {
      if (route.estado === "INDETERMINADO") return true;
      return state.includeSin && route.estado === "SIN_CASETAS";
    });
  }

  function ensureDecision(route) {
    if (!state.decisions[route.id_ruta]) {
      state.decisions[route.id_ruta] = { action: "PENDIENTE", cost: "" };
    }
    return state.decisions[route.id_ruta];
  }

  function pendingCount() {
    return reviewRoutes().filter(function (route) {
      return ensureDecision(route).action === "PENDIENTE";
    }).length;
  }

  function setStep(step) {
    state.step = step;
    [1, 2, 3, 4].forEach(function (n) {
      var el = document.getElementById("cas-step-" + n);
      if (el) el.hidden = n !== step || state.applied;
      var indicator = document.querySelector('[data-step-indicator="' + n + '"]');
      if (indicator) {
        indicator.classList.toggle("is-current", n === step && !state.applied);
        indicator.classList.toggle("is-done", n < step || state.applied);
      }
    });
    if (state.applied) {
      document.getElementById("cas-results").hidden = false;
    } else {
      document.getElementById("cas-results").hidden = true;
    }
    if (step === 2) renderPhases();
    if (step === 3) renderReview();
    if (step === 4) renderPlan();
    if (step === 2) renderFileChip();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderFileInfo() {
    var container = document.getElementById("cas-file-info");
    if (!state.file) {
      container.innerHTML = "";
      document.getElementById("cas-to-step-2").disabled = true;
      return;
    }
    container.innerHTML =
      '<span class="file-pill"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>' + escape(state.file) + " · " + escape(t("listo para procesar", "ready to process")) + "</span>";
    document.getElementById("cas-to-step-2").disabled = false;
  }

  function renderFileChip() {
    var container = document.getElementById("cas-file-chip");
    if (!container) return;
    container.innerHTML = state.file
      ? '<span class="file-pill">' + escape(state.file) + " · " + escape(t("Septiembre 2026", "September 2026")) + "</span>"
      : "";
  }

  function renderPhases() {
    var container = document.getElementById("cas-phases");
    if (!container) return;
    container.innerHTML = data.phases
      .map(function (phase, index) {
        var cls = "phase-row";
        if (state.calculated || index < state.phaseIndex) cls += " is-done";
        else if (index === state.phaseIndex) cls += " is-active";
        var marker = state.calculated || index < state.phaseIndex ? "✓" : index + 1;
        var time = state.calculated || index < state.phaseIndex ? "OK" : index === state.phaseIndex ? "..." : "—";
        return (
          '<div class="' + cls + '"><span class="phase-dot">' + marker + "</span><span>" +
          escape(t(phase.label, phase.labelEn || phase.label)) + "</span><span class=\"phase-time\">" + time + "</span></div>"
        );
      })
      .join("");
  }

  function renderCalcSummary() {
    var summary = data.summary;
    document.getElementById("cas-calc-summary").innerHTML =
      '<div class="calc-summary">' +
      '<div class="mini"><strong>' + summary.total + '</strong><span>' + escape(t("Claves procesadas", "Processed keys")) + "</span></div>" +
      '<div class="mini"><strong>' + summary.existing + '</strong><span>' + escape(t("Existentes", "Existing")) + "</span></div>" +
      '<div class="mini"><strong>' + summary.newRoutes + '</strong><span>' + escape(t("Nuevas", "New")) + "</span></div>" +
      '<div class="mini"><strong>' + summary.accuracy.toFixed(2) + '%</strong><span>' + escape(t("Precisión interna", "Internal accuracy")) + "</span></div>" +
      "</div>" +
      '<div class="info-note" style="margin-top:14px"><strong>' + escape(t("Dry-run:", "Dry-run:")) + "</strong> " +
      escape(t("pasa con 0 sobreescrituras y una diferencia estimada de " + summary.dryRunDiff.toFixed(2) + "%.", "passes with 0 overwrites and an estimated difference of " + summary.dryRunDiff.toFixed(2) + "%.")) +
      "</div>";
  }

  function calculate() {
    if (state.calculating) return;
    if (!state.file) {
      window.UI.toast(t("Falta el archivo", "Missing file"), t("Selecciona o usa el archivo de ejemplo.", "Select or use the sample file."), "warn");
      return;
    }
    state.calculating = true;
    state.calculated = false;
    state.phaseIndex = 0;
    document.getElementById("cas-calc-btn").disabled = true;
    document.getElementById("cas-to-step-3").disabled = true;
    document.getElementById("cas-calc-summary").innerHTML = "";
    renderPhases();
    document.getElementById("cas-progress").style.width = "4%";

    var index = 0;
    timer = window.setInterval(function () {
      index += 1;
      state.phaseIndex = index;
      if (index < data.phases.length) {
        renderPhases();
        document.getElementById("cas-progress").style.width = Math.round(((index + 1) / data.phases.length) * 100) + "%";
      } else {
        window.clearInterval(timer);
        timer = null;
        state.calculating = false;
        state.calculated = true;
        state.phaseIndex = data.phases.length;
        document.getElementById("cas-progress").style.width = "100%";
        renderPhases();
        renderCalcSummary();
        document.getElementById("cas-calc-btn").disabled = false;
        document.getElementById("cas-to-step-3").disabled = false;
        window.UI.toast(t("Cálculo terminado", "Calculation complete"), t("El dry-run pasó. No se escribió en ninguna base.", "The dry-run passed. Nothing was written to any database."), "ok");
      }
    }, 420);
  }

  function reviewOptions(selected) {
    var options = [
      { value: "PENDIENTE", es: "Pendiente", en: "Pending" },
      { value: "USAR_MEDIANA", es: "Usar mediana", en: "Use median" },
      { value: "COSTO_MANUAL", es: "Costo manual", en: "Manual cost" },
      { value: "SIN_CASETAS", es: "Sin casetas", en: "No tolls" }
    ];
    return options
      .map(function (option) {
        return '<option value="' + option.value + '"' + (selected === option.value ? " selected" : "") + ">" + escape(t(option.es, option.en)) + "</option>";
      })
      .join("");
  }

  function renderReview() {
    var routes = reviewRoutes();
    var tbody = document.getElementById("cas-review-body");
    if (!routes.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">' + escape(t("No hay casos pendientes de revisión.", "There are no cases pending review.")) + "</div></td></tr>";
    } else {
      tbody.innerHTML = routes
        .map(function (route) {
          var decision = ensureDecision(route);
          return (
            "<tr><td class=\"mono strong\">" + route.id_ruta + "</td><td>" + escape(route.desc_ruta) + "</td><td class=\"mono\">" + escape(route.id_unidad) + "</td><td>" + escape(armadoLabel(route.armado)) + '</td><td class="num">' + window.UI.money(route.costo_estimado) + "</td><td class=\"center\">" + route.viajes + "</td><td>" + confidenceBadge(route.confianza) + "</td>" +
            '<td><select data-review-select="' + route.id_ruta + '">' + reviewOptions(decision.action) + "</select></td>" +
            '<td><input type="number" min="0" step="0.01" value="' + escape(decision.cost) + '" data-review-cost="' + route.id_ruta + '"' + (decision.action === "COSTO_MANUAL" ? "" : " disabled") + "></td></tr>"
          );
        })
        .join("");
    }
    updatePending();
  }

  function updatePending() {
    var pending = pendingCount();
    var label = document.getElementById("cas-pending");
    if (label) {
      label.textContent = t(
        pending + " caso(s) pendiente(s).",
        pending + " pending case(s)."
      );
    }
    var next = document.getElementById("cas-to-step-4");
    if (next) next.disabled = pending > 0;
  }

  function renderPlan() {
    var summary = data.summary;
    document.getElementById("cas-plan").innerHTML =
      '<div class="plan-grid">' +
      '<div class="plan-box is-delete"><span class="num">' + summary.plan.delete + '</span><span class="lbl">DELETE</span></div>' +
      '<div class="plan-box is-update"><span class="num">' + summary.plan.update + '</span><span class="lbl">UPDATE</span></div>' +
      '<div class="plan-box is-insert"><span class="num">' + summary.plan.insert + '</span><span class="lbl">INSERT</span></div>' +
      "</div>" +
      '<div class="info-note"><strong>' + escape(t("Validación dry-run:", "Dry-run validation:")) + "</strong> " +
      escape(t("0 sobreescrituras · diferencia estimada " + summary.dryRunDiff.toFixed(2) + "% · precisión interna " + summary.accuracy.toFixed(2) + "%.", "0 overwrites · estimated difference " + summary.dryRunDiff.toFixed(2) + "% · internal accuracy " + summary.accuracy.toFixed(2) + "%.")) +
      "</div>" +
      '<div class="table-wrap" style="margin-top:14px"><table class="data-table"><thead><tr><th>' +
      escape(t("Acción", "Action")) + "</th><th>" + escape(t("Alcance", "Scope")) + "</th><th>" + escape(t("Guard", "Guard")) + "</th></tr></thead><tbody>" +
      "<tr><td>DELETE</td><td>" + escape(t("Claves obsoletas del periodo", "Obsolete keys for the period")) + '</td><td><span class="badge badge-ok">' + escape(t("Permitido", "Allowed")) + "</span></td></tr>" +
      "<tr><td>UPDATE</td><td>" + escape(t("Rutas existentes con nuevo cálculo", "Existing routes with a new calculation")) + '</td><td><span class="badge badge-ok">' + escape(t("Permitido", "Allowed")) + "</span></td></tr>" +
      "<tr><td>INSERT</td><td>" + escape(t("Rutas nuevas con casetas", "New routes with tolls")) + '</td><td><span class="badge badge-ok">' + escape(t("Permitido", "Allowed")) + "</span></td></tr>" +
      "</tbody></table></div>";
  }

  function applyChanges() {
    window.UI.confirm({
      title: t("¿Aplicar la depuración?", "Apply the cleanup?"),
      text: t("Se aplicará el plan sobre la tabla de costos de casetas. En esta demo la escritura es simulada y no toca ninguna base de datos.", "The plan will be applied to the toll cost table. In this demo the write is simulated and does not touch any database."),
      acceptLabel: t("Sí, aplicar", "Yes, apply"),
      cancelLabel: t("Cancelar", "Cancel")
    }).then(function (confirmed) {
      if (!confirmed) return;
      var button = document.getElementById("cas-apply");
      button.disabled = true;
      var status = document.getElementById("cas-apply-status");
      status.innerHTML =
        '<div class="info-note" style="margin-top:14px"><strong>' + escape(t("Aplicando cambios…", "Applying changes…")) + '</strong><div class="progress-track" style="margin-top:8px"><span class="progress-fill is-ok" style="width:65%"></span></div></div>';
      window.setTimeout(function () {
        state.applied = true;
        setStep(4);
        renderResults();
        window.UI.toast(t("Depuración aplicada", "Cleanup applied"), t("La simulación terminó correctamente. No se escribió en ninguna base real.", "The simulation finished successfully. No real database was written."), "ok");
        var results = document.getElementById("cas-results");
        if (results) results.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 1200);
    });
  }

  function classificationCounts() {
    var counts = { EXISTENTE: 0, NUEVA_CON: 0, SIN_CASETAS: 0, MANUAL: 0, INDETERMINADO: 0 };
    data.routes.forEach(function (route) {
      counts[route.estado] += 1;
    });
    return counts;
  }

  function renderResults() {
    var counts = classificationCounts();
    var total = data.routes.length;
    var pExisting = (counts.EXISTENTE / total) * 100;
    var pNew = (counts.NUEVA_CON / total) * 100;
    var pNoTolls = (counts.SIN_CASETAS / total) * 100;
    var pManual = (counts.MANUAL / total) * 100;
    var pInd = (counts.INDETERMINADO / total) * 100;

    var gradient =
      "conic-gradient(" +
      "var(--brand-strong) 0 " + pExisting + "%, " +
      "var(--info) " + pExisting + "% " + (pExisting + pNew) + "%, " +
      "var(--ok) " + (pExisting + pNew) + "% " + (pExisting + pNew + pNoTolls) + "%, " +
      "var(--accent) " + (pExisting + pNew + pNoTolls) + "% " + (pExisting + pNew + pNoTolls + pManual) + "%, " +
      "var(--warn) " + (pExisting + pNew + pNoTolls + pManual) + "% 100%)";

    var top = data.routes
      .slice()
      .sort(function (a, b) { return b.costo_estimado - a.costo_estimado; })
      .slice(0, 6);
    var maxTop = Math.max.apply(null, top.map(function (route) { return route.costo_estimado; }));

    var armados = ["CHICO", "SENCILLO", "FULL"];
    var comparison = armados.map(function (armado) {
      var list = data.routes.filter(function (route) {
        return route.armado === armado && route.costo_actual > 0;
      });
      var current = list.reduce(function (sum, route) { return sum + route.costo_actual; }, 0) / (list.length || 1);
      var next = list.reduce(function (sum, route) { return sum + route.costo_nuevo; }, 0) / (list.length || 1);
      return { armado: armado, current: current, next: next };
    });
    var maxComparison = Math.max.apply(null, comparison.map(function (item) { return Math.max(item.current, item.next); }));

    var results = document.getElementById("cas-results");
    results.innerHTML =
      '<div class="panel"><div class="panel-head"><div><h2>' + escape(t("Resultados del cálculo", "Calculation results")) + "</h2><p>" + escape(t("Septiembre 2026 · dry-run validado · escritura simulada", "September 2026 · validated dry-run · simulated write")) + '</p></div><span class="badge badge-ok">' + escape(t("Completado", "Completed")) + "</span></div>" +
      '<div class="kpis">' +
      '<div class="kpi"><span class="num">' + total + '</span><span class="label">' + escape(t("Rutas procesadas", "Processed routes")) + "</span></div>" +
      '<div class="kpi k-ok"><span class="num">' + counts.EXISTENTE + '</span><span class="label">' + escape(t("Existentes", "Existing")) + "</span></div>" +
      '<div class="kpi k-accent"><span class="num">' + counts.NUEVA_CON + '</span><span class="label">' + escape(t("Nuevas con casetas", "New with tolls")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + counts.SIN_CASETAS + '</span><span class="label">' + escape(t("Sin casetas", "No tolls")) + "</span></div>" +
      '<div class="kpi k-warn"><span class="num">' + counts.INDETERMINADO + '</span><span class="label">' + escape(t("Revisión manual", "Manual review")) + "</span></div>" +
      '<div class="kpi k-ok"><span class="num">' + data.summary.accuracy.toFixed(2) + '%</span><span class="label">' + escape(t("Precisión interna", "Internal accuracy")) + "</span></div>" +
      "</div>" +
      '<div class="result-grid"><div class="chart-card"><h3>' + escape(t("Distribución de la clasificación", "Classification breakdown")) + '</h3><div class="donut-wrap"><div class="donut" style="background:' + gradient + '"><div class="donut-center"><strong>' + total + '</strong><span>' + escape(t("rutas", "routes")) + '</span></div></div><div class="legend">' +
      '<div class="legend-row"><span><i style="background:var(--brand-strong)"></i>' + escape(t("Existentes", "Existing")) + "</span><strong>" + counts.EXISTENTE + "</strong></div>" +
      '<div class="legend-row"><span><i style="background:var(--info)"></i>' + escape(t("Nuevas con casetas", "New with tolls")) + "</span><strong>" + counts.NUEVA_CON + "</strong></div>" +
      '<div class="legend-row"><span><i style="background:var(--ok)"></i>' + escape(t("Sin casetas", "No tolls")) + "</span><strong>" + counts.SIN_CASETAS + "</strong></div>" +
      '<div class="legend-row"><span><i style="background:var(--accent)"></i>' + escape(t("Manual", "Manual")) + "</span><strong>" + counts.MANUAL + "</strong></div>" +
      '<div class="legend-row"><span><i style="background:var(--warn)"></i>' + escape(t("Indeterminado", "Indeterminate")) + "</span><strong>" + counts.INDETERMINADO + "</strong></div>" +
      "</div></div></div>" +
      '<div class="chart-card"><h3>' + escape(t("Rutas con mayor costo estimado", "Highest estimated cost routes")) + '</h3><div class="bar-chart">' +
      top.map(function (route) {
        return '<div class="bar-row"><span class="bar-label">' + escape(route.id_ruta + " · " + route.armado) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.round((route.costo_estimado / maxTop) * 100) + '%"></span></span><span class="bar-value">' + window.UI.money(route.costo_estimado, 0) + "</span></div>";
      }).join("") +
      "</div></div></div>" +
      '<div class="chart-card" style="margin-top:16px"><h3>' + escape(t("Costo actual vs. nuevo por armado", "Current vs. new cost by configuration")) + '</h3><div class="compare-grid">' +
      comparison.map(function (item) {
        return '<div class="compare-item"><div class="cmp-label"><span>' + escape(item.armado) + '</span><span class="mono">' + window.UI.money(item.next, 0) + '</span></div><div class="compare-bars"><span class="is-est" style="width:' + Math.round((item.current / maxComparison) * 100) + '%"></span><span class="is-real" style="width:' + Math.round((item.next / maxComparison) * 100) + '%"></span></div><div class="tiny muted" style="margin-top:6px">' + escape(t("Actual", "Current")) + " · " + escape(t("Nuevo", "New")) + "</div></div>";
      }).join("") +
      "</div></div>" +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>' + escape(t("Detalle de rutas", "Route detail")) + "</h2><p>" + escape(t("Catálogo completo del periodo ficticio.", "Full catalog for the fictional period.")) + '</p></div><div class="row-actions"><button class="btn btn-secondary btn-sm" type="button" id="cas-download">' + escape(t("Descargar CSV", "Download CSV")) + "</button></div></div>" +
      '<div class="liq-toolbar"><div class="toolbar-left"><div class="search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="cas-result-search" type="search" placeholder="' + escape(t("Buscar ruta o descripción", "Search route or description")) + '"></div><select id="cas-result-state" class="amount-input" style="width:auto;min-height:36px"><option value="all">' + escape(t("Todos los estados", "All statuses")) + "</option>" +
      ["EXISTENTE", "NUEVA_CON", "SIN_CASETAS", "MANUAL", "INDETERMINADO"].map(function (value) { return '<option value="' + value + '">' + escape(stateLabel(value)) + "</option>"; }).join("") +
      '</select></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>' + escape(t("Ruta", "Route")) + "</th><th>" + escape(t("Descripción", "Description")) + "</th><th>" + escape(t("Unidad", "Unit")) + "</th><th>" + escape(t("Armado", "Configuration")) + "</th><th>" + escape(t("Estado", "Status")) + "</th><th class=\"num\">" + escape(t("Actual", "Current")) + "</th><th class=\"num\">" + escape(t("Nuevo", "New")) + "</th><th class=\"num\">" + escape(t("Diferencia", "Difference")) + "</th></tr></thead><tbody id=\"cas-result-body\"></tbody></table></div></div>" +
      '<div class="tech-note" style="margin-top:16px">' + escape(t("Todos los datos de esta tabla son ficticios. La descarga se genera en el navegador y no consulta ningún servidor.", "All data in this table is fictional. The download is generated in the browser and does not query any server.")) + "</div>";

    renderResultRows();
    document.getElementById("cas-download").addEventListener("click", downloadCsv);
    document.getElementById("cas-result-search").addEventListener("input", window.UI.debounce(function (event) {
      state.resultQuery = event.target.value;
      renderResultRows();
    }, 100));
    document.getElementById("cas-result-state").addEventListener("change", function (event) {
      state.resultState = event.target.value;
      renderResultRows();
    });
  }

  function resultRoutes() {
    var q = state.resultQuery.trim().toLowerCase();
    return data.routes.filter(function (route) {
      if (state.resultState !== "all" && route.estado !== state.resultState) return false;
      if (!q) return true;
      return (route.id_ruta + " " + route.desc_ruta + " " + route.id_unidad).toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderResultRows() {
    var tbody = document.getElementById("cas-result-body");
    if (!tbody) return;
    var rows = resultRoutes();
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">' + escape(t("Sin rutas con ese filtro.", "No routes match that filter.")) + "</div></td></tr>";
      return;
    }
    tbody.innerHTML = rows
      .map(function (route) {
        var diff = route.costo_nuevo - route.costo_actual;
        var cls = diff > 0 ? "text-bad" : diff < 0 ? "text-ok" : "muted";
        return (
          '<tr><td class="mono strong">' + route.id_ruta + "</td><td>" + escape(route.desc_ruta) + "</td><td class=\"mono\">" + escape(route.id_unidad) + "</td><td>" + escape(route.armado) + "</td><td>" + stateBadge(route.estado) + '</td><td class="num">' + window.UI.money(route.costo_actual) + '</td><td class="num">' + window.UI.money(route.costo_nuevo) + '</td><td class="num ' + cls + '">' + (diff >= 0 ? "+" : "") + window.UI.money(diff) + "</td></tr>"
        );
      })
      .join("");
  }

  function downloadCsv() {
    var rows = [
      [t("Ruta", "Route"), t("Descripción", "Description"), t("Unidad", "Unit"), t("Armado", "Configuration"), t("Estado", "Status"), t("Costo actual", "Current cost"), t("Costo nuevo", "New cost")]
    ];
    resultRoutes().forEach(function (route) {
      rows.push([route.id_ruta, route.desc_ruta, route.id_unidad, route.armado, stateLabel(route.estado), route.costo_actual, route.costo_nuevo]);
    });
    window.UI.downloadCsv("casetas_demo.csv", rows);
    window.UI.toast(t("CSV generado", "CSV generated"), t("La descarga se creó en el navegador.", "The download was created in the browser."), "ok");
  }

  function openTech() {
    var body =
      '<div class="tech-summary">' +
      '<div class="tech-block"><h4>' + escape(t("Problema", "Problem")) + "</h4><p>" +
      escape(t("El costo de casetas por ruta y armado se calculaba cada mes con consultas manuales, archivos de Excel y criterios que vivían en la cabeza de una persona. El proceso era difícil de repetir, auditar y explicar.", "Monthly toll costs by route and configuration were calculated with manual queries, Excel files and criteria that lived in one person’s head. The process was hard to repeat, audit and explain.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Solución", "Solution")) + "</h4><p>" +
      escape(t("Pipeline en Python que ingesta el pase mensual, cruza contra el histórico, calcula el armado, filtra outliers con IQR, obtiene medianas por ruta y armado, asigna confianza y clasifica cada clave. La revisión manual se guarda aparte y el plan de depuración se valida con dry-run antes de aplicarse.", "Python pipeline that ingests the monthly pass, matches it against history, computes the configuration, filters outliers with IQR, obtains medians by route and configuration, assigns confidence and classifies every key. Manual review is stored separately and the cleanup plan is validated with a dry-run before being applied.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Stack", "Stack")) + '</h4><div class="tech-stack"><span>Python</span><span>pandas</span><span>NumPy</span><span>Flask</span><span>waitress</span><span>SQL Server</span><span>openpyxl</span><span>pytest</span><span>SDD</span></div></div>' +
      '<div class="tech-block"><h4>' + escape(t("Mi rol", "My role")) + "</h4><p>" +
      escape(t("Automaticé el proceso completo: ingesta, cálculo, motor de decisión, generación del plan SQL, respaldos, interfaz web de revisión y pruebas. Antes de implementar, ordené alcance, reglas y criterios de validación en especificaciones y tareas; el objetivo era que el proceso dejara de depender de una sola persona.", "I automated the entire process: ingestion, calculation, decision engine, SQL plan generation, backups, review web interface and tests. Before implementing, I organized scope, rules and validation criteria into specifications and tasks; the goal was to stop the process from depending on a single person.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Privacidad en esta demo", "Privacy in this demo")) + "</h4><p>" +
      escape(t("Las rutas, unidades, montos y clasificaciones son inventados. La demo no abre archivos reales, no se conecta a SQL Server y no escribe en ninguna tabla.", "Routes, units, amounts and classifications are fictional. The demo does not open real files, connect to SQL Server or write to any table.")) +
      "</p></div>" +
      '<div class="tech-note">' + escape(t("El flujo de cuatro pasos reproduce la operación real: cargar, calcular, revisar y ejecutar con confirmación.", "The four-step flow reproduces the real operation: upload, calculate, review and run with confirmation.")) + "</div>" +
      "</div>";
    window.UI.openModal({
      title: t("Costos de casetas", "Toll costs"),
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
      step: 1,
      file: null,
      calculating: false,
      calculated: false,
      phaseIndex: -1,
      includeSin: false,
      decisions: {},
      applied: false,
      resultQuery: "",
      resultState: "all"
    };
    if (timer) window.clearInterval(timer);
    timer = null;
    document.getElementById("cas-include-sin").checked = false;
    document.getElementById("cas-progress").style.width = "0%";
    document.getElementById("cas-calc-summary").innerHTML = "";
    document.getElementById("cas-apply-status").innerHTML = "";
    document.getElementById("cas-calc-btn").disabled = false;
    document.getElementById("cas-to-step-3").disabled = true;
    document.getElementById("cas-to-step-4").disabled = true;
    document.getElementById("cas-results").innerHTML = "";
    renderFileInfo();
    setStep(1);
    window.UI.toast(t("Demo reiniciada", "Demo reset"), t("Puedes comenzar de nuevo desde la carga del pase.", "You can start again from the pass upload."), "ok");
  }

  function setSampleFile() {
    state.file = data.file;
    renderFileInfo();
    window.UI.toast(t("Archivo de ejemplo listo", "Sample file ready"), state.file + " · " + t("Septiembre 2026", "September 2026"), "ok");
  }

  function useDemoState(mode) {
    if (mode === "revision" || mode === "resultados") {
      state.file = data.file;
      state.calculated = true;
      state.phaseIndex = data.phases.length;
      state.includeSin = false;
      data.routes.forEach(function (route) {
        if (route.estado === "INDETERMINADO") {
          state.decisions[route.id_ruta] = { action: "USAR_MEDIANA", cost: "" };
        }
      });
      renderFileInfo();
      document.getElementById("cas-progress").style.width = "100%";
      renderPhases();
      renderCalcSummary();
      document.getElementById("cas-to-step-3").disabled = false;
      if (mode === "revision") {
        setStep(3);
      } else {
        state.applied = true;
        setStep(4);
        renderResults();
      }
    }
  }

  function routeFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    if (hash === "tech") {
      openTech();
      setStep(1);
    } else if (hash === "revision") {
      useDemoState("revision");
    } else if (hash === "resultados") {
      useDemoState("resultados");
    }
  }

  function init() {
    renderFileInfo();
    setStep(1);

    document.getElementById("cas-pick-file").addEventListener("click", function () {
      document.getElementById("cas-file").click();
    });
    document.getElementById("cas-file").addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/\.xlsx$/i.test(file.name)) {
        window.UI.toast(t("Formato no válido", "Invalid format"), t("Selecciona un archivo .xlsx.", "Select an .xlsx file."), "warn");
        return;
      }
      state.file = file.name;
      renderFileInfo();
      window.UI.toast(t("Archivo cargado", "File uploaded"), file.name, "ok");
    });
    document.getElementById("cas-sample-file").addEventListener("click", setSampleFile);
    document.getElementById("cas-to-step-2").addEventListener("click", function () {
      setStep(2);
    });
    document.getElementById("cas-calc-btn").addEventListener("click", calculate);
    document.getElementById("cas-to-step-3").addEventListener("click", function () {
      setStep(3);
    });
    document.getElementById("cas-include-sin").addEventListener("change", function (event) {
      state.includeSin = event.target.checked;
      renderReview();
    });
    document.getElementById("cas-fill-median").addEventListener("click", function () {
      reviewRoutes().forEach(function (route) {
        var decision = ensureDecision(route);
        if (decision.action === "PENDIENTE") decision.action = "USAR_MEDIANA";
      });
      renderReview();
      window.UI.toast(t("Decisiones aplicadas", "Decisions applied"), t("Los casos pendientes usarán la mediana.", "Pending cases will use the median."), "ok");
    });
    document.getElementById("cas-to-step-4").addEventListener("click", function () {
      var invalid = reviewRoutes().filter(function (route) {
        var decision = ensureDecision(route);
        return decision.action === "COSTO_MANUAL" && !decision.cost;
      });
      if (invalid.length) {
        window.UI.toast(t("Falta el costo manual", "Missing manual cost"), t("Captura un costo para los casos marcados como costo manual.", "Enter a cost for cases marked as manual cost."), "warn");
        return;
      }
      setStep(4);
    });
    document.getElementById("cas-apply").addEventListener("click", applyChanges);
    document.getElementById("cas-reset").addEventListener("click", resetDemo);

    document.querySelectorAll("[data-cas-step]").forEach(function (button) {
      button.addEventListener("click", function () {
        setStep(Number(button.getAttribute("data-cas-step")));
      });
    });

    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-tech-open]")) openTech();
    });

    document.addEventListener("change", function (event) {
      var select = event.target.closest("[data-review-select]");
      if (select) {
        var id = select.getAttribute("data-review-select");
        var decision = state.decisions[id] || { action: "PENDIENTE", cost: "" };
        decision.action = select.value;
        state.decisions[id] = decision;
        renderReview();
        return;
      }
    });

    document.addEventListener("input", function (event) {
      var input = event.target.closest("[data-review-cost]");
      if (input) {
        var id = input.getAttribute("data-review-cost");
        var decision = state.decisions[id] || { action: "PENDIENTE", cost: "" };
        decision.cost = input.value;
        state.decisions[id] = decision;
      }
    });

    window.addEventListener("languagechange", function () {
      window.UI.closeModal();
      if (state.applied) renderResults();
      else if (state.step === 3) renderReview();
      else if (state.step === 4) renderPlan();
      else if (state.step === 2) {
        renderPhases();
        if (state.calculated) renderCalcSummary();
        renderFileChip();
      }
      renderFileInfo();
    });

    routeFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
