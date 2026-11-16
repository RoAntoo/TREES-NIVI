# NIVI 0.6.2 — Biblioteca, cascada y recepción de EPUB

16 de noviembre de 2026. Trabajo local sin comandos Git ni cambios al backend Azure. No se ejecutan pruebas prácticas en el teléfono: se compila, instala la actualización y se comprueban versión y registro de intents mediante consultas de diagnóstico.

## Biblioteca

Se retiran el buscador y el botón Agregar libro de esta pantalla. Permanecen dos clasificadores: Estado y Ordenar por. Las opciones de orden son Última lectura o actividad, Agregados recientemente y Título A–Z. La fecha de alta se conserva separada de la de actividad, tanto en libros físicos como en EPUB. Los cambios de clasificación vuelven a la primera página.

En los físicos, la fecha de actividad es `actualizadoEn` del servidor; puede incluir lectura, cambios de estado o metadatos. Por eso la opción se llama «Última lectura o actividad». Los EPUB usan su última lectura o su fecha de importación.

## Pantalla completa

`PantallaInmersiva` usa el plugin SystemBars ya incluido en Capacitor 8 para ocultar las barras de estado y navegación. Se serializan ocultado y restauración para que salir durante una operación pendiente deje las barras visibles. El lector las restaura al mostrar controles, abandonar la vista o destruirla.

La actividad Android configura barras transitorias: el sistema puede mostrarlas temporalmente cuando se desliza desde un borde, conforme al comportamiento inmersivo de Android. No se cambian ajustes globales del teléfono.

## Cascada

Aa → Forma de lectura incorpora «Cascada · deslizar hacia abajo». El motor usa el administrador continuo de epub.js; al llegar al borde de un capítulo incorpora los adyacentes. Sigue ofreciendo páginas por deslizamiento, toques o botones.

El cambio de flujo conserva el CFI lógico. El gesto vertical y la rueda liberan el ancla del diseño anterior para que el desplazamiento siga actualizando el progreso. El toque simple muestra u oculta controles y no se confunde con el scroll. La preferencia de cascada se guarda junto con fuente, interlineado, tema y calidez.

## Abrir y compartir archivos

`EntradaEpubPlugin` se registra desde `MainActivity`. Ambas clases son fuentes permanentes bajo `frontend/nativo/android/java/`; el script Android las copia al proyecto generado después de `cap sync`, junto con el manifest existente.

La actividad atiende ACTION_VIEW, ACTION_SEND y ACTION_SEND_MULTIPLE. Se aceptan el MIME EPUB y variantes habituales para archivos binarios o ZIP; los MIME genéricos requieren nombre terminado en `.epub`. Se reciben URI `content://` con el permiso de lectura concedido por la aplicación de origen, mediante EXTRA_STREAM, data o ClipData. No se solicita acceso general al almacenamiento, no se leen enlaces de texto ni se descargan libros remotos.

El receptor copia inmediatamente el archivo a almacenamiento privado, con nombre UUID, antes de depender del arranque del frontend. Limita cada archivo a 20 MiB y la cola a cinco entradas. Guarda metadatos atómicos; la cola permite recuperar una entrega después de cerrar el proceso.

El servicio Angular escucha nuevas recepciones y consulta también la cola al iniciar. Carga el importador bajo demanda, aplica las mismas validaciones ZIP/EPUB y saneamiento de la importación manual y guarda el archivo en el repositorio independiente. Solo confirma y elimina la copia de entrada después del guardado. Los duplicados conservan su posición. Los archivos inválidos se descartan con aviso; errores de persistencia conservan la entrada para Reintentar.

Después de importar, navega al lector del libro. Si ya había otro lector abierto, cambia primero de ruta para permitir su salida y guardado. En envíos múltiples procesa los libros de forma serial, abre el último válido y mantiene el aviso de los que fallaron. El archivo original de la otra aplicación no se modifica.

## Verificación

- Lint aprobado.
- 166 pruebas de aplicación, en 25 archivos, aprobadas.
- Cuatro pruebas de scripts Android aprobadas, incluida regeneración del manifest, receptor y registro nativo.
- Compilación web de producción y APK Android aprobados.
- APK debug 0.6.2, versionCode 602, misma configuración HTTPS de Azure.
- Actualización USB instalada con `adb install -r`: Success en Samsung SM-A546E. `dumpsys package` confirma 0.6.2 / 602; consultas de resolución de ACTION_VIEW, ACTION_SEND y ACTION_SEND_MULTIPLE para `application/epub+zip` devuelven `ar.edu.nivi.lectura/.MainActivity`. No se abrió la app ni se enviaron archivos de prueba al teléfono.
- Pruebas de orden por alta/actividad/título, ausencia de controles retirados, persistencia de cascada, cambio de flujo manteniendo CFI, diferenciación entre scroll y toque, serialización de barras, recepción con arranque nuevo o lector abierto, duplicados, errores permanentes, falta de espacio, múltiples archivos y notificaciones simultáneas.

Los tests de entrada usan un adaptador simulado; los tests del lector usan DOM y motor simulados. La compilación verifica las fuentes Android. La selección desde Telegram, Mis Archivos u otro proveedor queda para la comprobación de la usuaria con archivos descargados y accesibles.

Referencias primarias consultadas: [intents de Android](https://developer.android.com/training/basics/intents/filters), [modo inmersivo](https://developer.android.com/develop/ui/views/layout/immersive), [plugins Android de Capacitor](https://capacitorjs.com/docs/plugins/android). Las APIs SystemBars y el flujo continuo se contrastaron además con el código instalado de Capacitor y epub.js.
