window.AppState = (() => {
  const app = document.querySelector("#app");

  const SUPABASE_URL = "https://brossrtbenywacrfxkty.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb3NzcnRiZW55d2FjcmZ4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTcwNTgsImV4cCI6MjA5OTUzMzA1OH0.JmYDHw1oTa52noohGHCk2gbGTkriA6iZ2G_PqHOJkAM";
  const SUPABASE_TIMEOUT_MS = 12000;

  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const DEFAULT_PROPERTY = {
    name: "Hacienda San Julián",
    location: "Lorca, Murcia",
    notes: "Alojamiento de San Julián.",
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

  let renderer = () => {};

  function setRenderer(render) {
    renderer = render;
  }

  function renderApp() {
    renderer();
  }

  function withSupabaseTimeout(request, action, timeoutMs = SUPABASE_TIMEOUT_MS) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`La base de datos no respondió a tiempo al ${action}. Revisa la conexión e inténtalo de nuevo.`));
      }, timeoutMs);
    });
    return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
  }

  const faqs = [
    ["Hora de entrada", "La entrada está disponible desde las 16:00."],
    ["Hora de salida", "La salida es antes de las 11:00. Dejad las llaves según las instrucciones del anfitrión."],
    ["Zonas privadas", "Las zonas privadas del alojamiento quedan indicadas por el anfitrión antes de la llegada."],
    ["Contacto", "Para cualquier cosa, contactad con el anfitrión por el canal acordado."],
  ];

  const accessLinks = {
    routeVideo: "#",
    map: "#",
  };

  const accessSections = [
    {
      title: "Ubicación y entrada al campo",
      items: [
        {
          label: "Entrada al camino",
          text: "Seguid las indicaciones compartidas por el anfitrión para llegar al acceso principal.",
        },
        {
          label: "Coordenadas",
          text: "Coordenadas disponibles en la reserva real.",
        },
        {
          label: "Dirección de la casa",
          text: "Dirección disponible en la reserva real.",
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
          text: "Confirmad el último tramo con el anfitrión si tenéis dudas.",
        },
        {
          label: "Llegada",
          text: "Aparcad en la zona indicada para huéspedes.",
        },
      ],
    },
    {
      title: "Al llegar",
      items: [
        {
          label: "Aparcamiento",
          text: "Usad la zona de aparcamiento indicada por el anfitrión.",
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
          text: "Usad solo las zonas exteriores habilitadas para huéspedes.",
        },
        {
          label: "Cuidado exterior",
          text: "Cuidad las zonas comunes y dejadlas como las encontrasteis.",
        },
        {
          label: "Ropa de casa",
          text: "Las camas quedan hechas y encima encontraréis un juego de toallas para cada persona y otra toalla para la piscina.",
        },
        {
          label: "Zonas disponibles",
          text: "Las zonas no disponibles estarán cerradas o señalizadas.",
        },
      ],
    },
    {
      title: "Salida y contacto",
      items: [
        {
          label: "Entrega de llaves",
          text: "Al salir, dejad las llaves según las instrucciones del anfitrión.",
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
    ["Ciudad/Población", "address"],
    ["Teléfono móvil", "phone"],
    ["Email", "email"],
  ];

  return {
    DEFAULT_PROPERTY,
    accessLinks,
    accessSections,
    app,
    faqs,
    guests,
    hostGuestFields,
    property,
    renderApp,
    reservations,
    setRenderer,
    state,
    supabaseClient,
    withSupabaseTimeout,
  };
})();
