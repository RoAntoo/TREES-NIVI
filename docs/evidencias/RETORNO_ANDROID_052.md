# Atrás desde Inicio: corrección 0.5.2

15 de noviembre de 2026. Pedido de la autora: el gesto lateral de Atrás no salía de la app desde Inicio. Trabajo local sin Git, sin modificar datos ni despliegue en Azure.

## Corrección

Se agrega `RetornoAndroid` al contenedor de tabs. Su handler nativo tiene prioridad -1: los overlays conservan prioridad 100, el menú 99 y la navegación 0. Se consulta el outlet de la pestaña activa; si hay una vista anterior se deja actuar a Ionic sin otra navegación. Sin pila anterior, Inicio ejecuta App.exitApp; Biblioteca/Agregar/Ajustes vuelven primero a Inicio y un detalle abierto directamente vuelve a Biblioteca.

La salida finaliza la actividad Android, sin forzar la detención del proceso ni borrar datos. En navegador u otra plataforma no se registra esa salida. Se libera la suscripción cuando se destruye el contenedor y se evitan acciones simultáneas mientras está saliendo o navegando.

La causa coincide con el [comportamiento predeterminado documentado de Ionic y su manejo por prioridades](https://ionicframework.com/docs/developing/hardware-back-button): si no hay vista previa, no sale automáticamente. Se usa el plugin App ya instalado, sin agregar dependencias ni desactivar el manejo de modales.

## Verificación

- ESLint aprobado, sin advertencias.
- **121 pruebas frontend**, 16 archivos, aprobadas. Diez casos nuevos: prioridad de salida, respeto de la pila, raíces de tres pestañas, detalle directo, parámetros de Inicio, navegador, limpieza y gestos consecutivos.
- **4 pruebas de scripts Android** aprobadas.
- Build web de producción aprobado.
- APK debug 0.5.2 / versionCode 502 compilado: BUILD SUCCESSFUL.
- Instalación de actualización con `adb install -r` en Samsung SM-A546E: Success; versión instalada verificada 0.5.2 / 502. No se desinstaló ni se borraron datos.

## Prueba observada en el Samsung

Se abrió la actividad de NIVI con arranque COLD. Se comprobó que era la actividad activa y se envió KEYCODE_BACK por ADB. Después, la actividad activa fue el launcher de Samsung; el registro de Capacitor confirmó `pluginId: App, methodName: exitApp`.

Esto verifica el evento Atrás y la salida real en el dispositivo. No se ejecutó físicamente un deslizamiento con el dedo desde ambos bordes ni se probó en teléfono cada modal/teclado/escáner en esta corrección; las prioridades y rutas se comprobaron automáticamente. No se presentan las pruebas simuladas como una regresión física completa.

## Artefacto local

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`, **37123685 bytes**, debug 0.5.2 con HTTPS de Azure.

SHA-256: `7090776b92417d00e0039ec9dcde9044cafd15911452cf447ccaa70e89fa9d69`.

El artefacto reemplaza el APK 0.5.1 del mismo directorio. Las capturas y evidencias de paleta, icono y felicitación de [0.5.1](CORRECCIONES_051.md) siguen describiendo esas funciones; sus tamaños y hashes de APK son históricos.
