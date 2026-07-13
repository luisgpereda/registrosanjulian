const app = document.querySelector("#app");

const SUPABASE_URL = "https://brossrtbenywacrfxkty.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb3NzcnRiZW55d2FjcmZ4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTcwNTgsImV4cCI6MjA5OTUzMzA1OH0.JmYDHw1oTa52noohGHCk2gbGTkriA6iZ2G_PqHOJkAM";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_PROPERTY = {
  name: "Hacienda San Julian",
  location: "Lorca, Murcia",
  notes: "Alojamiento de San Julian.",
  map_url: null,
  route_video_url: null,
};

const property = {
  name: "",
  location: "",
  bookingRef: "",
  stayToken: "",
  tokenCreatedAt: "",
  tokenExpiresAt: "",
  checkIn: "",
  checkOut: "",
  notes: "",
};

const guests = [];

const state = {
  view: "host",
  tab: "register",
  openGuestId: null,
  activeReservationId: null,
  showReservationForm: false,
  loading: true,
  authUser: null,
  authError: "",
  dataError: "",
  propertyId: null,
};

const reservations = [];

window.state = state;
window.guests = guests;
window.reservations = reservations;

const faqs = [
  ["Hora de entrada", "La entrada esta disponible desde las 16:00."],
  ["Hora de salida", "La salida es antes de las 11:00. Dejad las llaves segun las instrucciones del anfitrion."],
  ["Zonas privadas", "Las zonas privadas del alojamiento quedan indicadas por el anfitrion antes de la llegada."],
  ["Contacto", "Para cualquier cosa, contactad con el anfitrion por el canal acordado."],
];

const accessLinks = {
  routeVideo: "#",
  map: "#",
};

const accessSections = [
  {
    title: "Ubicacion y entrada al campo",
    items: [
      {
        label: "Entrada al camino",
        text: "Seguid las indicaciones compartidas por el anfitrion para llegar al acceso principal.",
      },
      {
        label: "Coordenadas",
        text: "Coordenadas disponibles en la reserva real.",
      },
      {
        label: "Direccion de la casa",
        text: "Direccion disponible en la reserva real.",
      },
    ],
  },
  {
    title: "Recorrido hasta la casa",
    items: [
      {
        label: "Primer tramo",
        text: "Seguid el recorrido indicado en el enlace de acceso.",
      },
      {
        label: "Ultimo giro",
        text: "Confirmad el ultimo tramo con el anfitrion si teneis dudas.",
      },
      {
        label: "Llegada",
        text: "Aparcad en la zona indicada para huespedes.",
      },
    ],
  },
  {
    title: "Al llegar",
    items: [
      {
        label: "Aparcamiento",
        text: "Usad la zona de aparcamiento indicada por el anfitrion.",
      },
      {
        label: "Puerta de acceso",
        text: "Entrad por la puerta indicada en las instrucciones de la reserva.",
      },
      {
        label: "Llaves interiores",
        text: "Revisad las instrucciones de llaves antes de salir del alojamiento.",
      },
    ],
  },
  {
    title: "Durante la estancia",
    items: [
      {
        label: "Jardin",
        text: "Usad solo las zonas exteriores habilitadas para huespedes.",
      },
      {
        label: "Cuidado exterior",
        text: "Cuidad las zonas comunes y dejadlas como las encontrasteis.",
      },
      {
        label: "Ropa de casa",
        text: "Las camas quedan hechas y encima encontrareis un juego de toallas para cada persona y otra toalla para la piscina.",
      },
      {
        label: "Zonas disponibles",
        text: "Las zonas no disponibles estaran cerradas o senalizadas.",
      },
    ],
  },
  {
    title: "Salida y contacto",
    items: [
      {
        label: "Entrega de llaves",
        text: "Al salir, dejad las llaves segun las instrucciones del anfitrion.",
      },
      {
        label: "Telefono y WhatsApp",
        text: "Para cualquier cosa, usad el contacto compartido en la reserva real.",
      },
    ],
  },
];

const hostGuestFields = [
  ["Nombre completo", "fullName"],
  ["Sexo", "sex"],
  ["Documento", "documentLabel"],
  ["Nacionalidad", "nationality"],
  ["Fecha de nacimiento", "birthDate"],
  ["Residencia habitual", "address"],
  ["Telefono movil", "phone"],
  ["Email", "email"],
];

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatShortDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function formatDateTimeInput(date) {
  if (!date) return "";
  const parsed = new Date(date);
  const timezoneOffset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function buildBirthDate(data) {
  const day = Number(data.get("birthDay"));
  const month = Number(data.get("birthMonth"));
  const year = Number(data.get("birthYear"));
  if (!day || !month || !year) return "";
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date();
  return isValid ? `${year}-${padDatePart(month)}-${padDatePart(day)}` : "";
}

function yearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= currentYear - 110; year -= 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  return years.join("");
}

function generateToken() {
  const bytes = new Uint8Array(8);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `hsj_${Date.now().toString(36)}_${suffix}`;
}

