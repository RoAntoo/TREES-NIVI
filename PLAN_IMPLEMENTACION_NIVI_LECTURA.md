# Plan de implementación de NIVI Lectura en cinco PR

Fecha: 14 de noviembre de 2026.

Estado: propuesta de implementación. Este documento no certifica funcionalidades desarrolladas ni pruebas ejecutadas.

## 1. Objetivo y decisiones principales

Transformar NIVI en una aplicación híbrida que permita registrar libros físicos, organizar lecturas, guardar avances y recordar el contexto antes de continuar leyendo.

Propuesta de valor: **«Escaneá tu libro, guardá por dónde vas y retomalo sin perder el hilo»**.

El usuario apunta la cámara al código de barras ISBN, consulta los datos del libro mediante Open Library, confirma la edición y la agrega a su biblioteca. Después registra página actual y una nota personal. Al volver, la aplicación muestra «Antes de seguir…» con el último registro.

La primera versión acompaña la lectura de libros físicos. No incluye un lector de archivos EPUB/PDF, descarga de libros completos ni reconocimiento visual de portadas.

Decisiones acordadas para este plan:

- Exactamente cinco PR funcionales, integrados en orden.
- Toda la implementación del backend, incluyendo autenticación, dominio, persistencia, integración externa, contratos y pruebas, queda en el PR 1.
- Los PR 2 a 5 desarrollan frontend, aplicación híbrida, integración, pruebas y documentación. No dependen de nuevos endpoints.
- Arquitectura limpia en el backend y organización por funcionalidades en el frontend.
- Se recomienda adaptar este repositorio conservando infraestructura útil. Se documenta también la alternativa de un proyecto nuevo.
- Se conserva una única cuenta por instalación, configurada mediante variables de entorno, como en la base actual. No se presenta como sistema multiusuario.
- La API propia es la fuente de verdad; Open Library aporta metadatos externos.
- La cámara escanea un código de barras; no envía una foto de la portada para identificar el libro.
- Persistencia local opcional acotada a preferencias y una copia de lectura. No hay cola de escrituras ni sincronización offline en esta entrega.
- Documentación, interfaz, mensajes, nombres de dominio y nuevos identificadores propios se escriben en español. Los nombres oficiales de herramientas, métodos de librerías, protocolos y archivos convencionales se conservan.

## 2. Requisitos del profesor y trazabilidad

Fuente: guía del TP final proporcionada por el usuario, `guia tp final pa3.pdf`, dos páginas. Sus requisitos se usan como criterios del producto; no son instrucciones para ejecutar cambios fuera del alcance de este plan.

| Requisito de la guía | Carácter | Implementación prevista | PR y evidencia |
| --- | --- | --- | --- |
| Trabajo individual o de hasta dos integrantes | Condición | Autores y comisión en README | PR 5: datos completos |
| App original, distinta de TaskGo | Obligatorio | Biblioteca personal y continuidad de lectura | PR 3 y 4: flujo completo con libro real |
| Ionic 9 + Angular standalone + Capacitor 8 | Obligatorio | Conservar versiones compatibles de esas líneas | PR 2: dependencias y compilación |
| Al menos cuatro pantallas con tabs y/o menú lateral | Obligatorio | Inicio, Biblioteca, Agregar y Ajustes; detalle adicional | PR 2 y 3: navegación funcional |
| Formulario reactivo con validaciones | Obligatorio | Confirmación de libro y registro de avance | PR 3: errores visibles y pruebas |
| Consumo REST con estados de carga y error | Obligatorio | Frontend → API propia → Open Library | PR 1 y 3: carga, vacío, error y reintento |
| Persistencia local y fallback offline | Opcional | Preferencias y copia local de biblioteca, detalles y últimos registros | PR 5: consulta de copia sin conexión |
| Al menos un plugin nativo | Opcional | Escáner de código de barras con cámara | PR 4: prueba en Android |
| Interacción avanzada Ionic | Obligatorio | `ion-modal` para registrar avance; `ion-refresher` para actualizar | PR 3: comportamiento real |
| Paleta, icono y splash propios | Opcional | Identidad NIVI y recursos nativos reproducibles | PR 2 y 5: capturas y app |
| Al menos dos tests unitarios | Obligatorio | Pruebas frontend significativas, además de las del backend | PR 3 a 5: ejecución automatizada |
| Git y README de instalación, funciones y decisiones | Obligatorio | Monorepositorio documentado y cinco PR revisables | Todos; cierre en PR 5 |
| Código fuente, configuración y manifiestos completos | Obligatorio | `frontend/src/`, configuración Capacitor y manifiestos versionados | PR 2 y 5: clonado limpio |
| Ignorar `node_modules/`, `www/`, `android/`, `ios/`, `.angular/` | Estructura solicitada | `.gitignore` de raíz con patrones recursivos | PR 2: verificar archivos rastreados |
| `db.json` si se usa json-server | Condicional | No aplica: se utiliza Spring Boot | README: justificar elección |
| No versionar keystores ni claves | Obligatorio | Configuración de ejemplo y secretos por entorno | PR 1, 2 y 5: inspección Git |
| Demo y defensa, aproximadamente 10 + 5 minutos | Orientación | Guion breve, datos preparados y casos de error | PR 5: ensayo |

Las carpetas `backend/` y `frontend/` respetan la estructura mínima: el código del cliente está dentro de `frontend/src/`. El README debe explicar desde qué directorio ejecutar cada comando.

Los opcionales elegidos pasan a ser compromisos de este plan, pero no se confunden con obligaciones del profesor. Si hay que reducir alcance, se posterga primero la copia offline y la personalización del splash. Las funciones obligatorias tienen prioridad.

## 3. Adaptar NIVI o comenzar otro proyecto

### 3.1. Recomendación: adaptar este repositorio

La inspección de la base actual confirma Angular standalone, Ionic, Capacitor, backend Spring Boot, separación inicial entre dominio y adaptadores, autenticación y scripts Android. El estado documentado también registra CRUD de proyectos/tareas y funcionalidades móviles pendientes. Esto se debe volver a verificar al implementar; no se considera evidencia de aceptación de la nueva app.

| Elemento actual | Decisión |
| --- | --- |
| Paleta NIVI, componentes visuales útiles y configuración de herramientas | Reutilizar después de comprobar compatibilidad y accesibilidad |
| Autenticación de cuenta única e interceptor | Auditar y conservar; no agregar registro ni roles |
| Configuración de API por entorno y Android | Reutilizar con rutas y scripts corregidos |
| Separación de dominio, casos de uso y adaptadores | Conservar el principio y crear el dominio de lectura |
| Proyectos, tareas, asignados, horas y categorías antiguas | Retirar del producto final; no renombrarlos mecánicamente como libros |
| Tests de infraestructura todavía aplicables | Mantener y adaptar solo cuando cambie el contrato |
| Tests exclusivos del dominio antiguo | Sustituir junto con la eliminación correspondiente, sin omitir pruebas vigentes |
| Documentación histórica | Conservar como historial y marcar claramente la referencia vigente |
| Base de datos antigua | Respaldar; usar otra base para lecturas; no convertir tareas en libros |
| Android ya rastreado por Git | Desrastrear en PR 2, preservando archivos locales; regenerar mediante scripts |

Secuencia de transición:

