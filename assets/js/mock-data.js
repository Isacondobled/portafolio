(function () {
  var clients = [
    "Cliente Demo Norte",
    "Cliente Demo Bajío",
    "Cliente Demo Occidente",
    "Cliente Demo Sur",
    "Cliente Demo Centro"
  ];

  var operators = [
    "Operador Demo 01",
    "Operador Demo 02",
    "Operador Demo 03",
    "Operador Demo 04",
    "Operador Demo 05",
    "Operador Demo 06",
    "Operador Demo 07",
    "Operador Demo 08",
    "Operador Demo 09",
    "Operador Demo 10"
  ];

  var units = ["T-101", "T-102", "T-103", "T-104", "T-105", "T-106", "T-107", "T-108", "T-109", "T-110", "T-111", "T-112"];

  var docsBase = [
    { key: "ccp", label: "Carta porte firmada", hint: "Documento del cliente" },
    { key: "bascula", label: "Ticket de báscula", hint: "Peso de origen" },
    { key: "unidad", label: "Fotografía de la unidad", hint: "Unidad y remolque" },
    { key: "entrega", label: "Comprobante de entrega", hint: "Firmado por el cliente" },
    { key: "operador", label: "Identificación del operador", hint: "INE vigente" },
    { key: "danios", label: "Evidencia de daños", hint: "Solo si aplica" }
  ];

  var evidencePatterns = [
    ["accepted", "accepted", "accepted", "rejected", null, "accepted"],
    ["accepted", "rejected", "accepted", null, null, "accepted"],
    ["accepted", "accepted", null, "accepted", null, "accepted"],
    ["accepted", null, "accepted", "accepted", null, "rejected"],
    ["rejected", "accepted", "accepted", null, null, "accepted"],
    ["accepted", "accepted", "accepted", "accepted", null, null]
  ];

  function buildDocs(seed) {
    var pattern = evidencePatterns[seed % evidencePatterns.length];
    return docsBase.map(function (doc, index) {
      var loaded = !(index === 4 && seed % 3 === 0);
      var status = loaded ? pattern[index] : "rejected";
      return {
        key: doc.key + "-" + seed,
        label: doc.label,
        hint: doc.hint,
        loaded: loaded,
        status: status
      };
    });
  }

  function buildExpenses(seed) {
    var factor = 1 + ((seed % 4) * 0.045);
    return [
      {
        id: "A-" + seed + "-1",
        kind: "anticipo",
        label: "Anticipo de combustible",
        system: Math.round(2500 * factor),
        authorized: Math.round(2500 * factor),
        status: "accepted"
      },
      {
        id: "A-" + seed + "-2",
        kind: "anticipo",
        label: "Anticipo de casetas",
        system: Math.round(850 * factor),
        authorized: Math.round(850 * factor),
        status: "accepted"
      },
      {
        id: "C-" + seed + "-1",
        kind: "comprobacion",
        label: "Diesel",
        system: Math.round(3200 * factor),
        authorized: Math.round(3150 * factor),
        status: seed % 2 === 0 ? "accepted" : null
      },
      {
        id: "C-" + seed + "-2",
        kind: "comprobacion",
        label: "Casetas",
        system: Math.round(1480 * factor),
        authorized: Math.round(1480 * factor),
        status: seed % 3 === 0 ? "rejected" : "accepted"
      },
      {
        id: "C-" + seed + "-3",
        kind: "comprobacion",
        label: "Estadía",
        system: Math.round(600 * factor),
        authorized: Math.round(600 * factor),
        status: null
      },
      {
        id: "X-" + seed + "-1",
        kind: "extra",
        label: "Gasto extra: maniobra",
        system: Math.round(450 * factor),
        authorized: Math.round(450 * factor),
        status: null
      }
    ];
  }

  function buildVouchers(seed) {
    if (seed % 4 === 3) return [];
    var list = [
      {
        id: "D-" + (8800 + seed),
        type: "Diesel",
        status: "Aceptado",
        amount: Math.round(3200 * (1 + (seed % 3) * 0.03)),
        observation: "Carga completa en estación demo."
      },
      {
        id: "U-" + (2200 + seed),
        type: "Urea",
        status: seed % 3 === 0 ? "Edición" : "Aceptado",
        amount: Math.round(420 * (1 + (seed % 2) * 0.04)),
        observation: "Consumo del periodo."
      }
    ];
    if (seed % 2 === 0) {
      list.push({
        id: "L-" + (4400 + seed),
        type: "Lavado",
        status: "Aceptado",
        amount: 180,
        observation: "Lavado de unidad."
      });
    }
    return list;
  }

  function buildHistory(date, status) {
    var items = [
      { date: date, role: "Documentador", actor: "Usuario Demo 01", action: "Expediente creado", note: "Se cargaron las evidencias iniciales." },
      { date: date, role: "Documentador", actor: "Usuario Demo 01", action: "Enviado a revisión", note: "Checklist de evidencias completo." }
    ];
    if (status === "jefe" || status === "facturacion" || status === "ready" || status === "settled") {
      items.push({ date: date, role: "Jefe de Tráfico", actor: "Usuario Demo 02", action: "Revisión en tráfico", note: "Se validaron comprobaciones y montos." });
    }
    if (status === "facturacion" || status === "ready" || status === "settled") {
      items.push({ date: date, role: "Facturación", actor: "Usuario Demo 03", action: "Revisión de facturación", note: "Expediente listo para liquidar." });
    }
    if (status === "rejected") {
      items.push({ date: date, role: "Jefe de Tráfico", actor: "Usuario Demo 02", action: "Devuelto al Documentador", note: "Corregir comprobante de entrega." });
    }
    return items;
  }

  var tripSeeds = [
    {
      id: "V-10482",
      unit: "T-101",
      client: "Cliente Demo Norte",
      operator: "Operador Demo 01",
      operation: "Isquisa",
      type: "Cargado",
      exception: "",
      related: ["V-10479"],
      date: "2026-10-12 08:30",
      stage: 1,
      status: "documentador",
      route: "Ruta Demo 101 · Centro",
      ccp: "CCP-10482",
      invoice: "AF-10482",
      reference: "REF-10482",
      start: "2026-10-12 06:10",
      end: "2026-10-12 18:40",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10483",
      unit: "T-102",
      client: "Cliente Demo Bajío",
      operator: "Operador Demo 02",
      operation: "Chicas",
      type: "Vacío",
      exception: "Cambio Origen Destino",
      related: [],
      date: "2026-10-11 17:05",
      stage: 2,
      status: "jefe",
      route: "Ruta Demo 102 · Bajío",
      ccp: "CCP-10483",
      invoice: "AF-10483",
      reference: "REF-10483",
      start: "2026-10-11 14:10",
      end: "2026-10-12 02:35",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10484",
      unit: "T-103",
      client: "Cliente Demo Occidente",
      operator: "Operador Demo 03",
      operation: "Pipas",
      type: "Cargado",
      exception: "",
      related: [],
      date: "2026-10-11 11:20",
      stage: 4,
      status: "ready",
      route: "Ruta Demo 103 · Occidente",
      ccp: "CCP-10484",
      invoice: "AF-10484",
      reference: "REF-10484",
      start: "2026-10-10 22:15",
      end: "2026-10-11 09:05",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10485",
      unit: "T-104",
      client: "Cliente Demo Sur",
      operator: "Operador Demo 04",
      operation: "Secos",
      type: "Reparto",
      exception: "",
      related: [],
      date: "2026-10-10 09:45",
      stage: 1,
      status: "rejected",
      route: "Ruta Demo 104 · Sur",
      ccp: "CCP-10485",
      invoice: "AF-10485",
      reference: "REF-10485",
      start: "2026-10-09 20:30",
      end: "2026-10-10 08:10",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10486",
      unit: "T-105",
      client: "Cliente Demo Centro",
      operator: "Operador Demo 05",
      operation: "Isquisa",
      type: "Cargado",
      exception: "Reembarque",
      related: ["V-10487"],
      date: "2026-10-09 16:20",
      stage: 2,
      status: "jefe",
      route: "Ruta Demo 105 · Centro",
      ccp: "CCP-10486",
      invoice: "AF-10486",
      reference: "REF-10486",
      start: "2026-10-09 09:40",
      end: "2026-10-09 15:05",
      carta: "",
      reembarque: {
        complementId: "V-10487",
        reason: "Unidad con falla mecánica; la carga se reembarcó en la misma ruta."
      }
    },
    {
      id: "V-10488",
      unit: "T-106",
      client: "Cliente Demo Norte",
      operator: "Operador Demo 06",
      operation: "Chicas",
      type: "Vacío",
      exception: "No realizado",
      related: [],
      date: "2026-10-08 13:10",
      stage: 0,
      status: "finalizado",
      route: "Ruta Demo 106 · Norte",
      ccp: "CCP-10488",
      invoice: "AF-10488",
      reference: "REF-10488",
      start: "2026-10-08 07:00",
      end: "2026-10-08 12:40",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10489",
      unit: "T-107",
      client: "Cliente Demo Bajío",
      operator: "Operador Demo 07",
      operation: "Pipas",
      type: "Cargado",
      exception: "",
      related: [],
      date: "2026-10-08 10:35",
      stage: 3,
      status: "facturacion",
      route: "Ruta Demo 107 · Bajío",
      ccp: "CCP-10489",
      invoice: "AF-10489",
      reference: "REF-10489",
      start: "2026-10-07 19:25",
      end: "2026-10-08 08:50",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10490",
      unit: "T-108",
      client: "Cliente Demo Occidente",
      operator: "Operador Demo 08",
      operation: "Secos",
      type: "Reparto",
      exception: "",
      related: [],
      date: "2026-10-07 15:50",
      stage: 1,
      status: "documentador",
      route: "Ruta Demo 108 · Occidente",
      ccp: "CCP-10490",
      invoice: "AF-10490",
      reference: "REF-10490",
      start: "2026-10-07 08:15",
      end: "2026-10-07 14:30",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10491",
      unit: "T-109",
      client: "Cliente Demo Sur",
      operator: "Operador Demo 09",
      operation: "Isquisa",
      type: "Cargado",
      exception: "Cambio Origen Destino",
      related: [],
      date: "2026-10-06 12:00",
      stage: 5,
      status: "settled",
      route: "Ruta Demo 109 · Sur",
      ccp: "CCP-10491",
      invoice: "AF-10491",
      reference: "REF-10491",
      start: "2026-10-05 21:45",
      end: "2026-10-06 10:20",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10492",
      unit: "T-110",
      client: "Cliente Demo Centro",
      operator: "Operador Demo 10",
      operation: "Chicas",
      type: "Vacío",
      exception: "",
      related: [],
      date: "2026-10-05 18:15",
      stage: 1,
      status: "documentador",
      route: "Ruta Demo 110 · Centro",
      ccp: "CCP-10492",
      invoice: "AF-10492",
      reference: "REF-10492",
      start: "2026-10-05 11:30",
      end: "2026-10-05 17:25",
      carta: "",
      reembarque: null
    },
    {
      id: "V-10493",
      unit: "T-111",
      client: "Cliente Demo Occidente",
      operator: "Operador Demo 03",
      operation: "Secos",
      type: "Reparto",
      exception: "",
      related: [],
      date: "2026-10-12 07:15",
      stage: 1,
      status: "documentador",
      route: "Ruta Demo 111 · Reparto",
      ccp: "CCP-10493",
      invoice: "AF-10493",
      reference: "REF-7781/R1",
      start: "2026-10-12 05:50",
      end: "2026-10-12 16:10",
      carta: "28-7781/26",
      reembarque: null
    },
    {
      id: "V-10494",
      unit: "T-112",
      client: "Cliente Demo Occidente",
      operator: "Operador Demo 06",
      operation: "Secos",
      type: "Reparto",
      exception: "",
      related: [],
      date: "2026-10-12 07:40",
      stage: 2,
      status: "jefe",
      route: "Ruta Demo 112 · Reparto",
      ccp: "CCP-10494",
      invoice: "AF-10494",
      reference: "REF-7781/R2",
      start: "2026-10-12 06:05",
      end: "2026-10-12 17:00",
      carta: "28-7781/26",
      reembarque: null
    },
    {
      id: "V-10495",
      unit: "T-101",
      client: "Cliente Demo Occidente",
      operator: "Operador Demo 08",
      operation: "Secos",
      type: "Reparto",
      exception: "",
      related: [],
      date: "2026-10-12 08:10",
      stage: 4,
      status: "ready",
      route: "Ruta Demo 113 · Reparto",
      ccp: "CCP-10495",
      invoice: "AF-10495",
      reference: "REF-7781/R3",
      start: "2026-10-12 06:40",
      end: "2026-10-12 18:05",
      carta: "28-7781/26",
      reembarque: null
    }
  ];

  var trips = tripSeeds.map(function (trip, index) {
    var evidence = buildDocs(index);
    var expenses = buildExpenses(index);
    var vouchers = buildVouchers(index);
    return {
      id: trip.id,
      unit: trip.unit,
      client: trip.client,
      operator: trip.operator,
      operation: trip.operation,
      type: trip.type,
      exception: trip.exception,
      related: trip.related,
      date: trip.date,
      stage: trip.stage,
      status: trip.status,
      route: trip.route,
      ccp: trip.ccp,
      invoice: trip.invoice,
      reference: trip.reference,
      start: trip.start,
      end: trip.end,
      carta: trip.carta,
      reembarque: trip.reembarque,
      relatedOf: "",
      evidence: evidence,
      expenses: expenses,
      vouchers: vouchers,
      history: buildHistory(trip.date, trip.status)
    };
  });

  trips.push({
    id: "V-10479",
    unit: "T-101",
    client: "Cliente Demo Norte",
    operator: "Operador Demo 01",
    operation: "Isquisa",
    type: "Cargado",
    exception: "No realizado",
    related: [],
    date: "2026-10-10 07:20",
    stage: 1,
    status: "documentador",
    route: "Ruta Demo 101 · Centro",
    ccp: "CCP-10479",
    invoice: "AF-10479",
    reference: "REF-10479",
    start: "2026-10-10 05:55",
    end: "2026-10-10 12:10",
    carta: "",
    reembarque: null,
    relatedOf: "V-10482",
    evidence: buildDocs(8),
    expenses: buildExpenses(8),
    vouchers: buildVouchers(8),
    history: buildHistory("2026-10-10 07:20", "documentador")
  });

  trips.push({
    id: "V-10487",
    unit: "T-106",
    client: "Cliente Demo Centro",
    operator: "Operador Demo 06",
    operation: "Isquisa",
    type: "Cargado",
    exception: "Reembarque",
    related: [],
    date: "2026-10-10 08:15",
    stage: 2,
    status: "jefe",
    route: "Ruta Demo 105 · Centro",
    ccp: "CCP-10487",
    invoice: "AF-10487",
    reference: "REF-10486",
    start: "2026-10-10 07:30",
    end: "2026-10-10 16:45",
    carta: "",
    reembarque: {
      complementId: "V-10486",
      reason: "Unidad con falla mecánica; la carga se reembarcó en la misma ruta."
    },
    relatedOf: "V-10486",
    evidence: buildDocs(9),
    expenses: buildExpenses(9),
    vouchers: buildVouchers(9),
    history: buildHistory("2026-10-10 08:15", "jefe")
  });

  var repartos = [
    {
      id: "REP-7781",
      carta: "28-7781/26",
      client: "Cliente Demo Occidente",
      reference: "REF-7781",
      trips: ["V-10493", "V-10494", "V-10495"]
    }
  ];

  var reembarques = [
    {
      id: "REB-10486",
      reason: "Unidad con falla mecánica; la carga se reembarcó en la misma ruta.",
      trips: ["V-10486", "V-10487"],
      createdAt: "2026-10-10 09:05",
      author: "Usuario Demo 01"
    }
  ];

  var casetas = (function () {
    var descriptions = [
      "Centro — Norte",
      "Bajío — Occidente",
      "Sur — Centro",
      "Norte — Bajío",
      "Occidente — Sur",
      "Centro — Occidente",
      "Norte — Sur",
      "Bajío — Centro"
    ];
    var armados = ["CHICO", "SENCILLO", "FULL"];
    var confianzas = ["ALTA", "MEDIA", "BAJA"];
    var states = [];
    var i;
    for (i = 0; i < 48; i += 1) states.push("EXISTENTE");
    for (i = 0; i < 6; i += 1) states.push("NUEVA_CON");
    for (i = 0; i < 5; i += 1) states.push("SIN_CASETAS");
    states.push("MANUAL");
    for (i = 0; i < 4; i += 1) states.push("INDETERMINADO");

    return states.map(function (state, index) {
      var armado = armados[index % armados.length];
      var factor = armado === "FULL" ? 1.6 : armado === "SENCILLO" ? 1.25 : 1;
      var base = Math.round((1450 + ((index * 317) % 6400)) * factor);
      var current = state === "SIN_CASETAS" ? 0 : state === "NUEVA_CON" || state === "INDETERMINADO" ? 0 : base;
      var estimate = state === "SIN_CASETAS" ? 0 : state === "MANUAL" ? 4200 : base;
      var newCost = state === "MANUAL" ? 4200 : state === "SIN_CASETAS" ? 0 : Math.round(base * (0.94 + (index % 5) * 0.017));
      var viajes = 2 + ((index * 7) % 17);
      return {
        id_ruta: 20101 + index,
        desc_ruta: "Ruta Demo " + (20101 + index) + " · " + descriptions[index % descriptions.length],
        id_unidad: "T-" + (201 + (index % 20)),
        armado: armado,
        estado: state,
        costo_estimado: estimate,
        costo_actual: current,
        costo_nuevo: newCost,
        viajes: viajes,
        confianza: confianzas[index % confianzas.length],
        kms: 90 + ((index * 53) % 620),
        accion: "PENDIENTE",
        costo_manual: null
      };
    });
  })();

  var liquidaciones = [
    { id: "9001", name: "Operador Demo 01", email: "operador01@example.com", trips: 10, perceptions: 10480, deductions: -1320, advances: -2400, expenses: 1510, other: [{ label: "B. Diesel", amount: 3320 }, { label: "Estadía", amount: 600 }], status: "sent", sentAt: "2026-10-12 09:14" },
    { id: "9002", name: "Operador Demo 02", email: "operador02@example.com", trips: 8, perceptions: 8920, deductions: -980, advances: -2100, expenses: 1240, other: [{ label: "B. Diesel", amount: 2810 }, { label: "Km complementario", amount: 1240 }], status: "sent", sentAt: "2026-10-12 09:14" },
    { id: "9003", name: "Operador Demo 03", email: "operador03@example.com", trips: 12, perceptions: 12650, deductions: -1780, advances: -2950, expenses: 1860, other: [{ label: "B. Diesel", amount: 3980 }, { label: "Estadía", amount: 900 }], status: "pending", sentAt: "—" },
    { id: "9004", name: "Operador Demo 04", email: "operador04@example.com", trips: 7, perceptions: 7640, deductions: -890, advances: -1800, expenses: 990, other: [{ label: "B. Diesel", amount: 2310 }], status: "sent", sentAt: "2026-10-12 09:15" },
    { id: "9005", name: "Operador Demo 05", email: "operador05@example.com", trips: 9, perceptions: 9410, deductions: -1120, advances: -2250, expenses: 1370, other: [{ label: "B. Diesel", amount: 2940 }, { label: "Comisión", amount: 450 }], status: "pending", sentAt: "—" },
    { id: "9006", name: "Operador Demo 06", email: "operador06@example.com", trips: 11, perceptions: 11280, deductions: -1450, advances: -2680, expenses: 1680, other: [{ label: "B. Diesel", amount: 3520 }, { label: "Estadía", amount: 600 }], status: "sent", sentAt: "2026-10-12 09:15" },
    { id: "9007", name: "Operador Demo 07", email: "operador07@example.com", trips: 6, perceptions: 6980, deductions: -760, advances: -1650, expenses: 880, other: [{ label: "B. Diesel", amount: 2140 }], status: "error", sentAt: "—" },
    { id: "9008", name: "Operador Demo 08", email: "operador08@example.com", trips: 13, perceptions: 13720, deductions: -1890, advances: -3100, expenses: 1980, other: [{ label: "B. Diesel", amount: 4210 }, { label: "Km complementario", amount: 1580 }], status: "pending", sentAt: "—" },
    { id: "9009", name: "Operador Demo 09", email: "operador09@example.com", trips: 9, perceptions: 9580, deductions: -1170, advances: -2320, expenses: 1420, other: [{ label: "B. Diesel", amount: 3010 }, { label: "Estadía", amount: 300 }], status: "sent", sentAt: "2026-10-12 09:16" },
    { id: "9010", name: "Operador Demo 10", email: "operador10@example.com", trips: 8, perceptions: 8460, deductions: -940, advances: -2040, expenses: 1180, other: [{ label: "B. Diesel", amount: 2650 }, { label: "Comisión", amount: 400 }], status: "sent", sentAt: "2026-10-12 09:16" }
  ];

  var periods = [
    { id: "2026-10-05_2026-10-10", start: "2026-10-05", end: "2026-10-10", label: "05 oct — 10 oct 2026" },
    { id: "2026-09-28_2026-10-03", start: "2026-09-28", end: "2026-10-03", label: "28 sep — 03 oct 2026" },
    { id: "2026-09-21_2026-09-26", start: "2026-09-21", end: "2026-09-26", label: "21 sep — 26 sep 2026" }
  ];

  var monitor = {
    telemetry: {
      last: "2026-10-17 12:14:02",
      limit: 15
    },
    units: [
      { unit: "T-101", last: "2026-10-17 12:12:44", minutes: 2, route: "Ruta Demo 101 · Centro", operator: "Operador Demo 01", state: "ok" },
      { unit: "T-102", last: "2026-10-17 11:56:10", minutes: 18, route: "Ruta Demo 102 · Bajío", operator: "Operador Demo 02", state: "alert" },
      { unit: "T-103", last: "2026-10-17 12:13:01", minutes: 1, route: "Ruta Demo 103 · Occidente", operator: "Operador Demo 03", state: "ok" },
      { unit: "T-104", last: "2026-10-17 11:52:35", minutes: 22, route: "Ruta Demo 104 · Sur", operator: "Operador Demo 04", state: "alert" },
      { unit: "T-105", last: "2026-10-17 12:10:18", minutes: 4, route: "Ruta Demo 105 · Centro", operator: "Operador Demo 05", state: "ok" },
      { unit: "T-106", last: "2026-10-17 11:48:02", minutes: 26, route: "Ruta Demo 106 · Norte", operator: "Operador Demo 06", state: "alert" },
      { unit: "T-107", last: "2026-10-17 12:08:55", minutes: 6, route: "Ruta Demo 107 · Bajío", operator: "Operador Demo 07", state: "ok" },
      { unit: "T-108", last: "2026-10-17 11:59:21", minutes: 15, route: "Ruta Demo 108 · Occidente", operator: "Operador Demo 08", state: "alert" },
      { unit: "T-109", last: "2026-10-17 11:54:48", minutes: 20, route: "Ruta Demo 109 · Sur", operator: "Operador Demo 09", state: "alert" },
      { unit: "T-110", last: "2026-10-17 12:11:39", minutes: 3, route: "Ruta Demo 110 · Centro", operator: "Operador Demo 10", state: "ok" }
    ],
    finalized: [
      { trip: "V-20481", unit: "T-103", route: "Ruta Demo 103 · Norte", type: "Cargado", start: "2026-10-16 06:20", end: "2026-10-16 23:50", hours: "17.5 h", speed: "94 km/h", error: "Exceso de velocidad", state: "alert" },
      { trip: "V-20482", unit: "T-106", route: "Ruta Demo 106 · Sur", type: "Vacío", start: "2026-10-16 08:10", end: "2026-10-17 01:35", hours: "17.4 h", speed: "—", error: "Duración fuera de rango", state: "alert" },
      { trip: "V-20483", unit: "T-109", route: "Ruta Demo 109 · Centro", type: "Cargado", start: "2026-10-15 05:45", end: "2026-10-15 18:20", hours: "12.6 h", speed: "88 km/h", error: "Exceso de velocidad", state: "alert" },
      { trip: "V-20484", unit: "T-101", route: "Ruta Demo 101 · Norte", type: "Reparto", start: "2026-10-15 07:00", end: "2026-10-15 16:40", hours: "9.7 h", speed: "—", error: "Fecha inconsistente", state: "recovered" },
      { trip: "V-20485", unit: "T-104", route: "Ruta Demo 104 · Bajío", type: "Cargado", start: "2026-10-14 04:30", end: "2026-10-14 19:15", hours: "14.8 h", speed: "102 km/h", error: "Exceso de velocidad", state: "alert" },
      { trip: "V-20486", unit: "T-110", route: "Ruta Demo 110 · Occidente", type: "Vacío", start: "2026-10-14 06:50", end: "2026-10-14 15:30", hours: "8.7 h", speed: "—", error: "Sin cierre de viaje", state: "recovered" }
    ],
    vp: [
      { trip: "V-20511", unit: "T-104", coordinator: "Coordinador Demo A", operator: "Operador Demo 04", route: "Ruta Demo 104 · Sur", error: "Discrepancia CCP vs pedido", state: "alert" },
      { trip: "V-20512", unit: "T-106", coordinator: "Coordinador Demo B", operator: "Operador Demo 06", route: "Ruta Demo 106 · Norte", error: "Origen incompleto", state: "alert" },
      { trip: "V-20513", unit: "T-108", coordinator: "Coordinador Demo C", operator: "Operador Demo 08", route: "Ruta Demo 108 · Occidente", error: "Remolque sin asignar", state: "alert" },
      { trip: "V-20514", unit: "T-102", coordinator: "Coordinador Demo A", operator: "Operador Demo 02", route: "Ruta Demo 102 · Bajío", error: "Peso fuera de rango", state: "alert" },
      { trip: "V-20515", unit: "T-109", coordinator: "Coordinador Demo D", operator: "Operador Demo 09", route: "Ruta Demo 109 · Sur", error: "Sin operador asignado", state: "alert" },
      { trip: "V-20516", unit: "T-101", coordinator: "Coordinador Demo B", operator: "Operador Demo 01", route: "Ruta Demo 101 · Centro", error: "Fecha programada vencida", state: "recovered" }
    ],
    discrepancies: [
      { trip: "V-20511", unit: "T-104", originCcp: "Bodega Demo Norte", destCcp: "Planta Demo Sur", originPedido: "Bodega Demo Centro", destPedido: "Planta Demo Sur", state: "alert" },
      { trip: "V-20512", unit: "T-106", originCcp: "Planta Demo Norte", destCcp: "Bodega Demo Bajío", originPedido: "Planta Demo Norte", destPedido: "Bodega Demo Occidente", state: "alert" },
      { trip: "V-20513", unit: "T-108", originCcp: "Bodega Demo Occidente", destCcp: "Planta Demo Centro", originPedido: "Bodega Demo Occidente", destPedido: "Planta Demo Centro", state: "recovered" },
      { trip: "V-20514", unit: "T-102", originCcp: "Planta Demo Bajío", destCcp: "Bodega Demo Sur", originPedido: "Planta Demo Norte", destPedido: "Bodega Demo Sur", state: "alert" }
    ]
  };

  window.MOCK = {
    clients: clients,
    operators: operators,
    units: units,
    documentador: {
      trips: trips,
      repartos: repartos,
      reembarques: reembarques,
      users: [
        { id: "documentador", label: "Documentador", labelEn: "Document clerk", person: "Usuario Demo 01" },
        { id: "jefe", label: "Jefe de Tráfico", labelEn: "Traffic lead", person: "Usuario Demo 02" },
        { id: "facturacion", label: "Facturación", labelEn: "Billing", person: "Usuario Demo 03" },
        { id: "admin", label: "Administrador", labelEn: "Administrator", person: "Usuario Demo 04" }
      ]
    },
    casetas: {
      month: "Septiembre 2026",
      file: "PASESEPTIEMBRE2026.xlsx",
      routes: casetas,
      summary: {
        existing: 48,
        newRoutes: 6,
        noTolls: 5,
        manual: 1,
        indeterminate: 4,
        total: 64,
        accuracy: 96.18,
        dryRunDiff: 3.82,
        plan: { delete: 2, update: 48, insert: 6 }
      },
      phases: [
        { key: "lectura", label: "Lectura y normalización del pase", labelEn: "Reading and normalizing the pass", detail: "64 claves de cruce · 4,318 registros" },
        { key: "cruce", label: "Cruce con histórico y catálogo", labelEn: "Matching history and catalog", detail: "48 rutas existentes · 11 claves nuevas" },
        { key: "armado", label: "Cálculo de armado y limpieza", labelEn: "Configuration calculation and cleanup", detail: "CHICO · SENCILLO · FULL" },
        { key: "outliers", label: "Filtro IQR y cálculo de mediana", labelEn: "IQR filter and median calculation", detail: "1.5 × IQR por ruta y armado" },
        { key: "confianza", label: "Nivel de confianza y comparación", labelEn: "Confidence and comparison", detail: "ALTA · MEDIA · BAJA" },
        { key: "dryrun", label: "Validación dry-run", labelEn: "Dry-run validation", detail: "Sin escritura en base de datos" }
      ]
    },
    liquidaciones: {
      periods: periods,
      operators: liquidaciones,
      recipients: ["facturacion@example.com", "administracion@example.com"],
      activity: [
        { time: "09:14", text: "Se generaron 10 resúmenes en PDF." },
        { time: "09:14", text: "Se creó el comprimido del periodo." },
        { time: "09:15", text: "Se enviaron 6 correos correctamente." },
        { time: "09:16", text: "3 envíos quedaron pendientes y 1 con error de demostración." }
      ]
    },
    monitor: monitor
  };
})();