function generateReservationId() {
  return `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildBookingRef(checkIn, checkOut, guestCount, groupName = "") {
  const label = groupName.trim() || "Reserva";
  return `${label} · ${formatShortDate(checkIn)} - ${formatShortDate(checkOut)} · ${guestCount} huesp.`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function guestLink(tab = "register") {
  const baseUrl = window.location.href.split("#")[0];
  return property.stayToken ? `${baseUrl}#guest/${tab}/${property.stayToken}` : baseUrl;
}

function createGuest(id) {
  return {
    id,
    label: `Huesped ${id}`,
    complete: false,
    name: "",
    documentType: "",
    details: null,
  };
}

function cloneGuests(items = guests) {
  return items.map((guest) => ({
    ...guest,
    details: guest.details ? { ...guest.details } : null,
  }));
}

function hasBackend() {
  return Boolean(supabaseClient);
}

function bookingRefForReservation(reservation) {
  return buildBookingRef(reservation.checkIn, reservation.checkOut, reservation.guests.length, reservation.groupName);
}

function defaultDateTimeInput(daysFromNow = 0, hour = 16) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return formatDateTimeInput(date.toISOString());
}

function mapGuestFromRow(row) {
  const fullName = row.full_name || `Huesped ${row.position}`;
  const documentType = row.document_type || "";
  const details = row.complete
    ? {
        name: row.name || "",
        surname: row.surname || "",
        secondSurname: row.second_surname || "",
        fullName,
        sex: row.sex || "",
        documentType,
        documentNumber: row.document_number || "",
        documentLabel: `${documentType || "Documento"}${row.document_number ? ` · ${row.document_number}` : ""}`,
        nationality: row.nationality || "",
        birthDate: row.birth_date || "",
        address: row.address || "",
        phone: row.phone || "",
        email: row.email || "",
      }
    : null;

  return {
    id: row.position,
    rowId: row.id,
    label: `Huesped ${row.position}`,
    complete: Boolean(row.complete),
    name: row.complete ? fullName : "",
    documentType,
    details,
  };
}

function mapReservationFromRow(row) {
  const mappedGuests = (row.guests || []).sort((a, b) => a.position - b.position).map(mapGuestFromRow);
  const reservation = {
    id: row.id,
    groupName: row.group_name || "",
    stayToken: row.public_slug,
    tokenCreatedAt: row.created_at,
    tokenExpiresAt: row.check_out,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: mappedGuests,
  };
  reservation.bookingRef = bookingRefForReservation(reservation);
  return reservation;
}

function mapPublicReservation(payload) {
  const reservationData = payload.reservation;
  const mappedGuests = (payload.guests || []).map((guest) => ({
    id: guest.position,
    rowId: guest.id,
    label: `Huesped ${guest.position}`,
    complete: Boolean(guest.complete),
    name: guest.complete ? guest.fullName : "",
    documentType: guest.documentType || "",
    details: null,
  }));
  const reservation = {
    id: reservationData.id,
    groupName: reservationData.groupName || "",
    stayToken: reservationData.publicSlug,
    tokenCreatedAt: reservationData.checkIn,
    tokenExpiresAt: reservationData.checkOut,
    checkIn: reservationData.checkIn,
    checkOut: reservationData.checkOut,
    guests: mappedGuests,
  };
  reservation.bookingRef = bookingRefForReservation(reservation);
  return {
    property: payload.property,
    reservation,
  };
}

function applyPropertyFromRow(row) {
  if (!row) return;
  property.name = row.name || "";
  property.location = row.location || "";
  property.notes = row.notes || "";
  accessLinks.map = row.map_url || row.mapUrl || accessLinks.map;
  accessLinks.routeVideo = row.route_video_url || row.routeVideoUrl || accessLinks.routeVideo;
  state.propertyId = row.id || state.propertyId;
}

function clearActiveReservation() {
  property.bookingRef = "";
  property.stayToken = "";
  property.tokenCreatedAt = "";
  property.tokenExpiresAt = "";
  property.checkIn = "";
  property.checkOut = "";
  guests.splice(0, guests.length);
  state.activeReservationId = null;
  state.openGuestId = null;
}

function activeReservation() {
  return reservations.find((reservation) => reservation.id === state.activeReservationId);
}

function syncActiveReservation() {
  const reservation = activeReservation();
  if (!reservation) return;
  reservation.bookingRef = property.bookingRef;
  reservation.stayToken = property.stayToken;
  reservation.tokenCreatedAt = property.tokenCreatedAt;
  reservation.tokenExpiresAt = property.tokenExpiresAt;
  reservation.checkIn = property.checkIn;
  reservation.checkOut = property.checkOut;
  reservation.guests = cloneGuests();
}

