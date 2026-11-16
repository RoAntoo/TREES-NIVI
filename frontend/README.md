# Cliente de NIVI Lectura

Versión **0.6.4**. Angular/Ionic para biblioteca personal y lectura EPUB local: abre Inicio y permite usar todas las funciones sin cuenta ni contraseña. Trabajo local, sin publicación ni comandos Git. Ver [la decisión vigente](../docs/decisiones/inicio-sin-login.md).

## Entorno y ejecución

Node 24.14.1 y npm 11; Angular 21.2.26, CLI/build 21.2.30, TypeScript 5.9.3, Ionic 9.0.11 y Capacitor 8.6.2. Plugins fijados: Barcode Scanner 3.1.2 y App 8.0.1, este último para Atrás de Android. No hace falta Ionic CLI global.

Desde la raíz, con acceso al backend ya desplegado en Azure:

```powershell
npm --prefix frontend ci
npm --prefix frontend start
```

Abrir `http://localhost:8100`. El proxy conserva `/api/v1` y lo reenvía por HTTPS al backend de Azure; la IP de la PC debe estar permitida. Si el servidor está apagado se muestran error y reintento; no se pide ingresar ni se inventan resultados.

```powershell
npm --prefix frontend run lint
npm --prefix frontend test -- --watch=false
npm --prefix frontend run test:scripts
npm --prefix frontend run build
```

## Funciones y navegación

- Inicio: conteos de libros físicos y EPUB, con los tres libros de actividad más reciente.
- Biblioteca: colección unificada, etiquetas Físico/EPUB y clasificadores de estado y orden por actividad, alta o título. Sin buscador ni botón Agregar libro. Tocar la tarjeta abre el detalle físico o el lector EPUB; mantener presionada o tocar ⋯ abre acciones para leer, consultar información y eliminar con confirmación. Se cierra con la X, Atrás o tocando afuera.
- Agregar: título/autor, ISBN escrito o cámara Android; confirmación editable y alta manual. Las obras sin edición no reciben ISBN ni páginas inventadas.
- Detalle: edición, eliminación confirmada, estados, contexto de última nota e historial de diez registros por página.
- Avance: modal reactivo, enteros válidos, nota de hasta 2000 caracteres, corrección confirmada y revisión tras conflicto. Sin total se muestra posición sin porcentaje.
- Leer: importar EPUB sin DRM y abrir la última lectura tocando su tarjeta. El lector ofrece cascada vertical continua, páginas por deslizamiento, toques laterales o botones. La pantalla completa oculta también las barras de Android. Índice, posición CFI y preferencias persistentes, incluso sin conexión en Android.
- Android: recibir EPUB desde Abrir con o Compartir de otras aplicaciones y guardarlos en la biblioteca local. Un emergente confirma la carga: Comenzar a leer abre el libro y Cerrar lleva a Inicio; no se abre automáticamente. [Recepción de archivos](../docs/evidencias/FRONT_062.md), [confirmación de carga 0.6.3](../docs/evidencias/FRONT_063.md).
- Ajustes: acceso desde la cabecera de Inicio; conserva información de biblioteca, cámara, copia y apariencia.

Las rutas `/app/inicio`, `/app/biblioteca`, `/app/agregar`, `/app/leer`, `/lector/:id`, `/app/ajustes` y `/app/biblioteca/:id` son directas. `/acceso` es una redirección a Inicio por compatibilidad. No hay login oculto, token ni contraseñas guardadas. Al actualizar se elimina el antiguo token de sessionStorage.

Ionic conserva páginas: las consultas se actualizan al entrar y tras escrituras mediante una revisión compartida, cancelándose al salir o destruirse. `Consulta` descarta respuestas obsoletas y completa el refresher también ante error/cancelación. Las entradas individuales `@ionic/angular/ion-*` mantienen carga diferida.

## Ediciones y campos disponibles

La búsqueda inicial sigue siendo una sola consulta liviana de obras, ordenada por relevancia. Al tocar Revisar se solicitan sus ediciones, diez por página, sin resolver autores por cada fila. Se comparan idioma, editorial, fecha e ISBN antes de usar una edición. Si se busca por ISBN y ya hay edición concreta, no se consulta ese listado.

Usar una edición consulta su registro completo, también si no tiene ISBN, y resuelve autores mediante sus referencias y la obra vinculada cuando hace falta. Páginas, ISBN y portada provienen de esa edición; una respuesta parcial puede conservar datos previamente obtenidos de la misma edición. No se toman páginas de una obra ni de otra fila. La confirmación no guarda automáticamente.

El formulario permanece editable durante la consulta; Guardar espera a que termine. Solo se actualizan campos automáticos que no se editaron. Un campo vaciado manualmente también se conserva. Cambiar de edición actualiza las páginas automáticas, y los reintentos conservan la identidad y datos de la edición solicitada, evitando arrastrar los de la anterior. Si el proveedor falla, se conserva el borrador y se permite reintentar o completar a mano. No se agregan etiquetas ni proveedores nuevos.

[Diagnóstico, pruebas y recorrido real](../docs/evidencias/CATALOGO_OPEN_LIBRARY.md).

## Escáner

