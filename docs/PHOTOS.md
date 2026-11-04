# Fotos de herramientas

## Uso

En una publicación existente, abrir Edit listing y buscar Tool photo. Elegir una imagen, revisar la vista previa y pulsar Upload photo. La foto se guarda de manera independiente de los otros campos. Remove photo la elimina.

Al crear una publicación, primero se guardan sus datos. El formulario permanece abierto para agregar la foto opcional. Las publicaciones existentes no requieren migración manual y siguen usando su ilustración cuando no tienen una foto.

Se aceptan JPEG, PNG o WebP estáticos de hasta 5 MiB y 20 megapíxeles. El servidor genera WebP, elimina metadatos y limita la resolución. La portada pública continúa mostrando solo nombre y categoría. La demo sin conexión mantiene ilustraciones; storage funciona en el espacio autenticado.

## Configuración

La aplicación local de Diego ya tiene una clave independiente del procesador en .env.local y Convex. No se debe copiar esa clave a documentación o al repositorio.

Para una nueva instalación de desarrollo:

```sh
node scripts/configure-photo-storage.mjs
npx convex dev --once
npm run build
npm run start
```

Configurar NEXT_PUBLIC_CONVEX_SITE_URL con la URL .convex.site. El script reutiliza PHOTO_PROCESSOR_SECRET si existe; en caso contrario genera una clave aleatoria. La configura en Convex mediante un archivo temporal privado que después elimina. Reiniciar Next.js cuando cambie una variable de entorno.

En producción se configura la misma PHOTO_PROCESSOR_SECRET privada en el servidor Next.js y en el despliegue Convex correspondiente. No se usa una variable pública. El procesador requiere el runtime Node.js y sharp; no funciona en una exportación HTML estática.

## Implementación

- components/photo-editor.tsx: selección, vista previa y controles.
- app/api/tools/[id]/photo/route.ts: sesión, origen, límite de concurrencia, procesamiento y lectura autenticada.
- lib/process-photo.ts: identificación, decodificación y WebP.
- lib/photo-policy.ts: límites de lectura y contenido firmado.
- convex/photos.ts: permisos, tickets, cuotas, reemplazo, eliminación y limpieza.
- convex/photoHttp.ts: entrada firmada y salida autenticada.
- Convex File Storage: conserva solamente el resultado WebP.

Los campos photoId y photoVersion son opcionales. La tabla photoUploads almacena tickets temporales. Los contadores por usuario son privados y solo sirven para limitar cargas.

Para la revisión de permisos, inyecciones, recursos y limitaciones, consultar SECURITY.md.
