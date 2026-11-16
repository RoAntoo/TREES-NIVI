# Evidencia local del PR 1

Fecha: **14 de noviembre de 2026**, America/Buenos_Aires.

Alcance: backend nuevo desde cero. No hay frontend ni prueba de cámara en esta etapa. El plan original se conserva sin modificar como referencia. No se usó Git ni se abrió un PR remoto.

## Entorno y comando

- Windows, PowerShell.
- Java 21.0.11, seleccionado mediante `JAVA_HOME`; el Java predeterminado de la máquina era 17.
- Maven 3.9.14, descargado y ejecutado mediante el Wrapper incluido.
- Spring Boot 3.5.16.
- H2 2.3.232; Hibernate 6.6.53.Final; Spring Framework 6.2.19.

Comando reproducible desde `backend/`:

```powershell
.\mvnw.cmd verify
```

En este entorno restringido se ubicaron la caché de dependencias y la distribución del Wrapper dentro de `.cache/` en la raíz, mediante `-Dmaven.repo.local` y `MAVEN_USER_HOME`. La descarga inicial requirió habilitar acceso a Maven Central. Esas rutas no son requisitos del proyecto ni se incorporan a su configuración normal.

Resultado final: **BUILD SUCCESS**, 51 pruebas, cero fallos, cero errores, cero omitidas. Se generó `backend/target/nivi-lectura-0.1.0-SNAPSHOT.jar`. Los XML de resultados se encuentran en `backend/target/surefire-reports/`, como archivos locales generados.

| Pruebas | Cantidad | Evidencia |
| --- | ---: | --- |
| `ArquitecturaPrueba` | 1 | Dominio/aplicación sin frameworks ni adaptadores y dominio sin dependencia de aplicación |
| `BibliotecaIntegracionPrueba` | 15 | HTTP real, acceso, DTO, errores, CORS, JWT vencido/audiencia/emisor, límites, JPA, unicidad, idempotencia, correcciones, resumen, paginación, borrado, concurrencia y rollback |
| `ConfiguracionPrueba` | 3 | Secretos, duración, proveedor/identificación/presupuesto y rechazo de comodines CORS |
| `ContratoPrueba` | 1 | OpenAPI válido, referencias resueltas, seguridad y las doce operaciones |
| `LibroPrueba` | 19 | Estados, límites, finalización, reapertura, progreso desconocido, correcciones, metadatos e ISBN |
| `AdaptadorOpenLibraryPrueba` | 11 | Servidor HTTP simulado: obra sin edición, respuesta parcial, autores, redirección, caché, ausencia, timeout, rate limit, retry y JSON inválido |
| `MigracionesPrueba` | 1 | Crear una base H2 de archivo vacía, cerrarla, reabrirla, validar migración y conservar datos |

## Prueba del artefacto ejecutable

Además de la suite, se ejecutó el JAR empaquetado en un puerto local temporal con H2 en memoria y credenciales efímeras de prueba. Se verificó:

1. Con contraseña y secreto débiles, el arranque termina con error de configuración. El diagnóstico no contiene los valores de esos secretos.
2. Con configuración válida, el JAR inicia correctamente.
3. `backend/scripts/probar-recorrido.ps1` obtiene sesión, crea un libro, repite el alta sin duplicarlo, inicia lectura, guarda un avance y repite la misma operación sin duplicar el registro.
4. Recupera la nota del detalle, comprueba el porcentaje, pausa y retoma, alcanza la última página y comprueba estado/fecha de finalización.
5. Consulta dos registros de historial y elimina el libro.
6. El proceso iniciado para la verificación se detiene al terminar.

Salida del script, sin tokens ni notas:

```text
Recorrido aprobado: alta, reintentos, inicio, avance, contexto, pausa, retorno, finalización, historial y eliminación.
```

El script también pasó el análisis de sintaxis de PowerShell. El Wrapper POSIX tiene finales LF y la CI lo invoca con `sh mvnw` para no depender de un permiso ejecutable.

## Observaciones y límites

La primera ejecución encontró una configuración CORS que no estaba conectada explícitamente al filtro de seguridad. Se corrigió y quedó cubierta con preflight permitido, origen ajeno rechazado y errores 429 que conservan las cabeceras CORS. La prueba de rollback se ajustó para esperar la excepción traducida por Spring; comprueba que no cambian versión, posición, estado, fecha ni operación persistida tras el fallo.

No se usó Open Library en vivo para aceptar pruebas automatizadas. La configuración normal apunta al proveedor real; la simulación solo existe en `src/test/`. La disponibilidad y los metadatos de un ISBN físico concreto se revisarán al integrar el frontend y la cámara.

La CI se entrega preparada pero no ejecutada remotamente. No se probó PostgreSQL ni Android. No existe una base previa que convertir ni datos anteriores que respaldar en este proyecto nuevo. Los procedimientos de respaldo y recuperación están documentados en `backend/README.md`.
