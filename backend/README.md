# Backend de NIVI Lectura

## Uso actual: biblioteca local sin cuenta (PR 4)

Por indicación del usuario, la app usa toda la biblioteca sin usuario, contraseña ni token. El perfil predeterminado **local** escucha exclusivamente en `127.0.0.1`; rechaza una dirección de red. Conserva validaciones, límites, CORS explícito y las reglas de lectura del PR 1. No incrusta claves ni realiza login automático.

Desde backend, con Java 21:

```powershell
$env:OPEN_LIBRARY_USER_AGENT = 'NIVI-Lectura-desarrollo (tu-contacto@example.org)'
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

Usar un contacto válido para el catálogo. No definir AUTH_USERNAME, AUTH_PASSWORD ni AUTH_JWT_SECRET para el perfil local. La API está en `http://127.0.0.1:8080/api/v1`. En el teléfono, `adb reverse tcp:8080 tcp:8080` conecta por USB al servidor de la PC. No abrir el backend local a LAN/Internet.

`POST /acceso` no existe en el perfil local. El perfil alternativo **seguro** conserva la autenticación técnica del PR 1, activable con `SPRING_PROFILES_ACTIVE=seguro`; requiere las variables AUTH descritas abajo. La app 0.4.1 no tiene pantalla de acceso ni envía Bearer para ese perfil. Las instrucciones de credenciales y el script de recorrido protegido que siguen corresponden a ese perfil alternativo, no al uso actual de la app.

La base H2 y los respaldos siguen iguales. Cambiar de perfil no borra los libros. [Decisión actual](../docs/decisiones/inicio-sin-login.md).

## Referencia del backend protegido del PR 1


API de biblioteca única con Java 21, Spring Boot 3.5.16, Spring Security, JWT HS256, JPA/Hibernate, H2 y migraciones Flyway. Maven Wrapper fija Maven 3.9.14. Las versiones transitivas están administradas por el BOM de Spring Boot en `pom.xml`.

## Preparar el entorno

Todos los comandos de esta guía se ejecutan desde **`backend/`**, salvo indicación contraria. En Linux/macOS usar `sh mvnw` donde se muestra `.\mvnw.cmd`.

```powershell
java -version
.\mvnw.cmd -version
```

Ambos deben usar Java 21. Si el Java predeterminado es 17, seleccionar un JDK 21 instalado para esta terminal:

```powershell
$env:JAVA_HOME = 'C:\ruta\a\tu\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

No hace falta instalar Maven global. El Wrapper descarga su distribución en el primer uso; la primera compilación requiere acceso a Maven Central.

## Pruebas y compilación

```powershell
.\mvnw.cmd verify
```

Ejecuta pruebas de dominio, separación de capas, integración JPA/HTTP, concurrencia, rollback, catálogo local simulado, migraciones y validación OpenAPI. También construye `target/nivi-lectura-0.1.0-SNAPSHOT.jar`. Los resultados detallados quedan en `target/surefire-reports/`.

Para repetir solamente una categoría:

```powershell
.\mvnw.cmd '-Dtest=AdaptadorOpenLibraryPrueba' test
.\mvnw.cmd '-Dtest=BibliotecaIntegracionPrueba' test
.\mvnw.cmd '-Dtest=ContratoPrueba' test
```

El catálogo simulado vive exclusivamente en pruebas: `src/test/resources/catalogo/` y `AdaptadorOpenLibraryPrueba` levantan un servidor HTTP en loopback con puerto aleatorio. Incluye redirección ISBN, autores, respuestas parciales, ausencia, timeout y límites. La aplicación normal nunca usa esa simulación.

## Configurar y arrancar

`.env.example` enumera las variables. **Spring no carga archivos `.env` automáticamente.** Exportarlas en la terminal o mediante la configuración del entorno de despliegue.

Ejemplo PowerShell, sin contraseñas predeterminadas ni secretos guardados en archivos:

```powershell
$env:AUTH_USERNAME = Read-Host 'Usuario de la cuenta local'
$claveNivi = Read-Host 'Contraseña (12 a 72 bytes UTF-8)' -AsSecureString
$env:AUTH_PASSWORD = [System.Net.NetworkCredential]::new('', $claveNivi).Password
$bytesNivi = New-Object byte[] 48
$generadorNivi = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$generadorNivi.GetBytes($bytesNivi)
$generadorNivi.Dispose()
$env:AUTH_JWT_SECRET = [Convert]::ToBase64String($bytesNivi)
$env:OPEN_LIBRARY_USER_AGENT = Read-Host 'Identificación y contacto, por ejemplo NIVI-Lectura (tu-correo@dominio)'
.\mvnw.cmd spring-boot:run
```

También puede ejecutarse el JAR, conservando las mismas variables:

```powershell
java -jar target/nivi-lectura-0.1.0-SNAPSHOT.jar
```

El arranque falla si faltan credenciales seguras, el secreto JWT tiene menos de 32 bytes o falta la identificación de catálogo con contacto. Usar una contraseña personal; el servidor la verifica contra un hash BCrypt calculado al arrancar. No hay usuarios ni contraseñas en la base. Cambiar el secreto invalida los tokens anteriores.

| Variable | Predeterminado o condición |
| --- | --- |
| `AUTH_USERNAME` | Obligatoria, hasta 100 caracteres |
| `AUTH_PASSWORD` | Obligatoria, entre 12 y 72 bytes UTF-8 |
| `AUTH_JWT_SECRET` | Obligatorio, aleatorio, al menos 32 bytes |
| `AUTH_JWT_DURATION` | `PT2H`; entre `PT1M` y `PT24H` |
| `CORS_ALLOWED_ORIGINS` | Orígenes locales explícitos del archivo de ejemplo; separados por coma, sin comodines |
| `DB_URL` | `jdbc:h2:file:./datos/nivi-lectura;DB_CLOSE_ON_EXIT=FALSE` |
| `DB_USERNAME`, `DB_PASSWORD` | `sa` y vacío para H2 local; configurar el acceso apropiado para el entorno |
| `PORT` | `8080` |
| `OPEN_LIBRARY_USER_AGENT` | Obligatoria, nombre de aplicación y contacto propio |
| `OPEN_LIBRARY_CONNECT_TIMEOUT` | `PT2S` |
| `OPEN_LIBRARY_READ_TIMEOUT` | `PT3S` por petición |
| `OPEN_LIBRARY_BUDGET` | `PT10S` máximo por consulta, incluyendo redirecciones, esperas y autores |
| `OPEN_LIBRARY_INTERVAL` | `PT1S` entre llamadas externas, configurable según política del proveedor |
| `OPEN_LIBRARY_CACHE_ENTRIES` | `500`, máximo `10000` |
| `OPEN_LIBRARY_CACHE_TTL` | `PT15M` |
| `OPEN_LIBRARY_NEGATIVE_TTL` | `PT30S` para ausencias, sin cachear errores |

El proveedor está fijado a `https://openlibrary.org`. No acepta URLs de consulta provistas por el cliente ni sigue redirecciones a otros orígenes. Como máximo reintenta una vez un GET ante fallo transitorio, dentro del presupuesto, respetando `Retry-After`. Los autores son opcionales y su resolución se detiene si no queda presupuesto; no impide recuperar una edición válida.

