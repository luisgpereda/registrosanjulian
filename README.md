# Airbnb Guest Registry Prototype

Boceto estático para validar el flujo de registro de huéspedes de un alojamiento antes de construir backend real.

## Cómo abrirlo

Abre `index.html` directamente en el navegador.

También puedes servirlo localmente:

```sh
python3 -m http.server 5174
```

Y visitar:

```text
http://localhost:5174
```

## Pantallas incluidas

- Panel privado del arrendador para una única propiedad.
- Link único por estancia para los huéspedes.
- Registro móvil con un desplegable por huésped.
- Huéspedes marcados en verde cuando completan datos.
- Pestaña dedicada de acceso con instrucciones y FAQ, desbloqueada solo cuando todos están en verde.

## Qué falta para convertirlo en producto

- Autenticación real del arrendador.
- Base de datos Postgres/Supabase.
- Token único de estancia, persistente y revocable.
- Validación server-side.
- Cifrado o protección reforzada de campos sensibles.
- Política RGPD, logs de acceso y caducidad de datos.
- Exportación CSV/Excel para gestión manual.
- Integración con SES.HOSPEDAJES en una fase posterior.