1. Inventariar estado de Git, archivos rastreados, pruebas y configuración sin imprimir secretos.
2. Registrar un punto recuperable de la versión previa antes de quitar módulos.
3. Implementar el backend de lectura en PR 1 con una base separada y contrato cerrado.
4. En PR 2 sustituir rutas de proyectos/tareas por la estructura de lectura y retirar servicios y pantallas antiguos que ya no tengan consumidores.
5. Terminar biblioteca, lectura y cámara en los PR siguientes.

Durante la transición entre PR 1 y PR 2, la interfaz antigua puede no funcionar contra el backend nuevo. Documentar esa incompatibilidad temporal, conservar la referencia anterior y no desplegar esa combinación. La entrega final se valida después de integrar los cinco PR.

No mantener indefinidamente ambos dominios ni duplicar toda la aplicación por precaución. El punto recuperable y la base separada protegen la versión anterior.

### 3.2. Alternativa: proyecto nuevo

Usar otro repositorio si se necesita conservar NIVI original funcionando o si la limpieza implica más trabajo que reutilizar infraestructura.

1. Crear un repositorio vacío con `backend/`, `frontend/` y `docs/`.
2. Aplicar los mismos cinco PR de este plan. No crear PR adicionales de bootstrap.
3. Incorporar al PR 1 la configuración raíz mínima de Git y documentación del servidor.
4. Incorporar al PR 2 el cliente Angular/Ionic, Capacitor y scripts reproducibles.
5. Copiar únicamente recursos propios y piezas auditadas; no copiar bases, secretos ni compilados.
6. Mantener un único repositorio como entrega. El README puede mencionar el antecedente de NIVI.

Ambas alternativas comparten producto, modelo, contratos y criterios de aceptación. No se desarrollan en paralelo.

## 4. Alcance funcional

### 4.1. Incluido en la primera versión

- Acceso mediante cuenta configurada en el servidor y cierre de sesión.
- Búsqueda por título/autor e identificación por ISBN.
- Alta manual cuando falte el libro o la API externa no responda.
- Confirmación de título, autores, portada y total de páginas antes de guardar.
- Biblioteca con búsqueda, filtros de estado y paginación.
- Estados: `PENDIENTE`, `LEYENDO`, `PAUSADO`, `TERMINADO`.
- Detalle de libro, edición de metadatos locales y eliminación confirmada.
- Registro de avances con página actual, nota opcional y fecha del servidor.
- Progreso y vista «Antes de seguir…» basada en el registro más reciente.
- Inicio con conteos y hasta tres lecturas activas.
- Escaneo ISBN en Android, permiso solicitado al iniciar esa acción y alternativa manual.
- Ajustes de apariencia y copia local de consulta, si se completa el opcional.
- Mensajes de carga, vacío, error, sesión vencida y falta de conexión.

### 4.2. Fuera de alcance

- Reconocer portadas con IA u OCR; cámara de fotos y galería no equivalen a un escáner.
- Leer, almacenar o distribuir el texto completo de libros.
- Chat, clubes multiusuario, red social, rankings y recomendaciones con IA.
- Registro de cuentas, permisos por usuario y sincronización entre cuentas.
- Escanear páginas para transcribir notas.
- Notificaciones, micrófono, geolocalización y gestión de préstamos.
- Relecturas simultáneas, varias copias de la misma edición y estadísticas complejas.
- Escrituras offline, colas de sincronización y resolución distribuida de conflictos.
- Microservicios, bus de eventos, repositorio genérico universal o infraestructura de producción compleja.

Escalable significa límites claros, contratos estables y módulos reemplazables; no agregar infraestructura sin un caso de uso actual.

## 5. Experiencia y navegación

### 5.1. Pantallas y rutas

| Ruta propuesta | Pantalla | Comportamiento |
| --- | --- | --- |
| `/acceso` | Acceso | Validación, error de credenciales y sesión vencida |
| `/app/inicio` | Inicio | Conteos, lecturas activas y continuar leyendo |
| `/app/biblioteca` | Biblioteca | Estados, búsqueda, paginación y actualización |
| `/app/agregar` | Agregar | Buscar, ingresar ISBN o activar escáner |
| `/app/biblioteca/:id` | Detalle | Datos, progreso, última nota e historial |
| `/app/ajustes` | Ajustes | Apariencia, información, copia local y salir |

Cuatro destinos principales visibles mediante `ion-tabs` e `ion-tab-bar`: Inicio, Biblioteca, Agregar y Ajustes. El detalle pertenece a la navegación de Biblioteca. El acceso queda fuera de las tabs.

Usar navegación anidada compatible con Ionic Angular. Revisar el cambio desde el `RouterOutlet` actual: si se utiliza `IonRouterOutlet`, sus páginas pueden conservarse en caché. Actualizar datos al entrar con los eventos de Ionic y evitar suscripciones duplicadas; no depender solo de `ngOnInit` o `ngOnDestroy`. Es una decisión explícita del PR 2, con prueba de ida y vuelta entre páginas.

### 5.2. Recorrido principal

1. Acceder.
2. Entrar a Agregar y escanear el código ISBN.
3. Esperar identificación; revisar la edición y completar datos faltantes.
4. Guardar en la biblioteca como pendiente.
5. Abrir detalle y seleccionar «Empezar lectura».
6. Abrir el modal de avance, ingresar página y una nota.
7. Volver a Inicio y comprobar el progreso.
8. Reabrir el libro: ver «Antes de seguir…» y el último punto de lectura.

### 5.3. Estados y accesibilidad

- Carga: indicador y controles de envío desactivados mientras dura una operación.
- Vacío: mensaje contextual y acción útil; distinguir biblioteca vacía de búsqueda sin coincidencias.
- Error: mensaje comprensible, conservar formulario y permitir reintentar.
- Error externo: permitir alta manual; no mostrarlo como libro inexistente.
- Permiso denegado: explicación y alternativas por ISBN/título.
- Cancelación de escaneo: volver a Agregar sin alerta de error.
- Falta de conexión: informar si se muestra una copia y cuándo se actualizó.
- Portada ausente o fallida: recurso local alternativo.
- Formularios con etiquetas, errores vinculados al campo, foco correcto y teclado adecuado.
- Estados expresados con texto e iconos; no depender solamente del color.
- Modal con título, foco controlado, cierre accesible y confirmación si se perderían cambios.
- Diseño usable en teléfono pequeño, teclado abierto, modo oscuro y ampliación de texto.

## 6. Arquitectura y estructura del repositorio