`EscanerIsbn` encapsula el plugin y permite probarlo con cámara simulada. Solo Android con plugin nativo habilita Escanear ISBN; el navegador conserva todas las alternativas manuales. El plugin se importa al tocar el botón y administra su permiso y pantalla nativa. Usa cámara trasera, orientación adaptable y ZXing con EAN-13. Se comprueban formato, prefijo 978/979 y checksum antes de consultar catálogo; escanear no guarda automáticamente.

Cancelación, permiso denegado, cámara indisponible y lectura inválida dejan utilizable la app. No se abre cámara al entrar ni al volver de Ajustes. No se consulta ni guarda un resultado que llega después de abandonar Agregar. Ante edición duplicada se busca por ISBN equivalente o edición externa en páginas de hasta 50 libros y se ofrece abrir el existente.

## API y reintentos

`public/configuracion.json` contiene `{ "apiUrl": "/api/v1" }`, sin secretos. Se carga y valida antes de Angular. Debe ser HTTP(S), terminar en `/api/v1`, carecer de credenciales/parámetros/fragmentos y respetar HTTPS si la página usa HTTPS. El servidor debe servir `index.html` para rutas del cliente y conservar los errores de API como JSON; no se deben convertir en HTML ni cachear `configuracion.json`.

Las escrituras usan las reglas, versiones y fechas del servidor. Un 409 recupera la versión vigente y permite revisar el borrador antes de reenviar. Altas y avances conservan UUID y cuerpo exacto tras un fallo incierto, evitando doble envío. Se conservan **solo en memoria mientras la app sigue abierta**. Una recarga completa pierde el pendiente: si se perdió una respuesta, consultar Biblioteca/historial antes de iniciar otra operación. No existe cola persistente ni escritura offline.

`www/`, `node_modules/`, `.angular/` y `android/` son salidas generadas. [Preparación Android y prueba por USB](../docs/instalacion-android.md). [Evidencia del PR 4](../docs/evidencias/PR4.md).

## Diseño y alcance

Crema #F7EFC6, ciruela #4B1D45 y turquesa #12B892, fuentes del sistema y Georgia, modo sistema, claro u oscuro persistido, foco visible y movimiento reducido. El icono web es propio. iOS y la aceptación física de 0.5.1 quedan pendientes. La copia de consulta y los recursos nativos están implementados en PR 5. Las pruebas de cámara simulada no sustituyen el libro físico.

## PR 5: copia y apariencia

Ajustes permite elegir sistema/claro/oscuro, activar voluntariamente la copia, actualizarla o borrarla. Los objetos versionados se almacenan en IndexedDB, hasta 100 libros; los ajustes pequeños usan localStorage a través de `AlmacenamientoLocal`. La navegación guarda metadatos y los detalles efectivamente leídos; «Actualizar copia» recupera hasta dos páginas de 50 libros y sus últimos registros con cuatro consultas simultáneas como máximo.

`ApiBiblioteca` intenta primero el servidor. Solo un error de transporte habilita fallback después de conectar correctamente en ese arranque. La interfaz muestra fecha/cobertura y bloquea escrituras. No se guarda historial completo ni imágenes. Un cambio confirmado actualiza o invalida su entrada; borrar y desactivar espera tareas pendientes. Esquema/corrupción/cuota se gestionan con avisos sin romper el servidor. [Decisión detallada](../docs/decisiones/copia-local.md), [validación](../docs/evidencias/PR5.md).

La copia se separa por URL de API; si se cambia únicamente el destino del proxy, conserva el mismo origen lógico. Borrar y desactivar la copia antes de pasar entre bibliotecas distintas detrás de ese proxy. No se implementa un selector de múltiples servidores.

Los recursos Android propios viven en `nativo/android/res/`, se copian después de `cap sync` y usan el PNG original de instalación aportado en `icon/iconooooooo.png`, sin mostrarlo dentro de las pantallas. No editar Android generado. [Auditoría de herramientas y riesgo residual](../docs/seguridad-dependencias.md).

## Finalización de lectura en 0.5.1

El lector EPUB de 0.6.0 usa almacenamiento independiente y no altera estas reglas de lectura física. [Implementación, revisión y prueba manual del lector](../docs/evidencias/LECTOR_EPUB_060.md).

La barra usa el estado `TERMINADO` para mostrar 100%, tanto en tarjetas como en detalle y copia local, con o sin total de páginas. Se conserva el dato de página del servidor y se etiqueta como última posición registrada. Reabrir restaura el porcentaje calculado por página, o ausencia de porcentaje si no hay total. No se cambia el contrato ni el cálculo del backend.

La felicitación se presenta tras una respuesta confirmada, al marcar terminado o al guardar la última página. El guardado de avance conserva el estado anterior a la petición para no perder la celebración si el refresco del detalle termina antes que el cierre del modal. Cancelar o recibir un error no celebra. El emergente se puede cerrar con su botón o el fondo y no se repite al abrir un libro ya terminado.

[Evidencia y pruebas 0.5.1](../docs/evidencias/CORRECCIONES_051.md).

## Atrás en Android 0.5.2

Los modales conservan prioridad y Atrás cierra primero el overlay. Si hay una pantalla anterior, navega por la pila de la pestaña activa. Desde la raíz de otra pestaña vuelve a Inicio; desde Inicio sale a Android mediante App.exitApp. No modifica el botón Atrás del navegador. [Pruebas e instalación en Samsung](../docs/evidencias/RETORNO_ANDROID_052.md).
