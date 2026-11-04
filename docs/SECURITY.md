# Ciberseguridad de LendLoop

## Alcance y modelo de confianza

LendLoop es una aplicación de prueba. Este documento describe controles implementados y sus límites; no constituye una certificación ni una auditoría independiente.

Clerk verifica la identidad. Convex decide qué datos y acciones están permitidos. El navegador no determina el propietario ni el rol administrador. El servidor Next.js procesa imágenes; n8n procesa notificaciones simuladas. Cada integración usa una clave distinta.

## Autenticación y autorización

| Operación                                     | Invitado           | Miembro                    | Propietario                                          | Administrador             |
| --------------------------------------------- | ------------------ | -------------------------- | ---------------------------------------------------- | ------------------------- |
| Ver catálogo público                          | Nombre y categoría | Nombre y categoría         | Nombre y categoría                                   | Nombre y categoría        |
| Ver detalles y fotos de publicaciones activas | No                 | Sí                         | Sí                                                   | Sí                        |
| Crear una publicación                         | No                 | Sí, propia                 | Sí, propia                                           | Sí, propia                |
| Editar datos o reemplazar foto                | No                 | No en publicaciones ajenas | Sí                                                   | Solo en sus publicaciones |
| Quitar una foto                               | No                 | No en publicaciones ajenas | Sí                                                   | Sí, para moderación       |
| Archivar publicación                          | No                 | No en publicaciones ajenas | Sí, sin préstamos aprobados pendientes de devolución | Sí                        |
| Aprobar una solicitud                         | No                 | No por ser solicitante     | Solo el prestador                                    | No por ser administrador  |
| Ver todos los préstamos y otorgar confianza   | No                 | No                         | No por ser propietario                               | Sí                        |

El rol administrador procede de ADMIN_SUBJECTS, en el servidor. Las funciones no aceptan un rol o propietario enviado por el cliente. Los identificadores se validan con v.id y se comprueba su relación con el usuario en cada operación. Los controles de interfaz complementan los del backend.

Las fotos se leen por rutas autenticadas de Next.js y Convex. La aplicación no genera ni devuelve URLs públicas de storage. Un ID de archivo no habilita lectura anónima. Todos los miembros registrados pueden ver las fotos de publicaciones activas; no se trata de fotos privadas entre dos personas.

## Carga y normalización de imágenes

El navegador envía el archivo a POST /api/tools/:id/photo. La ruta comprueba origen y sesión, solicita un ticket ligado al propietario y solo entonces lee y procesa los bytes.

Se admiten JPEG, PNG y WebP estáticos, hasta 5 MiB de entrada y 20 millones de píxeles. Se comprueban la cabecera binaria, su coincidencia con el MIME declarado y la decodificación completa con sharp. La extensión y el nombre del archivo no deciden si se acepta. SVG, GIF, documentos, código y archivos corruptos no forman parte de la lista permitida. Se rechazan APNG y WebP animados.

La imagen se orienta según EXIF, se reduce para caber en 1600 × 1600 sin ampliarla y se recodifica a WebP con calidad 80. No se conservan EXIF, GPS, XMP ni ICC. El archivo resultante tiene un máximo de 2 MiB. Solo ese resultado se almacena: los bytes originales y el nombre de archivo no se guardan ni se usan como rutas del sistema.

Recodificar elimina metadatos y contenido añadido que no forma parte de los píxeles. No elimina información visible en la foto ni garantiza detectar esteganografía. No se instaló un antivirus ni se afirma que cualquier archivo sea inocuo.

## Impedir saltarse el procesador

Next.js firma el SHA-256 del WebP junto con el ticket, el sujeto autenticado, método, ruta y timestamp. PHOTO_PROCESSOR_SECRET se comparte únicamente entre Next.js y Convex; no tiene prefijo NEXT_PUBLIC ni se envía al navegador.

Convex exige simultáneamente una identidad válida, ticket del propietario vigente y firma del procesador. Así, tener una sesión o llamar directamente al endpoint no permite almacenar un archivo sin pasar por el procesador. No se ofrece generateUploadUrl al navegador.

El ticket vence en dos minutos y se consume en la misma mutación que adjunta el archivo. La firma admite hasta cinco minutos de diferencia de reloj, pero no extiende la duración del ticket. Se repiten los controles de propietario y estado de publicación al confirmar la escritura. Un ticket consumido no puede reutilizarse.