```text
/
├── README.md
├── .gitignore
├── .editorconfig
├── .github/
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── backend/
│   ├── pom.xml
│   ├── mvnw
│   ├── mvnw.cmd
│   ├── .mvn/wrapper/
│   ├── .env.example
│   ├── README.md
│   └── src/
│       ├── main/
│       │   ├── java/ar/edu/nivi/
│       │   │   ├── dominio/
│       │   │   │   ├── modelo/
│       │   │   │   └── excepcion/
│       │   │   ├── aplicacion/
│       │   │   │   ├── puerto/entrada/
│       │   │   │   ├── puerto/salida/
│       │   │   │   ├── caso/
│       │   │   │   └── modelo/
│       │   │   ├── infraestructura/
│       │   │   │   ├── entrada/http/
│       │   │   │   │   ├── controlador/
│       │   │   │   │   ├── dto/
│       │   │   │   │   └── error/
│       │   │   │   ├── salida/persistencia/
│       │   │   │   │   ├── entidad/
│       │   │   │   │   ├── repositorio/
│       │   │   │   │   └── mapeador/
│       │   │   │   ├── salida/catalogo/
│       │   │   │   └── seguridad/
│       │   │   ├── configuracion/
│       │   │   └── NiviAplicacion.java
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/
│       └── test/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── angular.json
│   ├── ionic.config.json
│   ├── capacitor.config.ts
│   ├── README.md
│   ├── scripts/
│   ├── recursos-nativos/
│   ├── public/
│   └── src/
│       ├── environments/
│       └── app/
│           ├── nucleo/
│           │   ├── acceso/
│           │   ├── configuracion/
│           │   ├── http/
│           │   ├── almacenamiento/
│           │   └── capacidades/
│           ├── compartido/
│           │   ├── componentes/
│           │   └── validadores/
│           ├── funcionalidades/
│           │   ├── inicio/
│           │   ├── biblioteca/
│           │   │   ├── paginas/
│           │   │   ├── componentes/
│           │   │   ├── datos/
│           │   │   └── modelos/
│           │   ├── catalogo/
│           │   ├── lectura/
│           │   └── ajustes/
│           ├── navegacion/
│           ├── app.config.ts
│           └── app.routes.ts
└── docs/
    ├── PLAN_IMPLEMENTACION_NIVI_LECTURA.md
    ├── contrato-api.yaml
    ├── arquitectura.md
    ├── decisiones/
    ├── instalacion-android.md
    ├── pruebas-manuales.md
    └── evidencias/
```

El árbol muestra el destino, no obliga a crear carpetas vacías. Renombrar paquetes y actualizar imports de forma atómica dentro del PR correspondiente. No mantener dos estructuras equivalentes en español e inglés.

### 6.1. Backend: dirección de dependencias

```text
HTTP → casos de uso → dominio
          ↓ puertos de salida
          ↑ implementaciones
    JPA / Open Library / reloj
```

- El dominio no importa Spring, JPA, Jackson ni DTO HTTP.
- Aplicación coordina operaciones mediante puertos; recibe y devuelve modelos propios.
- Controladores convierten HTTP a entradas de aplicación; no contienen reglas de progreso.
- Entidades JPA y respuestas externas no se devuelven directamente al cliente.
- Persistencia implementa repositorios definidos por aplicación.
- El adaptador de catálogo encapsula URLs, respuestas incompletas, tiempos de espera y límites externos.
- Configuración conecta implementaciones; las transacciones se delimitan mediante una envoltura de infraestructura alrededor de los casos de uso que escriben.
- Registro de avance y actualización del libro son una única transacción.
- Una única aplicación desplegable. La seguridad HTTP vive en infraestructura.

Puertos mínimos: `RepositorioLibros`, `RepositorioRegistrosLectura`, `CatalogoLibros` y `Reloj`. Crear interfaces de entrada por operación cuando aporten un límite real; evitar capas que solo delegan sin función.

### 6.2. Frontend

- Componentes standalone y rutas con carga diferida por funcionalidad.
- Formularios reactivos tipados; límites iguales a los del contrato.
- Servicios de datos para HTTP y mapeo; componentes para interacción y presentación.
- Estado local con signals y RxJS cuando corresponda. Sin incorporar una librería global de estado para este alcance.
- Una fachada por funcionalidad solo si coordina varias fuentes u operaciones; no una fachada por componente por obligación.
- Interfaces reemplazables para escáner y almacenamiento; implementación web/manual y nativa separadas.
- Limpiar suscripciones, cancelar búsquedas obsoletas y actualizar vistas conservadas por Ionic.
- Sin acceso directo al almacenamiento desde las páginas ni llamadas HTTP dispersas en plantillas.
- Evitar `any`, HTML externo sin sanitizar, mensajes técnicos al usuario y lógica de negocio duplicada.

## 7. Modelo de datos y reglas de negocio

### 7.1. Libro de biblioteca

| Campo | Regla |
| --- | --- |
| `id` | UUID generado por servidor |
| `titulo` | Obligatorio, recortado, de 1 a 255 caracteres |
| `autores` | Lista de 0 a 10 nombres; cada nombre de 1 a 150 caracteres |
| `isbn` | Opcional; ISBN normalizado y válido de 10 o 13 dígitos |
| `idEdicionExterna` | Opcional; identificador de edición, no confundir con obra |
| `idObraExterna` | Opcional; permite relacionar resultados de catálogo |
| `urlPortada` | Opcional; HTTPS y origen permitido; no descargar URLs arbitrarias en servidor |
| `totalPaginas` | Opcional; entero entre 1 y 100000 |
| `paginaActual` | Inicialmente 0; entero no negativo |
| `estado` | Uno de los cuatro estados definidos |
| `origen` | `MANUAL` o `OPEN_LIBRARY` |
| `version` | Entero para control de modificaciones concurrentes |
| `creadoEn`, `actualizadoEn`, `terminadoEn` | Instantes del servidor; último opcional |

No exigir autor, portada o páginas cuando no existan en el catálogo. No inventar datos. El usuario puede completar o corregir metadatos locales sin modificar Open Library.

La edición escaneada debe conservar su ISBN. En resultados de búsqueda por título puede existir solo una obra: no asignarle el ISBN o las páginas de una edición arbitraria. Permitir guardar datos incompletos o consultar una edición explícita.

### 7.2. Registro de lectura

| Campo | Regla |
| --- | --- |
| `id` | UUID generado por servidor |
| `libroId` | Referencia a un libro existente |
| `paginaAnterior` | Capturada por servidor antes del avance |
| `paginaActual` | Nueva posición confirmada |
| `nota` | Opcional; hasta 2000 caracteres |
| `creadoEn` | Instante del servidor |
| `idOperacion` | UUID de cliente para reconocer reintentos de creación |

Las notas son texto plano. El historial se muestra por fecha descendente y con desempate estable por identificador. En esta versión los registros son inmutables: una corrección se realiza mediante otro registro.

### 7.3. Reglas explícitas

1. Un libro pendiente comienza en página 0. «Empezar» lo cambia a `LEYENDO`.
2. Se puede pausar una lectura y retomarla conservando el progreso.
3. Registrar un avance se admite en `LEYENDO`; desde pendiente o pausado, la interfaz ofrece iniciar/retomar antes.
4. La página no puede exceder el total conocido. Sin total se muestra «Página N», sin porcentaje.
5. Se permite registrar una página menor como corrección, tras confirmación de la interfaz. El historial anterior permanece.
6. Si se alcanza el total conocido, se marca `TERMINADO` y se registra la fecha en la misma transacción.
7. Se puede marcar terminado sin total conocido, o antes de la última página si el usuario confirma. No se falsifica un 100 % numérico cuando las páginas no coinciden.
8. Reabrir un libro terminado lo pasa a `LEYENDO` y limpia `terminadoEn`; conserva registros y posición.
9. Volver a marcar terminado un libro ya terminado no cambia su fecha innecesariamente.
10. Corregir el total de páginas por debajo de la posición actual se rechaza; primero se corrige la posición. Editar metadatos no cambia automáticamente el estado.
11. Un ISBN identifica una edición. Para evitar duplicados se normaliza ISBN-10 a su equivalente ISBN-13 cuando sea posible y se aplica una restricción única sobre la clave canónica no nula.
12. Si falta ISBN, un mismo identificador de edición externa no se agrega dos veces. Coincidencias de título/autor solo generan una advertencia, no un bloqueo rígido.
13. Cada alta de libro y registro recibe `idOperacion`. Repetir la misma operación con el mismo contenido devuelve el resultado original; con contenido diferente devuelve conflicto. Verificar esta clave antes del control de versión para resolver un reintento ya aplicado.
14. El registro recibe `versionLibro`. Una escritura basada en una versión vieja devuelve 409; no sobrescribe cambios silenciosamente. Responder con la nueva versión y el libro actualizado.
15. Eliminar un libro solicita confirmación y elimina sus registros en una transacción. Una lectura eliminada no reaparece por usar una copia local antigua.
16. Fechas de almacenamiento en UTC; presentación según zona del dispositivo. El cliente no fija la fecha oficial del avance.

