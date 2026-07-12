# Airbnb Guest Registry Prototype

Boceto estatico para validar el flujo de registro de huespedes de un alojamiento antes de construir backend real.

## Como abrirlo

Abre `index.html` directamente en el navegador.

Tambien puedes servirlo localmente:

```sh
python3 -m http.server 5174
```

Y visitar:

```text
http://localhost:5174
```

## Pantallas incluidas

- Panel privado del arrendador para una unica propiedad.
- Link unico demo por estancia para cuatro huespedes.
- Registro movil con un desplegable por huesped.
- Huespedes marcados en verde cuando completan datos.
- Pestana dedicada de acceso con instrucciones y FAQ, desbloqueada solo cuando todos estan en verde.

## Que falta para convertirlo en producto

- Autenticacion real del arrendador.
- Base de datos Postgres/Supabase.
- Token unico de estancia, persistente y revocable.
- Validacion server-side.
- Cifrado o proteccion reforzada de campos sensibles.
- Politica RGPD, logs de acceso y caducidad de datos.
- Exportacion CSV/Excel para gestion manual.
- Integracion con SES.HOSPEDAJES en una fase posterior.