function applyReservation(reservation) {
  property.bookingRef = reservation.bookingRef;
  property.stayToken = reservation.stayToken;
  property.tokenCreatedAt = reservation.tokenCreatedAt;
  property.tokenExpiresAt = reservation.tokenExpiresAt;
  property.checkIn = reservation.checkIn;
  property.checkOut = reservation.checkOut;
  guests.splice(0, guests.length, ...cloneGuests(reservation.guests));
  state.activeReservationId = reservation.id;
  const nextPending = guests.find((guest) => !guest.complete);
  state.openGuestId = nextPending ? nextPending.id : null;
}

async function ensureHostProperty(existingProperties = []) {
  const currentProperty = existingProperties[0];
  if (currentProperty) return currentProperty;

  const { data, error } = await supabaseClient
    .from("properties")
    .insert({
      owner_id: state.authUser.id,
      ...DEFAULT_PROPERTY,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function loadHostData() {
  if (!hasBackend() || !state.authUser) return;
  state.loading = true;
  state.dataError = "";
  render();

  const { data: properties, error: propertyError } = await supabaseClient
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);

  if (propertyError) {
    state.dataError = propertyError.message;
    state.loading = false;
    render();
    return;
  }

  let currentProperty;
  try {
    currentProperty = await ensureHostProperty(properties || []);
  } catch (error) {
    state.dataError = error.message;
    state.loading = false;
    render();
    return;
  }

  applyPropertyFromRow(currentProperty);

  if (!currentProperty) {
    reservations.splice(0, reservations.length);
    clearActiveReservation();
    state.loading = false;
    render();
    return;
  }

  const { data, error } = await supabaseClient
    .from("reservations")
    .select("*, guests(*)")
    .eq("property_id", currentProperty.id)
    .order("check_in", { ascending: true });

  if (error) {
    state.dataError = error.message;
    state.loading = false;
    render();
    return;
  }

  reservations.splice(0, reservations.length, ...(data || []).map(mapReservationFromRow));
  if (reservations.length > 0) {
    const active = reservations.find((reservation) => reservation.id === state.activeReservationId) || reservations[0];
    applyReservation(active);
  } else {
    clearActiveReservation();
  }
  state.loading = false;
  render();
}

async function loadPublicReservation(publicSlug) {
  if (!hasBackend() || !publicSlug) return false;
  state.loading = true;
  state.dataError = "";
  render();

  const { data, error } = await supabaseClient.rpc("get_public_reservation", {
    input_public_slug: publicSlug,
  });

  if (error || !data) {
    state.dataError = error?.message || "No se ha encontrado esta reserva.";
    state.loading = false;
    render();
    return false;
  }

  const mapped = mapPublicReservation(data);
  applyPropertyFromRow(mapped.property);
  const index = reservations.findIndex((reservation) => reservation.id === mapped.reservation.id);
  if (index >= 0) {
    reservations[index] = mapped.reservation;
  } else {
    reservations.splice(0, reservations.length, mapped.reservation);
  }
  applyReservation(mapped.reservation);
  state.loading = false;
  render();
  return true;
}

async function refreshActivePublicReservation() {
  const reservation = activeReservation();
  if (reservation?.stayToken) {
    await loadPublicReservation(reservation.stayToken);
  }
}

function switchReservation(id) {
  syncActiveReservation();
  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) return;
  applyReservation(reservation);
  state.view = "host";
  window.location.hash = "host";
  render();
}

function toggleReservationForm() {
  state.showReservationForm = !state.showReservationForm;
  render();
}

async function deleteReservation(id) {
  const reservationIndex = reservations.findIndex((reservation) => reservation.id === id);
  if (reservationIndex === -1) return;
  const reservation = reservations[reservationIndex];
  const confirmed = window.confirm(`Borrar la reserva ${reservation.bookingRef}? Esta accion quitara tambien su link efimero.`);
  if (!confirmed) return;

  if (hasBackend() && state.authUser) {
    const { error } = await supabaseClient.from("reservations").delete().eq("id", id);
    if (error) {
      window.alert(`No se pudo borrar la reserva: ${error.message}`);
      return;
    }
    await loadHostData();
    return;
  }

  reservations.splice(reservationIndex, 1);
  if (reservations.length === 0) {
    clearActiveReservation();
  } else if (state.activeReservationId === id) {
    applyReservation(reservations[Math.max(0, reservationIndex - 1)]);
  }
  state.view = "host";
  state.tab = "register";
  window.location.hash = "host";
  render();
}

async function loginHost(form) {
  if (!hasBackend()) return;
  const data = new FormData(form);
  state.authError = "";
  state.loading = true;
  render();

  const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
    email: data.get("email"),
    password: data.get("password"),
  });

  if (error) {
    state.authError = error.message;
    state.loading = false;
    render();
    return;
  }

  state.authUser = authData.user;
  await loadHostData();
}

async function logoutHost() {
  if (!hasBackend()) return;
  await supabaseClient.auth.signOut();
  state.authUser = null;
  state.view = "host";
  state.loading = false;
  render();
}

function reservationOverlaps(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return reservations.find((reservation) => {
    const reservationStart = new Date(reservation.checkIn);
    const reservationEnd = new Date(reservation.checkOut);
    return start < reservationEnd && end > reservationStart;
  });
}

