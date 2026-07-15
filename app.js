const {
  accessLinks,
  accessSections,
  app,
  faqs,
  guests,
  hostGuestFields,
  property,
  reservations,
  setRenderer,
  state,
  supabaseClient,
  withSupabaseTimeout,
} = window.AppState;
const {
  buildBirthDate,
  buildBookingRef,
  defaultDateTimeInput,
  escapeHtml,
  formatDate,
  formatDateTimeInput,
  generateReservationId,
  generateToken,
  yearOptions,
} = window.AppUtils;
const {
  activeReservation,
  applyReservation,
  clearActiveReservation,
  createGuest,
  hasBackend,
  loadHostData,
  loadPublicReservation,
  refreshActivePublicReservation,
  syncActiveReservation,
} = window.AppData;

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
  const confirmed = window.confirm(`¿Borrar la reserva ${reservation.bookingRef}? Esta acción quitará también su link efímero.`);
  if (!confirmed) return;

  if (hasBackend() && state.authUser) {
    try {
      const { error } = await withSupabaseTimeout(
        supabaseClient.from("reservations").delete().eq("id", id),
        "borrar la reserva",
      );
      if (error) throw error;
      await loadHostData();
      return;
    } catch (error) {
      window.alert(`No se pudo borrar la reserva: ${error.message}`);
      return;
    }
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

  try {
    const { data: authData, error } = await withSupabaseTimeout(
      supabaseClient.auth.signInWithPassword({
        email: data.get("email"),
        password: data.get("password"),
      }),
      "iniciar sesión",
    );
    if (error) throw error;
    state.authUser = authData.user;
    await loadHostData();
  } catch (error) {
    state.authError = error.message;
    state.loading = false;
    render();
  }
}

