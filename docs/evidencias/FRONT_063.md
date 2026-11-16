# Confirmación de carga externa — NIVI 0.6.3

16 de noviembre de 2026. Sin comandos Git ni cambios a Azure. Se conserva la recepción nativa de EPUB y su almacenamiento local.

Después de guardar un EPUB recibido con Abrir con o Compartir, se presenta un modal centrado con marca de éxito, título del libro y dos botones: **Comenzar a leer** y **Cerrar**. El primero abre el lector; el segundo vuelve a Inicio. Cerrar con el fondo o Atrás también vuelve a Inicio. La recepción ya no navega automáticamente al libro.

Los duplicados indican que el libro ya existe y conservan la posición. En envíos múltiples se confirma la cantidad guardada y se ofrece leer el último libro válido. Los avisos de error permanecen separados: Reintentar aparece solo si existe un fallo recuperable, nunca en la confirmación de éxito ni ante un archivo inválido.

Validación: lint aprobado, 169 pruebas de aplicación aprobadas en 25 archivos y compilación APK correcta. Las pruebas verifican espera de elección, apertura explícita, retorno a Inicio, duplicados, separación de reintentos y recuperación de un fallo de navegación sin reimportar. APK debug 0.6.3, versionCode 603. No se realizaron pruebas prácticas en el teléfono.

Instalada como actualización mediante `adb install -r` en el Samsung conectado: Success. La versión instalada se verificó por consulta de paquete; no se abrió la app ni se modificaron sus datos de lectura.
