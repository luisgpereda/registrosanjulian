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

  const accessLinks = {
    images: [
      {
        src: "./assets/acceso_cenital.jpg",
        alt: "Vista cenital de la casa y el camino de acceso marcado",
        caption: "Vista cenital de la casa y del camino de acceso marcado en negro.",
        label: "Ver foto cenital de la casa y acceso",
      },
      {
        src: "./assets/acceso_street_view.jpeg",
        alt: "Foto del acceso desde Google Street View",
        caption: "Entrada al camino vista desde la carretera. La flecha indica el acceso.",
        label: "Ver Street View de la entrada de la casa",
      },
    ],
    map: "https://www.google.com/maps/search/?api=1&query=37.697111,-1.634056",
    routeVideo: "",
  };

  const accessSections = [
    {
      title: "Dirección exacta",
      items: [
        {
          label: "Orientación",
          text: "La entrada se identifica por un camino de pinos. En el acceso hay una piedra con el texto San Julián.",
        },
        {
          label: "Coordenadas del camino de acceso",
          text: "37°41'49.6\"N 1°38'02.6\"W",
        },
        {
          label: "Dirección de la casa",
          text: "Diseminado la Hoya, 293, 30816 San Julián, Murcia.",
        },
      ],
    },
    {
      title: "Entrada por el camino",
      items: [
        {
          label: "Indicaciones",
          text: "Hay que seguir todo el camino recto hasta encontrar una cancela. En ese punto se gira a la izquierda. Al final del carril hay un muro; allí se vuelve a girar a la derecha y se continúa haciendo una U, como se indica en la imagen del acceso, hasta llegar a la parte trasera de la casa.",
        },
      ],
    },
    {
      title: "Llegada y llaves",
      items: [
        {
          label: "Aparcamiento",
          text: "Una vez dentro de la casa, el coche se puede aparcar dentro del patio o fuera, según se prefiera.",
        },
        {
          label: "Entrega de llaves",
          text: "Al llegar se entregará una copia de las llaves.",
        },
        {
          label: "Acceso a la casa",
          text: "La entrada se realiza por la puerta de la planta baja, situada en el patio. En esa planta están la mayoría de los dormitorios; el resto se encuentran en la planta superior.",
        },
      ],
    },
    {
      title: "Uso de la casa",
      items: [
        {
          label: "Jardín",
          text: "Se puede salir al jardín por la puerta principal de la planta baja, junto al salón, o por la terraza de la planta superior. Por favor, no se deben tirar piedras al estanque ni mover las piedras grandes del jardín.",
        },
        {
          label: "Puertas interiores",
          text: "Las llaves se han dejado en sus puertas o cerca de ellas. Solo es necesario cerrar la puerta del patio; el resto se cierran desde dentro de la casa.",
        },
        {
          label: "Ropa de casa",
          text: "Las camas estarán hechas. Encima de cada cama habrá un juego de toallas para cada persona y una toalla adicional para la piscina.",
        },
        {
          label: "Zonas disponibles",
          text: "El trastero y una sala de la planta superior, situada entre el salón principal y el comedor, permanecerán cerrados por contener objetos personales. El resto de la casa queda a disposición de los huéspedes.",
        },
      ],
    },
    {
      title: "Instrucciones de salida",
      items: [
        {
          label: "Entrega de llaves",
          text: "Al salir, las llaves deben dejarse en la primera maceta situada junto al portalón. Después, conviene avisar para que puedan pasar a recogerlas y cerrar la casa.",
        },
      ],
    },
    {
      title: "Contacto",
      items: [
        {
          label: "Teléfono y WhatsApp",
          text: "Para cualquier cosa, se puede contactar por teléfono o WhatsApp en el 608 96 72 48 o en el 610 54 72 20.",
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