async function logoutHost() {
  if (!hasBackend()) return;
  try {
    await withSupabaseTimeout(supabaseClient.auth.signOut(), "cerrar sesión");
  } catch (error) {
    console.warn(error);
  }
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

function guestLink(tab = "register") {
  const baseUrl = window.location.href.split("#")[0];
  return property.stayToken ? `${baseUrl}#guest/${tab}/${property.stayToken}` : baseUrl;
}

function openGuestLink(tab = "register") {
  if (!property.stayToken) return;
  window.open(guestLink(tab), "_blank", "noopener");
}

async function copyGuestLink(tab = "register") {
  if (!property.stayToken) return;
  const link = guestLink(tab);
  try {
    await navigator.clipboard.writeText(link);
    window.alert("Link copiado.");
  } catch (_) {
    window.prompt("Copia este link:", link);
  }
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
    try {
      const { error } = await withSupabaseTimeout(
        supabaseClient.rpc("update_public_guest", {
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
        }),
        "guardar el registro",
      );
      if (error) throw error;
    } catch (error) {
      window.alert(`No se pudo guardar el registro: ${error.message}`);
      return;
    }
    guest.complete = true;
    guest.name = "";
    guest.documentType = "";
    guest.details = null;
    await refreshActivePublicReservation();
    if (allComplete()) state.tab = "access";
    render();
    return;
  }

  guest.complete = true;
  guest.name = "";
  guest.documentType = "";
  guest.details = null;
  const nextPending = guests.find((item) => !item.complete);
  state.openGuestId = nextPending ? nextPending.id : null;
  if (allComplete()) state.tab = "access";
  syncActiveReservation();
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
    let reservationRow;
    try {
      const { data: createdReservation, error } = await withSupabaseTimeout(
        supabaseClient
          .from("reservations")
          .insert({
            property_id: state.propertyId,
            group_name: data.get("groupName")?.trim() || null,
            check_in: checkIn,
            check_out: checkOut,
            guest_count: guestCount,
          })
          .select()
          .single(),
        "crear la reserva",
      );
      if (error) throw error;
      reservationRow = createdReservation;
    } catch (error) {
      window.alert(`No se pudo crear la reserva: ${error.message}`);
      return;
    }

    const guestRows = Array.from({ length: guestCount }, (_, index) => ({
      reservation_id: reservationRow.id,
      position: index + 1,
    }));
    try {
      const { error: guestsError } = await withSupabaseTimeout(
        supabaseClient.from("guests").insert(guestRows),
        "crear los huéspedes",
      );
      if (guestsError) throw guestsError;
    } catch (error) {
      window.alert(`La reserva se creó, pero no se pudieron crear los huéspedes: ${error.message}`);
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
  const propertyName = property.name || "Registro de huéspedes";
  const heroMeta = [property.location, property.notes].filter(Boolean).join(" · ");
  app.innerHTML = `
    <main class="host-page">
      <section class="property-hero">
        <div class="hero-top">
          <div class="brand"><span class="brand-logo-frame"><img src="./assets/logo.png" alt="" /></span><span>${propertyName}</span></div>
          <div class="toolbar">
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
        <h2>Supabase no está disponible</h2>
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
        <p class="muted">Cuando exista una propiedad en Supabase, aquí aparecerán sus reservas.</p>
      </section>
    `);
  }

  if (reservations.length === 0) {
    return hostShell(`
      <section class="panel my-reservations-panel">
        <div class="panel-head">
          <div>
            <h2>Reservas</h2>
            <p class="muted">Todavía no hay reservas para este alojamiento.</p>
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
          <p class="muted">Gestiona estancias activas y pasadas. Selecciona una reserva para ver su link, huéspedes y estado de registro.</p>
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
          <h2>Huéspedes de esta reserva</h2>
          <p class="muted">Una única estancia genera un único link compartido para que los ${guests.length} huéspedes rellenen sus datos.</p>
        </div>
        <div class="toolbar">
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
          <h2>Link único de la estancia</h2>
          <p class="muted">Comparte este enlace con el grupo. Todos los huéspedes registran sus datos desde la misma página.</p>
        </div>
        <button class="btn primary" onclick="openGuestLink('register')">Abrir link</button>
      </div>
      <div class="single-link-card">
        <div>
          <span>Enlace de check-in</span>
          <code>${guestLink()}</code>
        </div>
        <div class="link-actions">
          <button class="btn primary" onclick="copyGuestLink('register')">Copiar link</button>
        </div>
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
          <p class="muted">Inicia sesión para gestionar reservas, enlaces y registros.</p>
        </div>
      </div>
      <form class="reservation-form auth-form" onsubmit="event.preventDefault(); loginHost(this);">
        <div class="field">
          <label>Email</label>
          <input name="email" required type="email" autocomplete="email" />
        </div>
        <div class="field">
          <label>Contraseña</label>
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
      <div class="field reservation-date-field">
        <label>Entrada</label>
        <input name="checkIn" required type="datetime-local" value="${formatDateTimeInput(property.checkIn) || defaultDateTimeInput(0, 16)}" />
      </div>
      <div class="field reservation-date-field">
        <label>Salida</label>
        <input name="checkOut" required type="datetime-local" value="${formatDateTimeInput(property.checkOut) || defaultDateTimeInput(1, 11)}" />
      </div>
      <div class="field">
        <label>Número de huéspedes</label>
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
      <span class="pill ${guest.complete ? "ok" : "pending"}">${guest.complete ? "Completo" : "Pendiente"}</span>
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
  const propertyName = property.name || "Registro de huéspedes";
  const locationText = property.location ? `${property.location}. ` : "";
  app.innerHTML = `
    <main class="guest-page">
      <header class="guest-header">
        <div class="brand"><span class="brand-logo-frame"><img src="./assets/logo.png" alt="" /></span><span>${propertyName}</span></div>
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
        Este es el link único de la estancia. Cada persona pulsa su hueco, rellena sus datos y queda en verde. Cuando todos estén en verde, se activa la pestaña Acceso.
      </div>
      <div class="accordion-list">
        ${guests.map((guest) => guestAccordion(guest)).join("")}
      </div>
    </section>
  `);
}

function guestAccordion(guest) {
  const open = state.openGuestId === guest.id;
  const guestTitle = guest.complete && guest.name ? guest.name : guest.label;
  return `
    <article class="guest-accordion ${guest.complete ? "complete" : ""}">
      <button class="accordion-trigger" onclick="toggleGuest(${guest.id})" aria-expanded="${open}">
        <span class="guest-state">${guest.complete ? "OK" : guest.id}</span>
        <span>
          <strong>${escapeHtml(guestTitle)}</strong>
          <small>${guest.complete ? "Registro completo" : "Tocar para rellenar"}</small>
        </span>
        <span class="chevron">${open ? "-" : "+"}</span>
      </button>
      ${
        open
          ? guest.complete
            ? completedGuestBody()
            : guestForm(guest)
          : ""
      }
    </article>
  `;
}

function completedGuestBody() {
  return `
    <div class="accordion-body">
      <div class="saved-card">
        <strong>Registro completado</strong>
        <span>Todos los campos obligatorios se han guardado correctamente.</span>
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
        <label>Número de documento</label>
        <input name="documentNumber" required autocomplete="off" />
      </div>
      <div class="field">
        <label>Nacionalidad</label>
        <input name="nationality" required autocomplete="country-name" />
      </div>
      <div class="field full">
        <label>Fecha de nacimiento</label>
        <div class="date-parts" role="group" aria-label="Fecha de nacimiento">
          <select name="birthDay" required aria-label="Día de nacimiento">
            <option value="">Día</option>
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
        <input name="address" required placeholder="Dirección completa, localidad y país" autocomplete="street-address" />
      </div>
      <div class="field">
        <label>Teléfono móvil</label>
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
              <p>Las instrucciones aparecerán aquí cuando todos los huéspedes estén en verde.</p>
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
      <p>Guardad esta pantalla antes de llegar. Aquí tenéis la entrada exacta al campo, el recorrido hasta la casa y las normas básicas de la estancia.</p>
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
            <p>Espere por favor...</p>
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
window.copyGuestLink = copyGuestLink;
window.toggleGuest = toggleGuest;
window.completeGuest = completeGuest;
window.createReservation = createReservation;
window.switchReservation = switchReservation;
window.deleteReservation = deleteReservation;
window.toggleReservationForm = toggleReservationForm;
window.loginHost = loginHost;
window.logoutHost = logoutHost;
window.loadHostData = loadHostData;

setRenderer(render);

window.addEventListener("hashchange", async () => {
  try {
    await initFromHash();
  } catch (error) {
    state.dataError = error.message;
    state.loading = false;
  }
  render();
});

async function boot() {
  try {
    if (hasBackend()) {
      const { data } = await withSupabaseTimeout(supabaseClient.auth.getSession(), "recuperar la sesión");
      state.authUser = data.session?.user || null;
    }
    await initFromHash();
    if (state.view === "host" && state.authUser) {
      await loadHostData();
      return;
    }
  } catch (error) {
    state.dataError = error.message;
  }
  state.loading = false;
  render();
}

boot();