## 8. Contrato REST: cerrado en PR 1

Prefijo único: `/api/v1`. El backend atiende ese prefijo y el proxy lo conserva. Actualizar configuración e interceptor para evitar duplicaciones y descartar la regla anterior que retiraba `/api`.

| Método y ruta | Uso | Respuesta principal |
| --- | --- | --- |
| `POST /api/v1/acceso` | Obtener sesión de cuenta configurada | 200, token y vencimiento |
| `GET /api/v1/catalogo/busqueda?q=...&pagina=1&tamano=20` | Buscar por título/autor | 200, resultados paginados |
| `GET /api/v1/catalogo/isbn/{isbn}` | Identificar edición | 200 o 404 si no existe |
| `GET /api/v1/libros?estado=LEYENDO&q=...&pagina=1&tamano=20` | Biblioteca | 200, colección paginada |
| `POST /api/v1/libros` | Guardar libro confirmado/manual | 201 y cabecera `Location`; 200 en repetición idéntica |
| `GET /api/v1/libros/{id}` | Detalle y último registro | 200 o 404 |
| `PUT /api/v1/libros/{id}/metadatos` | Reemplazar campos editables con versión | 200 |
| `PUT /api/v1/libros/{id}/estado` | Cambiar estado con versión | 200 |
| `DELETE /api/v1/libros/{id}?version=...` | Eliminar libro e historial | 204 |
| `GET /api/v1/libros/{id}/registros?pagina=1&tamano=20` | Historial | 200 |
| `POST /api/v1/libros/{id}/registros` | Registrar avance atómico | 201; 200 en repetición idéntica |
| `GET /api/v1/resumen` | Conteos y hasta tres lecturas activas | 200 |

El detalle incluye el último registro para evitar una petición adicional al retomar. El resumen no devuelve bibliotecas completas ni calcula conteos cargando todas las entidades.

Convención de paginación propia: página inicial 1, tamaño predeterminado 20 y máximo 50. Respuesta: `elementos`, `pagina`, `tamano`, `totalElementos` y `totalPaginas`. Si el catálogo solo permite un total aproximado, declararlo con `totalEstimado` y usar `haySiguiente` sin afirmar exactitud.

Ejemplo de registro:

```json
{
  "idOperacion": "9425c038-255b-4db0-a4e6-3af4a334f26a",
  "versionLibro": 3,
  "paginaActual": 94,
  "nota": "Apareció la hermana de Martín."
}
```

Formato uniforme de error:

```json
{
  "codigo": "PAGINA_SUPERA_TOTAL",
  "mensaje": "La página actual no puede superar el total del libro.",
  "campos": { "paginaActual": "Ingresá una página entre 0 y 240." },
  "idSolicitud": "identificador-de-diagnostico"
}
```

- 400: entrada inválida, ISBN incorrecto o transición no admitida.
- 401: falta de sesión, credenciales incorrectas o token vencido.
- 404: libro o ISBN inexistente. Búsqueda sin coincidencias devuelve 200 con lista vacía.
- 409: duplicado o conflicto de versión/operación; códigos de error diferenciados.
- 429: límite propio de peticiones; incluir espera cuando corresponda.
- 503: catálogo externo temporalmente no disponible o limitado.
- 504: vencimiento del tiempo de espera externo.
- 500: error interno controlado, sin detalles de base ni trazas al cliente.

Documentar en `docs/contrato-api.yaml` todos los esquemas, límites, enums, seguridad, respuestas, ejemplos de alta manual/importada y cambios de estado. Servir o enlazar la documentación desde el README. El archivo debe validarse automáticamente en PR 1.

## 9. Integración Open Library y escaneo

### 9.1. Responsabilidad de cada parte

```text
Cámara → escáner → ISBN validado → API propia → Open Library
                                             ↓
Biblioteca ← confirmación del usuario ← datos normalizados
```

La cámara obtiene un identificador; la consulta HTTP consume la API. El plugin no obtiene por sí mismo título, portada ni páginas.

- Usar Search API para consultas de catálogo y `/isbn/{isbn}.json` para edición identificada.
- Evitar iniciar una integración nueva con `/api/books`: su documentación lo presenta como legado.
- Resolver autores y portada solo cuando sea necesario, con caché y sin una petición por fila de resultados.
- Mostrar atribución y enlace a Open Library; no prometer disponibilidad de todos los títulos o campos.
- El servidor solo accede al proveedor configurado, nunca a una URL arbitraria enviada por el cliente.
- Guardar una copia confirmada de metadatos en nuestra base; consultar un libro guardado no depende de volver a consultar el catálogo.

### 9.2. Resiliencia del catálogo

- Configurar tiempo de conexión y lectura; presupuesto total de consulta de hasta 10 segundos.
- Reintentar como máximo una vez un GET ante un fallo transitorio, dentro de ese presupuesto y respetando la espera del proveedor. No reintentar validaciones ni 404.
- Aplicar caché acotada por consulta/ISBN, con expiración y límite de entradas. Caché breve también para resultados inexistentes.
- Limitar llamadas externas según la política vigente del proveedor, usar identificación del servidor y evitar consultas masivas. No fijar en código una cuota supuesta e inmutable.
- En frontend, buscar con botón explícito en la primera versión; no disparar una llamada por tecla. Cancelar la búsqueda anterior si se inicia otra.
- Ante caída externa, biblioteca propia y avances siguen funcionando si el backend está disponible.

### 9.3. Validación del escaneo

- Seleccionar un plugin compatible con Capacitor 8 y probarlo en Android antes de dar por cerrado PR 4.
- Leer EAN-13 y aceptar como ISBN de libro los prefijos 978/979 con dígito de control correcto. Un EAN cualquiera no es necesariamente un libro.
- Entrada manual: aceptar guiones/espacios, normalizar y validar ISBN-10, incluyendo `X` final, o ISBN-13.
- Confirmar siempre el resultado y permitir corregirlo; un código válido no garantiza presencia en el catálogo.
- Separar cancelación, permiso denegado, formato inválido, cámara no disponible, libro inexistente y error de red.
- Desactivar escaneos simultáneos y evitar dobles altas por callbacks repetidos.
- En navegador sin capacidad comprobada, mostrar ISBN manual y búsqueda por título. No prometer soporte web de cámara sin probarlo.
- No guardar imágenes de cámara ni solicitar acceso al iniciar la aplicación.

