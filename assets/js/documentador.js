(function () {
  var STORAGE_KEY = "portafolio-documentador-v1";
  var source = window.MOCK.documentador;

  var STATUS = {
    finalizado: { es: "Finalizado", en: "Finished", cls: "badge-ok" },
    documentador: { es: "En proceso Documentador", en: "Document clerk", cls: "badge-warn" },
    jefe: { es: "En proceso Tráfico", en: "Traffic review", cls: "badge-warn" },
    facturacion: { es: "En proceso Facturación", en: "Billing review", cls: "badge-info" },
    ready: { es: "Listo para liquidar", en: "Ready to settle", cls: "badge-accent" },
    settled: { es: "Liquidado", en: "Settled", cls: "badge-ok" },
    rejected: { es: "Rechazado", en: "Rejected", cls: "badge-bad" }
  };

  var STAGES = [
    { es: "Finalizado", en: "Finished" },
    { es: "Documentador", en: "Document clerk" },
    { es: "Jefe de Tráfico", en: "Traffic lead" },
    { es: "Facturación", en: "Billing" },
    { es: "Listo para liquidar", en: "Ready to settle" }
  ];

  var ROLES = {
    documentador: {
      es: "Documentador",
      en: "Document clerk",
      noteEs: "Puedes capturar montos y marcar evidencias en la etapa Documentador. Cambia de rol para ver las demás etapas.",
      noteEn: "You can enter amounts and mark evidence during the Document clerk stage. Switch roles to see the other stages."
    },
    jefe: {
      es: "Jefe de Tráfico",
      en: "Traffic lead",
      noteEs: "Puedes aceptar o rechazar evidencias y modificar montos en la etapa Jefe de Tráfico.",
      noteEn: "You can accept or reject evidence and edit amounts during the Traffic lead stage."
    },
    facturacion: {
      es: "Facturación",
      en: "Billing",
      noteEs: "Puedes consultar el expediente, marcar evidencias en la etapa Facturación y descargar la factura.",
      noteEn: "You can review the file, mark evidence during the Billing stage and download the invoice."
    },
    admin: {
      es: "Administrador",
      en: "Administrator",
      noteEs: "Tienes acceso completo a todas las etapas y a la reapertura del expediente.",
      noteEn: "You have full access to every stage and can reopen the file."
    }
  };

  var saved = window.UI.store.get(STORAGE_KEY, null);
  var state = {
    role: saved && ROLES[saved.role] ? saved.role : "documentador",
    view: "home",
    selectedTrip: null,
    selectedReembarque: null,
    filters: { q: "", status: "all", type: "all", exception: "all" },
    overrides: saved && saved.overrides ? saved.overrides : {}
  };

  function t(es, en) {
    return window.I18N.t(es, en);
  }

  function persist() {
    window.UI.store.set(STORAGE_KEY, { role: state.role, overrides: state.overrides });
  }

  function escape(value) {
    return window.UI.escape(value);
  }

  function getBaseTrip(id) {
    for (var i = 0; i < source.trips.length; i += 1) {
      if (source.trips[i].id === id) return source.trips[i];
    }
    return null;
  }

  function getTrip(id) {
    var base = getBaseTrip(id);
    if (!base) return null;
    var copy = JSON.parse(JSON.stringify(base));
    var override = state.overrides[id];
    if (override) {
      if (override.evidence) {
        copy.evidence.forEach(function (item) {
          if (Object.prototype.hasOwnProperty.call(override.evidence, item.key)) {
            item.status = override.evidence[item.key];
          }
        });
      }
      if (override.expenses) {
        copy.expenses.forEach(function (item) {
          if (override.expenses[item.id]) {
            Object.keys(override.expenses[item.id]).forEach(function (key) {
              item[key] = override.expenses[item.id][key];
            });
          }
        });
      }
      if (override.exception !== undefined) copy.exception = override.exception;
    }
    return copy;
  }

  function baseTrips() {
    return source.trips
      .filter(function (trip) {
        return !trip.relatedOf;
      })
      .map(function (trip) {
        return getTrip(trip.id);
      });
  }

  function evidencePercent(trip) {
    if (!trip.evidence.length) return 0;
    var loaded = trip.evidence.filter(function (item) {
      return item.loaded;
    }).length;
    return Math.round((loaded / trip.evidence.length) * 100);
  }

  function statusLabel(status) {
    var meta = STATUS[status] || STATUS.documentador;
    return t(meta.es, meta.en);
  }

  function statusBadge(status) {
    var meta = STATUS[status] || STATUS.documentador;
    return '<span class="badge ' + meta.cls + '">' + escape(statusLabel(status)) + "</span>";
  }

  function stageName(index) {
    var stage = STAGES[index] || STAGES[0];
    return t(stage.es, stage.en);
  }

  function stageBar(trip) {
    var html = '<div class="demo-stepper">';
    STAGES.forEach(function (stage, index) {
      var cls = "stage";
      if (trip.status === "settled") {
        cls += " is-done";
      } else if (index < trip.stage) {
        cls += " is-done";
      } else if (index === trip.stage) {
        cls += trip.status === "rejected" ? " is-bad" : " is-current";
      }
      html +=
        '<div class="' + cls + '"><span class="dot"></span><span class="name">' +
        escape(stageName(index)) +
        "</span></div>";
    });
    html += "</div>";
    return html;
  }

  function canMarkEvidence(role, trip) {
    if (role === "admin") return true;
    if (trip.status === "finalizado" || trip.status === "settled") return false;
    if (role === "documentador") return trip.stage === 1;
    if (role === "jefe") return trip.stage === 2;
    if (role === "facturacion") return trip.stage === 3;
    return false;
  }

  function canEditAmount(role, trip) {
    if (role === "admin") return true;
    if (role === "documentador") return trip.stage === 1;
    if (role === "jefe") return trip.stage === 2;
    return false;
  }

  function canReviewExpense(role, trip) {
    if (role === "admin") return true;
    return role === "jefe" && trip.stage === 2;
  }

  function canEditException(role, trip) {
    if (role === "admin") return true;
    return role === "documentador" && trip.stage === 1 && trip.status !== "settled";
  }

  function markClass(status) {
    if (status === "accepted") return "is-ok";
    if (status === "rejected") return "is-bad";
    return "";
  }

  function relatedIds(trip) {
    var list = [trip.id];
    (trip.related || []).forEach(function (id) {
      if (list.indexOf(id) === -1) list.push(id);
    });
    return list;
  }

  function relatedChips(trip) {
    return relatedIds(trip)
      .map(function (id, index) {
        var related = getTrip(id);
        var isBad = related && related.exception === "No realizado";
        var cls = "related-chip" + (index === 0 ? " is-base" : "") + (isBad ? " is-bad" : "");
        if (index === 0) {
          return '<span class="' + cls + '">' + escape(id) + "</span>";
        }
        return (
          '<button type="button" class="' + cls + '" data-trip-link="' + escape(id) + '">' +
          escape(id) +
          "</button>"
        );
      })
      .join("");
  }

  function filteredTrips() {
    return baseTrips().filter(function (trip) {
      var q = state.filters.q.trim().toLowerCase();
      var haystack = [trip.id, trip.client, trip.operator, trip.unit, trip.route, trip.reference]
        .join(" ")
        .toLowerCase();
      if (q && haystack.indexOf(q) === -1) return false;

      if (state.filters.status !== "all") {
        if (state.filters.status === "process") {
          if (["documentador", "jefe", "facturacion"].indexOf(trip.status) === -1) return false;
        } else if (trip.status !== state.filters.status) {
          return false;
        }
      }

      if (state.filters.type !== "all" && trip.type !== state.filters.type) return false;
      if (state.filters.exception !== "all") {
        if (state.filters.exception === "Cambio Origen Destino" && trip.exception !== "Cambio Origen Destino") return false;
        if (state.filters.exception === "Reembarque" && trip.exception !== "Reembarque") return false;
        if (state.filters.exception === "No realizado" && trip.exception !== "No realizado") return false;
      }
      return true;
    });
  }

  function renderRoleNote() {
    var note = document.getElementById("doc-role-note");
    if (!note) return;
    var meta = ROLES[state.role];
    note.innerHTML =
      "<strong>" + escape(t("Rol activo:", "Active role:")) + " " + escape(t(meta.es, meta.en)) + ".</strong> " +
      escape(t(meta.noteEs, meta.noteEn));
  }

  function renderKpis() {
    var trips = baseTrips();
    var counts = {
      finalizado: 0,
      settled: 0,
      process: 0,
      ready: 0,
      rejected: 0
    };
    trips.forEach(function (trip) {
      if (trip.status === "finalizado") counts.finalizado += 1;
      else if (trip.status === "settled") counts.settled += 1;
      else if (trip.status === "ready") counts.ready += 1;
      else if (trip.status === "rejected") counts.rejected += 1;
      else counts.process += 1;
    });
    var evidenceValues = trips.map(evidencePercent);
    var evidenceAvg = evidenceValues.length
      ? Math.round(evidenceValues.reduce(function (a, b) { return a + b; }, 0) / evidenceValues.length)
      : 0;

    var html =
      '<div class="kpi"><span class="num">' + counts.finalizado + '</span><span class="label">' + escape(t("Finalizados", "Finished")) + "</span></div>" +
      '<div class="kpi k-ok"><span class="num">' + counts.settled + '</span><span class="label">' + escape(t("Liquidados", "Settled")) + "</span></div>" +
      '<div class="kpi k-warn"><span class="num">' + counts.process + '</span><span class="label">' + escape(t("En proceso", "In process")) + "</span></div>" +
      '<div class="kpi k-accent"><span class="num">' + counts.ready + '</span><span class="label">' + escape(t("Listos para liquidar", "Ready to settle")) + "</span></div>" +
      '<div class="kpi k-bad"><span class="num">' + counts.rejected + '</span><span class="label">' + escape(t("Rechazados", "Rejected")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + evidenceAvg + '%</span><span class="label">' + escape(t("Evidencias cargadas", "Evidence uploaded")) + "</span></div>";
    document.getElementById("doc-kpis").innerHTML = html;
  }

  function renderTable() {
    var rows = filteredTrips();
    var all = baseTrips();
    document.getElementById("doc-count").textContent = t(
      "Mostrando " + rows.length + " de " + all.length + " viajes.",
      "Showing " + rows.length + " of " + all.length + " trips."
    );
    var tbody = document.getElementById("doc-tbody");
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="11"><div class="empty-state"><strong>' +
        escape(t("Sin viajes con esos filtros", "No trips match those filters")) +
        "</strong>" +
        escape(t("Limpia los filtros para ver el listado completo.", "Clear the filters to see the full list.")) +
        "</div></td></tr>";
      return;
    }

    tbody.innerHTML = rows
      .map(function (trip) {
        var pct = evidencePercent(trip);
        var related = (trip.related || []).length
          ? trip.related
              .map(function (id) {
                var rel = getTrip(id);
                var bad = rel && rel.exception === "No realizado";
                return '<span class="' + (bad ? "text-bad" : "") + '">' + escape(id) + "</span>";
              })
              .join(", ")
          : '<span class="muted">—</span>';
        return (
          "<tr>" +
          '<td><span class="trip-code">' + escape(trip.id) + "</span></td>" +
          '<td><span class="unit-code">' + escape(trip.unit) + "</span></td>" +
          "<td>" + escape(trip.client) + "</td>" +
          "<td>" + escape(trip.operator) + "</td>" +
          "<td>" + escape(t(trip.type, trip.type === "Vacío" ? "Empty" : trip.type === "Reparto" ? "Dispatch" : "Loaded")) + "</td>" +
          "<td>" + (trip.exception ? escape(trip.exception === "Cambio Origen Destino" ? t("Cambio Origen Destino", "Origin/destination change") : trip.exception === "Reembarque" ? t("Reembarque", "Reshipment") : t("No realizado", "Not completed")) : '<span class="muted">—</span>') + "</td>" +
          '<td class="mono">' + related + "</td>" +
          '<td class="mono">' + escape(window.UI.date(trip.date)) + "</td>" +
          '<td><div class="progress-line"><span class="progress-track"><span class="progress-fill ' + (pct < 50 ? "is-bad" : pct < 100 ? "is-warn" : "is-ok") + '" style="width:' + pct + '%"></span></span><span>' + pct + "%</span></div></td>" +
          '<td><div class="status-cell">' + statusBadge(trip.status) + '<span class="status-sub">' + escape(stageName(trip.stage)) + "</span></div></td>" +
          '<td><div class="row-actions"><button class="link-btn" type="button" data-trip-open="' + escape(trip.id) + '">' + escape(t("Ver", "View")) + "</button></div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderReadyPanel() {
    var container = document.getElementById("doc-ready-panel");
    if (!container) return;
    if (state.role !== "facturacion" && state.role !== "admin") {
      container.innerHTML = "";
      return;
    }
    var ready = baseTrips().filter(function (trip) {
      return trip.status === "ready";
    });
    if (!ready.length) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML =
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>' +
      escape(t("Listos para liquidar", "Ready to settle")) +
      "</h2><p>" +
      escape(t("Expedientes aprobados por Facturación.", "Files approved by Billing.")) +
      '</p></div><span class="badge badge-accent">' + ready.length + "</span></div>" +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>' +
      escape(t("Viaje", "Trip")) + "</th><th>" + escape(t("Cliente", "Customer")) + "</th><th>" +
      escape(t("Unidad", "Unit")) + "</th><th>" + escape(t("Evidencias", "Evidence")) + "</th><th></th></tr></thead><tbody>" +
      ready
        .map(function (trip) {
          return (
            "<tr><td><span class=\"trip-code\">" + escape(trip.id) + "</span></td><td>" +
            escape(trip.client) + "</td><td>" + escape(trip.unit) + "</td><td>" +
            evidencePercent(trip) + '%</td><td><button class="link-btn" type="button" data-trip-open="' +
            escape(trip.id) + '">' + escape(t("Abrir", "Open")) + "</button></td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div>";
  }

  function renderHome() {
    renderRoleNote();
    renderKpis();
    renderTable();
    renderReadyPanel();
  }

  function evidenceRow(trip, item, canMark) {
    var badge = "";
    if (!item.loaded) badge = '<span class="badge badge-neutral">' + escape(t("No cargado", "Not uploaded")) + "</span>";
    else if (!item.status) badge = '<span class="badge badge-neutral">' + escape(t("Sin revisar", "Not reviewed")) + "</span>";
    var disabledAccept = !item.loaded || !canMark;
    var disabledReject = !canMark;
    return (
      '<div class="doc-item"><div class="doc-name"><span class="mark ' + markClass(item.status) + '"></span><span>' +
      escape(item.label) + '<span class="doc-hint">' + escape(item.hint) + "</span></span>" + badge + "</div>" +
      '<div class="doc-actions"><div class="segmented">' +
      '<button type="button" data-evi-action="accepted" data-trip-id="' + escape(trip.id) + '" data-doc-key="' + escape(item.key) + '" aria-pressed="' + String(item.status === "accepted") + '"' + (disabledAccept ? " disabled" : "") + ">" + escape(t("Aceptar", "Accept")) + "</button>" +
      '<button type="button" data-evi-action="rejected" data-trip-id="' + escape(trip.id) + '" data-doc-key="' + escape(item.key) + '" aria-pressed="' + String(item.status === "rejected") + '"' + (disabledReject ? " disabled" : "") + ">" + escape(t("Rechazar", "Reject")) + "</button>" +
      "</div>" +
      '<button class="link-btn is-muted" type="button" data-doc-viewer="' + escape(trip.id) + '" data-doc-title="' + escape(item.label) + '">' + escape(t("ver", "view")) + "</button>" +
      "</div></div>"
    );
  }

  function expenseRow(trip, expense, canAmount, canReview) {
    var mark = expense.status === "accepted" ? "is-ok" : expense.status === "rejected" ? "is-bad" : "";
    var kindLabel =
      expense.kind === "anticipo"
        ? t("Anticipo", "Advance")
        : expense.kind === "extra"
        ? t("Gasto extra", "Extra expense")
        : t("Comprobación", "Expense check");
    var html =
      '<div class="doc-item"><div class="doc-name"><span class="mark ' + mark + '"></span><span>' +
      escape(expense.label) + '<span class="doc-hint">' + escape(kindLabel) + "</span></span></div>" +
      '<div class="doc-actions"><span class="doc-amounts">' +
      escape(t("Sistema", "System")) + ": " + window.UI.money(expense.system) +
      " · " + escape(t("Autorizado", "Authorized")) + ": " + window.UI.money(expense.authorized) +
      "</span>";
    if (canAmount) {
      html +=
        '<input class="amount-input" type="number" min="0" step="0.01" value="' + escape(expense.authorized) + '" data-exp-input="' + escape(expense.id) + '" data-trip-id="' + escape(trip.id) + '" aria-label="' + escape(t("Monto autorizado", "Authorized amount")) + '">' +
        '<button class="link-btn" type="button" data-exp-save="' + escape(expense.id) + '" data-trip-id="' + escape(trip.id) + '">' + escape(t("Guardar", "Save")) + "</button>";
    }
    if (canReview) {
      html +=
        '<div class="segmented">' +
        '<button type="button" data-exp-action="accepted" data-exp-id="' + escape(expense.id) + '" data-trip-id="' + escape(trip.id) + '" aria-pressed="' + String(expense.status === "accepted") + '">' + escape(t("Aceptar", "Accept")) + "</button>" +
        '<button type="button" data-exp-action="rejected" data-exp-id="' + escape(expense.id) + '" data-trip-id="' + escape(trip.id) + '" aria-pressed="' + String(expense.status === "rejected") + '">' + escape(t("Rechazar", "Reject")) + "</button>" +
        "</div>";
    }
    html +=
      '<button class="link-btn is-muted" type="button" data-doc-viewer="' + escape(trip.id) + '" data-doc-title="' + escape(expense.label) + '">' + escape(t("ver", "view")) + "</button>" +
      "</div></div>";
    return html;
  }

  function renderExpenses(trip) {
    var canAmount = canEditAmount(state.role, trip);
    var canReview = canReviewExpense(state.role, trip);
    var groups = [
      { key: "anticipo", es: "Anticipos", en: "Advances" },
      { key: "comprobacion", es: "Comprobaciones", en: "Expense checks" },
      { key: "extra", es: "Gastos extra", en: "Extra expenses" }
    ];
    return groups
      .map(function (group) {
        var items = trip.expenses.filter(function (expense) {
          return expense.kind === group.key;
        });
        if (!items.length) return "";
        return (
          '<p class="panel-title" style="margin:12px 0 2px">' + escape(t(group.es, group.en)) + "</p>" +
          '<div class="doc-list">' +
          items
            .map(function (expense) {
              return expenseRow(trip, expense, canAmount, canReview);
            })
            .join("") +
          "</div>"
        );
      })
      .join("");
  }

  function renderVouchers(trip) {
    if (!trip.vouchers.length) {
      return '<p class="muted tiny" style="margin:0">' + escape(t("Sin vales relacionados para el viaje.", "No vouchers linked to this trip.")) + "</p>";
    }
    return (
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>' +
      escape(t("Consecutivo", "Voucher")) + "</th><th>" + escape(t("Tipo", "Type")) + "</th><th>" +
      escape(t("Estatus", "Status")) + "</th><th class=\"num\">" + escape(t("Monto", "Amount")) + "</th></tr></thead><tbody>" +
      trip.vouchers
        .map(function (voucher) {
          return (
            "<tr><td class=\"mono\">" + escape(voucher.id) + "</td><td>" + escape(t(voucher.type, voucher.type === "Diesel" ? "Diesel" : voucher.type === "Urea" ? "Urea" : "Wash")) + "</td><td>" + escape(t(voucher.status, voucher.status === "Aceptado" ? "Accepted" : voucher.status === "Edición" ? "Edited" : "Cancelled")) + '</td><td class="num">' + window.UI.money(voucher.amount) + "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  var HISTORY_ACTION_EN = {
    "Expediente creado": "File created",
    "Enviado a revisión": "Sent to review",
    "Revisión en tráfico": "Traffic review",
    "Revisión de facturación": "Billing review",
    "Devuelto al Documentador": "Returned to document clerk"
  };

  var HISTORY_NOTE_EN = {
    "Se cargaron las evidencias iniciales.": "Initial evidence was uploaded.",
    "Checklist de evidencias completo.": "Evidence checklist complete.",
    "Se validaron comprobaciones y montos.": "Expense checks and amounts were validated.",
    "Expediente listo para liquidar.": "File ready to settle.",
    "Corregir comprobante de entrega.": "Fix the delivery receipt."
  };

  var HISTORY_ROLE_EN = {
    "Documentador": "Document clerk",
    "Jefe de Tráfico": "Traffic lead",
    "Facturación": "Billing"
  };

  var HISTORY_ACTOR_EN = {
    "Usuario Demo 01": "Demo User 01",
    "Usuario Demo 02": "Demo User 02",
    "Usuario Demo 03": "Demo User 03",
    "Usuario Demo 04": "Demo User 04"
  };

  function renderHistory(trip) {
    return (
      '<div class="history-list">' +
      trip.history
        .map(function (item) {
          return (
            '<div class="history-item"><strong>' + escape(t(item.action, HISTORY_ACTION_EN[item.action] || item.action)) + "</strong>" +
            "<span>" + escape(t(item.role, HISTORY_ROLE_EN[item.role] || item.role)) + " · " + escape(t(item.actor, HISTORY_ACTOR_EN[item.actor] || item.actor)) + " · " + escape(window.UI.date(item.date, true)) + "</span>" +
            "<p>" + escape(t(item.note, HISTORY_NOTE_EN[item.note] || item.note)) + "</p></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderDetail(id) {
    var trip = getTrip(id);
    var container = document.getElementById("doc-detail");
    if (!trip) {
      container.innerHTML =
        '<div class="panel"><p class="muted">' + escape(t("Viaje no encontrado.", "Trip not found.")) + '</p><button class="btn btn-secondary btn-sm" type="button" data-back-home>' + escape(t("Volver", "Back")) + "</button></div>";
      return;
    }

    var canMark = canMarkEvidence(state.role, trip);
    var hiddenEvidence = trip.reembarque && getTrip(trip.reembarque.complementId) && new Date(trip.date.replace(" ", "T")) < new Date(getTrip(trip.reembarque.complementId).date.replace(" ", "T"));
    var roles = ROLES[state.role];
    var invoiceDisabled = state.role !== "facturacion" && state.role !== "admin";

    container.innerHTML =
      '<button class="back-link" type="button" data-back-home><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>' + escape(t("Volver al listado", "Back to list")) + "</button>" +
      '<div class="view-head"><div><h2>' + escape(t("Viaje", "Trip")) + ' <span class="trip-code">' + escape(trip.id) + "</span></h2><p>" + escape(trip.client) + " · " + escape(trip.operator) + " · " + escape(trip.unit) + "</p></div>" + statusBadge(trip.status) + "</div>" +
      '<div class="meta-grid">' +
      '<div class="meta"><span class="k">' + escape(t("Cliente", "Customer")) + '</span><span class="v">' + escape(trip.client) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Unidad", "Unit")) + '</span><span class="v">' + escape(trip.unit) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Operador", "Operator")) + '</span><span class="v">' + escape(trip.operator) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Ruta", "Route")) + '</span><span class="v">' + escape(trip.route) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Carta porte", "Bill of lading")) + '</span><span class="v mono">' + escape(trip.ccp) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Factura", "Invoice")) + '</span><span class="v mono">' + escape(trip.invoice) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Referencia", "Reference")) + '</span><span class="v mono">' + escape(trip.reference) + "</span></div>" +
      '<div class="meta"><span class="k">' + escape(t("Inicio / fin", "Start / end")) + '</span><span class="v mono">' + escape(window.UI.date(trip.start)) + " — " + escape(window.UI.date(trip.end)) + "</span></div>" +
      "</div>" +
      stageBar(trip) +
      '<div class="kpis" style="margin-top:12px">' +
      '<div class="kpi"><span class="num">' + trip.evidence.length + '</span><span class="label">' + escape(t("Evidencias esperadas", "Expected evidence")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + trip.evidence.filter(function (item) { return item.loaded; }).length + '</span><span class="label">' + escape(t("Cargadas", "Uploaded")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + trip.expenses.length + '</span><span class="label">' + escape(t("Comprobaciones", "Expense checks")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + trip.vouchers.length + '</span><span class="label">' + escape(t("Vales", "Vouchers")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + trip.history.length + '</span><span class="label">' + escape(t("Movimientos", "Movements")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + evidencePercent(trip) + '%</span><span class="label">' + escape(t("Evidencias", "Evidence")) + "</span></div>" +
      "</div>" +
      '<div class="info-note" style="margin-bottom:16px">' + escape(t(roles.noteEs, roles.noteEn)) + "</div>" +
      '<div class="doc-columns">' +
      '<div class="doc-stack">' +
      '<section class="doc-section"><h3>' + escape(t("Evidencias de cliente", "Customer evidence")) + '<span class="count">' + trip.evidence.filter(function (item) { return item.loaded; }).length + " / " + trip.evidence.length + "</span></h3>" +
      (hiddenEvidence
        ? '<div class="info-note is-warn">' + escape(t("Las evidencias de este viaje se gestionan en el viaje complementario del reembarque.", "Evidence for this trip is managed in the reshipment companion trip.")) + " " + (trip.reembarque ? '<button class="link-btn" type="button" data-trip-link="' + escape(trip.reembarque.complementId) + '">' + escape(trip.reembarque.complementId) + "</button>" : "") + "</div>"
        : '<div class="doc-list">' + trip.evidence.map(function (item) { return evidenceRow(trip, item, canMark); }).join("") + "</div>" +
          (canMark ? "" : '<p class="muted tiny" style="margin:10px 0 0">' + escape(t("Cambia de rol o de viaje para editar las evidencias de esta etapa.", "Switch role or trip to edit evidence at this stage.")) + "</p>")) +
      "</section>" +
      '<section class="doc-section"><h3>' + escape(t("Comprobaciones y anticipos", "Expenses and advances")) + "</h3>" + renderExpenses(trip) + "</section>" +
      '<section class="doc-section"><h3>' + escape(t("Historial de movimientos", "Movement history")) + "</h3>" + renderHistory(trip) + "</section>" +
      "</div>" +
      '<aside class="doc-stack">' +
      '<section class="doc-section"><h3>' + escape(t("Circuito de viajes", "Trip circuit")) + "</h3>" +
      '<div class="related-chips">' + relatedChips(trip) + "</div>" +
      '<p class="muted tiny" style="margin:12px 0 0">' + escape(t("El viaje base y sus relacionados forman un circuito. Los relacionados no se documentan por separado.", "The base trip and its related trips form a circuit. Related trips are not documented separately.")) + "</p>" +
      (trip.reembarque ? '<div class="info-note" style="margin-top:10px"><strong>' + escape(t("Reembarque:", "Reshipment:")) + "</strong> " + escape(trip.reembarque.reason) + ' <button class="link-btn" type="button" data-trip-link="' + escape(trip.reembarque.complementId) + '">' + escape(t("Ver complementario", "View companion")) + "</button></div>" : "") +
      "</section>" +
      '<section class="doc-section"><h3>' + escape(t("Tipo de viaje por excepción", "Trip type by exception")) + "</h3>" +
      (canEditException(state.role, trip)
        ? '<div class="field"><label for="doc-exception-edit">' + escape(t("Excepción informativa", "Informational exception")) + '</label><select id="doc-exception-edit" data-exception-select="' + escape(trip.id) + '"><option value="">' + escape(t("Sin excepción", "No exception")) + '</option><option value="Cambio Origen Destino"' + (trip.exception === "Cambio Origen Destino" ? " selected" : "") + ">" + escape(t("Cambio Origen Destino", "Origin/destination change")) + '</option><option value="Reembarque"' + (trip.exception === "Reembarque" ? " selected" : "") + ">" + escape(t("Reembarque", "Reshipment")) + '</option><option value="No realizado"' + (trip.exception === "No realizado" ? " selected" : "") + ">" + escape(t("No realizado", "Not completed")) + "</option></select></div>"
        : '<p class="tiny" style="margin:0"><strong>' + escape(t("Tipo base:", "Base type:")) + "</strong> " + escape(t(trip.type, trip.type === "Vacío" ? "Empty" : trip.type === "Reparto" ? "Dispatch" : "Loaded")) + "<br><strong>" + escape(t("Excepción:", "Exception:")) + "</strong> " + escape(trip.exception || "—") + "</p>") +
      "</section>" +
      '<section class="doc-section"><h3>' + escape(t("Vales en LIS", "LIS vouchers")) + '<span class="count">' + trip.vouchers.length + "</span></h3>" + renderVouchers(trip) + "</section>" +
      '<section class="doc-section"><h3>' + escape(t("Factura", "Invoice")) + "</h3>" +
      '<div class="row-actions"><button class="btn btn-secondary btn-sm" type="button" data-invoice="pdf"' + (invoiceDisabled ? " disabled" : "") + ">" + escape(t("PDF", "PDF")) + '</button><button class="btn btn-secondary btn-sm" type="button" data-invoice="xml"' + (invoiceDisabled ? " disabled" : "") + ">" + escape(t("XML", "XML")) + "</button></div>" +
      '<p class="muted tiny" style="margin:10px 0 0">' + escape(invoiceDisabled ? t("Disponible para Facturación y Administrador.", "Available to Billing and Administrator.") : t("Descarga simulada en esta demo.", "Simulated download in this demo.")) + "</p>" +
      "</section>" +
      "</aside></div>";
  }

  function renderRepartos() {
    var container = document.getElementById("doc-repartos");
    container.innerHTML =
      '<div class="view-head"><div><h2>' + escape(t("Repartos agrupados por circuito", "Dispatches grouped by circuit")) + "</h2><p>" + escape(t("Cada reparto agrupa sus viajes y comparte las evidencias de cliente.", "Each dispatch groups its trips and shares customer evidence.")) + "</p></div><span class=\"badge badge-accent\">" + source.repartos.length + "</span></div>" +
      '<div class="reparto-grid">' +
      source.repartos
        .map(function (group) {
          var trips = group.trips.map(getTrip).filter(Boolean);
          return (
            '<article class="reparto-card"><h3>' + escape(t("Reparto", "Dispatch")) + " " + escape(group.carta) + "</h3>" +
            '<p class="rep-meta">' + escape(group.client) + " · " + escape(t("Referencia", "Reference")) + ": " + escape(group.reference) + "</p>" +
            '<div class="reparto-trips">' +
            trips
              .map(function (trip) {
                return (
                  '<div class="reparto-trip"><div><span class="trip-code">' + escape(trip.id) + "</span> <span>" + escape(trip.reference) + " · " + escape(trip.unit) + " · " + escape(trip.operator) + '</span></div><div><span class="strong">' + escape(window.UI.date(trip.date)) + "</span> " + statusBadge(trip.status) + "</div></div>"
                );
              })
              .join("") +
            '</div><button class="btn btn-secondary btn-sm" type="button" data-trip-open="' + escape(trips[0].id) + '">' + escape(t("Abrir primer viaje", "Open first trip")) + "</button></article>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderReembarques() {
    var container = document.getElementById("doc-reembarques");
    container.innerHTML =
      '<div class="view-head"><div><h2>' + escape(t("Reembarques", "Reshipments")) + "</h2><p>" + escape(t("Dos circuitos vinculados por una razón operativa.", "Two circuits linked by an operational reason.")) + "</p></div><span class=\"badge badge-accent\">" + source.reembarques.length + "</span></div>" +
      '<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>' + escape(t("Reembarque", "Reshipment")) + "</th><th>" + escape(t("Circuito", "Circuit")) + "</th><th>" + escape(t("Razón", "Reason")) + "</th><th>" + escape(t("Estatus", "Status")) + "</th><th></th></tr></thead><tbody>" +
      source.reembarques
        .map(function (item) {
          var trips = item.trips.map(getTrip).filter(Boolean);
          return (
            "<tr><td class=\"mono\">" + escape(item.id) + "</td><td>" + trips.map(function (trip) { return escape(trip.id); }).join(" · ") + "</td><td>" + escape(item.reason) + "</td><td>" + statusBadge(trips[0].status) + "</td><td><button class=\"link-btn\" type=\"button\" data-reembarque-open=\"" + escape(item.id) + "\">" + escape(t("Ver detalle", "View detail")) + "</button></td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div>";
  }

  function renderReembarqueDetail(id) {
    var item = source.reembarques.filter(function (entry) {
      return entry.id === id;
    })[0];
    var container = document.getElementById("doc-reembarque-detail");
    if (!item) {
      container.innerHTML = '<div class="panel">' + escape(t("Reembarque no encontrado.", "Reshipment not found.")) + "</div>";
      return;
    }
    var trips = item.trips.map(getTrip).filter(Boolean);
    container.innerHTML =
      '<button class="back-link" type="button" data-doc-view="reembarques"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>' + escape(t("Volver a reembarques", "Back to reshipments")) + "</button>" +
      '<div class="view-head"><div><h2>' + escape(item.id) + "</h2><p>" + escape(item.reason) + "</p></div><span class=\"badge badge-accent\">" + escape(t("Reembarque", "Reshipment")) + "</span></div>" +
      '<div class="info-note" style="margin-bottom:16px"><strong>' + escape(t("Razón registrada por", "Reason recorded by")) + ":</strong> " + escape(item.author) + " · " + escape(window.UI.date(item.createdAt, true)) + "</div>" +
      '<div class="reparto-grid">' +
      trips
        .map(function (trip, index) {
          return (
            '<article class="reparto-card"><h3>' + escape(t("Circuito", "Circuit")) + " " + (index + 1) + " · " + escape(trip.id) + "</h3>" +
            '<p class="rep-meta">' + escape(trip.client) + " · " + escape(trip.unit) + " · " + escape(trip.operator) + " · " + escape(trip.reference) + "</p>" +
            '<div class="reparto-trips"><div class="reparto-trip"><span>' + escape(t("Fecha", "Date")) + '</span><span class="strong">' + escape(window.UI.date(trip.date)) + "</span></div>" +
            '<div class="reparto-trip"><span>' + escape(t("Estatus", "Status")) + "</span><span>" + statusBadge(trip.status) + "</span></div>" +
            '<div class="reparto-trip"><span>' + escape(t("Evidencias", "Evidence")) + '</span><span class="strong">' + evidencePercent(trip) + "%</span></div></div>" +
            '<button class="btn btn-secondary btn-sm" type="button" data-trip-open="' + escape(trip.id) + '">' + escape(t("Abrir expediente", "Open file")) + "</button></article>"
          );
        })
        .join("") +
      "</div>";
  }

  function hideViews() {
    ["doc-home", "doc-detail", "doc-repartos", "doc-reembarques", "doc-reembarque-detail"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function updateTabs(view) {
    document.querySelectorAll("[data-doc-view]").forEach(function (btn) {
      var active = btn.getAttribute("data-doc-view") === view;
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function navigate(view, data, updateHash) {
    state.view = view;
    state.selectedTrip = view === "detail" ? data : null;
    state.selectedReembarque = view === "reembarque" ? data : null;
    hideViews();
    updateTabs(view === "detail" || view === "reembarque" ? "" : view);
    if (view === "home") {
      document.getElementById("doc-home").hidden = false;
      renderHome();
    } else if (view === "detail") {
      document.getElementById("doc-detail").hidden = false;
      renderDetail(data);
    } else if (view === "repartos") {
      document.getElementById("doc-repartos").hidden = false;
      renderRepartos();
    } else if (view === "reembarques") {
      document.getElementById("doc-reembarques").hidden = false;
      renderReembarques();
    } else if (view === "reembarque") {
      document.getElementById("doc-reembarque-detail").hidden = false;
      updateTabs("reembarques");
      renderReembarqueDetail(data);
    }
    if (updateHash !== false) {
      var hash = "";
      if (view === "detail") hash = "#viaje=" + data;
      else if (view === "repartos") hash = "#repartos";
      else if (view === "reembarques") hash = "#reembarques";
      else if (view === "reembarque") hash = "#reembarque=" + data;
      else hash = "#inicio";
      history.replaceState(null, "", hash);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function routeFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    if (hash.indexOf("viaje=") === 0) {
      navigate("detail", hash.split("=")[1], false);
    } else if (hash === "repartos") {
      navigate("repartos", null, false);
    } else if (hash === "reembarques") {
      navigate("reembarques", null, false);
    } else if (hash.indexOf("reembarque=") === 0) {
      navigate("reembarque", hash.split("=")[1], false);
    } else if (hash === "tech") {
      openTech();
      navigate("home", null, false);
    } else {
      navigate("home", null, false);
    }
  }

  function updateEvidence(tripId, key, status) {
    var trip = getTrip(tripId);
    if (!trip || !canMarkEvidence(state.role, trip)) {
      window.UI.toast(t("Sin permiso", "Not allowed"), t("Este rol no puede editar evidencias en esta etapa.", "This role cannot edit evidence at this stage."), "warn");
      return;
    }
    var item = trip.evidence.filter(function (entry) {
      return entry.key === key;
    })[0];
    if (!item) return;
    if (!item.loaded && status === "accepted") {
      window.UI.toast(t("No cargado", "Not uploaded"), t("Una evidencia faltante solo se puede rechazar.", "A missing item can only be rejected."), "warn");
      return;
    }
    state.overrides[tripId] = state.overrides[tripId] || {};
    state.overrides[tripId].evidence = state.overrides[tripId].evidence || {};
    var next = item.status === status ? null : status;
    state.overrides[tripId].evidence[key] = next;
    persist();
    renderDetail(tripId);
    window.UI.toast(
      t("Evidencia actualizada", "Evidence updated"),
      next === "accepted" ? t("Marcada como aceptada.", "Marked as accepted.") : next === "rejected" ? t("Marcada como rechazada.", "Marked as rejected.") : t("Sin revisar.", "Not reviewed."),
      next === "rejected" ? "warn" : "ok"
    );
  }

  function updateExpense(tripId, expenseId, status) {
    var trip = getTrip(tripId);
    if (!trip || !canReviewExpense(state.role, trip)) {
      window.UI.toast(t("Sin permiso", "Not allowed"), t("Solo el Jefe de Tráfico puede aceptar o rechazar comprobaciones.", "Only the Traffic lead can accept or reject expense checks."), "warn");
      return;
    }
    state.overrides[tripId] = state.overrides[tripId] || {};
    state.overrides[tripId].expenses = state.overrides[tripId].expenses || {};
    state.overrides[tripId].expenses[expenseId] = state.overrides[tripId].expenses[expenseId] || {};
    var current = state.overrides[tripId].expenses[expenseId].status;
    if (current === undefined) {
      var original = trip.expenses.filter(function (expense) { return expense.id === expenseId; })[0];
      current = original ? original.status : null;
    }
    state.overrides[tripId].expenses[expenseId].status = current === status ? null : status;
    persist();
    renderDetail(tripId);
    window.UI.toast(t("Comprobación actualizada", "Expense check updated"), t("El cambio se guardó en la demo.", "The change was saved in the demo."), "ok");
  }

  function saveAmount(tripId, expenseId) {
    var trip = getTrip(tripId);
    if (!trip || !canEditAmount(state.role, trip)) return;
    var input = document.querySelector('[data-exp-input="' + expenseId + '"]');
    if (!input) return;
    var value = Number(input.value);
    if (isNaN(value) || value < 0) {
      window.UI.toast(t("Monto inválido", "Invalid amount"), t("Ingresa un monto mayor o igual a cero.", "Enter an amount greater than or equal to zero."), "warn");
      return;
    }
    state.overrides[tripId] = state.overrides[tripId] || {};
    state.overrides[tripId].expenses = state.overrides[tripId].expenses || {};
    state.overrides[tripId].expenses[expenseId] = state.overrides[tripId].expenses[expenseId] || {};
    state.overrides[tripId].expenses[expenseId].authorized = value;
    persist();
    renderDetail(tripId);
    window.UI.toast(t("Monto guardado", "Amount saved"), window.UI.money(value), "ok");
  }

  function updateException(tripId, value) {
    var trip = getTrip(tripId);
    if (!trip || !canEditException(state.role, trip)) return;
    state.overrides[tripId] = state.overrides[tripId] || {};
    state.overrides[tripId].exception = value;
    persist();
    renderDetail(tripId);
    window.UI.toast(t("Excepción actualizada", "Exception updated"), value || t("Sin excepción", "No exception"), "ok");
  }

  function openViewer(title) {
    var zoom = 1;
    var panX = 0;
    var panY = 0;
    window.UI.openModal({
      title: t("Visor de evidencia", "Evidence viewer"),
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      bodyHtml:
        '<div class="viewer-stage" data-viewer-stage><div class="viewer-paper" data-viewer-paper>' +
        '<div class="vp-head"><span>' + escape(t("Documento de demostración", "Demo document")) + "</span><span>AC</span></div>" +
        '<div class="vp-title">' + escape(title || t("Evidencia", "Evidence")) + "</div>" +
        '<div class="vp-line"></div><div class="vp-line"></div><div class="vp-line short"></div>' +
        '<div class="vp-box"></div>' +
        '<div class="vp-foot"><span>' + escape(t("Imagen no disponible", "Image not available")) + "</span><span>DEMO</span></div>" +
        "</div></div>" +
        '<div class="viewer-controls"><button class="btn btn-secondary btn-sm" type="button" data-zoom-out>−</button><button class="btn btn-secondary btn-sm" type="button" data-zoom-reset>' + escape(t("Ajustar", "Fit")) + '</button><button class="btn btn-secondary btn-sm" type="button" data-zoom-in>+</button><span data-zoom-label>100%</span></div>' +
        '<p class="viewer-caption">' + escape(t("Vista de demostración. No se carga ningún archivo real.", "Demo view. No real file is loaded.")) + "</p>",
      onMount: function (box) {
        var paper = box.querySelector("[data-viewer-paper]");
        var stage = box.querySelector("[data-viewer-stage]");
        var label = box.querySelector("[data-zoom-label]");
        var dragging = false;
        var startX = 0;
        var startY = 0;

        function apply() {
          paper.style.transform = "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")";
          label.textContent = Math.round(zoom * 100) + "%";
        }

        box.querySelector("[data-zoom-in]").addEventListener("click", function () {
          zoom = Math.min(4, zoom + 0.25);
          apply();
        });
        box.querySelector("[data-zoom-out]").addEventListener("click", function () {
          zoom = Math.max(0.5, zoom - 0.25);
          if (zoom <= 1) { panX = 0; panY = 0; }
          apply();
        });
        box.querySelector("[data-zoom-reset]").addEventListener("click", function () {
          zoom = 1;
          panX = 0;
          panY = 0;
          apply();
        });

        stage.addEventListener("pointerdown", function (event) {
          if (zoom <= 1) return;
          dragging = true;
          startX = event.clientX - panX;
          startY = event.clientY - panY;
          stage.setPointerCapture(event.pointerId);
        });
        stage.addEventListener("pointermove", function (event) {
          if (!dragging) return;
          panX = event.clientX - startX;
          panY = event.clientY - startY;
          apply();
        });
        stage.addEventListener("pointerup", function () {
          dragging = false;
        });
        stage.addEventListener("pointercancel", function () {
          dragging = false;
        });
      }
    });
  }

  function openTech() {
    var body =
      '<div class="tech-summary">' +
      '<div class="tech-block"><h4>' + escape(t("Problema", "Problem")) + "</h4><p>" +
      escape(t("El proceso de validación de evidencias y comprobaciones de viajes estaba repartido entre correos, hojas de cálculo y revisiones manuales. Cada rol necesitaba una vista distinta y no había una trazabilidad única del expediente.", "Trip evidence and expense validation was spread across emails, spreadsheets and manual reviews. Each role needed a different view and there was no single audit trail for the file.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Solución", "Solution")) + "</h4><p>" +
      escape(t("Aplicación web con inicio de sesión, alcance por rol, checklist de evidencias por cliente, captura de montos, flujo Documentador → Jefe de Tráfico → Facturación, visor de documentos, repartos y reembarques. Todo el estado del proyecto se guarda en su propia base, sin escribir en los sistemas de origen.", "Web application with login, role scoping, customer evidence checklist, amount capture, Document clerk → Traffic lead → Billing workflow, document viewer, dispatches and reshipments. All project state is stored in its own database, without writing to source systems.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Stack", "Stack")) + '</h4><div class="tech-stack"><span>FastAPI</span><span>Jinja2</span><span>HTMX</span><span>SQLAlchemy</span><span>SQL Server</span><span>PBKDF2</span><span>Pytest</span><span>SDD</span></div></div>' +
      '<div class="tech-block"><h4>' + escape(t("Mi rol", "My role")) + "</h4><p>" +
      escape(t("Diseñé y desarrollé el flujo completo: modelo de datos, reglas por rol y etapa, endpoints, plantillas, visor y pruebas. La documentación funcional se organizó con especificaciones por iteración (SDD), sin convertirlo en un proceso pesado.", "I designed and built the full workflow: data model, role and stage rules, endpoints, templates, viewer and tests. Functional documentation was organized with per-iteration specifications (SDD), without turning it into a heavy process.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Privacidad en esta demo", "Privacy in this demo")) + "</h4><p>" +
      escape(t("Todos los viajes, clientes, operadores, montos y documentos son ficticios. La demo no lee bases de datos, no envía correos y no ejecuta procesos reales.", "All trips, customers, operators, amounts and documents are fictional. The demo does not read databases, send emails or run real processes.")) +
      "</p></div>" +
      '<div class="tech-note">' + escape(t("Esta reconstrucción estática permite explorar el flujo sin instalar Python ni conectarse a SQL Server.", "This static reconstruction lets you explore the workflow without installing Python or connecting to SQL Server.")) + "</div>" +
      "</div>";
    window.UI.openModal({
      title: t("Documentador de evidencias", "Evidence document manager"),
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
    state.overrides = {};
    state.role = "documentador";
    state.filters = { q: "", status: "all", type: "all", exception: "all" };
    persist();
    document.getElementById("doc-role").value = "documentador";
    document.getElementById("doc-search").value = "";
    document.getElementById("doc-status").value = "all";
    document.getElementById("doc-type").value = "all";
    document.getElementById("doc-exception").value = "all";
    navigate("home");
    window.UI.toast(t("Demo reiniciada", "Demo reset"), t("Los cambios de la sesión se borraron.", "Session changes were cleared."), "ok");
  }

  function init() {
    document.getElementById("doc-role").value = state.role;

    document.addEventListener("click", function (event) {
      var tech = event.target.closest("[data-tech-open]");
      if (tech) {
        openTech();
        return;
      }

      var tripOpen = event.target.closest("[data-trip-open]");
      if (tripOpen) {
        navigate("detail", tripOpen.getAttribute("data-trip-open"));
        return;
      }

      var tripLink = event.target.closest("[data-trip-link]");
      if (tripLink) {
        navigate("detail", tripLink.getAttribute("data-trip-link"));
        return;
      }

      var back = event.target.closest("[data-back-home]");
      if (back) {
        navigate("home");
        return;
      }

      var viewBtn = event.target.closest("[data-doc-view]");
      if (viewBtn) {
        var view = viewBtn.getAttribute("data-doc-view");
        navigate(view);
        return;
      }

      var evi = event.target.closest("[data-evi-action]");
      if (evi) {
        updateEvidence(evi.getAttribute("data-trip-id"), evi.getAttribute("data-doc-key"), evi.getAttribute("data-evi-action"));
        return;
      }

      var expAction = event.target.closest("[data-exp-action]");
      if (expAction) {
        updateExpense(expAction.getAttribute("data-trip-id"), expAction.getAttribute("data-exp-id"), expAction.getAttribute("data-exp-action"));
        return;
      }

      var expSave = event.target.closest("[data-exp-save]");
      if (expSave) {
        saveAmount(expSave.getAttribute("data-trip-id"), expSave.getAttribute("data-exp-save"));
        return;
      }

      var viewer = event.target.closest("[data-doc-viewer]");
      if (viewer) {
        openViewer(viewer.getAttribute("data-doc-title"));
        return;
      }

      var reembarqueOpen = event.target.closest("[data-reembarque-open]");
      if (reembarqueOpen) {
        navigate("reembarque", reembarqueOpen.getAttribute("data-reembarque-open"));
        return;
      }

      var invoice = event.target.closest("[data-invoice]");
      if (invoice) {
        window.UI.toast(t("Descarga simulada", "Simulated download"), t("En la demo no se descarga ningún archivo real.", "No real file is downloaded in the demo."), "ok");
      }
    });

    document.getElementById("doc-role").addEventListener("change", function (event) {
      state.role = event.target.value;
      persist();
      if (state.view === "detail" && state.selectedTrip) renderDetail(state.selectedTrip);
      else if (state.view === "home") renderHome();
      else if (state.view === "repartos") renderRepartos();
      else if (state.view === "reembarques") renderReembarques();
      else if (state.view === "reembarque") renderReembarqueDetail(state.selectedReembarque);
    });

    document.getElementById("doc-search").addEventListener("input", window.UI.debounce(function (event) {
      state.filters.q = event.target.value;
      renderTable();
    }, 120));

    document.getElementById("doc-status").addEventListener("change", function (event) {
      state.filters.status = event.target.value;
      renderTable();
    });
    document.getElementById("doc-type").addEventListener("change", function (event) {
      state.filters.type = event.target.value;
      renderTable();
    });
    document.getElementById("doc-exception").addEventListener("change", function (event) {
      state.filters.exception = event.target.value;
      renderTable();
    });
    document.getElementById("doc-clear").addEventListener("click", function () {
      state.filters = { q: "", status: "all", type: "all", exception: "all" };
      document.getElementById("doc-search").value = "";
      document.getElementById("doc-status").value = "all";
      document.getElementById("doc-type").value = "all";
      document.getElementById("doc-exception").value = "all";
      renderTable();
    });
    document.getElementById("doc-refresh").addEventListener("click", function () {
      renderHome();
      window.UI.toast(t("Datos actualizados", "Data refreshed"), t("La vista se volvió a calcular con los datos ficticios.", "The view was recalculated with fictional data."), "ok");
    });
    document.getElementById("doc-reset").addEventListener("click", resetDemo);

    document.addEventListener("change", function (event) {
      var exceptionSelect = event.target.closest("[data-exception-select]");
      if (exceptionSelect) {
        updateException(exceptionSelect.getAttribute("data-exception-select"), exceptionSelect.value);
      }
    });

    window.addEventListener("languagechange", function () {
      window.UI.closeModal();
      if (state.view === "detail" && state.selectedTrip) renderDetail(state.selectedTrip);
      else if (state.view === "home") renderHome();
      else if (state.view === "repartos") renderRepartos();
      else if (state.view === "reembarques") renderReembarques();
      else if (state.view === "reembarque") renderReembarqueDetail(state.selectedReembarque);
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
