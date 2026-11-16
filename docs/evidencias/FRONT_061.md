# Organización y lector — NIVI 0.6.1

15 de noviembre de 2026. Cambios exclusivamente en el cliente. Sin comandos Git ni cambios al backend de Azure. Se respeta la indicación de no ejecutar pruebas prácticas: la comprobación de gestos en el teléfono queda a cargo de la usuaria.

## Inicio y Biblioteca

Inicio conserva «Las historias te esperan» y los cuatro conteos, ahora combinando libros físicos y EPUB locales. Muestra hasta tres tarjetas ordenadas por última actividad, incluyendo altas e importaciones. Para los libros físicos se consulta el listado existente en páginas de 50 y se ordena al completar la lectura: el servidor ordena por fecha de alta, de modo que consultar solo la primera página no permitiría detectar actividad reciente en un libro antiguo.

Los EPUB sin progreso cuentan como pendientes, los abiertos como leyendo y los que alcanzan la última pantalla como terminados. El marcador digital de finalización se guarda con su progreso; versiones anteriores sin ese marcador conservan su posición y se clasifican por progreso disponible. No se escriben páginas físicas ni se envían EPUB al servidor.

Biblioteca usa una colección combinada con etiquetas Físico y EPUB, filtros de título/autor y estado y paginación común de doce tarjetas. Las claves incluyen el formato para evitar colisiones de identificadores. La tarjeta completa abre el detalle del libro físico o directamente el lector del EPUB. Las opciones de eliminación confirmada de EPUB se trasladan aquí.

Si falla la consulta remota, los EPUB siguen accesibles y se muestra el fallo de actualización. Las reglas de la copia física siguen perteneciendo a `ApiBiblioteca` y `CopiaBiblioteca`.

## Leer y controles

Leer queda con el selector EPUB y la tarjeta del último libro leído o importado, pulsable en toda su superficie. La colección completa está en Biblioteca. Se retira el recuadro informativo final; la advertencia sobre pérdida de archivos al desinstalar o borrar datos queda en Ajustes.

En Aa se puede elegir y guardar uno de estos modos:

- Deslizar, predeterminado para preferencias anteriores: izquierda avanza, derecha retrocede.
- Toques laterales: el 30 % izquierdo retrocede y el 30 % derecho avanza. El centro alterna los controles.
- Botones: muestra Anterior/Siguiente. Tocar el texto alterna los controles.

En deslizamiento y toques no aparecen botones de avance. Los eventos se capturan dentro del iframe y sus coordenadas se corrigen con el desplazamiento del capítulo respecto del visor. Se descartan movimientos verticales, pulsaciones largas, selección de texto y gestos múltiples; los enlaces conservan su comportamiento. Se suprime el click sintético posterior para no duplicar acciones.

Un toque en el texto oculta o recupera cabecera y pie del lector; en el modo de laterales, ese gesto se reserva al centro. Esto amplía el espacio de lectura dentro de la app, sin modificar las barras del sistema Android. La reconfiguración del visor conserva el CFI mediante el mecanismo del motor. Atrás recupera primero los controles si están ocultos y cierra primero las opciones si están abiertas.

Los paneles tienen un fondo pulsable que permite cerrarlos al tocar fuera. Texto, cabecera, paneles, pie y botones comparten los colores del tema. La capa cálida cubre también los controles inferiores y no intercepta los gestos.

## Validación

- Lint aprobado.
- 151 pruebas de aplicación aprobadas, en 23 archivos.
- Cuatro pruebas de scripts Android aprobadas.
- Compilación web de producción aprobada.
- Pruebas nuevas para la mezcla de formatos y estadísticas, actividad física en páginas posteriores, continuidad de EPUB ante fallo del servidor, clasificación de gestos, compensación del iframe, enlaces, selección de modo persistente, cierre exterior, pantalla completa y variables de color.
- APK 0.6.1, versionCode 601, generado con la misma configuración HTTPS de Azure. Instalación por USB como actualización mediante `adb install -r`, sin desinstalar ni borrar datos.

Las comprobaciones automatizadas usan documentos simulados y dependencias de prueba; no se presentan como una validación manual de los gestos en el teléfono.
