# LendLoop como aplicación de prueba

LendLoop es una aplicación full stack de prueba para compartir herramientas entre vecinos. Se desarrolló como ejercicio técnico de selección y como material de portfolio. No es un servicio comercial ni tiene usuarios reales de una comunidad.

El ejercicio permite mostrar decisiones que van más allá de una pantalla: identidad, permisos, reservas por fechas, estados de préstamos y automatizaciones que toleran reintentos.

## Problema y recorrido

Una persona publica una herramienta con nombre, categoría, estado y descripción. Otra solicita un intervalo de fechas. El propietario aprueba o rechaza la solicitud. Una vez iniciado el préstamo, cualquiera de sus participantes puede registrar la devolución.

El catálogo público solo muestra nombre y categoría de las herramientas disponibles. Los detalles, las reservas y los datos del propietario requieren iniciar sesión. Las vistas privadas separan mis publicaciones, mis solicitudes y las solicitudes recibidas.

## Implementación

El frontend utiliza Next.js App Router, React y TypeScript. Clerk gestiona la identidad y emite el token de Convex. Convex mantiene los datos y ejecuta las reglas del negocio en funciones del servidor. n8n procesa eventos de solicitudes y recordatorios diarios de préstamos vencidos.

Los administradores pueden retirar publicaciones, consultar todos los préstamos y marcar prestadores de confianza. Los permisos se verifican en Convex, incluso si alguien intenta llamar las funciones sin pasar por los botones de la interfaz.

## Decisiones que vale la pena mostrar

La aprobación vuelve a comprobar disponibilidad dentro de una mutación. Dos solicitudes pendientes no pueden transformarse en reservas superpuestas. Una herramienta vencida sigue indisponible hasta que se registra su devolución.

El cambio de estado y su evento se guardan juntos. Un proceso posterior intenta entregar el evento a n8n. Si la entrega falla, el evento no desaparece: se reintenta y, al agotar los intentos, queda visible para el administrador.

Los mensajes entre Convex y n8n llevan firmas HMAC con claves distintas por dirección. Se firman método, ruta, hora y contenido. Los callbacks repetidos producen una sola notificación; un recordatorio se identifica por préstamo y día UTC.

## Diseño visual

La interfaz usa un catálogo comercial con tarjetas, ilustraciones por categoría, búsqueda y filtros. La paleta azul y las superficies claras priorizan el inventario. Las imágenes son ilustraciones orientativas, no fotografías de los objetos.

La navegación horizontal separa publicaciones, solicitudes y administración. Los formularios conservan etiquetas, foco visible y cierre con Escape.

## Alcance y límites

Las notificaciones son registros simulados en Convex, una alternativa admitida por la consigna. No se ha implementado un proveedor de correo. Las capturas con la banda de demo representan datos de ejemplo, no actividad real.

Existe un backend de desarrollo desplegado en Convex y una aplicación de desarrollo de Clerk vinculada. Las pruebas locales y las evidencias de conexión se detallan en el estado de entrega; no equivalen a una auditoría de producción.

Para operar públicamente faltarían, entre otras cosas, reglas de pertenencia a una comunidad, moderación, gestión de disputas, paginación, límites de uso y una infraestructura estable de automatización.

## Texto breve para portfolio

LendLoop es una aplicación de prueba de préstamo de herramientas desarrollada con Next.js, TypeScript, Clerk, Convex y n8n. Implementa permisos en el backend, reservas con control de superposición y automatizaciones firmadas e idempotentes. Incluye una demo interactiva, pruebas automatizadas y documentación de arquitectura. El canal de notificaciones es simulado y no se presenta como un servicio en producción.
