package ar.edu.nivi;

import ar.edu.nivi.aplicacion.modelo.Solicitudes.*;
import ar.edu.nivi.aplicacion.puerto.entrada.Biblioteca;
import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import ar.edu.nivi.dominio.modelo.*;
import ar.edu.nivi.infraestructura.salida.persistencia.AdaptadorRegistros;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.*;
import org.springframework.web.client.RestClient;
import java.util.*;
import java.time.Instant;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("seguro")
@AutoConfigureMockMvc @TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BibliotecaIntegracionPrueba {
    @DynamicPropertySource static void propiedades(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> "jdbc:h2:mem:biblioteca;DB_CLOSE_DELAY=-1");
        p.add("nivi.acceso.usuario", () -> "prueba"); p.add("nivi.acceso.contrasena", () -> "contrasena-solo-pruebas");
        p.add("nivi.acceso.secreto", () -> "secreto-exclusivo-de-pruebas-automatizadas-1234567890");
        p.add("nivi.catalogo.identificacion", () -> "NiviPruebas (pruebas@example.org)");
    }
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired Biblioteca biblioteca;
    @Autowired JwtEncoder tokens;
    @MockitoSpyBean AdaptadorRegistros registros;
    @LocalServerPort int puerto;
    private String token;
    @BeforeAll void iniciarSesionReal() {
        var sesion = RestClient.create("http://localhost:" + puerto).post().uri("/api/v1/acceso").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("usuario", "prueba", "contrasena", "contrasena-solo-pruebas")).retrieve().body(JsonNode.class);
        token = "Bearer " + sesion.path("token").asText();
    }
    @BeforeEach void limpiarDatos() {
        jdbc.update("delete from registros_lectura"); jdbc.update("delete from autores_libro");
        jdbc.update("delete from libros"); jdbc.update("delete from operaciones");
    }
    private MetadatosLibro datos(String isbn, Integer total) { return new MetadatosLibro("Prueba", List.of("Autora"), isbn, null, null, null, total); }
    private Libro crear(Integer total) { return biblioteca.agregar(new Alta(UUID.randomUUID(), datos(null, total), OrigenLibro.MANUAL)).libro(); }
    private Libro iniciar(Libro l) { return biblioteca.cambiarEstado(l.id(), new Estado(l.version(), EstadoLectura.LEYENDO, false)); }
    private ResultActions enviar(String ruta, Object cuerpo) throws Exception {
        return http.perform(post("/api/v1" + ruta).header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(cuerpo)));
    }
    @Test void recorridoHttpCompleto() {
        RestClient cliente = RestClient.builder().baseUrl("http://localhost:" + puerto + "/api/v1").defaultHeader("Authorization", token).build();
        Map<String, Object> alta = Map.of("idOperacion", UUID.randomUUID(), "origen", "MANUAL", "metadatos", Map.of("titulo", "Libro de demo", "totalPaginas", 100));
        ResponseEntity<JsonNode> creada = cliente.post().uri("/libros").contentType(MediaType.APPLICATION_JSON).body(alta).retrieve().toEntity(JsonNode.class);
        assertThat(creada.getStatusCode().value()).isEqualTo(201); assertThat(creada.getHeaders().getLocation()).isNotNull();
        String id = creada.getBody().path("libro").path("id").asText();
        JsonNode activo = cliente.put().uri("/libros/" + id + "/estado").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("versionLibro", 0, "estado", "LEYENDO")).retrieve().body(JsonNode.class);
        assertThat(activo.path("version").asInt()).isEqualTo(1);
        cliente.post().uri("/libros/" + id + "/registros").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("idOperacion", UUID.randomUUID(), "versionLibro", 1, "paginaActual", 35, "nota", "Recordar este capítulo.")).retrieve().toBodilessEntity();
        JsonNode detalle = cliente.get().uri("/libros/" + id).retrieve().body(JsonNode.class);
        assertThat(detalle.path("ultimoRegistro").path("nota").asText()).isEqualTo("Recordar este capítulo.");
        assertThat(detalle.path("libro").path("porcentaje").asDouble()).isEqualTo(35);
        JsonNode fin = cliente.post().uri("/libros/" + id + "/registros").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("idOperacion", UUID.randomUUID(), "versionLibro", 2, "paginaActual", 100)).retrieve().body(JsonNode.class);
        assertThat(fin.path("libro").path("estado").asText()).isEqualTo("TERMINADO");
        assertThat(fin.path("libro").path("terminadoEn").isTextual()).isTrue();
        cliente.delete().uri("/libros/" + id + "?version=3").retrieve().toBodilessEntity();
        assertThat(jdbc.queryForObject("select count(*) from registros_lectura", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from libros", Long.class)).isZero();
    }
    @Test void altaIdempotenteDevuelveOriginalYRechazaOtraCarga() throws Exception {
        UUID operacion = UUID.randomUUID();
        var alta = Map.of("idOperacion", operacion, "origen", "MANUAL", "metadatos", Map.of("titulo", "A"));
        JsonNode original = json.readTree(enviar("/libros", alta).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        UUID id = UUID.fromString(original.path("libro").path("id").asText());
        iniciar(biblioteca.detalle(id).libro());
        enviar("/libros", alta).andExpect(status().isOk()).andExpect(jsonPath("$.libro.version").value(0));
        enviar("/libros", Map.of("idOperacion", operacion, "origen", "MANUAL", "metadatos", Map.of("titulo", "B")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("OPERACION_REUTILIZADA"));
        assertThat(jdbc.queryForObject("select count(*) from libros", Long.class)).isEqualTo(1);
    }
    @Test void isbnEquivalenteYEdicionExternaSonUnicos() {
        biblioteca.agregar(new Alta(UUID.randomUUID(), datos("0140328726", 100), OrigenLibro.MANUAL));
        assertThatThrownBy(() -> biblioteca.agregar(new Alta(UUID.randomUUID(), datos("9780140328721", 100), OrigenLibro.MANUAL)))
                .isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("EDICION_DUPLICADA");
        MetadatosLibro externa = new MetadatosLibro("Otra", List.of(), null, "OL123M", null, null, null);
        biblioteca.agregar(new Alta(UUID.randomUUID(), externa, OrigenLibro.OPEN_LIBRARY));
        assertThatThrownBy(() -> biblioteca.agregar(new Alta(UUID.randomUUID(), externa, OrigenLibro.OPEN_LIBRARY))).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> jdbc.update("update libros set isbn_canonico='9780140328721' where id_edicion_externa='OL123M'"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void reintentoDeAvancePrecedeAVersionYNoDuplica() {
        Libro l = iniciar(crear(100)); UUID operacion = UUID.randomUUID(); var entrada = new Avance(operacion, l.version(), 20, "Nota");
        var primero = biblioteca.registrar(l.id(), entrada); var repetido = biblioteca.registrar(l.id(), entrada);
        assertThat(repetido.repetida()).isTrue(); assertThat(repetido.registro().id()).isEqualTo(primero.registro().id());
        assertThat(biblioteca.historial(l.id(), 1, 20).totalElementos()).isEqualTo(1);
        assertThatThrownBy(() -> biblioteca.registrar(l.id(), new Avance(operacion, l.version(), 21, "Nota"))).isInstanceOf(ExcepcionNegocio.class);
    }
    @Test void correccionMantieneHistorialYDetalleUltimo() {
        Libro l = iniciar(crear(null)); l = biblioteca.registrar(l.id(), new Avance(UUID.randomUUID(), l.version(), 100, null)).libro();
        var corregido = biblioteca.registrar(l.id(), new Avance(UUID.randomUUID(), l.version(), 25, "Corrección"));
        assertThat(corregido.registro().paginaAnterior()).isEqualTo(100);
        assertThat(biblioteca.historial(l.id(), 1, 20).totalElementos()).isEqualTo(2);
        assertThat(biblioteca.detalle(l.id()).ultimoRegistro().id()).isEqualTo(corregido.registro().id());
    }
    @Test void falloDeRegistroRevierteLibroYOperacion() {
        Libro l = iniciar(crear(100)); UUID operacion = UUID.randomUUID();
        doThrow(new IllegalStateException("Fallo simulado")).when(registros).guardar(any());
        assertThatThrownBy(() -> biblioteca.registrar(l.id(), new Avance(operacion, l.version(), 100, "Nota")))
                .isInstanceOf(org.springframework.dao.InvalidDataAccessApiUsageException.class);
        Libro posterior = biblioteca.detalle(l.id()).libro();
        assertThat(posterior.version()).isEqualTo(l.version()); assertThat(posterior.paginaActual()).isZero();
        assertThat(posterior.estado()).isEqualTo(EstadoLectura.LEYENDO); assertThat(posterior.terminadoEn()).isNull();
        assertThat(jdbc.queryForObject("select count(*) from operaciones where id=?", Long.class, operacion)).isZero();
    }
    @Test void dosEscriturasSimultaneasProducenUnSoloGanador() throws Exception {
        Libro l = iniciar(crear(100));
        try (var ejecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            Callable<String> accion = () -> {
                try { biblioteca.registrar(l.id(), new Avance(UUID.randomUUID(), l.version(), 20, null)); return "OK"; }
                catch (ExcepcionNegocio ex) { return ex.codigo(); }
            };
            var resultados = ejecutor.invokeAll(List.of(accion, accion));
            assertThat(resultados.stream().map(f -> { try { return f.get(); } catch (Exception ex) { throw new IllegalStateException(ex); } }).toList())
                    .containsExactlyInAnyOrder("OK", "VERSION_DESACTUALIZADA");
        }
        assertThat(biblioteca.historial(l.id(), 1, 20).totalElementos()).isEqualTo(1);
    }
    @Test void dosReintentosSimultaneosCompartenRegistro() throws Exception {
        Libro l = iniciar(crear(100)); var entrada = new Avance(UUID.randomUUID(), l.version(), 20, null);
        try (var ejecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            Callable<ar.edu.nivi.aplicacion.modelo.Resultados.Escritura> accion = () -> biblioteca.registrar(l.id(), entrada);
            var resultados = ejecutor.invokeAll(List.of(accion, accion));
            assertThat(resultados.get(0).get().registro().id()).isEqualTo(resultados.get(1).get().registro().id());
        }
    }
    @Test void eliminarImpideResucitarYBorraNotasDeSnapshots() {
        var alta = new Alta(UUID.randomUUID(), datos(null, 100), OrigenLibro.MANUAL); Libro l = iniciar(biblioteca.agregar(alta).libro());
        var avance = new Avance(UUID.randomUUID(), l.version(), 20, "Nota privada"); l = biblioteca.registrar(l.id(), avance).libro();
        UUID id = l.id(); biblioteca.eliminar(id, l.version());
        assertThatThrownBy(() -> biblioteca.agregar(alta)).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> biblioteca.registrar(id, avance)).isInstanceOf(ExcepcionNegocio.class);
        assertThat(jdbc.queryForList("select resultado from operaciones", String.class)).allMatch(String::isEmpty);
    }
    @Test void paginacionFiltrosAdvertenciaYResumen() {
        for (int i = 0; i < 5; i++) iniciar(crear(null));
        assertThat(biblioteca.listar(EstadoLectura.LEYENDO, "autora", 1, 2).totalElementos()).isEqualTo(5);
        assertThat(biblioteca.listar(null, "%", 1, 20).elementos()).isEmpty();
        var p1 = biblioteca.listar(null, "", 1, 2); var p2 = biblioteca.listar(null, "", 2, 2);
        assertThat(p1.elementos()).doesNotContainAnyElementsOf(p2.elementos()); assertThat(p1.totalPaginas()).isEqualTo(3);
        var resumen = biblioteca.resumen(); assertThat(resumen.conteos().get(EstadoLectura.LEYENDO)).isEqualTo(5);
        assertThat(resumen.lecturasActivas()).hasSize(3);
        assertThat(biblioteca.agregar(new Alta(UUID.randomUUID(), datos(null, null), OrigenLibro.MANUAL)).advertencias()).hasSize(1);
    }
    @Test void validacionHttpErroresYVersion() throws Exception {
        Libro l = iniciar(crear(100));
        enviar("/libros/" + l.id() + "/registros", Map.of("idOperacion", UUID.randomUUID(), "versionLibro", 0, "paginaActual", 2))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("VERSION_DESACTUALIZADA"));
        enviar("/libros/" + l.id() + "/registros", Map.of("idOperacion", UUID.randomUUID(), "versionLibro", l.version(), "paginaActual", 2.5))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.idSolicitud").isNotEmpty());
        enviar("/libros/" + l.id() + "/registros", Map.of("idOperacion", UUID.randomUUID(), "versionLibro", l.version(), "paginaActual", 101))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.paginaActual").isNotEmpty());
        enviar("/libros", Map.of("idOperacion", UUID.randomUUID(), "origen", "MANUAL", "metadatos", Map.of("titulo", " "))).andExpect(status().isBadRequest());
        http.perform(get("/api/v1/libros?tamano=51").header("Authorization", token)).andExpect(status().isBadRequest());
        http.perform(get("/api/v1/libros/" + UUID.randomUUID()).header("Authorization", token)).andExpect(status().isNotFound());
    }
    @Test void seguridadNoFiltraDatosYCorsEsExplicito() throws Exception {
        http.perform(get("/api/v1/libros")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("SESION_REQUERIDA"));
        http.perform(get("/api/v1/libros").header("Authorization", "Bearer invalido")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.campos").isMap());
        http.perform(post("/api/v1/acceso").contentType(MediaType.APPLICATION_JSON).content("{\"usuario\":\"prueba\",\"contrasena\":\"incorrecta\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("CREDENCIALES_INCORRECTAS"));
        http.perform(options("/api/v1/libros").header("Origin", "http://localhost:8100").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8100"));
        http.perform(options("/api/v1/libros").header("Origin", "https://sitio-ajeno.example").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ORIGEN_NO_PERMITIDO"));
    }
    @Test void rechazaTokenVencidoYAudienciaOEmisorAjenos() throws Exception {
        for (var claims : List.of(
                JwtClaimsSet.builder().issuer("nivi").subject("prueba").audience(List.of("nivi-lectura")).issuedAt(Instant.now().minusSeconds(7200)).expiresAt(Instant.now().minusSeconds(3600)).build(),
                JwtClaimsSet.builder().issuer("nivi").subject("prueba").audience(List.of("otra-app")).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build(),
                JwtClaimsSet.builder().issuer("otro").subject("prueba").audience(List.of("nivi-lectura")).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build())) {
            String ajeno = tokens.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            http.perform(get("/api/v1/resumen").header("Authorization", "Bearer " + ajeno)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.codigo").value("SESION_INVALIDA"));
        }
    }
    @Test void limiteDeAccesoDevuelveErrorUniformeConCorsYEspera() throws Exception {
        for (int i = 0; i < 10; i++) http.perform(post("/api/v1/acceso").with(r -> { r.setRemoteAddr("192.0.2.10"); return r; })
                .header("Origin", "http://localhost:8100").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        http.perform(post("/api/v1/acceso").with(r -> { r.setRemoteAddr("192.0.2.10"); return r; })
                .header("Origin", "http://localhost:8100").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "60"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8100"))
                .andExpect(jsonPath("$.codigo").value("LIMITE_PETICIONES"));
    }
    @Test void metadatosVersionadosRespetanPosicionYNoAceptanCamposDesconocidos() throws Exception {
        Libro l = iniciar(crear(100)); l = biblioteca.registrar(l.id(), new Avance(UUID.randomUUID(), l.version(), 50, null)).libro();
        http.perform(put("/api/v1/libros/" + l.id() + "/metadatos").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("versionLibro", l.version(), "metadatos", Map.of("titulo", "Corregido", "totalPaginas", 40)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("PAGINA_SUPERA_TOTAL"));
        http.perform(put("/api/v1/libros/" + l.id() + "/metadatos").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("versionLibro", l.version(), "metadatos", Map.of("titulo", "Corregido")))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.titulo").value("Corregido")).andExpect(jsonPath("$.porcentaje").isEmpty());
        enviar("/libros", Map.of("idOperacion", UUID.randomUUID(), "origen", "MANUAL", "metadatos", Map.of("titulo", "A"), "extra", true))
                .andExpect(status().isBadRequest());
        http.perform(get("/api/v1/catalogo/isbn/123").header("Authorization", token)).andExpect(status().isBadRequest());
    }
}
