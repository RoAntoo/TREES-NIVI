# Biblioteca sin cuenta ni login

Actualizada el 15 de noviembre de 2026 por indicación explícita del usuario durante PR 4. Esta decisión reemplaza la conexión opcional de los PR 2/3 y el recorrido de autenticación del plan original.

La app abre Inicio y permite usar Biblioteca, Agregar, catálogo, cámara, detalle y avances **sin usuario ni contraseña**. Ajustes no ofrece conexión de cuenta ni cierre de sesión. La ruta antigua `/acceso` vuelve a Inicio. Se retiraron el formulario, las guardas, el interceptor de autenticación y el almacenamiento de token del cliente; al iniciar se elimina el token legado si existe.

El backend usa de forma predeterminada el perfil `local`, sin credenciales, limitado a `127.0.0.1`. En teléfono se conecta mediante `adb reverse tcp:8080 tcp:8080`. El perfil local rechaza configuraciones que lo hagan escuchar en otras interfaces y conserva CORS explícito, límites, validación e idempotencia. No se incrustan credenciales ni se realiza un login oculto.

La biblioteca sigue guardada en el backend; quitar la cuenta no incorpora almacenamiento offline. El perfil técnico alternativo `seguro` conserva JWT del PR 1 y sus pruebas, pero la app actual no incluye un cliente de acceso para él. No se publica esta biblioteca local como un servicio anónimo en Internet.

La validación del PR 4 documenta las pruebas anónimas de lectura/alta, CORS y restricción de dirección, además del recorrido web y el APK actualizado. Las evidencias anteriores describen versiones históricas.

## Continuidad en PR 5

El backend ya está en Azure con perfil propio y restricciones IP descritas en [despliegue](../despliegue-azure.md). El cliente 0.5.0 incorpora copia local voluntaria de consulta; la afirmación anterior sobre ausencia de almacenamiento offline corresponde al PR 4. No se agrega sesión ni cierre de cuenta: la copia se borra/desactiva desde Ajustes y se limpia ante acceso inválido. [Decisión vigente de copia](copia-local.md).