function reservationStatus(reservation) {
  return new Date(reservation.checkOut) < new Date() ? "Pasada" : "Activa";
}

function completedCount() {
  return guests.filter((guest) => guest.complete).length;
}

function allComplete() {
  return guests.length > 0 && completedCount() === guests.length;
}

function completionLabel() {
  return `${completedCount()}/${guests.length} completos`;
}

function route(view, tab = state.tab) {
  if (view === "guest" && !property.stayToken) return;
  state.view = view;
  state.tab = tab;
  window.location.hash = view === "guest" ? `guest/${tab}/${property.stayToken}` : "host";
  render();
}

function openGuestLink(tab = "register") {
  if (!property.stayToken) return;
  window.open(guestLink(tab), "_blank", "noopener");
}

function toggleGuest(id) {
  state.openGuestId = state.openGuestId === id ? null : id;
  render();
}

async function completeGuest(id, form) {
  const data = new FormData(form);
  const guest = guests.find((item) => item.id === id);
  const birthDate = buildBirthDate(data);
  if (!birthDate) {
    window.alert("Revisa la fecha de nacimiento.");
    return;
  }
  const details = {
    name: data.get("name") || "",
    surname: data.get("surname") || "",
    secondSurname: data.get("secondSurname") || "",
    sex: data.get("sex") || "",
    documentType: data.get("documentType") || "Documento",
    documentNumber: data.get("documentNumber") || "",
    nationality: data.get("nationality") || "",
    birthDate,
    address: data.get("address") || "",
    phone: data.get("phone") || "",
    email: data.get("email") || "",
  };

  if (hasBackend()) {
    const reservation = activeReservation();
    if (!reservation?.stayToken) return;
    const { error } = await supabaseClient.rpc("update_public_guest", {
      input_public_slug: reservation.stayToken,
      input_position: id,
      input_name: details.name,
      input_surname: details.surname,
      input_second_surname: details.secondSurname,
      input_sex: details.sex,
      input_document_type: details.documentType,
      input_document_number: details.documentNumber,
      input_nationality: details.nationality,
      input_birth_date: details.birthDate,
      input_address: details.address,
      input_phone: details.phone,
      input_email: details.email,
      input_signature: null,
    });
    if (error) {
      window.alert(`No se pudo guardar el registro: ${error.message}`);
      return;
    }
    await refreshActivePublicReservation();
    if (allComplete()) state.tab = "access";
    render();
    return;
  }

  details.fullName =
    [details.name, details.surname, details.secondSurname]
      .filter(Boolean)
      .join(" ")
      .trim() || guest.label;
  details.documentLabel = `${details.documentType}${details.documentNumber ? ` · ${details.documentNumber}` : ""}`;
  guest.complete = true;
  guest.name = details.fullName;
  guest.documentType = details.documentType;
  guest.details = details;
  const nextPending = guests.find((item) => !item.complete);
  state.openGuestId = nextPending ? nextPending.id : null;
  if (allComplete()) state.tab = "access";
  syncActiveReservation();
  render();
}

function resetDemo() {
  const demoReservation = {
    id: "res_demo",
    groupName: "Reserva Demo",
    bookingRef: "Reserva Demo · 14 ago - 18 ago · 4 huesp.",
    stayToken: "demo_estancia_publica",
    tokenCreatedAt: "2026-07-12T10:00",
    tokenExpiresAt: "2026-08-18T11:00",
    checkIn: "2026-08-14T16:00",
    checkOut: "2026-08-18T11:00",
    guests: Array.from({ length: 4 }, (_, index) => createGuest(index + 1)),
  };
  reservations.splice(0, reservations.length, demoReservation);
  applyReservation(demoReservation);
  property.name = "Registro de huespedes";
  property.location = "";
  property.notes = "";
  state.tab = "register";
  state.view = "host";
  window.location.hash = "host";
  render();
}