Referencias oficiales: [búsqueda](https://openlibrary.org/dev/docs/api/search), [consulta por ISBN y diferencias entre obra/edición](https://openlibrary.org/dev/docs/api/books), [política de APIs](https://openlibrary.org/developers/api), [escáner Capacitor](https://capacitorjs.com/docs/apis/barcode-scanner).

## 10. PR 1: backend completo con arquitectura limpia

Rama propuesta: `codex/lectura-01-backend`.

Título: **Implementar API de biblioteca y seguimiento de lectura con arquitectura limpia**.

### Objetivo

Entregar todo el backend que usarán las cuatro etapas de frontend, ejecutable sin el cliente y probado sin depender de Open Library en vivo.

### Tareas

- [ ] Inventariar infraestructura reutilizable y guardar referencia recuperable del estado previo.
- [ ] Crear dominio, reglas, casos de uso y puertos definidos en este documento.
- [ ] Retirar endpoints y componentes exclusivos de proyectos/tareas; conservar solo infraestructura útil.
- [ ] Implementar todos los endpoints, incluido catálogo, resumen, historial, acceso y errores.
- [ ] Implementar DTO HTTP, modelos de aplicación y mapeadores explícitos.
- [ ] Implementar persistencia JPA con índices para filtros, claves canónicas de edición y orden del historial.
- [ ] Implementar idempotencia de altas y avances, control de versión y transacciones.
- [ ] Crear migraciones versionadas, por ejemplo con Flyway; usar validación del esquema en vez de actualizaciones automáticas en ejecución.
- [ ] Usar una base H2 persistente nueva para desarrollo y H2 temporal para pruebas. Aislar SQL específico para poder migrar posteriormente a PostgreSQL.
- [ ] Documentar respaldo y recuperación. No ejecutar migraciones destructivas sobre la base anterior.
- [ ] Implementar adaptador Open Library, caché, límites, identificación y tiempos de espera.
- [ ] Mantener autenticación de cuenta única con contraseña segura y JWT de duración documentada. Fallar al iniciar si faltan secretos.
- [ ] Restringir CORS a orígenes configurados; todas las rutas de negocio requieren sesión.
- [ ] No registrar contraseñas, tokens ni notas completas; incluir identificador de solicitud en diagnóstico.
- [ ] Publicar contrato OpenAPI y ejemplos de solicitudes.
- [ ] Añadir datos de prueba únicamente para perfil de desarrollo, sin credenciales públicas predeterminadas.
- [ ] Configurar CI backend y documentación de instalación.

### Pruebas relevantes

- Dominio: límites de página, progreso sin total, estados, correcciones y fecha de finalización.
- Casos de uso: alta duplicada, ISBN equivalente 10/13, idempotencia y operación con contenido diferente.
- Persistencia: restricciones únicas, conflicto de versión y atomicidad de registro + actualización.
- HTTP: validación, códigos de estado, acceso rechazado y errores uniformes.
- Catálogo simulado: respuesta parcial, 404, timeout, límite externo, portada ausente y obra sin edición.
- Resumen y paginación: resultados estables, límites y conteos coherentes.
- Migraciones: base vacía y reapertura de una base creada por las mismas migraciones.

### Criterios de aceptación

- [ ] El backend compila y sus pruebas pasan con el Maven Wrapper.
- [ ] Puede demostrarse por HTTP el recorrido crear libro → empezar → registrar → retomar → terminar → eliminar.
- [ ] El dominio y aplicación no dependen de frameworks o del esquema externo.
- [ ] Ningún dato real del sistema anterior se pierde.
- [ ] El contrato contiene todo lo necesario para PR 2 a 5 y está validado.
- [ ] Existe un catálogo simulado reproducible para pruebas, separado de la configuración normal.

### Fuera de este PR

Pantallas, estilos, escáner, configuración nativa y almacenamiento del dispositivo.

## 11. PR 2: base del frontend y navegación Ionic

Rama propuesta: `codex/lectura-02-base-app`.

Título: **Preparar NIVI Lectura con navegación Ionic, acceso y estructura por funcionalidades**.

### Tareas

- [ ] Conservar Angular standalone, Ionic 9 y Capacitor 8 con versiones compatibles fijadas en lockfile.
- [ ] Usar Node 24 para este repositorio y documentar que la guía admite Node 22 o superior. Conservar Java 21.
- [ ] Organizar carpetas y nuevos identificadores en español.
- [ ] Crear cuatro tabs visibles y rutas de detalle y acceso.
- [ ] Integrar componentes Ionic reales; no limitarse a envolver páginas Bootstrap sin navegación propia.
- [ ] Retirar rutas, servicios y textos del dominio anterior. Reducir estilos globales Bootstrap si interfieren con Ionic.
- [ ] Conectar acceso, guardas, cierre y vencimiento con el contrato de PR 1.
- [ ] Mantener el token en memoria y, si se conserva la restauración actual, en `sessionStorage`; nunca en Preferences ni en logs. El reinicio completo de la app puede requerir otro acceso.
- [ ] Enviar el token exclusivamente al origen y prefijo de API propia configurados.
- [ ] Configurar API de desarrollo, producción y Android con una única convención `/api/v1`.
- [ ] Definir paleta, tipografía local/sistema, espacios y componentes de carga, vacío, error y portada ausente.
- [ ] Crear servicio de capacidades; no pedir permisos de cámara todavía.
- [ ] Corregir `.gitignore` y desrastrear exclusivamente archivos generados ya versionados tras revisar el listado.
- [ ] Preparar scripts para crear/sincronizar Android reproduciblemente desde un clon limpio.
- [ ] Actualizar CI frontend: instalación reproducible, comprobación de formato/lint configurada, tests y build.

### Criterios de aceptación

- [ ] Las cuatro pantallas principales se recorren desde tabs en móvil y escritorio.
- [ ] Acceso y vencimiento funcionan contra el backend real.
- [ ] Recargar una ruta interna funciona con la configuración de servidor documentada.
- [ ] Volver a una página no duplica peticiones ni suscripciones.
- [ ] No aparecen módulos antiguos ni funcionalidades futuras como si estuvieran disponibles.
- [ ] `android/` e `ios/` no quedan rastreados; su regeneración no requiere recuperar archivos secretos o ignorados.
- [ ] Instalación, pruebas existentes pertinentes y build pasan.

## 12. PR 3: catálogo, biblioteca y seguimiento de lectura

Rama propuesta: `codex/lectura-03-biblioteca`.

Título: **Implementar biblioteca, búsqueda de libros y registros de lectura**.

### Tareas

- [ ] Implementar búsqueda por título/autor y consulta manual por ISBN contra la API propia.
- [ ] Mostrar resultados y confirmar datos antes de guardar; conservar selección ante un error.
- [ ] Implementar formulario reactivo tipado de alta/edición y alternativa manual.
- [ ] Implementar biblioteca paginada con búsqueda y filtro por estado.
- [ ] Implementar detalle, edición, borrado confirmado e historial paginado.
- [ ] Implementar formulario reactivo de avance en `ion-modal` con página y nota.
- [ ] Implementar cambios de estado, corrección de página y reapertura de terminado.
- [ ] Implementar Inicio con resumen y acción continuar.
- [ ] Mostrar «Antes de seguir…» con última nota, fecha y página; si no hay nota, mostrar la posición sin inventar resumen.
- [ ] Integrar `ion-refresher` con finalización garantizada incluso ante error.
- [ ] Mantener `idOperacion` y contenido durante reintentos; bloquear doble envío. Ante 409 de versión, recargar y permitir revisar antes de reenviar.
- [ ] Actualizar coherentemente Inicio, Biblioteca y Detalle después de una escritura confirmada.
- [ ] Mostrar errores por campo, carga, vacíos, sesión vencida y portadas alternativas.

### Pruebas frontend mínimas significativas

1. Servicio de catálogo: distingue lista vacía, datos incompletos y error HTTP.
2. Formulario de avance: rechaza negativos, decimales y exceso de páginas; admite posición válida sin total conocido.
3. Flujo de reintento: conserva clave de operación y no crea un segundo registro.
4. Vista de detalle: muestra última nota real y progreso correcto sin total conocido.
5. Servicio de acceso: no adjunta token a un origen ajeno y limpia sesión vencida.

Estas pruebas superan el mínimo de dos de la guía y verifican comportamiento, no detalles internos triviales.

### Criterios de aceptación

- [ ] Todo el recorrido de lectura funciona sin cámara, con búsqueda o carga manual.
- [ ] Las cuatro pantallas contienen funcionalidades reales.
- [ ] La API externa se consume a través del backend y sus fallos no impiden consultar libros ya guardados.
- [ ] El modal y el refresco cumplen la interacción avanzada solicitada.
- [ ] Formularios, límites y mensajes coinciden con el contrato de PR 1.
- [ ] Tests y build pasan; se adjuntan capturas móviles y evidencia del flujo.

## 13. PR 4: escaneo ISBN y aplicación Android

Rama propuesta: `codex/lectura-04-escaner-android`.

Título: **Agregar identificación de libros con cámara y validar la app Android**.

### Tareas

- [ ] Integrar escáner detrás de `EscanerIsbn`, con implementación nativa y alternativa manual.
- [ ] Fijar la versión compatible del plugin y registrar sus requisitos concretos.
- [ ] Verificar SDK mínimo, SDK de compilación, JDK y Gradle. La documentación actual del plugin exige como mínimo Android API 26; no confundirlo con targetSdk.
- [ ] Automatizar configuración nativa necesaria porque `android/` no se versiona.
- [ ] Solicitar permiso únicamente al tocar Escanear.
- [ ] Validar EAN/ISBN, normalizarlo y consultar el endpoint ya entregado en PR 1.
- [ ] Confirmar edición antes de agregar; resolver duplicado mostrando el libro existente.
- [ ] Manejar cancelación, denegación, lectura inválida, cámara ausente, red caída y libro no encontrado.
- [ ] Mantener alternativas de título e ISBN manual en todos los dispositivos.
- [ ] Comprobar botón Atrás, cierre del escáner, modal y reanudación tras ir a Ajustes de Android.
- [ ] Configurar URL de API alcanzable desde teléfono/emulador; `localhost` del teléfono no es la PC.
- [ ] Mantener HTTPS fuera de desarrollo; HTTP local, si se usa, solo en configuración debug explícita y reproducible.
- [ ] Generar APK debug e instalarlo en dispositivo o emulador; para aceptar el escaneo, probar además con cámara y libro físico en un teléfono.

### Criterios de aceptación

- [ ] Desde un clon limpio se genera Android, se sincroniza y compila sin ajustes manuales ocultos.
- [ ] Un libro físico con ISBN presente en el catálogo se escanea y agrega correctamente.
- [ ] Un código de otro producto no se guarda como ISBN de libro.
- [ ] Permiso denegado y cancelación dejan la aplicación utilizable.
- [ ] Se puede completar el mismo flujo mediante ISBN manual en navegador.
- [ ] Hay pruebas unitarias del adaptador de escaneo simulado y evidencia manual del plugin real.
- [ ] Si no hay teléfono disponible, se declara pendiente la aceptación de cámara; un build aprobado no la sustituye.

## 14. PR 5: persistencia local, calidad y entrega

Rama propuesta: `codex/lectura-05-entrega`.

Título: **Completar consulta offline, documentación y validación final de NIVI Lectura**.

### Tareas

- [ ] Guardar preferencias de apariencia y habilitación de copia local mediante adaptador de almacenamiento.
- [ ] Implementar copia local versionada y acotada: hasta 100 libros recientes, sus metadatos y último registro; historial completo y búsqueda global requieren conexión.
- [ ] Usar almacenamiento apropiado para objetos de copia, por ejemplo IndexedDB; reservar Preferences para ajustes pequeños. No almacenar una biblioteca creciente como un único valor de Preferences.
- [ ] Manejar cuota, corrupción o indisponibilidad del almacenamiento sin romper la consulta en línea.
- [ ] Mostrar fecha de actualización, límite de cobertura y estado «Copia guardada».
- [ ] Deshabilitar altas, edición y avances cuando solo hay copia disponible; no prometer sincronización.
- [ ] Actualizar/inutilizar entradas después de cada mutación confirmada para no mostrar libros eliminados.
- [ ] Activar la copia de datos personales solo por elección del usuario; permitir borrarla y limpiarla al cerrar sesión o detectar sesión inválida.
- [ ] Permitir consulta offline únicamente con sesión previamente válida en ese arranque; no almacenar credenciales para desbloquear en frío. Documentar esta limitación.
- [ ] Ante fallo de red conservar copia; ante 401 no usarla para evitar el cierre de sesión.
- [ ] No prometer arranque web sin conexión: un navegador sin recursos cacheados requiere un service worker, que queda fuera del alcance. Probar consulta offline en APK y en pestaña ya cargada.
- [ ] Completar icono y splash propios con recursos fuente y generación reproducible, si se mantiene este opcional.
- [ ] Revisar accesibilidad, modo oscuro, teclado, textos y tamaños de pantalla.
- [ ] Revisar dependencias y vulnerabilidades de las versiones elegidas; resolver las explotables en el alcance o documentar impacto, mitigación y seguimiento.
- [ ] Ejecutar comprobaciones completas desde un clon limpio.
- [ ] Completar README, guía Android, decisiones, limitaciones, evidencias y guion de defensa.
- [ ] Actualizar `docs/ESTADO_ACTUAL.md` para que describa la nueva app y no la etapa anterior.
- [ ] Publicar APK debug como artefacto de entrega o de una release, no dentro del historial del repositorio.

### Criterios de aceptación

- [ ] Sin red, una app ya abierta permite consultar únicamente datos previamente guardados y lo informa.
- [ ] No se pierden formularios por errores de red ni se muestran escrituras offline como realizadas.
- [ ] Al salir se eliminan sesión y copia personal.
- [ ] Una persona distinta instala y ejecuta el proyecto siguiendo solo el README.
- [ ] Todos los requisitos obligatorios de la matriz tienen evidencia.
- [ ] Los opcionales no completados están declarados expresamente.
- [ ] Pruebas, build web, generación Android y recorrido manual final aprobados.

Este PR no incorpora nuevas reglas de backend. Si se detecta un defecto bloqueante de contrato antes de integrar PR 1, corregirlo allí. Si aparece después, registrarlo y corregirlo con transparencia: no ocultar cambios de servidor como trabajo de frontend para sostener artificialmente la distribución.

## 15. Git y revisión de los cinco PR

| Orden | Entregable | Dependencia | Cambios principales |
| --- | --- | --- | --- |
| 1 | Backend completo | Base existente o repo vacío | `backend/`, contrato, CI backend y documentación |
| 2 | Base de app | PR 1 integrado | Estructura frontend, tabs, acceso y generación nativa |
| 3 | Biblioteca funcional | PR 2 integrado | Catálogo, formularios, lectura, resumen y tests |
| 4 | Cámara y Android | PR 3 integrado | Escáner, capacidades y validación nativa |
| 5 | Calidad y entrega | PR 4 integrado | Copia local, apariencia, documentación y aceptación |

### Flujo de trabajo

1. Crear cada rama desde la rama principal actualizada después de integrar la anterior.
2. Mantener commits enfocados y mensajes en español; excluir formateos masivos ajenos al cambio.
3. Subir la rama a Git y abrir el PR con problema, comportamiento resultante, pruebas, capturas y limitaciones.
4. Exigir CI aprobado y revisar el diff antes de integrar. Con dos integrantes, revisar el trabajo del compañero.
5. Integrar manteniendo una referencia clara de cada PR; eliminar ramas remotas terminadas si corresponde.
6. No empujar directo a principal ni versionar dependencias, bases personales, tokens, claves o compilados.

Plantilla de descripción:

```markdown
## Problema y resultado
Qué necesidad cubre y qué puede hacer el usuario después del cambio.

## Alcance
Componentes relevantes y decisiones necesarias para revisarlo.

## Validación
Comandos ejecutados, resultados y recorridos manuales.

## Evidencia
Capturas, video breve o solicitudes HTTP según corresponda.

## Limitaciones
Pendientes reales, riesgos conocidos y cómo reproducirlos.
```

Las ramas y los PR de este documento son propuestas. Este archivo no implica que ya se hayan creado, subido o integrado.

## 16. Generación nativa y reglas de Git

La guía solicita ignorar los proyectos generados `android/` e `ios/`. Para cumplirlo sin perder configuración:

1. Versionar `capacitor.config.ts`, dependencias, lockfile, scripts y recursos fuente.
2. Crear Android mediante un comando idempotente que compruebe si existe antes de ejecutar `cap add android`.
3. Aplicar los ajustes necesarios de manifest, SDK, recursos e HTTP debug mediante scripts explícitos. Evitar reemplazos de texto frágiles y duplicados en cada ejecución.
4. Ejecutar build web y `cap sync android`.
5. Compilar con Gradle Wrapper generado; documentar versiones y requisitos de Android Studio/SDK.
6. Probar este recorrido en una copia de trabajo limpia, sin depender del `android/` local previo.

Patrones mínimos adicionales de `.gitignore`:

```gitignore
**/node_modules/
**/www/
**/dist/
**/android/
**/ios/
**/.angular/
**/coverage/
**/target/
**/build/
**/.gradle/
**/local.properties
**/*.apk
**/*.aab
**/*.jks
**/*.keystore
**/*.mv.db
**/*.trace.db
**/.env
**/.env.*
!**/.env.example
```

Agregar un patrón no deja de rastrear archivos existentes. Revisar `git ls-files` y retirar del índice únicamente las carpetas generadas identificadas, preservando las copias de trabajo. No usar limpiezas recursivas para esta operación.

## 17. Configuración, ejecución y despliegue

### Entorno esperado

- Node.js 24 y npm de la versión documentada por el proyecto.
- Java 21 y Maven Wrapper incluido.
- Android Studio y SDK compatibles con las versiones fijadas de Capacitor, plugin y Gradle.
- Cuenta de servidor y clave JWT suministradas por entorno.
- Conexión a Internet para catálogo; no necesaria para las pruebas automatizadas que lo simulan.

### Variables del servidor

- `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_JWT_SECRET`: conservar contrato de configuración actual o documentar su equivalente en PR 1.
- `CORS_ALLOWED_ORIGINS`: lista explícita de orígenes web/nativos.
- Configuración de conexión a la nueva base de lectura, fuera del repositorio.
- Configuración de identificación, timeout, caché y límite para Open Library.

Un `.env.example` describe las variables; no asumir que Spring carga `.env` automáticamente. Documentar cómo exportarlas en PowerShell y en el entorno de despliegue.

### Variables públicas del cliente

- URL de API propia por entorno o archivo de configuración pública en ejecución.
- `NIVI_API_URL` para preparar el paquete Android, conservando o ajustando el script existente.
- `NIVI_ALLOW_HTTP` solo si se mantiene el mecanismo de desarrollo debug actual.

El frontend no contiene secretos. Producción usa HTTPS. Si se sirve bajo un proxy, `/api/v1` se conserva hasta el backend y las rutas de Angular tienen fallback a `index.html`, sin convertir errores de API en HTML.

### Comandos de aceptación previstos

```powershell
# Desde la raíz, cliente
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build

# Servidor: desde backend/
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run

# Cliente en desarrollo: desde la raíz
npm --prefix frontend start

# Android: desde la raíz, con NIVI_API_URL configurada
npm --prefix frontend run android:preparar
npm --prefix frontend run android:build
```

`lint` y `android:preparar` son scripts a incorporar en PR 2; no están garantizados en la base inspeccionada. `android:preparar` debe generar el proyecto si falta, aplicar ajustes y sincronizar de forma repetible. Cada script debe fallar con un mensaje claro si falta configuración.

CI ejecuta backend, frontend y validación del contrato desde PR 1/2 según estén disponibles. La generación nativa se comprueba desde PR 4 mediante un job Android si el entorno lo permite; documentar la validación manual cuando no exista ese runner. Ningún job de pruebas usa credenciales reales ni exige Open Library disponible.

## 18. Plan de pruebas y evidencia

| Escenario | Resultado esperado | Nivel |
| --- | --- | --- |
| Alta manual válida | Libro pendiente guardado | Integración + recorrido |
| ISBN inválido | Error antes de consultar proveedor | Unidad + HTTP |
| ISBN-10 y su ISBN-13 equivalente | Una sola edición guardada | Integración |
| Resultado sin portada, autor o páginas | Confirmación usable y campos opcionales | Unidad + recorrido |
| Obra sin edición concreta | No inventar ISBN o total | Adaptador + recorrido |
| Catálogo sin coincidencias | Lista vacía o 404 ISBN según contrato | HTTP + interfaz |
| Timeout o límite externo | Error temporal y alta manual disponible | Adaptador + interfaz |
| Página negativa, decimal o mayor al total | Registro rechazado | Unidad + integración |
| Página menor como corrección | Confirmación y nuevo registro preservando historial | Recorrido |
| Última página | Finalización y fecha atómicas | Integración |
| Libro sin total | Página visible, sin porcentaje ficticio | Unidad + interfaz |
| Doble envío o respuesta perdida | Un solo registro tras reintentar | Integración |
| Dos cambios desde misma versión | Uno confirma y otro recibe 409 | Integración |
| Sesión vencida | Se limpia acceso y se redirige sin filtrar datos | Integración + interfaz |
| Token ante URL externa | No se envía | Unidad |
| Escaneo cancelado o permiso denegado | Se puede seguir por alternativa manual | Android real |
| Código de producto no ISBN | No se importa como libro | Unidad + Android |
| Eliminación confirmada | Libro e historial ausentes en servidor y copia | Integración + recorrido |
| Red desconectada después de guardar copia | Consulta marcada como copia y escrituras bloqueadas | Android + interfaz |
| Almacenamiento corrupto o lleno | Aviso sin caída de la app en línea | Unidad |
| Tabs, retorno y botón Atrás | Datos actualizados y navegación predecible | Android + navegador |
| Clonado limpio | Instalación, pruebas, build y Android reproducibles | Aceptación |

Evidencias por PR: resultados resumidos, capturas pertinentes y pasos reproducibles en `docs/evidencias/`. No guardar tokens, notas personales reales ni logs sin revisar. Una captura de pantalla no reemplaza una prueba de lógica; un test simulado no certifica la cámara real.

## 19. README final y documentación de entrega

El README de raíz debe contener, en este orden:

1. Nombre, descripción breve y problema resuelto.
2. Capturas o GIF breve con imágenes accesibles desde el repositorio.
3. Funcionalidades y pantallas implementadas; separar opcionales pendientes.
4. Tecnologías y versiones comprobadas.
5. Requisitos de PC, Android y conexión.
6. Instalación desde un clon limpio, con directorios explícitos.
7. Variables de entorno y ejemplos sin secretos.
8. Inicio del backend y del frontend en dos terminales.
9. Generación, sincronización y ejecución Android con scripts versionados.
10. Pruebas, comprobaciones y compilación.
11. Arquitectura, dependencia entre capas y enlace al contrato API.
12. Flujo del escaneo ISBN y papel de Open Library.
13. Decisiones de datos, cuenta única, copia local y sus límites.
14. Limitaciones conocidas: catálogo incompleto, cámara no web si aplica, sin lectura de texto completo y sin escrituras offline.
15. Problemas frecuentes: API inaccesible desde celular, CORS, permisos, sesión vencida y libro inexistente.
16. Enlace al APK/artefacto si se entrega y distinción entre debug y release.
17. Autores y comisión, atribuciones de fuentes y recursos.

Registrar decisiones breves sobre: adaptación frente a proyecto nuevo, arquitectura limpia, obra frente a edición, generación de Android ignorado, cuenta única y consulta offline sin escrituras.

## 20. Riesgos y control de alcance

| Riesgo | Prevención o respuesta |
| --- | --- |
| Rehacer demasiado de NIVI | Reutilizar infraestructura; reemplazar únicamente el dominio que cambió |
| Backend incompleto que obliga a tocarlo en todos los PR | Cerrar contrato y probar recorrido completo en PR 1 |
| PR 1 demasiado grande | Commits separados por dominio, persistencia, catálogo, HTTP y pruebas, dentro del mismo PR |
| Portada, ISBN o páginas incorrectos | Confirmación humana y corrección local; distinguir obra/edición |
| Libro físico no presente en Open Library | Probar varios antes de la demo y conservar alta manual |
| Plugin incompatible o cámara sin probar | Verificación de versión e integración nativa real en PR 4 |
| Android ignorado pierde configuración | Automatizarla y probar regeneración limpia |
| Tokens/copia con datos personales | No guardar credenciales en copia; limpiar al salir; dispositivo personal de demo |
| Copia offline se convierte en sincronización compleja | Solo consulta de datos acotados, escrituras en línea |
| Multiusuario implícito | Explicitar biblioteca única; no publicar como servicio compartido |
| Páginas Ionic cacheadas muestran datos viejos | Actualización al entrar y después de mutaciones |
| Dependencias heredadas vulnerables | Revisión dirigida y actualizaciones compatibles antes de entregar |
| Falta de tiempo | Mantener búsqueda manual y lectura; recortar opcionales antes que obligaciones |

## 21. Escalabilidad posterior, sin implementarla ahora

- Multiusuario: introducir identidad y propietario en dominio, repositorios, restricciones, autorización y migraciones. Cambiar solo el login no alcanza.
- PostgreSQL: nuevo perfil y pruebas de migración contra la base real antes de declarar compatibilidad.
- Otro catálogo: implementar `CatalogoLibros` sin filtrar su JSON al dominio o al cliente.
- OCR de portada: nuevo mecanismo de obtención de candidatos, manteniendo confirmación y búsqueda manual.
- Escrituras offline: almacenamiento transaccional local, operaciones persistentes y estrategia explícita de conflictos. Requiere un proyecto posterior.
- Relecturas y varios ejemplares: separar obra, edición, ejemplar y ciclo de lectura cuando exista esa necesidad.
- Notificaciones o dictado: módulos independientes y permisos solicitados en contexto.

## 22. Guion de demo y cierre

### Demo de diez minutos

1. Un minuto: problema y propuesta de NIVI Lectura.
2. Dos minutos: escanear libro físico, consultar API y confirmar edición.
3. Dos minutos: iniciar lectura, registrar página y nota en modal.
4. Un minuto: volver y usar «Antes de seguir…».
5. Un minuto: biblioteca, filtros y actualización.
6. Un minuto: libro no encontrado o alta manual.
7. Un minuto: copia de consulta sin conexión, si está implementada.
8. Un minuto: arquitectura, pruebas y decisiones de alcance.

Preparar un ISBN comprobado, otro inexistente y datos ficticios. La demo principal consume la API real; las pruebas automatizadas usan respuestas simuladas. Si el proveedor está caído, explicar el fallo y mostrar la recuperación manual sin fingir una consulta real exitosa.

### Lista final de entrega

- [ ] Cinco PR integrados y enlazados en la evidencia de entrega.
- [ ] Backend completo concentrado en PR 1; frontend y app distribuidos en PR 2 a 5.
- [ ] Cuatro pantallas con tabs, formularios reactivos y REST con estados visibles.
- [ ] Componente avanzado Ionic funcionando.
- [ ] Al menos dos pruebas unitarias pertinentes y resto de verificaciones aprobadas.
- [ ] Escaneo Android aceptado o pendiente declarado sin afirmar que está probado.
- [ ] README reproducible, autores y comisión completos.
- [ ] Configuración nativa regenerable y carpetas generadas ignoradas.
- [ ] Ninguna clave, base personal, dependencia o compilado versionado.
- [ ] Estado actual y limitaciones coinciden con la aplicación entregada.
- [ ] Demo ensayada y referencia final de entrega identificada.

## 23. Fuentes de las decisiones

- Guía del profesor: documento local proporcionado por el usuario, dos páginas; requisitos de entrega y estructura resumidos en la sección 2.
- Repositorio inspeccionado: `README.md`, `docs/ESTADO_ACTUAL.md`, `frontend/package.json`, rutas, configuración de Capacitor, scripts Android, `.gitignore` y estructura Java. Esta inspección no incluyó ejecutar sus pruebas.
- [Documentación de Ionic Tabs](https://ionicframework.com/docs/api/tabs).
- [Formularios reactivos de Angular](https://angular.dev/guide/forms/reactive-forms).
- [API de búsqueda de Open Library](https://openlibrary.org/dev/docs/api/search).
- [Open Library: obras, ediciones e ISBN](https://openlibrary.org/dev/docs/api/books).
- [Política de uso de las APIs de Open Library](https://openlibrary.org/developers/api).
- [Plugin de escaneo de Capacitor, documentación v8 consultada](https://capacitorjs.com/docs/apis/barcode-scanner).

Las versiones concretas de dependencias, requisitos del plugin y política del proveedor deben comprobarse al ejecutar el plan. Los contratos y límites de producto aquí definidos son decisiones propuestas para NIVI, no requisitos adicionales atribuidos al profesor.
