(function () {
  var base = window.MOCK.monitor;
  var AUTH_KEY = "portafolio-monitor-auth";
  var timer = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function t(es, en) {
    return window.I18N.t(es, en);
  }

  function escape(value) {
    return window.UI.escape(value);
  }

  function timeOf(value) {
    var date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString(window.I18N.lang === "en" ? "en-GB" : "es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function clock() {
    return new Date().toLocaleTimeString(window.I18N.lang === "en" ? "en-GB" : "es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function makeInitialLog() {
    return [
      { time: "12:14", text: t("Telemetría general actualizada. Última posición hace 2 minutos.", "General telemetry updated. Last position 2 minutes ago.") },
      { time: "12:12", text: t("Alerta de posición: unidad T-102 sin reporte por más de 15 minutos.", "Position alert: unit T-102 has not reported for more than 15 minutes.") },
      { time: "12:10", text: t("Se detectaron 4 discrepancias entre CCP y pedido.", "4 discrepancies between CCP and order were detected.") },
      { time: "12:06", text: t("Correo simulado enviado al coordinador de tráfico.", "Simulated email sent to the traffic coordinator.") },
      { time: "12:02", text: t("Recuperación: unidad T-103 volvió a reportar posición.", "Recovery: unit T-103 reported position again.") }
    ];
  }

  var state = {
    auth: false,
    live: true,
    units: clone(base.units),
    finalized: clone(base.finalized),
    vp: clone(base.vp),
    discrepancies: clone(base.discrepancies),
    log: makeInitialLog(),
    telemetryMinutes: 2,
    updated: new Date()
  };

  function addLog(text) {
    state.log.unshift({ time: clock().slice(0, 5), text: text });
    state.log = state.log.slice(0, 14);
  }

  function ensureAuthFromStorage() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function saveAuth(value) {
    try {
      if (value) sessionStorage.setItem(AUTH_KEY, "1");
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (error) {
      void error;
    }
  }

  function showDashboard() {
    state.auth = true;
    saveAuth(true);
    document.getElementById("mon-login").hidden = true;
    document.getElementById("mon-dashboard").hidden = false;
    render();
    startTimer();
  }

  function showLogin() {
    state.auth = false;
    saveAuth(false);
    document.getElementById("mon-login").hidden = false;
    document.getElementById("mon-dashboard").hidden = true;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    if (timer) return;
    timer = window.setInterval(tick, 6000);
  }

  function tick() {
    if (!state.auth || !state.live) return;

    state.telemetryMinutes = 0;
    state.updated = new Date();

    state.units.forEach(function (unit) {
      if (unit.state === "ok") {
        unit.minutes += 1;
        if (unit.minutes >= 15) {
          unit.state = "alert";
          addLog(t("Alerta de posición: unidad " + unit.unit + " sin reporte por " + unit.minutes + " minutos.", "Position alert: unit " + unit.unit + " has not reported for " + unit.minutes + " minutes."));
          window.UI.toast(t("Alerta de posición", "Position alert"), unit.unit + " · " + unit.minutes + " min " + t("sin telemetría", "without telemetry"), "warn");
        }
      } else if (unit.state === "alert") {
        unit.minutes += 1;
        if (unit.minutes >= 22) {
          unit.state = "recovered";
          unit.ticks = 0;
          unit.minutes = 0;
          unit.last = new Date().toISOString();
          addLog(t("Recuperación: unidad " + unit.unit + " volvió a reportar posición.", "Recovery: unit " + unit.unit + " reported position again."));
          window.UI.toast(t("Unidad recuperada", "Unit recovered"), unit.unit + " · " + t("volvió a reportar", "reported again"), "ok");
        }
      } else if (unit.state === "recovered") {
        unit.ticks = (unit.ticks || 0) + 1;
        if (unit.ticks >= 3) {
          unit.state = "ok";
          unit.minutes = 0;
          unit.last = new Date().toISOString();
        }
      }
    });

    render();
  }

  function alertCount(list) {
    return list.filter(function (item) { return item.state === "alert"; }).length;
  }

  function renderKpis() {
    var unitsAlert = state.units.filter(function (unit) { return unit.state === "alert"; }).length;
    var unitsRecovered = state.units.filter(function (unit) { return unit.state === "recovered"; }).length;
    document.getElementById("mon-kpis").innerHTML =
      '<div class="kpi k-bad"><span class="num">' + unitsAlert + '</span><span class="label">' + escape(t("Unidades sin posición", "Units without position")) + "</span></div>" +
      '<div class="kpi k-ok"><span class="num">' + unitsRecovered + '</span><span class="label">' + escape(t("Recuperadas", "Recovered")) + "</span></div>" +
      '<div class="kpi k-warn"><span class="num">' + alertCount(state.finalized) + '</span><span class="label">' + escape(t("Viajes finalizados con error", "Finished trips with errors")) + "</span></div>" +
      '<div class="kpi k-warn"><span class="num">' + alertCount(state.vp) + '</span><span class="label">' + escape(t("VP con error", "Scheduled trips with errors")) + "</span></div>" +
      '<div class="kpi k-bad"><span class="num">' + alertCount(state.discrepancies) + '</span><span class="label">' + escape(t("Discrepancias CCP", "CCP discrepancies")) + "</span></div>" +
      '<div class="kpi"><span class="num">' + state.telemetryMinutes + " min</span><span class=\"label\">" + escape(t("Última telemetría", "Last telemetry")) + "</span></div>";
  }

  function statusBadge(kind) {
    if (kind === "alert") return '<span class="mon-badge is-alert">' + escape(t("Alerta", "Alert")) + "</span>";
    if (kind === "recovered") return '<span class="mon-badge is-recovered">' + escape(t("Recuperada", "Recovered")) + "</span>";
    return '<span class="mon-badge is-ok">' + escape(t("Sin alerta", "No alert")) + "</span>";
  }

  function renderFinalized() {
    var list = state.finalized;
    document.getElementById("mon-finalized-count").textContent = alertCount(list) + " " + t("alertas", "alerts");
    document.getElementById("mon-finalized-body").innerHTML = list
      .map(function (item) {
        return (
          '<tr class="' + (item.state === "recovered" ? "is-recovered" : "is-alert") + '"><td><span class="mon-trip">' + escape(item.trip) + "</span><span class=\"status-sub\" style=\"display:block\">" + escape(item.unit) + " · " + escape(item.route) + "</span></td><td>" + escape(item.type) + "</td><td>" + escape(item.error) + '</td><td class="num">' + escape(item.hours) + '</td><td class="num">' + escape(item.speed) + "</td><td>" + statusBadge(item.state) + (item.state === "alert" ? ' <button class="link-btn" type="button" data-mon-fix="finalized" data-mon-id="' + escape(item.trip) + '">' + escape(t("corregir", "fix")) + "</button>" : "") + "</td></tr>"
        );
      })
      .join("");
    document.getElementById("mon-finalized-note").textContent = t(
      "Viajes finalizados con error: " + alertCount(list) + ". Los recuperados se marcan en verde.",
      "Finished trips with errors: " + alertCount(list) + ". Recovered trips are highlighted in green."
    );
  }

  function renderUnits() {
    var list = state.units;
    var alerts = list.filter(function (unit) { return unit.state === "alert"; }).length;
    var recovered = list.filter(function (unit) { return unit.state === "recovered"; }).length;
    document.getElementById("mon-units-count").textContent = alerts + " " + t("en alerta", "in alert") + " · " + recovered + " " + t("recuperadas", "recovered");
    document.getElementById("mon-units-body").innerHTML = list
      .map(function (unit) {
        var rowClass = unit.state === "recovered" ? "is-recovered" : unit.state === "alert" ? "is-alert" : "";
        return (
          '<tr class="' + rowClass + '"><td><span class="mon-trip">' + escape(unit.unit) + "</span><span class=\"status-sub\" style=\"display:block\">" + escape(unit.operator) + "</span></td><td>" + escape(timeOf(unit.last)) + '</td><td class="num"><span class="mon-minutes ' + (unit.state === "alert" ? "is-alert" : "is-ok") + '">' + (unit.state === "recovered" ? "—" : unit.minutes) + "</span></td><td>" + statusBadge(unit.state) + (unit.state === "alert" ? ' <button class="link-btn" type="button" data-mon-fix="unit" data-mon-id="' + escape(unit.unit) + '">' + escape(t("recuperar", "recover")) + "</button>" : "") + "</td></tr>"
        );
      })
      .join("");
    document.getElementById("mon-units-note").textContent = t(
      "Límite de alerta: " + base.telemetry.limit + " minutos sin posición. Unidades monitoreadas: " + list.length + ".",
      "Alert threshold: " + base.telemetry.limit + " minutes without position. Monitored units: " + list.length + "."
    );
  }

  function renderVp() {
    var list = state.vp;
    document.getElementById("mon-vp-count").textContent = alertCount(list) + " " + t("alertas", "alerts");
    document.getElementById("mon-vp-body").innerHTML = list
      .map(function (item) {
        return (
          '<tr class="' + (item.state === "recovered" ? "is-recovered" : "is-alert") + '"><td><span class="mon-trip">' + escape(item.trip) + "</span><span class=\"status-sub\" style=\"display:block\">" + escape(item.operator) + "</span></td><td>" + escape(item.unit) + "</td><td>" + escape(item.error) + "</td><td>" + statusBadge(item.state) + (item.state === "alert" ? ' <button class="link-btn" type="button" data-mon-fix="vp" data-mon-id="' + escape(item.trip) + '">' + escape(t("corregir", "fix")) + "</button>" : "") + "</td></tr>"
        );
      })
      .join("");
    document.getElementById("mon-vp-note").textContent = t(
      "Viajes pendientes con error: " + alertCount(list) + ".",
      "Pending trips with errors: " + alertCount(list) + "."
    );
  }

  function renderDiscrepancies() {
    var list = state.discrepancies;
    document.getElementById("mon-disc-count").textContent = alertCount(list) + " " + t("abiertas", "open");
    document.getElementById("mon-disc-body").innerHTML = list
      .map(function (item) {
        return (
          '<tr class="' + (item.state === "recovered" ? "is-recovered" : "is-alert") + '"><td><span class="mon-trip">' + escape(item.trip) + "</span></td><td>" + escape(item.unit) + "</td><td>" + escape(item.originCcp) + "</td><td>" + escape(item.destCcp) + "</td><td>" + escape(item.originPedido) + "</td><td>" + escape(item.destPedido) + "</td><td>" + statusBadge(item.state) + "</td><td>" + (item.state === "alert" ? '<button class="link-btn" type="button" data-mon-fix="disc" data-mon-id="' + escape(item.trip) + '">' + escape(t("marcar corregida", "mark fixed")) + "</button>" : "") + "</td></tr>"
        );
      })
      .join("");
  }

  function renderTelemetry() {
    var last = state.telemetryMinutes;
    var limit = base.telemetry.limit;
    var warning = last > limit;
    document.getElementById("mon-telemetry").innerHTML =
      '<span class="' + (warning ? "text-bad" : "text-ok") + '">' + (warning ? "❌" : "✅") + " " +
      escape(t("Última posición general: hace " + last + " min (límite " + limit + " min)", "Last general position: " + last + " min ago (limit " + limit + " min)")) +
      "</span>";
    document.getElementById("mon-updated").textContent =
      t("Actualizado: ", "Updated: ") + timeOf(state.updated);
    ["mon-live", "mon-live-2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("is-off", !state.live);
      if (id === "mon-live") el.textContent = state.live ? t("En vivo", "Live") : t("En pausa", "Paused");
      else el.textContent = state.live ? t("Monitoreo activo", "Monitoring active") : t("Monitoreo en pausa", "Monitoring paused");
    });
    var toggle = document.getElementById("mon-toggle-live");
    if (toggle) {
      toggle.querySelector("span").textContent = state.live ? t("Pausar", "Pause") : t("Reanudar", "Resume");
    }
  }

  function renderLog() {
    document.getElementById("mon-log").innerHTML = state.log
      .map(function (item) {
        return '<div class="mon-log-row"><time>' + escape(item.time) + "</time><span>" + escape(item.text) + "</span></div>";
      })
      .join("");
  }

  function render() {
    renderTelemetry();
    renderKpis();
    renderFinalized();
    renderUnits();
    renderVp();
    renderDiscrepancies();
    renderLog();
  }

  function recoverOne(kind, id) {
    if (kind === "unit") {
      var unit = state.units.filter(function (item) { return item.unit === id; })[0];
      if (unit) {
        unit.state = "recovered";
        unit.ticks = 0;
        unit.minutes = 0;
        unit.last = new Date().toISOString();
        addLog(t("Recuperación manual: unidad " + id + " volvió a reportar.", "Manual recovery: unit " + id + " reported again."));
        window.UI.toast(t("Unidad recuperada", "Unit recovered"), id, "ok");
      }
    } else {
      var collection = kind === "finalized" ? state.finalized : kind === "vp" ? state.vp : state.discrepancies;
      var item = collection.filter(function (entry) {
        return (entry.trip || entry.unit) === id;
      })[0];
      if (item) {
        item.state = "recovered";
        addLog(t("Excepción marcada como corregida: " + id + ".", "Exception marked as fixed: " + id + "."));
        window.UI.toast(t("Excepción corregida", "Exception fixed"), id, "ok");
      }
    }
    render();
  }

  function simulateRecovery() {
    var unit = state.units.filter(function (item) { return item.state === "alert"; })[0];
    if (unit) {
      recoverOne("unit", unit.unit);
      return;
    }
    var finalized = state.finalized.filter(function (item) { return item.state === "alert"; })[0];
    if (finalized) {
      recoverOne("finalized", finalized.trip);
      return;
    }
    window.UI.toast(t("Sin alertas", "No alerts"), t("No hay elementos en alerta para recuperar.", "There are no alert items to recover."), "warn");
  }

  function toggleLive() {
    state.live = !state.live;
    addLog(state.live ? t("Simulación reanudada.", "Simulation resumed.") : t("Simulación pausada.", "Simulation paused."));
    render();
    window.UI.toast(
      state.live ? t("Simulación activa", "Simulation active") : t("Simulación en pausa", "Simulation paused"),
      state.live ? t("Las posiciones vuelven a actualizarse.", "Positions are updating again.") : t("Los datos se mantienen congelados.", "Data is frozen."),
      state.live ? "ok" : "warn"
    );
  }

  function resetDemo() {
    state.units = clone(base.units);
    state.finalized = clone(base.finalized);
    state.vp = clone(base.vp);
    state.discrepancies = clone(base.discrepancies);
    state.log = makeInitialLog();
    state.telemetryMinutes = 2;
    state.updated = new Date();
    state.live = true;
    render();
    window.UI.toast(t("Demo reiniciada", "Demo reset"), t("Las alertas y recuperaciones volvieron al estado inicial.", "Alerts and recoveries returned to the initial state."), "ok");
  }

  function openTech() {
    var body =
      '<div class="tech-summary">' +
      '<div class="tech-block"><h4>' + escape(t("Problema", "Problem")) + "</h4><p>" +
      escape(t("La operación dependía de revisar manualmente la telemetría, los viajes finalizados y los viajes programados para detectar unidades sin posición, errores de fecha o velocidad y discrepancias entre la carta porte y el pedido. Cuando algo fallaba, el aviso llegaba tarde y por canales distintos.", "Operations relied on manually checking telemetry, finished trips and scheduled trips to detect units without position, date or speed errors and discrepancies between the bill of lading and the order. When something failed, the alert arrived late through different channels.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Solución", "Solution")) + "</h4><p>" +
      escape(t("Monitor con dos interfaces (escritorio en PySide6 y panel web en Streamlit) que consulta la telemetría y los viajes, mantiene el estado de las alertas, detecta recuperaciones y envía notificaciones por correo. Incluye cambio automático de tema día/noche y refresco periódico.", "Monitor with two interfaces (PySide6 desktop and a Streamlit web dashboard) that queries telemetry and trips, keeps alert state, detects recoveries and sends email notifications. Includes automatic day/night theming and periodic refresh.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Stack", "Stack")) + '</h4><div class="tech-stack"><span>Python</span><span>PySide6</span><span>Streamlit</span><span>pandas</span><span>SQL Server</span><span>SMTP</span><span>QTimer</span></div></div>' +
      '<div class="tech-block"><h4>' + escape(t("Mi rol", "My role")) + "</h4><p>" +
      escape(t("Desarrollé las consultas, los workers de actualización, la detección de alertas y recuperaciones, las notificaciones, la interfaz de escritorio, el panel de Streamlit y el empaquetado de la aplicación.", "I built the queries, refresh workers, alert and recovery detection, notifications, desktop interface, Streamlit dashboard and application packaging.")) +
      "</p></div>" +
      '<div class="tech-block"><h4>' + escape(t("Privacidad en esta demo", "Privacy in this demo")) + "</h4><p>" +
      escape(t("Las unidades, viajes, rutas, operadores y correos son ficticios. La demo no se conecta a telemetría real, no lee bases de datos y no envía notificaciones.", "Units, trips, routes, operators and emails are fictional. The demo does not connect to real telemetry, read databases or send notifications.")) +
      "</p></div>" +
      '<div class="tech-note">' + escape(t("La simulación acelera el tiempo: las unidades ganan minutos sin posición y las recuperaciones se muestran en verde durante unos ciclos.", "The simulation accelerates time: units accumulate minutes without position and recoveries stay green for a few cycles.")) + "</div>" +
      "</div>";
    window.UI.openModal({
      title: t("Monitor operativo", "Operations monitor"),
      closeLabel: t("Cerrar", "Close"),
      className: "modal-wide",
      bodyHtml: body,
      footHtml: '<button class="btn btn-secondary" type="button" data-close-tech>' + escape(t("Cerrar", "Close")) + "</button>",
      onMount: function (box) {
        box.querySelector("[data-close-tech]").addEventListener("click", window.UI.closeModal);
      }
    });
  }

  function routeFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    if (hash === "dashboard") {
      showDashboard();
    } else if (hash === "pausa") {
      showDashboard();
      state.live = false;
      render();
    } else if (hash === "tech") {
      if (!state.auth) showDashboard();
      openTech();
    }
  }

  function init() {
    document.getElementById("mon-login-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var user = document.getElementById("mon-user").value.trim();
      var pass = document.getElementById("mon-pass").value.trim();
      if (!user || !pass) {
        window.UI.toast(t("Credenciales incompletas", "Incomplete credentials"), t("Usa las credenciales de demostración.", "Use the demo credentials."), "warn");
        return;
      }
      showDashboard();
      window.UI.toast(t("Acceso concedido", "Access granted"), t("Bienvenido a la demo de ATQMonitor.", "Welcome to the ATQMonitor demo."), "ok");
    });

    document.getElementById("mon-skip").addEventListener("click", function () {
      showDashboard();
    });
    document.getElementById("mon-toggle-live").addEventListener("click", toggleLive);
    document.getElementById("mon-recover").addEventListener("click", simulateRecovery);
    document.getElementById("mon-reset").addEventListener("click", resetDemo);
    document.getElementById("mon-logout").addEventListener("click", function () {
      showLogin();
      window.UI.toast(t("Sesión cerrada", "Signed out"), t("Puedes volver a entrar cuando quieras.", "You can sign in again whenever you want."), "ok");
    });

    document.addEventListener("click", function (event) {
      var tech = event.target.closest("[data-tech-open]");
      if (tech) {
        openTech();
        return;
      }
      var fix = event.target.closest("[data-mon-fix]");
      if (fix) {
        recoverOne(fix.getAttribute("data-mon-fix"), fix.getAttribute("data-mon-id"));
      }
    });

    window.addEventListener("languagechange", function () {
      window.UI.closeModal();
      if (state.auth) {
        state.log = state.log.map(function (item) {
          return item;
        });
        render();
      }
    });

    window.addEventListener("hashchange", routeFromHash);

    if (ensureAuthFromStorage() || window.location.hash === "#dashboard") {
      showDashboard();
    } else {
      document.getElementById("mon-login").hidden = false;
      document.getElementById("mon-dashboard").hidden = true;
    }
    routeFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
