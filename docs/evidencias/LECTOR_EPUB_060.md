# Lector EPUB local — NIVI 0.6.0

Trabajo realizado el 15 de noviembre de 2026. Sin comandos Git, PR, publicaciones ni cambios al backend desplegado en Azure. Por indicación del usuario se suspendieron las pruebas prácticas: la aceptación final de cierre completo, modo avión y reinicio del teléfono queda a su cargo.

## Implementación

- Barra inferior: Inicio, Biblioteca, Agregar, Leer. `book-outline` es el equivalente de libro abierto disponible en Ionicons 8.1.0; `book-open-outline` no existe en esta versión. Ajustes conserva su ruta y servicios, con acceso desde Inicio.
- Colección `/app/leer`: selector del dispositivo, importación, portada opcional, metadatos, duplicados por SHA-256, última lectura destacada, orden por fecha y eliminación confirmada.
- Lector `/lector/:id` fuera de las pestañas: índice anidado, anterior/siguiente, teclado, capítulo y porcentaje estimado. No muestra páginas impresas ni modifica los avances físicos.
- Preferencias generales persistentes: letra de 14 a 36 px, interlineado de 1,2 a 2,4, fondo claro/sepia/negro con texto contrastante y filtro cálido de 0 a 70 %. El filtro solo cubre el contenido del lector; no cambia brillo ni ajustes del sistema.
- Progreso por EPUB: CFI, capítulo de respaldo, nombre del capítulo, porcentaje cuando termina el cálculo, última lectura y versión del motor. Los cambios de diseño conservan el ancla lógica; la pantalla se ajusta para contenerla.
- Diario pequeño síncrono en localStorage y escritura principal a los 200 ms como máximo desde el primer cambio. También se guarda en `visibilitychange`, `pagehide`, `App.appStateChange` y al abandonar el lector. Un error deja el progreso pendiente y ofrece reintentar.
- Si el CFI no encuentra un rango válido, se intenta el capítulo guardado y después el principio, informándolo. Las operaciones tardías se descartan cuando la vista deja de estar activa.

## Persistencia y aislamiento

`funcionalidades/epub/datos/almacen-epub.ts` selecciona el adaptador por plataforma:

- Android: EPUB completo en `Directory.Data/epub/<id>.epub`, almacenamiento privado persistente; estado y preferencias en `estado.json`, mediante archivo temporal y renombrado. Base64 solo durante la transferencia inicial al plugin; la lectura usa la URL local privada de Capacitor.
- Navegador: Blob original y estado en IndexedDB `nivi-epub`, independiente de `nivi-consulta`. Se solicita persistencia al navegador; este puede denegarla. No hay service worker para garantizar un arranque web completo sin conexión. El APK incluye el cliente y su configuración local.

No se usa HttpClient, servicios de biblioteca, Open Library ni endpoints remotos en el módulo EPUB. El único `fetch` del módulo abre el archivo privado local de Capacitor. El backend existente continúa atendiendo la biblioteca física.

Se avisa en la colección que no hay sincronización, que desinstalar o borrar datos puede eliminar libros y seguimiento y que el avance digital no equivale a páginas impresas.

## Validación del contenido

- Hasta 20 MiB comprimidos, 2000 entradas, 16 MiB por entrada y 80 MiB descomprimidos en total; documentos XML/XHTML hasta 2 MiB. Se inspecciona el directorio ZIP antes de extraer y se limita también la extracción real por flujo.
- Contenedor, MIME, manifiesto y orden de lectura obligatorios. Se rechazan rutas peligrosas, entradas duplicadas, entidades XML, DRM/cifrado y diseño fijo.
- DOMPurify sanea XHTML antes de entregarlo al motor. Se eliminan scripts, CSS del editor, formularios, iframes, multimedia y recursos remotos. Se incorporan una CSP restrictiva y el sandbox sin permisos de scripts del motor.
- Solo se conservan imágenes raster locales PNG/JPEG/GIF/WebP; portada de hasta 2 MiB. Enlaces externos deshabilitados; nunca se abren automáticamente.
- El archivo original completo se conserva; la versión saneada se prepara en memoria al abrirlo, sin insertar HTML del libro en plantillas Angular.

Dependencias: epub.js 0.3.93, JSZip 3.10.1, DOMPurify 3.4.18 y Filesystem 8.1.5. Se fija el parser transitivo `@xmldom/xmldom` en 0.9.12. Referencias: [epub.js](https://github.com/futurepress/epub.js) y [Filesystem de Capacitor](https://capacitorjs.com/docs/apis/filesystem).

## Verificación de código

La suite incorpora pruebas de persistencia en IndexedDB entre instancias, archivo completo, progreso y preferencias, duplicados, escritura serializada, limpieza por falta de espacio, datos dañados y reintento; pruebas de ZIP y saneamiento; ciclo de vida y diario de progreso; contrato simulado del motor para restauración, cambios de apariencia, cancelación y porcentaje.

Resultado final: lint sin errores, 138 pruebas de aplicación aprobadas en 20 archivos y cuatro pruebas de los scripts Android aprobadas. Las pruebas del motor usan dependencias simuladas mediante TestBed; no abren navegador ni teléfono.

Compilación Android con Java 21 y SDK instalado: APK debug 0.6.0, `versionCode` 600, API mínima 26. Se mantiene la URL Azure ya configurada. `npm audit --omit=dev` informa cero vulnerabilidades en dependencias de producción; no se actualizaron las herramientas ajenas a esta funcionalidad.

## Comprobaciones prácticas parciales, anteriores a la suspensión

Se observó importación y lectura en navegador y Android emulado, índice EPUB 3 y preferencias. La copia privada se comparó por SHA-256 con el original. Se observó recuperación después de una terminación del proceso provocada por la actualización de Android WebView. Estos resultados parciales no sustituyen la aceptación del APK final en el teléfono; los últimos ajustes solo se comprobaron por código y compilación.

## Prueba manual a cargo del usuario

1. Instalar el APK como actualización, sin desinstalar ni borrar los datos.
2. En Leer, importar un EPUB sin DRM. Se incluye `docs/pruebas-epub/nivi-prueba.epub`, con texto propio y tres capítulos; puede regenerarse con `node frontend/scripts/crear-epub-prueba.mjs`.
3. Avanzar dentro de un capítulo y cambiar letra, interlineado, tema y calidez. Volver al texto y esperar un momento.
4. Forzar el cierre de NIVI, activar modo avión con Wi-Fi apagado y abrirla de nuevo. Entrar en Leer y continuar el libro.
5. Comprobar el mismo pasaje lógico, capítulo, preferencias y archivo disponible. Repetir después de reiniciar el teléfono.
6. Probar orientación y cambios de letra; el pasaje guardado debe seguir contenido en la pantalla resultante aunque cambie la paginación.

Pendientes de aceptación práctica: modo avión desde arranque completo y reinicio, botón Atrás en el APK final, actualización conservando archivos, bibliotecas con muchos EPUB, consumo máximo de memoria con archivos cercanos a 20 MiB y ausencia de solicitudes de libros maliciosos observada con herramientas de red.

## Limitaciones de esta primera versión

Se retiran estilos originales, fuentes incrustadas, SVG y contenido interactivo para priorizar aislamiento, contraste y texto adaptable. Libros con fuentes ofuscadas mediante `encryption.xml` se rechazan también aunque no tengan DRM comercial. No hay PDF, diseño fijo, anotaciones, exportación de EPUB, sincronización ni asociación con páginas de libros físicos. Para recuperar un libro eliminado hay que importarlo nuevamente y su seguimiento empieza de cero.
