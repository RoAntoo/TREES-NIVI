# Evidencia local del PR 2

Fecha: **14 de noviembre de 2026**, zona America/Buenos_Aires.

Resultado: base del frontend Angular/Ionic y preparación Capacitor implementadas localmente, sin ejecutar comandos Git, crear ramas, commits ni PR remotos. No se modificó el código del backend ni el contrato del PR 1.

## Entorno

Node 24.14.1, npm 11.21.2, Angular 21.2.26, Angular CLI/build 21.2.30, Ionic 9.0.11, Capacitor 8.6.2, TypeScript 5.9.3, Vitest 4.1.12 y ESLint 10.15.0. Todas las versiones directas están fijadas en `frontend/package.json` y las transitivas en su lockfile.

Se verificaron los exports reales de Ionic 9 y su guía: los componentes standalone se importan desde `@ionic/angular`. Se eligió Angular 21 para la versión de Node 24 instalada y se habilitó Zone.js explícitamente.

## Instalación y validación reproducibles

Desde la raíz:

```powershell
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend test -- --watch=false
npm --prefix frontend run test:scripts
npm --prefix frontend run build
```

Se ejecutó una reinstalación real desde el lockfile, después de detener la vista previa. En este entorno se usó `.cache/npm` como caché local y se habilitó la descarga desde el registro público. No es un requisito del proyecto.

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Correcto, 655 paquetes instalados desde el lockfile |
| ESLint | Sin errores ni advertencias de lint |
| Vitest / Angular | **26 pruebas aprobadas**, 3 archivos |
| Scripts Android / Node test | **3 pruebas aprobadas** |
| Build de producción | Correcto; salida en `frontend/www/` |
| Presupuesto inicial | Aproximadamente 800 kB en bruto / 189 kB de transferencia estimada, dentro del presupuesto configurado |
| Carga diferida | Acceso, contenedor de pestañas y cada pantalla en chunks separados |

Las pruebas comprueban restauración, almacenamiento corrupto y vencido, temporizador, cierre, guardas, origen/prefijo exacto del token, 401 propio/externo, respuesta antigua tras nuevo acceso, configuración inválida, mezcla HTTPS/HTTP y política nativa debug. No requieren backend ni Open Library disponibles.

npm informó una deprecación transitiva de `whatwg-encoding` y avisos sobre scripts de instalación de paquetes nativos. La instalación, el lint, las pruebas y el build terminaron correctamente. Estos avisos no se presentan como una auditoría de vulnerabilidades; esa revisión forma parte del cierre de calidad del PR 5.

## Prueba inicial de interfaz con backend real

Este recorrido documenta la primera entrega del PR 2, anterior a la corrección de arranque sin login. Para el comportamiento vigente, ver la actualización al final de este archivo.

Se inició el JAR del PR 1 con una base H2 en memoria y credenciales sintéticas efímeras. Se ejecutó el cliente local mediante Angular y se usó el origen `http://localhost:8100`, compatible con CORS del servidor.

Comprobaciones observadas en navegador:

1. Una ruta protegida sin sesión redirige al acceso.
2. Credenciales incorrectas muestran un error comprensible y conservan el formulario.
3. Credenciales correctas acceden a `/app/inicio` y limpian la contraseña del formulario.
4. Las cuatro pestañas Inicio, Biblioteca, Agregar y Ajustes navegan mediante Ionic.
5. Biblioteca y Agregar explican que sus funciones aún no están habilitadas; no muestran libros o resultados falsos ni solicitan cámara.
6. La recarga directa de `/app/ajustes` responde correctamente y restaura la sesión temporal.
7. Cerrar sesión devuelve al acceso; intentar abrir Biblioteca después del cierre vuelve a redirigir al acceso.
8. Con el backend configurado para emitir una sesión de **un minuto**, la interfaz cierra automáticamente al vencer y muestra `Tu sesión terminó. Volvé a ingresar para continuar.` en `/acceso?motivo=vencida`.
9. Se observaron las pantallas en un viewport de **1280 × 850** y otro de **390 × 844**, con modo oscuro del sistema, sin desborde horizontal. Se restauró el tamaño de vista al terminar.
10. La consola del navegador no informó errores ni advertencias en el recorrido final. La navegación de pantallas informativas no dispara peticiones de libros ni acumula suscripciones de datos.

Los servidores temporales se detuvieron y las credenciales usadas no quedaron en archivos de configuración. La captura no contiene datos personales ni tokens:

![Acceso en escritorio](pr2/acceso-escritorio.jpg)

## Preparación Android

Se ejecutó `android:preparar` sin un directorio Android previo, con una URL HTTPS pública de ejemplo, y se generó/sincronizó el proyecto correctamente. Una segunda preparación con HTTP explícito completó la sincronización sin volver a crear la plataforma ni duplicar configuración.

Se comprobó que la URL HTTP de prueba aparece exclusivamente en el override debug y que la política permite solamente su dominio, manteniendo `base-config cleartextTrafficPermitted="false"`. La configuración principal no contiene esa URL HTTP. Se deja nuevamente la preparación en modo HTTPS al finalizar las verificaciones.

La plantilla generada fija SDK mínimo 24, compilación/objetivo 36 y Gradle 8.14.3. Los patrones recursivos existentes excluyen `android/`, `ios/`, `www/`, dependencias y compilados. No se consultó el índice de Git por la indicación de trabajar sin Git; no había un proyecto nativo anterior que retirar.

No se compiló ni instaló una APK, no se aceptó el escáner en dispositivo y no se probó iOS. Esas verificaciones siguen pendientes del PR 4. La CI fue ampliada como archivo local, sin ejecución remota.

## Siguiente etapa

PR 3 conecta el catálogo, biblioteca, detalle, formularios reactivos, modal de avance, refresco y resumen con los endpoints ya disponibles. No necesita nuevos endpoints del backend.

## Actualización: arranque móvil sin login obligatorio

Por pedido posterior del usuario, se retiró la guarda global del contenedor de pestañas. La app abre directamente `/app/inicio`. Ajustes ofrece conectar la biblioteca de forma opcional, el formulario permite volver a Inicio y el cierre/vencimiento de sesión devuelve a Inicio. El backend conserva su autenticación y el detalle privado mantiene la guarda.

Se volvieron a ejecutar lint, las **26 pruebas Angular** y el build de producción, todos aprobados. Se comprobó en navegador, con el backend apagado: entrada desde `/`, pantalla Inicio sin credenciales, Ajustes con cuenta desconectada, entrada explícita al formulario, regreso a Inicio y recarga en formato móvil de 390 × 844. No se registraron errores de consola. El servidor de vista previa se detuvo después de la revisión.

![Inicio móvil sin login](pr2/inicio-movil.jpg)
