window.AppData = (() => {
const {
  DEFAULT_PROPERTY,
  accessLinks,
  guests,
  property,
  renderApp,
  reservations,
  state,
  supabaseClient,
  withSupabaseTimeout,
} = window.AppState;
const { buildBookingRef } = window.AppUtils;

function createGuest(id) {
  return {
    id,
    label: `Huésped ${id}`,
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

function mapGuestFromRow(row) {
  const fullName = row.full_name || `Huésped ${row.position}`;
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
    label: `Huésped ${row.position}`,
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
    label: `Huésped ${guest.position}`,
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

  const { data, error } = await withSupabaseTimeout(
    supabaseClient
      .from("properties")
      .insert({
        owner_id: state.authUser.id,
        ...DEFAULT_PROPERTY,
      })
      .select("*")
      .single(),
    "crear el alojamiento",
  );

  if (error) {
    throw error;
  }

  return data;
}

async function loadHostData() {
  if (!hasBackend() || !state.authUser) return;
  state.loading = true;
  state.dataError = "";
  renderApp();

  try {
    const { data: properties, error: propertyError } = await withSupabaseTimeout(
      supabaseClient
        .from("properties")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1),
      "cargar el alojamiento",
    );
    if (propertyError) throw propertyError;

    const currentProperty = await ensureHostProperty(properties || []);

    applyPropertyFromRow(currentProperty);

    if (!currentProperty) {
      reservations.splice(0, reservations.length);
      clearActiveReservation();
      state.loading = false;
      renderApp();
      return;
    }

    const { data, error } = await withSupabaseTimeout(
      supabaseClient
        .from("reservations")
        .select("*, guests(*)")
        .eq("property_id", currentProperty.id)
        .order("check_in", { ascending: true }),
      "cargar las reservas",
    );
    if (error) throw error;

    reservations.splice(0, reservations.length, ...(data || []).map(mapReservationFromRow));
    if (reservations.length > 0) {
      const active = reservations.find((reservation) => reservation.id === state.activeReservationId) || reservations[0];
      applyReservation(active);
    } else {
      clearActiveReservation();
    }
    state.loading = false;
    renderApp();
  } catch (error) {
    state.dataError = error.message;
    state.loading = false;
    renderApp();
  }
}

async function loadPublicReservation(publicSlug, options = {}) {
  const { showLoading = true, showError = true } = options;
  if (!hasBackend() || !publicSlug) return false;
  if (showLoading) state.loading = true;
  state.dataError = "";
  if (showLoading) renderApp();

  try {
    const { data, error } = await withSupabaseTimeout(
      supabaseClient.rpc("get_public_reservation", {
        input_public_slug: publicSlug,
      }),
      "cargar la reserva",
    );
    if (error || !data) throw new Error(error?.message || "No se ha encontrado esta reserva.");

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
    if (showLoading) renderApp();
    return true;
  } catch (error) {
    if (showError) state.dataError = error.message;
    state.loading = false;
    if (showLoading || showError) renderApp();
    return false;
  }
}

async function refreshActivePublicReservation() {
  const reservation = activeReservation();
  if (reservation?.stayToken) {
    return loadPublicReservation(reservation.stayToken, { showLoading: false, showError: false });
  }
  return false;
}

return {
  activeReservation,
  applyReservation,
  clearActiveReservation,
  createGuest,
  hasBackend,
  loadHostData,
  loadPublicReservation,
  refreshActivePublicReservation,
  syncActiveReservation,
};
})();
