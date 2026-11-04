# LendLoop: ejecución y demostración

## Aplicación de prueba

LendLoop es un ejercicio técnico full stack para préstamo de herramientas. Las pantallas de demo usan datos de ejemplo. No es una tienda real, no procesa pagos y las notificaciones se registran en Convex como un canal simulado.

## Abrir en la computadora de Diego

Carpeta: D:\portoflio pawsi\LendLoop
En CMD: cd /d "D:\portoflio pawsi\LendLoop"
Para editar: npm run dev
Para usar la versión compilada: npm run build y después npm run start. También se puede abrir Start-LendLoop.cmd. Si ya hay un proceso en el puerto 3100, se reutiliza o se cierra antes de iniciar otro.
Aplicación conectada: http://localhost:3100
Demo interactiva: http://localhost:3100/demo
Catálogo de muestra: http://localhost:3100/demo/public

## Clerk y Convex

Las cuentas de desarrollo existentes ya están vinculadas. No hace falta crear nuevos proyectos. Diego inició sesión en la aplicación y su usuario está incluido en ADMIN_SUBJECTS, la lista de administradores del servidor. Actualizar la página permite recibir el permiso.
Para editar funciones del backend, mantener npx convex dev en otra terminal. Los cambios de frontend se muestran con npm run dev; npm start requiere una nueva compilación.
En otra computadora se necesita npm ci, configurar .env.local con las propias credenciales y seleccionar el proyecto de Convex. README.md describe cada variable. Los secretos no se suben al repositorio ni a Drive.

## Automatizaciones

Docker Desktop debe estar iniciado. docker compose --env-file .env.n8n up -d levanta n8n. El editor está en http://localhost:5678 y su cuenta local es independiente de Clerk.
Los tres exports están en n8n/workflows. Los workflows de solicitudes y vencimientos usan el de errores como manejador. Las notificaciones son registros simulados; no se envían correos a personas.
Convex Cloud necesita una dirección HTTPS para alcanzar el webhook. compose.tunnel.yml ofrece un túnel temporal con un gateway que solo acepta POST /webhook/lendloop-events y comprueba la firma antes de reenviar. El editor no queda expuesto.
El comando de inicio del perfil de túnel es docker compose --env-file .env.n8n -f compose.yml -f compose.tunnel.yml up -d. La URL temporal cambia al recrear el túnel: debe actualizarse N8N_WEBHOOK_URL en Convex. Para una entrega estable se necesita un hostname permanente o n8n alojado.
La integración conectada entregó tres eventos y deduplicó un replay. El workflow diario se ejecutó sin préstamos vencidos. Evidencia en docs/connected-verification.json. Para reconectar el túnel, ejecutar node scripts/connect-automations.mjs o abrir Start-Automations.cmd con Docker iniciado.

## Recorrido de demostración

En /demo, Sam puede buscar una herramienta y solicitar fechas. Cambiar a Alex permite aprobar una solicitud de su herramienta. Volver a Sam permite registrar la devolución cuando el préstamo comenzó. Morgan muestra los controles de administrador.
En la aplicación conectada, repetir el recorrido con dos cuentas y dos perfiles del navegador. El catálogo, las publicaciones y los préstamos se guardan en Convex. La demo se reinicia al refrescar.
Expandir Automation activity permite comprobar la entrega del registro de notificación. Una solicitud pendiente no reserva fechas; la aprobación vuelve a comprobar disponibilidad.

## Verificaciones y capturas

npm run check comprueba TypeScript, pruebas automatizadas y compilación. npm run test:e2e recorre la demo en Chromium. El checklist de la infraestructura real está en docs/ACCEPTANCE.md.
Con la app abierta, node scripts/capture-portfolio.mjs guarda cinco capturas en docs/portfolio/capturas: catálogo, espacio de trabajo, solicitud, administración y móvil. La banda de demo debe permanecer visible al usarlas en el portfolio.

## Qué explicar en una entrevista

Clerk autentica; Convex autoriza. Los permisos se comprueban en el servidor. El préstamo y su evento se guardan en una misma transacción. Un proceso entrega el evento con reintentos, y un callback repetido no crea notificaciones duplicadas.
HTTPS cifra el transporte. HMAC autentica la integración y detecta cambios. Cada dirección usa una clave distinta. Los recordatorios se identifican por préstamo y día UTC y vuelven a comprobar que el préstamo siga vencido.

## Antes de publicar

Revisar el diseño con Diego, confirmar la prueba de dos sesiones y elegir un alojamiento estable. GitHub, la postulación y el portfolio online son pasos posteriores. No presentar la app como un producto comercial con usuarios reales.

## Fotos y seguridad

Las publicaciones permiten una foto opcional desde Edit listing → Choose a photo → Upload photo. Al crear una publicación, guardar primero los datos. Ver [PHOTOS.md](PHOTOS.md) para la configuración y [SECURITY.md](SECURITY.md) para los controles de ciberseguridad.