async function createReservation(form) {
  const data = new FormData(form);
  const guestCount = Math.min(30, Math.max(1, Number(data.get("guestCount")) || 1));
  const checkIn = data.get("checkIn") || property.checkIn || new Date().toISOString();
  const checkOut = data.get("checkOut") || property.checkOut || new Date(Date.now() + 86400000).toISOString();
  if (new Date(checkOut) <= new Date(checkIn)) {
    window.alert("La fecha de salida debe ser posterior a la entrada.");
    return;
  }
  syncActiveReservation();
  const overlappingReservation = reservationOverlaps(checkIn, checkOut);
  if (overlappingReservation) {
    window.alert(`Las fechas coinciden con la reserva ${overlappingReservation.bookingRef}. Ajusta la entrada o la salida.`);
    return;
  }

  if (hasBackend() && state.propertyId) {
    const { data: reservationRow, error } = await supabaseClient
      .from("reservations")
      .insert({
        property_id: state.propertyId,
        group_name: data.get("groupName")?.trim() || null,
        check_in: checkIn,
        check_out: checkOut,
        guest_count: guestCount,
      })
      .select()
      .single();

    if (error) {
      window.alert(`No se pudo crear la reserva: ${error.message}`);
      return;
    }

    const guestRows = Array.from({ length: guestCount }, (_, index) => ({
      reservation_id: reservationRow.id,
      position: index + 1,
    }));
    const { error: guestsError } = await supabaseClient.from("guests").insert(guestRows);
    if (guestsError) {
      window.alert(`La reserva se creo, pero no se pudieron crear los huespedes: ${guestsError.message}`);
      return;
    }

    state.showReservationForm = false;
    state.openGuestId = 1;
    state.tab = "register";
    state.view = "host";
    window.location.hash = "host";
    await loadHostData();
    state.activeReservationId = reservationRow.id;
    const createdReservation = reservations.find((reservation) => reservation.id === reservationRow.id);
    if (createdReservation) applyReservation(createdReservation);
    render();
    return;
  }

  const reservation = {
    id: generateReservationId(),
    groupName: data.get("groupName")?.trim() || "",
    bookingRef: buildBookingRef(checkIn, checkOut, guestCount, data.get("groupName") || ""),
    checkIn,
    checkOut,
    stayToken: generateToken(),
    tokenCreatedAt: new Date().toISOString(),
    tokenExpiresAt: checkOut,
    guests: Array.from({ length: guestCount }, (_, index) => createGuest(index + 1)),
  };
  reservations.push(reservation);
  applyReservation(reservation);
  state.showReservationForm = false;
  state.openGuestId = 1;
  state.tab = "register";
  state.view = "host";
  window.location.hash = "host";
  render();
}

function hostShell(content) {
  const propertyName = property.name || "Registro de huespedes";
  const heroMeta = [property.location, property.notes].filter(Boolean).join(" · ");
  app.innerHTML = `
    <main class="host-page">
      <section class="property-hero">
        <div class="hero-top">
          <div class="brand"><span class="brand-logo-frame"><img src="./assets/logo.png" alt="" /></span><span>${propertyName}</span></div>
          <div class="toolbar">
            ${property.stayToken ? `<button class="btn ghost" onclick="openGuestLink('register')">Vista huesped</button>` : ""}
            ${state.authUser ? `<button class="btn ghost" onclick="logoutHost()">Salir</button>` : ""}
          </div>
        </div>
        <div class="hero-copy">
          <p class="eyebrow">Panel privado</p>
          <h1>${propertyName}</h1>
          ${heroMeta ? `<p>${heroMeta}</p>` : ""}
        </div>
      </section>
      <section class="host-content">${content}</section>
    </main>
  `;
}

function hostView() {
  if (!hasBackend()) {
    return hostShell(`
      <section class="panel">
        <h2>Supabase no esta disponible</h2>
        <p class="muted">Revisa que el script de Supabase haya cargado correctamente antes de usar el panel.</p>
      </section>
    `);
  }

  if (!state.authUser) {
    return hostShell(loginView());
  }

  if (state.loading) {
    app.innerHTML = "";
    return;
  }

  if (state.dataError) {
    return hostShell(`
      <section class="panel">
        <h2>No se pudieron cargar los datos</h2>
        <p class="muted">${escapeHtml(state.dataError)}</p>
        <button class="btn primary" onclick="loadHostData()">Reintentar</button>
      </section>
    `);
  }

  if (!state.propertyId) {
    return hostShell(`
      <section class="panel">
        <h2>No hay alojamiento configurado</h2>
        <p class="muted">Cuando exista una propiedad en Supabase, aqui apareceran sus reservas.</p>
      </section>
    `);
  }

  if (reservations.length === 0) {
    return hostShell(`
      <section class="panel my-reservations-panel">
        <div class="panel-head">
          <div>
            <h2>Reservas</h2>
            <p class="muted">Todavia no hay reservas para este alojamiento.</p>
          </div>
          <button class="btn icon-btn" onclick="toggleReservationForm()" aria-expanded="${state.showReservationForm}" aria-label="Nueva reserva">
            ${state.showReservationForm ? "-" : "+"}
          </button>
        </div>
        ${state.showReservationForm ? reservationForm() : ""}
      </section>
    `);
  }

  hostShell(`
    <section class="panel my-reservations-panel">
      <div class="panel-head">
        <div>
          <h2>Reservas</h2>
          <p class="muted">Gestiona estancias activas y pasadas. Selecciona una reserva para ver su link, huespedes y estado de registro.</p>
        </div>
        <button class="btn icon-btn" onclick="toggleReservationForm()" aria-expanded="${state.showReservationForm}" aria-label="Nueva reserva">
          ${state.showReservationForm ? "-" : "+"}
        </button>
      </div>
      ${
        state.showReservationForm
          ? reservationForm()
          : ""
      }
      <div class="reservation-list">
        ${reservations.map((reservation) => reservationCard(reservation)).join("")}
      </div>
    </section>

    <section class="summary-strip" aria-label="Resumen de la reserva seleccionada">
      <article><span>Entrada</span><strong>${formatDate(property.checkIn)}</strong></article>
      <article><span>Salida</span><strong>${formatDate(property.checkOut)}</strong></article>
      <article><span>Reserva</span><strong>${property.bookingRef}</strong></article>
      <article><span>Registros</span><strong>${completionLabel()}</strong></article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Huespedes de esta reserva</h2>
          <p class="muted">Una unica estancia genera un unico link compartido para que los ${guests.length} huespedes rellenen sus datos.</p>
        </div>
        <div class="toolbar">
          <button class="btn" onclick="resetDemo()">Reiniciar demo</button>
          <button class="btn primary" onclick="openGuestLink('register')">Abrir registro</button>
        </div>
      </div>
      <div class="progress-card">
        <div class="progress-row">
          <span>${completionLabel()}</span>
          <span>${allComplete() ? "Acceso disponible" : "Acceso bloqueado"}</span>
        </div>
        <div class="progress"><span style="width: ${guests.length ? (completedCount() / guests.length) * 100 : 0}%"></span></div>
      </div>
      <div class="guest-list">
        ${guests.map((guest) => hostGuestRow(guest)).join("")}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Link unico de la estancia</h2>
          <p class="muted">Comparte este enlace con el grupo. Todos los huespedes registran sus datos desde la misma pagina.</p>
        </div>
        <button class="btn primary" onclick="openGuestLink('register')">Abrir link</button>
      </div>
      <div class="single-link-card">
        <div>
          <span>Enlace de check-in</span>
          <code>${guestLink()}</code>
        </div>
        <div class="link-meta">
          <span>Token efimero</span>
          <strong>${property.stayToken}</strong>
        </div>
        <p>Creado el ${formatDate(property.tokenCreatedAt)} y valido hasta la salida, ${formatDate(property.tokenExpiresAt)}. En una version con backend, el token se guardaria cifrado, seria revocable y caducaria automaticamente.</p>
      </div>
    </section>
  `);
}