## Probar el recorrido

Con el servidor iniciado, en otra terminal configurar las variables de usuario/contraseña con los mismos valores y ejecutar:

```powershell
.\scripts\probar-recorrido.ps1
```

La prueba crea un libro ficticio, comprueba el reintento de alta, inicia lectura, guarda una nota, la recupera del detalle, pausa, retoma, termina y elimina el libro. No imprime el token ni la nota. Los ejemplos [solicitudes.http](../docs/solicitudes.http) permiten consultar cada endpoint desde un cliente REST.

El cierre de sesión es local: el cliente elimina el token y, en etapas posteriores, su copia personal. No hay refresh token ni endpoint de revocación. Los tokens tienen vencimiento y la validación de reloj admite el margen estándar de Spring Security de 60 segundos. Todas las rutas de negocio requieren Bearer JWT. No usar HTTP fuera de desarrollo; colocar TLS delante del servidor cuando se publique.

Los límites propios son 10 solicitudes de acceso y 120 de negocio por IP/minuto, con `Retry-After`. Se toma la IP de la conexión, sin confiar en `X-Forwarded-For`; detrás de un proxy el límite agrupa conexiones del proxy hasta que se configure una política confiable. Los límites y caché son por proceso, suficientes para una instalación personal.

## Base, respaldo y recuperación

Flyway aplica `V1__biblioteca.sql` sobre una base vacía; Hibernate usa `ddl-auto=validate`. No hay `update`, `create-drop` ni conversión de datos anteriores. Pruebas HTTP usan H2 en memoria y la prueba de reapertura usa un archivo temporal distinto.

Para respaldar, **detener el servidor y esperar su cierre**. Copiar `datos/nivi-lectura.mv.db` a una ubicación de respaldo privada elegida por el usuario. No copiar una base abierta ni guardar respaldos en el código del proyecto. El archivo contiene notas personales.

Para recuperar, detener el servidor, conservar una copia del archivo actual y copiar el respaldo a una carpeta nueva. Apuntar `DB_URL` a esa copia mediante una ruta absoluta, por ejemplo `jdbc:h2:file:C:/respaldos-restaurados/nivi-lectura;DB_CLOSE_ON_EXIT=FALSE`, y arrancar la misma versión del servidor. Flyway verifica el historial y Hibernate valida el esquema. No editar migraciones ya aplicadas; agregar una migración nueva para cambios posteriores.

Al eliminar un libro se borran metadatos, autores, registros y snapshots que contienen notas. Se conservan UUID y huella de operaciones como marcas de eliminación para impedir que un reintento resucite el libro. Esas marcas no se purgan automáticamente en esta primera versión.

## Datos opcionales de desarrollo

Solo si se solicitan explícitamente al arrancar, una base vacía puede recibir un libro ficticio pendiente:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'desarrollo'
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.arguments=--nivi.desarrollo.cargar-ejemplo=true'
```

No añade credenciales y no se activa en el perfil normal. El libro usa una operación fija idempotente.

## Contrato y errores

El [contrato OpenAPI](../docs/contrato-api.yaml) es la referencia para los PR 2 a 5. Se valida con Swagger Parser durante `verify`. El detalle devuelve `{libro, ultimoRegistro}`; las altas y avances devuelven `{libro, registro, advertencias}`. Edición y estado devuelven el libro actualizado con su versión. Las altas reciben los campos editables dentro de `metadatos`.

Errores uniformes: `{codigo, mensaje, campos, idSolicitud}`. `X-Request-Id` identifica cada solicitud. Ante 409 de versión, volver a consultar el detalle y pedir una nueva confirmación. Los reintentos idénticos de alta/avance devuelven el resultado original, incluso si después el libro cambió; refrescar el detalle para obtener el estado presente.

No se devuelven entidades JPA ni JSON del proveedor. No se registran cuerpos, contraseñas, tokens o notas en los mensajes de diagnóstico de la aplicación.
