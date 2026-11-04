# Arquitectura de LendLoop

## Componentes

Next.js sirve la interfaz pública y el espacio de trabajo. React se suscribe a las consultas de Convex para actualizar herramientas y solicitudes. TypeScript comparte los contratos de las funciones del backend con sus consumidores.

Clerk autentica a las personas. Su plantilla JWT llamada convex incorpora la audiencia convex. El backend verifica el emisor configurado y utiliza el sujeto del token como identidad estable. La clave secreta de Clerk no se envía al navegador.

Convex mantiene las tablas members, tools, loans, events y notifications. Las funciones públicas que acceden a información privada exigen identidad y comprueban propiedad o rol. Las funciones de automatización que no deben llamarse desde el navegador son internas.

n8n ejecuta el workflow de eventos y el workflow diario de vencimientos. Un tercer workflow registra fallos operativos. La configuración local utiliza Docker y mantiene privado el editor.

## Modelo de datos y permisos

members conserva el identificador de Clerk, un nombre para mostrar y la marca de confianza. El rol administrador procede de una lista de sujetos configurada en el servidor, no de un campo editable enviado por el cliente.

tools registra propietario, nombre, categoría, condición, descripción y archivado. La baja lógica preserva el historial de préstamos. Los propietarios no pueden retirar una publicación con un préstamo aprobado sin terminar; los administradores pueden archivarla y conservar el préstamo activo.

loans vincula herramienta, prestador, solicitante, fechas y estado. Los estados son pending, approved, declined, cancelled y returned. Las fechas representan días UTC inclusivos. La duración máxima es de 31 días y la anticipación máxima es de 180 días.

events es la bandeja de eventos pendientes de entrega. notifications guarda el registro de notificación simulada y su clave de deduplicación.

## Flujo de una solicitud

La mutación comprueba identidad, propiedad, fechas y disponibilidad. Guarda el préstamo pendiente y el evento en una misma transacción.

Un cron de Convex toma eventos pendientes cada minuto. El proceso adquiere una reserva temporal de procesamiento, firma la entrega y envía a n8n únicamente el identificador del evento.

n8n valida la firma y llama un endpoint de Convex con un callback también firmado. El servidor determina el destinatario a partir del evento persistido y escribe la notificación simulada. Una respuesta HTTP exitosa sin ese registro no se considera entrega completa.

Los intentos utilizan espera creciente. Después de cinco fallos, el administrador puede revisar el problema y reintentar desde la aplicación.

## Recordatorios de vencimiento

El workflow diario consulta por HTTP los préstamos aprobados cuya fecha de devolución ya pasó. Envía un callback por préstamo. Antes de registrar el recordatorio, Convex verifica otra vez el estado: una devolución registrada después de la consulta hace que el callback se omita.

La clave de un recordatorio combina préstamo y día UTC. Repetir la ejecución del workflow no multiplica recordatorios de ese día.

## Límite de confianza

Las firmas HMAC-SHA256 cubren método, ruta, timestamp y bytes del cuerpo. Las claves son diferentes en cada dirección. La ventana aceptada es de cinco minutos; las operaciones de escritura son idempotentes también dentro de esa ventana.

Los workflows reciben identificadores opacos y el día del recordatorio. No necesitan nombre, correo, dirección, descripción de la herramienta ni tokens de Clerk. El catálogo público devuelve solo nombre y categoría.

HTTPS protege el transporte. HMAC permite detectar alteraciones y autenticar al emisor de la integración; no reemplaza el cifrado.

## Qué no afirma este diseño

El canal implementado garantiza una única fila de notificación por clave, no una entrega de correo exactamente una vez. Convex-test verifica funciones en un entorno simulado, no toda la infraestructura cloud. Los ensayos de navegador de la demo no sustituyen una prueba real de inicio de sesión.

La versión de prueba utiliza consultas completas y un conjunto pequeño de datos. Producción necesitaría paginación, monitoreo de colas y ejecuciones, alertas externas, rotación de claves, backups probados y aislamiento de los task runners de n8n.

## Conexión de desarrollo verificada

El gateway restringe la entrada a POST /webhook/lendloop-events y valida HMAC antes de reenviar a n8n. El editor permanece privado. El túnel temporal permite la prueba con Convex Cloud; un entorno público necesita un hostname estable.

El 3 de noviembre se verificaron tres entregas reales de eventos y la deduplicación de un replay con identidades sintéticas de la CLI. El workflow diario consultó Convex con cero préstamos vencidos. Las reglas de vencimiento, revalidación y deduplicación también tienen pruebas automatizadas. La prueba de dos sesiones reales de Clerk sigue en el checklist de aceptación.