function loginView() {
  return `
    <section class="panel auth-panel">
      <div class="panel-head">
        <div>
          <h2>Acceso arrendador</h2>
          <p class="muted">Inicia sesion para gestionar reservas, enlaces y registros.</p>
        </div>
      </div>
      <form class="reservation-form auth-form" onsubmit="event.preventDefault(); loginHost(this);">
        <div class="field">
          <label>Email</label>
          <input name="email" required type="email" autocomplete="email" />
        </div>
        <div class="field">
          <label>Contrasena</label>
          <input name="password" required type="password" autocomplete="current-password" />
        </div>
        <button class="btn primary" type="submit">${state.loading ? "Entrando..." : "Entrar"}</button>
      </form>
      ${state.authError ? `<p class="form-error">${escapeHtml(state.authError)}</p>` : ""}
    </section>
  `;
}

function reservationForm() {
  return `
    <form class="reservation-form inline" onsubmit="event.preventDefault(); createReservation(this);">
      <div class="field">
        <label>Nombre del grupo</label>
        <input name="groupName" placeholder="Opcional" />
      </div>
      <div class="field">
        <label>Entrada</label>
        <input name="checkIn" required type="datetime-local" value="${formatDateTimeInput(property.checkIn) || defaultDateTimeInput(0, 16)}" />
      </div>
      <div class="field">
        <label>Salida</label>
        <input name="checkOut" required type="datetime-local" value="${formatDateTimeInput(property.checkOut) || defaultDateTimeInput(1, 11)}" />
      </div>
      <div class="field">
        <label>Numero de huespedes</label>
        <input name="guestCount" required type="number" min="1" max="30" value="${guests.length || 1}" />
      </div>
      <button class="btn primary" type="submit">Generar reserva y link</button>
    </form>
  `;
}

function reservationCard(reservation) {
  const completed = reservation.guests.filter((guest) => guest.complete).length;
  const isActive = reservation.id === state.activeReservationId;
  const status = reservationStatus(reservation);
  return `
    <article class="reservation-card ${isActive ? "active" : ""}">
      <button class="reservation-select" onclick="switchReservation('${reservation.id}')" aria-pressed="${isActive}">
        <span>
          <strong>${reservation.bookingRef}</strong>
          <small>${formatDate(reservation.checkIn)} - ${formatDate(reservation.checkOut)}</small>
        </span>
        <span class="reservation-badges">
          <span class="pill ${status === "Pasada" ? "neutral" : "ok"}">${status}</span>
          <span class="pill ${completed === reservation.guests.length ? "ok" : "pending"}">${completed}/${reservation.guests.length}</span>
        </span>
      </button>
      <button class="reservation-delete" onclick="deleteReservation('${reservation.id}')" aria-label="Borrar ${reservation.bookingRef}">Borrar</button>
    </article>
  `;
}

