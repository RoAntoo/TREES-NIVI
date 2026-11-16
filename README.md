# NIVI Lectura

Aplicación híbrida para **retomar una lectura sin perder el hilo**, con seguimiento de libros físicos y lector EPUB local.

**Cliente 0.6.4 · Documentación principal actualizada el 16 de noviembre de 2026.** El backend ya está desplegado en Azure. La aplicación se usa sin cuenta ni contraseña: los clientes permitidos comparten una biblioteca física; los EPUB y sus posiciones permanecen en cada dispositivo.

## Funcionalidades actuales

| Pantalla | Funciones |
| --- | --- |
| Inicio | Conteos de físicos y EPUB por estado, y las tres lecturas con actividad más reciente. Acceso a Ajustes. |
| Biblioteca | Colección unificada con etiquetas Físico/EPUB, filtro de estado, orden por actividad, alta o título y paginación de la vista. Actualización al deslizar. |
| Agregar | Búsqueda por título/autor, ISBN escrito, escáner ISBN Android y alta manual. Selección de edición y confirmación editable. |
| Detalle físico | Metadatos, edición, estados, eliminación confirmada, historial y contexto «Antes de seguir…». |
| Modal de avance | Página y nota validadas, confirmación de correcciones y revisión ante conflictos de versión. Finalizar muestra 100% y una felicitación, conservando la última página registrada. |
| Leer | Importar un EPUB y retomar la lectura local. Los duplicados binarios conservan su progreso. |
| Lector EPUB | Índice, posición CFI, fuente, interlineado, calidez, temas claro/sepia/oscuro y navegación por deslizamiento, toques, botones o cascada vertical. Pantalla completa con barras Android ocultables. |
| Ajustes | Apariencia sistema/claro/oscuro, copia voluntaria de consulta física, actualización/borrado de esa copia e información del almacenamiento. |

En Biblioteca, tocar una tarjeta abre el detalle físico o lector digital. Mantenerla presionada durante 500 ms, tocar ⋯, usar clic derecho o la tecla de menú contextual abre acciones e información. Eliminar requiere confirmación adicional y actúa sobre el almacén correspondiente.

Android admite recibir EPUB mediante **Abrir con** y **Compartir**, incluso múltiples archivos. Tras guardarlos, una confirmación permite comenzar a leer o cerrar y volver a Inicio. No se abre el lector automáticamente.

La Biblioteca actual no incluye buscador de texto: la búsqueda de catálogo está en Agregar. Hay cuatro tabs: Inicio, Biblioteca, Agregar y Leer; además existen Ajustes, detalle físico y lector dedicado.

## Tecnologías y requisitos

| Parte | Tecnologías |
| --- | --- |
| Cliente | Angular 21.2.26, CLI/build 21.2.30, Ionic 9.0.11, TypeScript 5.9.3, RxJS 7.8.2. |
| Entorno frontend | Node 24.14.1, npm 11; versiones previstas en `.nvmrc` y `package.json`. No hace falta Ionic CLI global. |
| Android | Capacitor 8.6.2, Barcode Scanner 3.1.2, App 8.0.1, Filesystem 8.1.5 y plugin propio de recepción EPUB. |
| Lector | epub.js 0.3.93, JSZip 3.10.1 y DOMPurify 3.4.18. |
| Backend | Java 21, Spring Boot 3.5.16, JPA/Hibernate, Flyway y Maven Wrapper 3.9.14. |
| Bases | H2 en local y PostgreSQL en el perfil Azure. No se usa json-server. |
| Build Android | JDK 21, Android SDK/platform-tools, plataforma/target 36, mínimo API 26 y Gradle Wrapper 8.14.3 en la preparación revisada. |

Internet es necesario para las descargas iniciales y las consultas remotas. Los EPUB importados en Android tienen un circuito local independiente de Azure.

## Estructura del proyecto

```text
frontend/
  src/app/
    nucleo/          Configuración, errores, almacenamiento y capacidades nativas
    compartido/      Formularios, validadores, consultas y componentes reutilizables
    funcionalidades/ Inicio, biblioteca, catálogo, lectura, ajustes y EPUB
    navegacion/      Tabs
  public/            Configuración pública y assets
  nativo/android/    Fuentes propias: manifest, Java, icono y splash
  scripts/           Preparación y comprobaciones Android
  www/               Build web generado
  android/           Proyecto Android generado/preparado
backend/
  src/main/java/ar/edu/nivi/
    dominio/         Modelos y reglas independientes de frameworks
    aplicacion/      Casos de uso, modelos y puertos
    infraestructura/ HTTP, JPA, catálogo y seguridad
    configuracion/   Perfiles y conexión de implementaciones
  src/main/resources/ Configuración y migraciones H2/PostgreSQL
  src/test/           Pruebas Java
  target/             JAR y reportes generados
  datos/              H2 local al ejecutar desde backend/
docs/                 Contrato, decisiones, guías y evidencias
.github/workflows/    Definición de CI
icon/                 Imagen original del icono
.cache/               Cachés y copias temporales de comprobación
output/               Entregables generados
```

