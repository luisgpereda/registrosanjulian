window.AppUtils = (() => {
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

  function defaultDateTimeInput(daysFromNow = 0, hour = 16) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return formatDateTimeInput(date.toISOString());
  }

  return {
    buildBirthDate,
    buildBookingRef,
    defaultDateTimeInput,
    escapeHtml,
    formatDate,
    formatDateTimeInput,
    generateReservationId,
    generateToken,
    yearOptions,
  };
})();