## Recursos, privacidad y ciclo de vida

El tamaño del cuerpo se limita mientras se lee, incluso sin Content-Length. La lectura tiene un máximo de veinte segundos y la operación de recodificación de sharp tiene un límite de diez segundos. Se permiten dos cargas simultáneas por proceso Next.js y cinco intentos por usuario cada diez minutos, registrados transaccionalmente en Convex. El contador por usuario también cuenta intentos inválidos que llegan a reservar un ticket.

Al reemplazar una foto se elimina el archivo anterior. Quitar la foto o archivar la publicación elimina su archivo de storage. Una escritura rechazada después de almacenar el nuevo archivo intenta borrarlo. Los tickets vencidos se limpian en lotes de 200 cada diez minutos.

Las respuestas de imagen usan image/webp, nosniff, CSP restrictiva, nombre fijo y Cache-Control: private, no-store. El acceso vuelve a comprobarse en cada solicitud. Un usuario que ya vio una imagen puede guardarla; borrar el archivo no revoca copias externas.

## Inyecciones y consultas: aclaración sobre sentencias preparadas

Este proyecto usa Convex, no un controlador SQL. No hay sentencias SQL que preparar ni consultas construidas concatenando cadenas. Sería incorrecto documentar que se implementaron prepared statements.

La protección correspondiente está en las funciones con validación de argumentos en tiempo de ejecución, esquemas, valores enumerados, IDs tipados, búsquedas por índice y controles de identidad y propiedad. Los textos del usuario se pasan como valores y se renderizan como texto React; no se evalúan como código, HTML ni expresiones de consulta.

No se encontró uso de eval, new Function, dangerouslySetInnerHTML, innerHTML ni SQL crudo en app/, components/, convex/ o lib/. Esa revisión estática no demuestra ausencia de toda vulnerabilidad. Si se incorpora SQL en el futuro, deberán usarse parámetros enlazados del controlador, nunca interpolación de cadenas.

## Automatizaciones y otros controles

Convex y n8n se autentican mediante HMAC con claves separadas por dirección. Se firman método, ruta, timestamp y contenido. Las escrituras de notificaciones son idempotentes. El gateway expone solo el webhook de eventos, no el editor de n8n. Los eventos incluyen identificadores opacos; no transportan correo, dirección, nombre ni tokens.

Las operaciones de préstamo validan fechas y vuelven a comprobar disponibilidad al aprobar. La baja lógica conserva el historial. React escapa los textos y las respuestas generales usan nosniff, bloqueo de framing y una política restrictiva de permisos del navegador.

El POST de fotos exige Origin igual al origen de la petición. La API de datos de Convex requiere el token de Clerk; la nueva ruta de fotos no sustituye sus controles de autorización.

## Pruebas y límites pendientes

La suite incluye archivos falsos, MIME incorrecto, corrupción, dimensiones excesivas, metadatos EXIF, contenido añadido, animación PNG, lectura sin Content-Length, acceso anónimo, acceso cruzado, firma inválida, ticket expirado/reutilizado, cuota, reemplazo y borrado. El estado y las verificaciones de entorno se registran en STATUS.md.

Antes de producción: mantener sharp/libvips actualizados, aislar el procesador con límites de memoria y CPU, aplicar cuotas globales e IP en el borde, añadir alertas y reconciliación de archivos huérfanos. Una terminación abrupta entre storage.store y la mutación de asociación puede dejar un archivo sin referencia; la limpieza en catch no cubre la muerte del proceso.

La concurrencia local no es un límite global entre instancias. El timeout de sharp no incluye toda espera en la cola de libuv. Las consultas de catálogo aún requieren paginación para grandes volúmenes. Una CSP completa para la aplicación debe probarse con Clerk; la CSP de imágenes ya está aplicada. Ver PRODUCTION.md.

## Referencias

- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- Convex: validación de argumentos: https://docs.convex.dev/functions/validation
- Convex: consultas estructuradas: https://docs.convex.dev/database/reading-data
- Convex: modelo de seguridad de storage: https://docs.convex.dev/file-storage/overview
- sharp: decodificación y límites: https://sharp.pixelplumbing.com/api-constructor/
- sharp: salida y metadatos: https://sharp.pixelplumbing.com/api-output/