`node_modules/`, `www/`, `android/`, `target/`, cachés, APK y claves están previstos como exclusiones en `.gitignore`. Cambios duraderos de Android se hacen en `frontend/nativo/` o en su script de preparación; editar solo el proyecto generado puede perderse al regenerarlo.

### ¿Se necesita docs para ejecutar?

La app instalada y el servidor desplegado **no leen la carpeta `docs/` para funcionar**. Allí se conserva documentación de desarrollo y estudio.

Hay una dependencia de verificación concreta: `backend/src/test/java/ar/edu/nivi/ContratoPrueba.java` lee `docs/contrato-api.yaml`. Eliminar esa carpeta rompe esa prueba y, por tanto, la comprobación normal con Maven `verify`. Mantener el contrato junto a las fuentes, aunque los documentos no se empaqueten como parte de la aplicación.

## Ejecutar el frontend en la PC con Azure

Desde la raíz del proyecto, en PowerShell:

```powershell
npm --prefix frontend ci
npm --prefix frontend start
```

Abrir [NIVI en localhost](http://localhost:8100). `npm ci` instala desde el lockfile; no hace falta repetirlo para cada cambio de pantalla. Dejar abierta la terminal del servidor de desarrollo y detenerlo con Ctrl+C al terminar.

La configuración actual conecta así:

```text
Navegador en localhost:8100
  → /api/v1/...
  → proxy de ng serve
  → backend HTTPS de Azure
  → PostgreSQL
```

`frontend/public/configuracion.json` contiene `{ "apiUrl": "/api/v1" }`. El proxy de `frontend/proxy.conf.json` reenvía `/api/**` a:

```text
https://nivi-backend-h0b3ercua7g7aacj.brazilsouth-01.azurewebsites.net
```

Para este recorrido no hace falta iniciar Java localmente. La conexión de la PC debe estar permitida por las restricciones de App Service. No se despliega otro frontend ni se modifica Azure al iniciar `ng serve`.

Consulta opcional de lectura:

```powershell
Invoke-RestMethod -Uri 'https://nivi-backend-h0b3ercua7g7aacj.brazilsouth-01.azurewebsites.net/api/v1/resumen'
```

## Alternativa: frontend y backend locales

Esta alternativa utiliza H2 local; no mueve ni replica los libros de PostgreSQL. Open Library sigue requiriendo red para consultas de catálogo.

Terminal 1, desde `backend/`, con un JDK 21 instalado seleccionado en `JAVA_HOME` y su `bin` en PATH:

```powershell
java -version
.\mvnw.cmd -version
$env:SPRING_PROFILES_ACTIVE = 'local'
$env:PORT = '8080'
$env:DB_URL = 'jdbc:h2:file:./datos/nivi-lectura;DB_CLOSE_ON_EXIT=FALSE'
$env:DB_USERNAME = 'sa'
$env:DB_PASSWORD = ''
$env:OPEN_LIBRARY_USER_AGENT = Read-Host 'Identificacion con contacto: NIVI-Lectura (tu-correo@dominio)'
.\mvnw.cmd spring-boot:run
```

El perfil local escucha solo en `127.0.0.1:8080`, no necesita AUTH/JWT y guarda la base en `backend/datos/` al iniciarse desde esa carpeta. Se fijan perfil/base locales para evitar heredar variables de otro entorno. Spring no carga `.env` automáticamente.

Para este ensayo, cambiar temporalmente el proxy del frontend:

```json
{
  "/api/**": {
    "target": "http://127.0.0.1:8080",
    "secure": false,
    "changeOrigin": false
  }
}
```

Terminal 2, desde la raíz: `npm --prefix frontend start`. Reiniciar `ng serve` después de cambiar el proxy. Al volver al backend remoto, restaurar su destino Azure.

Antes de cambiar entre bibliotecas distintas detrás del mismo proxy, borrar/desactivar la **copia de consulta física** desde Ajustes para evitar confundir datos del servidor anterior. Esto no elimina la biblioteca remota ni los EPUB locales.

El perfil técnico `seguro` del backend conserva autenticación JWT histórica, pero el cliente actual no incluye login ni envío de Bearer para usarlo. Algunas instrucciones de [backend/README.md](backend/README.md) pertenecen a ese perfil alternativo.

## Configuración pública y despliegue web

`main.ts` carga y valida `configuracion.json` antes de iniciar Angular, sin cachearlo deliberadamente. La URL debe usar HTTP(S), terminar en `/api/v1` y no contener credenciales, parámetros ni fragmentos. Una página HTTPS requiere API HTTPS.

Para compilar la web:

```powershell
npm --prefix frontend run build
```

La salida es `frontend/www/`. El proyecto configura la subcarpeta `browser` vacía, por lo que Capacitor utiliza `webDir: 'www'`.

Fuera de `ng serve`, configurar un proxy real de `/api/v1` o una API HTTPS absoluta con CORS permitido. El proxy de desarrollo no se incorpora automáticamente a un hosting ni al APK. Las rutas web necesitan fallback a `index.html`, manteniendo las respuestas de API como JSON.

## Compilar e instalar Android con Azure

Requisitos: `JAVA_HOME` con JDK 21, `ANDROID_HOME` con el SDK y `adb` de platform-tools disponible en PATH. Android Studio no necesita permanecer abierto durante la compilación por script.

Desde la raíz, con dependencias instaladas:

```powershell
$env:NIVI_API_URL = 'https://nivi-backend-h0b3ercua7g7aacj.brazilsouth-01.azurewebsites.net/api/v1'
Remove-Item Env:NIVI_ALLOW_HTTP -ErrorAction SilentlyContinue
npm --prefix frontend run android:build
adb devices -l
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
adb shell dumpsys package ar.edu.nivi.lectura | Select-String 'versionCode|versionName'
```

`android:build` valida entorno/URL, compila Angular, crea Android si falta, sincroniza Capacitor, aplica fuentes/recursos propios y ejecuta Gradle `assembleDebug`. `android:preparar` prepara sin la compilación Gradle final; `android:abrir` abre el proyecto en Android Studio.

El paquete incorpora la URL absoluta de Azure y no necesita `ng serve`, servidor Java en la PC ni ADB reverse. La conexión del teléfono debe poder alcanzar la API.

La salida es un **APK debug**, no una release para tienda. `adb install -r` permite actualizar conservando datos si identidad y firma son compatibles. Desinstalar o borrar datos puede eliminar EPUB y posiciones locales.

### Ubicación y versiones de APK

Salida principal, reemplazada al recompilar:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

`output-metadata.json`, en esa misma carpeta, informa versión y paquete. La salida revisada corresponde a `ar.edu.nivi.lectura`, versión **0.6.4**, código **604**.

El script toma la versión de `frontend/package.json` y calcula `versionCode = mayor × 10000 + menor × 100 + parche`. La versión del backend/JAR es independiente.

Copias de comprobación encontradas, según sus metadatos locales:

| Versión/código | APK relativo a la raíz |
| --- | --- |
| 0.6.4 / 604 | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| 0.5.0 / 500 | `.cache/pr5-limpio/frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| 0.4.0 / 400 | `.cache/pr4/limpio/frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| 0.4.1 / 401 | `.cache/pr4/limpio-final/frontend/android/app/build/outputs/apk/debug/app-debug.apk` |

No hay un archivo automático de todas las versiones ni una release pública confirmada. Los logs de una versión no garantizan que su APK separado siga existiendo. Para conservar entregas futuras, copiar cada salida con nombre/versionado y registrar destino de API, fecha y hash; por ejemplo, guardar una copia como `nivi-lectura-0.6.4-debug-azure.apk` fuera de la carpeta de build antes de recompilar.

### Android con backend local por USB

Para un ensayo local, iniciar Spring como se explicó antes, preparar un debug con `NIVI_API_URL=http://127.0.0.1:8080/api/v1` y `NIVI_ALLOW_HTTP=1`, compilar/instalar y ejecutar:

```powershell
adb reverse tcp:8080 tcp:8080
```

El puente permite que el puerto del teléfono llegue al backend de la PC. Mantener servidor y conexión USB; `localhost` del teléfono por sí solo no apunta a la computadora. Retirar con `adb reverse --remove tcp:8080` al terminar. Volver a HTTPS y quitar `NIVI_ALLOW_HTTP` antes de preparar otro paquete para Azure.

## Arquitectura, API y datos

El backend separa dominio Java, casos de uso, puertos y adaptadores HTTP/JPA/Open Library. `ControladorBiblioteca` utiliza el puerto `Biblioteca`; `BibliotecaTransaccional` delega en `GestionBiblioteca` y coordina transacciones/bloqueo. Libro, registro e identidad del avance se confirman juntos.

Las mutaciones comprueban versiones. Altas y avances incluyen UUID/huella para reconocer reintentos exactos; un conflicto devuelve 409 y exige recuperar/revisar el estado vigente. El cliente conserva el cuerpo de un intento incierto solo en memoria.

El frontend standalone se organiza por funcionalidades, con formularios reactivos, signals y RxJS. `ColeccionLecturas` combina físicos del servidor con EPUB locales para conteos y tarjetas. Ionic conserva páginas y estas actualizan/cancelan consultas al entrar/salir.

Los metadatos del catálogo se consultan desde el backend; las portadas públicas por URL pueden cargarse desde el cliente. Una obra tiene varias ediciones: ISBN y páginas se toman de la edición elegida. El escáner lee códigos ISBN, no reconoce portadas. Hay alternativa manual y se admiten datos ausentes sin inventarlos.

### Dónde se guarda cada formato

| Datos | Almacenamiento principal |
| --- | --- |
| Libros físicos, notas e historial | PostgreSQL en Azure; H2 en el recorrido local. |
| EPUB y progreso en Android | Archivos privados con Filesystem `Directory.Data`; estado independiente del servidor. |
| EPUB y progreso en navegador | IndexedDB `nivi-epub`. |
| Copia de consulta física | IndexedDB `nivi-consulta`, optativa y limitada. |
| Apariencia/activación de copia | Ajustes pequeños en localStorage. |
| Respaldo inmediato de posición EPUB | localStorage por libro, además del estado principal. |

El lector usa CFI para restaurar una posición lógica al cambiar fuente/tamaño, con alternativa por capítulo. La importación calcula hash para duplicados y valida estructura ZIP/EPUB, tamaños y expansión. El contenido se sanea antes de renderizar, con scripts y recursos externos restringidos. Se admiten EPUB compatibles sin DRM; no PDF.

## Alcance offline y conservación

- **EPUB Android:** los archivos ya importados y su seguimiento son locales y no dependen de Azure. La aceptación física completa de cierre/reinicio sigue pendiente de documentar.
- **Copia física:** voluntaria, versionada y de hasta 100 libros, con últimos registros conocidos, fecha y alcance visibles. No guarda imágenes ni historial completo.
- La copia física requiere una consulta correcta al servidor en ese arranque y un fallo de transporte posterior. No se desbloquea automáticamente en frío sin red.
- En modo copia se bloquean escrituras físicas. Los conteos físicos abarcan solo lo guardado; los EPUB locales mantienen su circuito.
- Un error 401/403 limpia la copia; los demás errores HTTP no se ocultan como consulta offline exitosa.
- No hay service worker ni garantía de arranque web sin conexión; las rutas/recursos necesarios deben haberse cargado.
- Borrar/desactivar copia conserva el servidor y no equivale a eliminar la colección EPUB. Desinstalar/borrar datos sí puede perder archivos y posiciones digitales.

No hay sincronización EPUB entre dispositivos ni exportación propia de su progreso. Una copia de consulta no sustituye un respaldo del servidor.

## Azure y acceso

El despliegue documentado utiliza App Service Linux con Java 21 y PostgreSQL 16. El perfil `azure` recibe `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `OPEN_LIBRARY_USER_AGENT` mediante variables del entorno, y selecciona migraciones PostgreSQL. Las credenciales no van en el cliente.

El acceso actual no tiene identidad por usuario: depende de las restricciones de IP de App Service. CORS no sustituye autenticación/autorización ni el firewall de PostgreSQL protege por sí solo los endpoints. Verificar la conectividad de PC y teléfono antes de la demo, especialmente si usan redes distintas.

Cambiar pantallas y recompilar el cliente no despliega Java. El JAR local de `backend/target/` tampoco reemplaza automáticamente el servidor remoto. La configuración y los límites de aceptación se describen en este README.

## Pruebas y comprobaciones

Desde la raíz:

```powershell
npm --prefix frontend run lint
npm --prefix frontend test -- --watch=false
npm --prefix frontend run test:scripts
npm --prefix frontend run build
npm --prefix frontend audit --omit=dev
```

Desde `backend/`, con Java 21: `.\mvnw.cmd verify`. Genera `target/nivi-lectura-0.1.0-SNAPSHOT.jar` y los reportes `target/surefire-reports/`.

Resultados de la auditoría del **16/11/2026**, sin presentar esta edición documental como una nueva ejecución:

| Comprobación | Resultado |
| --- | --- |
| Frontend | 186 pruebas aprobadas en 27 archivos. |
| Scripts Android | 4 pruebas aprobadas. |
| Backend | 64 pruebas aprobadas con Maven verify. |
| Lint/build web | Completados; build inicial 660,76 kB sin comprimir, transferencia estimada 187,11 kB. Advertencias CommonJS vinculadas al lector. |
| npm audit | 0 avisos de producción; 25 moderados con herramientas, sin altos/críticos reportados. |
| Azure | Lectura de resumen HTTP 200 con JSON válido. |
| Navegador | Revisión parcial en Chrome/escritorio y 390 px; navegación, modal y validación de título vacío. |

Las pruebas llamadas Azure usan H2 local: no certifican persistencia PostgreSQL ni reinicio remoto. Instalación/compilación del APK no reemplazan su aceptación física.

La CI está definida en `.github/workflows/ci.yml`, sin ejecución remota acreditada en esta revisión. Su build Android usa una URL de API de ejemplo y retención de artefacto de siete días; no debe confundirse con un APK conectado a la biblioteca Azure real.

## Límites, pendientes y problemas frecuentes

No se implementan multiusuario, lector PDF, reconocimiento de portadas, escrituras físicas offline ni sincronización digital. Open Library puede estar incompleto o no responder. Tras recargar y perder una respuesta de escritura, revisar Biblioteca/historial antes de iniciar otro intento: los pendientes del cliente no son persistentes.

| Problema | Qué revisar |
| --- | --- |
| API inaccesible/403 | Disponibilidad, proxy y restricciones de acceso Azure para esa conexión. |
| Error CORS o HTML en lugar de JSON | Origen, proxy, prefijo `/api/v1` y fallback del hosting. |
| Cámara no disponible | Escáner Android, permiso en contexto y alternativa ISBN/manual. |
| Libro ausente en catálogo | Edición/ISBN o alta manual. |
| Copia física ausente | Activación, conexión inicial, cobertura y avisos de almacenamiento. |
| EPUB no visible en otra PC/teléfono | La colección digital es local; no se sincroniza con Azure. |
| Pantalla antigua en el teléfono | Build, sync, Gradle, instalación y versión del paquete instalado. |

Pendientes de cierre: aceptación física completa del APK 0.6.4 (cámara, recepción de archivos, gestos, Atrás, reinicio/modo avión y conservación), accesibilidad integral, escritura/idempotencia/persistencia tras reinicio en PostgreSQL real, entrega Git verificable y ensayo de defensa. Completar la comisión académica.

## Documentación y defensa

- [README del frontend](frontend/README.md): funcionamiento actual y decisiones del cliente.
- [Contrato OpenAPI](docs/contrato-api.yaml): referencia documental validada por una prueba; incluye el acceso técnico histórico.
- [Evidencia 0.6.4](docs/evidencias/FRONT_064.md): acciones de Biblioteca, pruebas e instalación documentadas.
- [Recepción Android 0.6.2](docs/evidencias/FRONT_062.md) y [confirmación 0.6.3](docs/evidencias/FRONT_063.md).
- [Lector EPUB](docs/evidencias/LECTOR_EPUB_060.md): implementación y límites de aceptación.
- [Catálogo](docs/evidencias/CATALOGO_OPEN_LIBRARY.md), [copia física](docs/decisiones/copia-local.md) y [acceso sin login](docs/decisiones/inicio-sin-login.md).
- [Auditoría PDF](output/pdf/auditoria_nivi_lectura.pdf): hallazgos y promedio orientativo, no nota oficial del profesor.

Las evidencias de etapas anteriores son registros históricos, no una descripción completa de 0.6.4. Para el alcance vigente, contrastarlas con este README, el README del frontend y las evidencias recientes. La guía de estudio y la guía separada de Azure no están presentes en la carpeta `docs/` al actualizar este archivo.

## Autoría y atribuciones

**Rocío Antonella Ramaccioni — Ingeniería en Sistemas.** Comisión pendiente de informar.

Icono de instalación aportado en `icon/iconooooooo.png`, copiado a los recursos nativos sin editar sus píxeles; no se utiliza como imagen dentro de las pantallas. La marca interna conserva su SVG y la paleta crema/ciruela/turquesa. Tipografías del sistema y Georgia; metadatos y portadas de [Open Library](https://openlibrary.org), iconos de [Ionicons](https://ionic.io/ionicons). Los EPUB son archivos aportados localmente por la persona usuaria; no se incluyen textos de libros como parte de las fuentes.
