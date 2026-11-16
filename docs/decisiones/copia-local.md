# Copia local de consulta y apariencia

15 de noviembre de 2026. PR 5, cliente 0.5.0. La decisión vigente sin login prevalece sobre el plan original: no se agregan cuentas, credenciales ni cierre de sesión para implementar la copia.

La biblioteca del servidor sigue siendo la fuente de verdad. El usuario habilita la copia desde Ajustes; está deshabilitada inicialmente. Los objetos se guardan en IndexedDB, separados por URL de API, con esquema versión 1 y un máximo de 100 libros ordenados por última modificación entre los recibidos. Los ajustes pequeños usan localStorage a través de `AlmacenamientoLocal`, también en el WebView nativo. No hace falta agregar Preferences para estos dos ajustes. No se guardan tokens ni contraseñas.

Al navegar se guardan los metadatos recibidos y los últimos registros efectivamente consultados. Un listado por sí solo no permite inferir la última nota: los detalles no consultados pueden no estar disponibles offline. «Actualizar copia» consulta las dos primeras páginas de 50 libros más recientemente agregados del contrato actual y sus detalles en lotes de cuatro. Reemplaza la cobertura anterior solo después de recuperar todos los detalles. Una copia interrumpida por red conserva la anterior. Los cambios realizados desde otro cliente se reflejan al volver a consultar o actualizar la copia; no hay sincronización en segundo plano.

Altas y avances confirmados guardan el libro y último registro recibidos. Edición y cambio de estado actualizan metadatos e invalidan el detalle si cambia la versión, hasta volver a consultarlo. Una respuesta antigua no reemplaza una versión posterior. DELETE confirmado y GET 404 retiran la entrada. Las escrituras esperan el mantenimiento de la copia antes de notificar su finalización. Los errores de almacenamiento se informan sin convertir una escritura confirmada del servidor en un fallo.

Una marca pequeña identifica actualizaciones incompletas: si se corta el proceso o falla la cuota, el siguiente arranque descarta esa copia antes de mostrarla. La aplicación valida esquema, origen, fechas y campos utilizados al recuperar objetos. El borrado espera las escrituras locales previas y una generación impide que una operación pendiente reconstruya los datos borrados. Si el dispositivo impide borrar, se informa que hay que reintentar o eliminar los datos de la app.

El fallback se ofrece únicamente ante error de transporte HTTP 0 y después de una consulta correcta al servidor en el mismo arranque. Un arranque en frío sin red no desbloquea notas persistidas. HTTP 401/403 elimina la copia y revoca esa habilitación; HTTP 404/409/429/5xx se muestra como error del servidor. No se ocultan errores de acceso con una copia. En esta app sin cuenta, la consulta correcta reemplaza el concepto de sesión válida del plan original.

La interfaz marca el uso de copia, fecha de última actualización y cobertura limitada; conteos, búsqueda y filtros offline abarcan solo los libros guardados. Las portadas remotas y el historial completo no se almacenan. El catálogo requiere conexión. Altas, edición, eliminación y avances se bloquean tanto en los controles como en la capa de escritura mientras se consulta copia o el navegador informa falta de red. Una actualización correcta vuelve al servidor. No hay cola persistente de escrituras, promesa de sincronización ni service worker.

«Borrar y desactivar copia» elimina libros y notas locales y conserva el servidor. No hay acción de salir de cuenta porque no existen sesiones de usuario. Un equipo compartido debe mantener la copia desactivada o borrarla al terminar. Los controles de privacidad del navegador y la eliminación de datos Android pueden borrar esta copia; nunca reemplaza un respaldo del servidor.

La apariencia permite sistema, claro u oscuro y sigue los cambios del sistema cuando corresponde. Un fallo al persistir mantiene la elección en memoria e informa el problema. El icono web existente se adapta a vector Android y a icono adaptativo, con splash del sistema y fuentes XML reproducibles. Se usa la [API SplashScreen de Android](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen), sin incorporar una imagen generada ni otro plugin.

IndexedDB confirma escrituras al completar la transacción, siguiendo el [evento complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event); no se considera suficiente el éxito de una solicitud individual.

## Presentación de libros terminados en 0.5.1

Por pedido posterior de la autora, el cliente muestra 100% cuando el estado es TERMINADO, aunque la página registrada sea anterior o no se conozca el total. La página y el porcentaje del contrato no se modifican: el 100% representa el cierre declarado de la lectura. Reabrir vuelve al cálculo por página. La misma representación se aplica sobre los libros guardados en copia local.

La paleta pasa a crema/ciruela/turquesa. El icono vectorial de instalación de 0.5.0 queda reemplazado por el PNG aportado por la autora en `icon/iconooooooo.png`; se copia sin edición a los recursos nativos, sin incorporarlo a las pantallas internas.