function hostGuestRow(guest) {
  return `
    <article class="guest-row ${guest.complete ? "complete" : ""}">
      <div class="guest-state">${guest.complete ? "OK" : guest.id}</div>
      <div>
        <strong>${guest.complete ? guest.name : guest.label}</strong>
        <span>${guest.complete ? `${guest.documentType} registrado` : "Pendiente de datos"}</span>
      </div>
      <span class="pill ${guest.complete ? "ok" : "pending"}">${guest.complete ? "Verde" : "Pendiente"}</span>
      ${guest.complete ? hostGuestDetails(guest) : ""}
    </article>
  `;
}

function hostGuestDetails(guest) {
  const details = guest.details || {
    fullName: guest.name,
    documentLabel: guest.documentType,
  };
  return `
    <details class="guest-data">
      <summary>Ver datos registrados</summary>
      <div class="guest-data-grid">
        ${hostGuestFields
          .map(
            ([label, key]) => `
              <div>
                <span>${label}</span>
                <strong>${escapeHtml(details[key] || "No indicado")}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    </details>
  `;
}

function guestShell(content) {
  const propertyName = property.name || "Registro de huespedes";
  const locationText = property.location ? `${property.location}. ` : "";
  app.innerHTML = `
    <main class="guest-page">
      <header class="guest-header">
        <div class="brand"><span class="brand-logo-frame"><img src="./assets/logo.png" alt="" /></span><span>${propertyName}</span></div>
        <button class="btn ghost dark" onclick="route('host')">Panel</button>
      </header>
      <section class="guest-title">
        <p class="eyebrow">Check-in online</p>
        <h1>${propertyName}</h1>
        <p>${locationText}Completa los registros para desbloquear la llegada.</p>
      </section>
      <nav class="tabs" aria-label="Secciones">
        <button class="${state.tab === "register" ? "active" : ""}" onclick="route('guest', 'register')">Registro</button>
        <button class="${state.tab === "access" ? "active" : ""}" onclick="route('guest', 'access')">Acceso</button>
      </nav>
      ${content}
    </main>
  `;
}

function guestView() {
  if (state.tab === "access") return guestAccess();
  return guestRegister();
}

function guestRegister() {
  guestShell(`
    <section class="mobile-panel">
      <div class="progress-card compact">
        <div class="progress-row">
          <span>${completionLabel()}</span>
          <span>${allComplete() ? "Listo" : "Faltan datos"}</span>
        </div>
        <div class="progress"><span style="width: ${guests.length ? (completedCount() / guests.length) * 100 : 0}%"></span></div>
      </div>
      <div class="notice">
        Este es el link unico de la estancia. Cada persona pulsa su hueco, rellena sus datos y queda en verde. Cuando todos esten en verde, se activa la pestana Acceso.
      </div>
      <div class="accordion-list">
        ${guests.map((guest) => guestAccordion(guest)).join("")}
      </div>
    </section>
  `);
}

function guestAccordion(guest) {
  const open = state.openGuestId === guest.id;
  return `
    <article class="guest-accordion ${guest.complete ? "complete" : ""}">
      <button class="accordion-trigger" onclick="toggleGuest(${guest.id})" aria-expanded="${open}">
        <span class="guest-state">${guest.complete ? "OK" : guest.id}</span>
        <span>
          <strong>${guest.complete ? guest.name : guest.label}</strong>
          <small>${guest.complete ? `${guest.documentType} guardado` : "Tocar para rellenar"}</small>
        </span>
        <span class="chevron">${open ? "-" : "+"}</span>
      </button>
      ${
        open
          ? guest.complete
            ? completedGuestBody(guest)
            : guestForm(guest)
          : ""
      }
    </article>
  `;
}

function completedGuestBody(guest) {
  return `
    <div class="accordion-body">
      <div class="saved-card">
        <strong>Registro completado</strong>
        <span>${guest.name} · ${guest.documentType}</span>
      </div>
    </div>
  `;
}

function guestForm(guest) {
  return `
    <form class="accordion-body form-grid" onsubmit="event.preventDefault(); completeGuest(${guest.id}, this);">
      <div class="field">
        <label>Nombre</label>
        <input name="name" required autocomplete="given-name" />
      </div>
      <div class="field">
        <label>Primer apellido</label>
        <input name="surname" required autocomplete="family-name" />
      </div>
      <div class="field">
        <label>Segundo apellido</label>
        <input name="secondSurname" autocomplete="additional-name" />
      </div>
      <div class="field">
        <label>Sexo</label>
        <select name="sex" required>
          <option value="">Seleccionar</option>
          <option>Mujer</option>
          <option>Hombre</option>
          <option>Otro / no especificado</option>
        </select>
      </div>
      <div class="field">
        <label>Tipo de documento</label>
        <select name="documentType" required>
          <option>DNI</option>
          <option>Pasaporte</option>
          <option>TIE</option>
        </select>
      </div>
      <div class="field">
        <label>Numero de documento</label>
        <input name="documentNumber" required autocomplete="off" />
      </div>
      <div class="field">
        <label>Nacionalidad</label>
        <input name="nationality" required autocomplete="country-name" />
      </div>
      <div class="field full">
        <label>Fecha de nacimiento</label>
        <div class="date-parts" role="group" aria-label="Fecha de nacimiento">
          <select name="birthDay" required aria-label="Dia de nacimiento">
            <option value="">Dia</option>
            ${Array.from({ length: 31 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("")}
          </select>
          <select name="birthMonth" required aria-label="Mes de nacimiento">
            <option value="">Mes</option>
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
          <select name="birthYear" required aria-label="Año de nacimiento">
            <option value="">Año</option>
            ${yearOptions()}
          </select>
        </div>
      </div>
      <div class="field full">
        <label>Residencia habitual</label>
        <input name="address" required placeholder="Direccion completa, localidad y pais" autocomplete="street-address" />
      </div>
      <div class="field">
        <label>Telefono movil</label>
        <input name="phone" required type="tel" autocomplete="tel" />
      </div>
      <div class="field">
        <label>Email</label>
        <input name="email" required type="email" autocomplete="email" />
      </div>
      <button class="btn primary full-width" type="submit">Guardar ${guest.label}</button>
    </form>
  `;
}

function guestAccess() {
  guestShell(`
    <section class="mobile-panel">
      ${
        allComplete()
          ? accessUnlocked()
          : `
            <div class="locked-panel">
              <div class="lock-icon">!</div>
              <h2>Acceso bloqueado</h2>
              <p>Las instrucciones apareceran aqui cuando todos los huespedes esten en verde.</p>
              <button class="btn primary full-width" onclick="route('guest', 'register')">Completar registros</button>
            </div>
          `
      }
    </section>
  `);
}

function accessUnlocked() {
  return `
    <article class="access-hero">
      <p class="eyebrow">Llegada</p>
      <h2>Acceso a ${property.name}</h2>
      <p>Guardad esta pantalla antes de llegar. Aqui teneis la entrada exacta al campo, el recorrido hasta la casa y las normas basicas de la estancia.</p>
    </article>
    <section class="quick-actions" aria-label="Enlaces utiles">
      <a class="btn primary" href="${accessLinks.map}" target="_blank" rel="noopener">Abrir mapa</a>
      <a class="btn" href="${accessLinks.routeVideo}" target="_blank" rel="noopener">Ver video del recorrido</a>
    </section>
    ${accessSections
      .map(
        (section) => `
          <section class="access-section">
            <h2>${section.title}</h2>
            <div class="access-list">
              ${section.items
                .map((item) => `<article><span>${item.label}</span><strong>${item.text}</strong></article>`)
                .join("")}
            </div>
          </section>
        `,
      )
      .join("")}
    <section class="faq">
      <h2>FAQ</h2>
      ${faqs.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("")}
    </section>
  `;
}

async function initFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("guest")) {
    const [, tab, token] = hash.split("/");
    state.view = "guest";
    state.tab = tab === "access" ? "access" : "register";
    const tokenReservation = reservations.find((reservation) => reservation.stayToken === token);
    if (tokenReservation && tokenReservation.id !== state.activeReservationId) {
      syncActiveReservation();
      applyReservation(tokenReservation);
    } else if (hasBackend() && token) {
      await loadPublicReservation(token);
    }
    return;
  }
  state.view = "host";
}

function render() {
  if (state.view === "guest" && state.loading) {
    app.innerHTML = `
      <main class="guest-page">
        <section class="mobile-panel">
          <div class="locked-panel">
            <h2>Cargando reserva</h2>
            <p>Conectando con Supabase...</p>
          </div>
        </section>
      </main>
    `;
    return;
  }
  if (state.view === "guest" && state.dataError) {
    app.innerHTML = `
      <main class="guest-page">
        <section class="mobile-panel">
          <div class="locked-panel">
            <h2>No se pudo abrir el enlace</h2>
            <p>${escapeHtml(state.dataError)}</p>
          </div>
        </section>
      </main>
    `;
    return;
  }
  if (state.view === "guest") return guestView();
  return hostView();
}

window.route = route;
window.openGuestLink = openGuestLink;
window.toggleGuest = toggleGuest;
window.completeGuest = completeGuest;
window.resetDemo = resetDemo;
window.createReservation = createReservation;
window.switchReservation = switchReservation;
window.deleteReservation = deleteReservation;
window.toggleReservationForm = toggleReservationForm;
window.loginHost = loginHost;
window.logoutHost = logoutHost;
window.loadHostData = loadHostData;

window.addEventListener("hashchange", async () => {
  await initFromHash();
  render();
});

async function boot() {
  if (hasBackend()) {
    const { data } = await supabaseClient.auth.getSession();
    state.authUser = data.session?.user || null;
  }
  await initFromHash();
  if (state.view === "host" && state.authUser) {
    await loadHostData();
    return;
  }
  state.loading = false;
  render();
}

boot();
