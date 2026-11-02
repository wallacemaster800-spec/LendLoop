# Puesta en marcha y explicación

## Para verlo ahora

Abrí Start-LendLoop.cmd. Entrá en http://localhost:3100/demo.

La demo permite cambiar entre Sam, Alex y Morgan. Morgan tiene vista de administrador. Los cambios duran hasta refrescar; no se envían mensajes ni se crean cuentas reales.

## Lo que necesitás hacer vos

1. Crear una aplicación de desarrollo en Clerk y activar su integración con Convex.
2. Pegar sus claves en .env.local, sin mandarlas por chat ni agregarlas a Git.
3. Ejecutar npx convex dev, iniciar sesión y elegir/crear el proyecto.
4. Configurar el issuer de Clerk y tu ID de usuario administrador en las variables de Convex.
5. Copiar allí las dos claves de integración ya generadas en .env.n8n. Son distintas y tienen direcciones distintas.
6. Completar la URL .convex.site y la URL pública de n8n en .env.n8n.
7. Levantar n8n con Docker, crear su cuenta local, importar los tres JSON y seleccionar el workflow de errores en los otros dos. Publicar ambos workflows principales.
8. Darle a Convex una URL HTTPS accesible para el webhook. Localhost no sirve desde la nube. El editor de n8n debe quedar privado.
9. Hacer la prueba real con dos cuentas, siguiendo ACCEPTANCE.md.
10. Elegir el repositorio GitHub y el alojamiento para la entrega. No está publicada ni enviada al empleador.

No hace falta un proveedor de correo: la consigna acepta notificaciones simuladas registradas, que es lo implementado. La integración real igual debe ejecutarse y verificarse.

## Qué deberías poder explicar en la entrevista

**Clerk autentica; Convex autoriza.** Clerk dice quién está conectado. Convex decide qué registros puede leer o modificar esa persona. Los botones no son una defensa de seguridad.

**Una solicitud todavía no reserva.** La reserva ocurre al aprobar y vuelve a comprobar las fechas en una transacción. Esto evita que dos aprobaciones se pisen.

**El outbox evita perder eventos.** Guardar el préstamo y crear el evento ocurren juntos. Después un proceso intenta entregarlo; si n8n está caído, el evento sigue guardado.

**La firma no es cifrado.** HTTPS protege el tránsito. HMAC permite comprobar que el mensaje provino de quien conoce la clave y que no cambió. También firmamos la ruta, el método y la hora.

**Idempotencia es tolerar reintentos.** Si el mismo evento llega dos veces, solo queda una notificación. Los recordatorios tienen una clave compuesta por préstamo y día UTC.

**Un recordatorio se vuelve a validar al escribir.** Entre consultar un préstamo vencido y procesar el recordatorio, alguien puede devolver la herramienta. El servidor comprueba el estado otra vez.

**El canal es simulado.** Se registran las notificaciones en Convex. Mandar emails reales agregaría un efecto externo que necesita otras garantías. No digas que está integrado un servicio que no usamos.

**Límites conocidos.** Hay consultas completas pensadas para una comunidad pequeña. Producción necesitaría paginación, alertas operativas, rate limits, runners aislados de n8n y reglas de devolución/disputas más completas.

La prueba permite asistencia con LLM. Conviene ser transparente si te preguntan y, sobre todo, entender las decisiones y poder modificar el código durante la entrevista.
