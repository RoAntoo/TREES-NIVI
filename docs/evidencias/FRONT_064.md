# Acciones al mantener presionado — NIVI 0.6.4

16 de noviembre de 2026. Trabajo local sin comandos Git ni cambios al backend o la configuración de Azure.

En Biblioteca, mantener presionada una tarjeta durante 500 ms presenta una ventana de acciones. El toque corto conserva la apertura del lector EPUB o del detalle físico. También se puede acceder por el botón ⋯ de la tarjeta, clic derecho o la tecla de menú contextual. Desplazar el dedo para recorrer la lista cancela la pulsación larga; el clic posterior a una pulsación larga se consume para evitar abrir el libro accidentalmente.

El emergente muestra portada, formato, título y autores. Para EPUB ofrece Comenzar a leer o Continuar leyendo, Ver información y Eliminar EPUB y progreso. Para físicos ofrece Ver libro y registrar avance, Ver información y Eliminar libro. La información incluye estado, avance, fechas y datos del archivo EPUB o ISBN y páginas del físico. Se puede regresar a las acciones sin navegar.

La X superior derecha, tocar el fondo y Atrás cierran la ventana sin ejecutar acciones. Las eliminaciones siempre requieren una confirmación adicional. El EPUB se elimina del almacenamiento local y se limpia su respaldo de posición; el físico usa el endpoint existente con su versión y solo se quita de la colección después de una respuesta confirmada. Se respetan los bloqueos de escritura de la copia sin conexión y se actualiza la vista ante conflictos de versión o resultados inciertos.

El paquete declara ESM explícitamente (`type: module`), de acuerdo con el código Angular y los scripts `.mjs`, para evitar que la ejecución conjunta de Vitest capture exportaciones antes de su inicialización. No se cambiaron dependencias.

Validación automática: 186 pruebas aprobadas en 27 archivos de aplicación, incluidos gesto, navegación, cancelaciones, información y eliminación por formato. Sin pruebas prácticas en el celular, a pedido del usuario. Entrega Android debug 0.6.4, versionCode 604.

Lint y las cuatro pruebas de scripts Android aprobados; compilación APK final correcta. Instalada como actualización mediante `adb install -r` en el Samsung SM_A546E conectado: Success. Se verificaron versionName 0.6.4 y versionCode 604 mediante consulta de paquete. Sin abrir la app ni borrar datos de usuario.
