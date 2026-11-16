package ar.edu.nivi.infraestructura;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import ar.edu.nivi.infraestructura.salida.catalogo.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.*;
import org.junit.jupiter.api.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;

class AdaptadorOpenLibraryPrueba {
    private HttpServer servidor;
    private ExecutorService ejecutor;
    private final AtomicInteger llamadas = new AtomicInteger();
    private volatile HttpHandler respuesta;
    private AdaptadorOpenLibrary catalogo;
    @BeforeEach void preparar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        ejecutor = Executors.newVirtualThreadPerTaskExecutor(); servidor.setExecutor(ejecutor);
        servidor.createContext("/", intercambio -> { llamadas.incrementAndGet(); respuesta.handle(intercambio); });
        respuesta = e -> responder(e, 200, "{}"); servidor.start(); catalogo = adaptador(Duration.ofSeconds(1), Duration.ofSeconds(3));
    }
    @AfterEach void cerrar() { servidor.stop(0); ejecutor.shutdownNow(); }
    private AdaptadorOpenLibrary adaptador(Duration lectura, Duration presupuesto) {
        var propiedades = new PropiedadesCatalogo(URI.create("http://127.0.0.1:" + servidor.getAddress().getPort()), "NiviPruebas (pruebas@example.org)",
                Duration.ofSeconds(1), lectura, presupuesto, Duration.ofMillis(1), 10, Duration.ofMinutes(1), Duration.ofMillis(30));
        return new AdaptadorOpenLibrary(propiedades, new ObjectMapper());
    }
    private String recurso(String nombre) throws IOException {
        try (var entrada = getClass().getResourceAsStream("/catalogo/" + nombre + ".json")) { return new String(entrada.readAllBytes(), StandardCharsets.UTF_8); }
    }
    private void responder(HttpExchange e, int estado, String contenido) throws IOException {
        byte[] bytes = contenido.getBytes(StandardCharsets.UTF_8); e.getResponseHeaders().set("Content-Type", "application/json");
        e.sendResponseHeaders(estado, bytes.length); try (var salida = e.getResponseBody()) { salida.write(bytes); }
    }
    @Test void busquedaDeObraNoInventaEdicionNiIsbnNiPaginas() throws Exception {
        String obra = recurso("obra"); respuesta = e -> responder(e, 200, obra);
        var resultado = catalogo.buscar("obra", 1, 20);
        var m = resultado.elementos().getFirst().metadatos();
        assertThat(m.idObraExterna()).isEqualTo("OL123W"); assertThat(m.idEdicionExterna()).isNull();
        assertThat(m.isbn()).isNull(); assertThat(m.totalPaginas()).isNull(); assertThat(m.urlPortada()).isNull();
        assertThat(resultado.totalEstimado()).isFalse(); assertThat(resultado.haySiguiente()).isFalse();
        catalogo.buscar("obra", 1, 20); assertThat(llamadas).hasValue(1);
    }
    @Test void isbnConservadoResuelveRedireccionYAutoresConCache() throws Exception {
        String edicion = recurso("edicion");
        respuesta = e -> {
            assertThat(e.getRequestHeaders().getFirst("User-Agent")).contains("NiviPruebas");
            switch (e.getRequestURI().getPath()) {
                case "/isbn/0140328726.json" -> { e.getResponseHeaders().set("Location", "/books/OL123M.json"); responder(e, 302, ""); }
                case "/books/OL123M.json" -> responder(e, 200, edicion);
                case "/authors/OL123A.json" -> responder(e, 200, "{\"name\":\"Autora\"}");
                default -> responder(e, 404, "{}");
            }
        };
        var m = catalogo.porIsbn("0-140-32872-6").metadatos();
        assertThat(m.isbn()).isEqualTo("0140328726"); assertThat(m.idEdicionExterna()).isEqualTo("OL123M");
        assertThat(m.autores()).containsExactly("Autora"); assertThat(m.totalPaginas()).isEqualTo(120);
        assertThat(m.urlPortada()).isEqualTo("https://covers.openlibrary.org/b/id/12345-M.jpg");
        assertThat(llamadas).hasValue(3); catalogo.porIsbn("0140328726"); assertThat(llamadas).hasValue(3);
    }
    @Test void datosParcialesSonValidos() {
        respuesta = e -> responder(e, 200, "{\"title\":\"Sin información\",\"key\":\"/books/OL1M\"}");
        var m = catalogo.porIsbn("0140328726").metadatos();
        assertThat(m.autores()).isEmpty(); assertThat(m.totalPaginas()).isNull(); assertThat(m.urlPortada()).isNull();
    }
    @Test void edicionSinIsbnRecupera308PaginasYRobertChambers() {
        respuesta = e -> {
            switch (e.getRequestURI().getPath()) {
                case "/books/OL49631747M.json" -> responder(e, 200, """
                    {"key":"/books/OL49631747M","title":"The king in yellow","number_of_pages":308,
                     "authors":[{"key":"/authors/OL162057A"}],"works":[{"key":"/works/OL8127201W"}]}
                    """);
                case "/authors/OL162057A.json" -> responder(e, 200, "{\"name\":\"Robert W. Chambers\"}");
                default -> responder(e, 404, "{}");
            }
        };
        var libro = catalogo.porEdicion("OL49631747M").metadatos();
        assertThat(libro.autores()).containsExactly("Robert W. Chambers");
        assertThat(libro.totalPaginas()).isEqualTo(308); assertThat(libro.isbn()).isNull();
        assertThat(libro.idEdicionExterna()).isEqualTo("OL49631747M"); assertThat(llamadas).hasValue(2);
        catalogo.porEdicion("OL49631747M"); assertThat(llamadas).hasValue(2);
    }
    @Test void listarEdicionesNoResuelveAutoresPorCadaFilaNiMezclaPaginas() {
        respuesta = e -> {
            assertThat(e.getRequestURI().toString()).isEqualTo("/works/OL8127201W/editions.json?limit=2&offset=2");
            responder(e, 200, """
                {"size":4,"entries":[
                  {"key":"/books/OL49631747M","title":"The king in yellow","number_of_pages":308,
                   "authors":[{"key":"/authors/OL162057A"}],"languages":[{"key":"/languages/eng"}],
                   "publishers":["Editorial de prueba"],"publish_date":"2023","isbn_13":["inválido","9780306406157"]},
                  {"key":"/books/OL2M","title":"Otra edición","number_of_pages":144,"isbn_10":["0140328726"]}]}
                """);
        };
        var resultado = catalogo.ediciones("OL8127201W", 2, 2);
        assertThat(resultado.totalElementos()).isEqualTo(4); assertThat(resultado.haySiguiente()).isFalse();
        assertThat(resultado.elementos().getFirst().libro().metadatos().totalPaginas()).isEqualTo(308);
        assertThat(resultado.elementos().getLast().libro().metadatos().totalPaginas()).isEqualTo(144);
        assertThat(resultado.elementos().getFirst().idiomas()).containsExactly("eng");
        assertThat(resultado.elementos().getFirst().libro().metadatos().isbn()).isEqualTo("9780306406157");
        assertThat(resultado.elementos().getFirst().libro().metadatos().autores()).isEmpty();
        assertThat(llamadas).hasValue(1);
    }
    @Test void otraEdicionNoSeAceptaComoSiFueraLaSolicitada() {
        respuesta = e -> responder(e, 200, "{\"key\":\"/books/OL2M\",\"title\":\"Otra edición\",\"number_of_pages\":999}");
        assertThatThrownBy(() -> catalogo.porEdicion("OL49631747M")).isInstanceOf(ExcepcionNegocio.class)
                .extracting("codigo").isEqualTo("CATALOGO_RESPUESTA_INVALIDA");
    }
    @Test void identificadoresExternosInvalidosNoLlamanProveedor() {
        assertThatThrownBy(() -> catalogo.porEdicion("https://otro.example/OL1M")).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> catalogo.porEdicion("OL" + "1".repeat(40) + "M")).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> catalogo.ediciones("../OL1W", 1, 10)).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> catalogo.ediciones("OL1W", 0, 10)).isInstanceOf(ExcepcionNegocio.class);
        assertThat(llamadas).hasValue(0);
    }
    @Test void edicionNoEncontradaYListadoInvalidoPermitenInformarElError() {
        respuesta = e -> responder(e, 404, "{}");
        assertThatThrownBy(() -> catalogo.porEdicion("OL1M")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("EDICION_INEXISTENTE");
        respuesta = e -> responder(e, 200, "{\"size\":1}");
        assertThatThrownBy(() -> catalogo.ediciones("OL1W", 1, 10)).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("CATALOGO_RESPUESTA_INVALIDA");
    }
    @Test void edicionSinAutoresRecuperaLosDeLaObraVinculadaSinInventarPaginas() {
        respuesta = e -> {
            switch (e.getRequestURI().getPath()) {
                case "/isbn/9788408096238.json" -> responder(e, 200, """
                    {"title":"Ángel mecánico","key":"/books/OL25647375M","works":[{"key":"/works/OL17077559W"}]}
                    """);
                case "/works/OL17077559W.json" -> responder(e, 200, """
                    {"authors":[{"author":{"key":"/authors/OL2821271A"}}],"number_of_pages":999}
                    """);
                case "/authors/OL2821271A.json" -> responder(e, 200, "{\"name\":\"Cassandra Clare\"}");
                default -> responder(e, 404, "{}");
            }
        };
        var m = catalogo.porIsbn("9788408096238").metadatos();
        assertThat(m.autores()).containsExactly("Cassandra Clare"); assertThat(m.totalPaginas()).isNull();
        assertThat(m.idEdicionExterna()).isEqualTo("OL25647375M"); assertThat(m.isbn()).isEqualTo("9788408096238");
        assertThat(llamadas).hasValue(3);
        catalogo.porIsbn("9788408096238"); assertThat(llamadas).hasValue(3);
    }
    @Test void autoresDeObraNoConsultanUrlsExternas() {
        respuesta = e -> {
            if (e.getRequestURI().getPath().startsWith("/isbn/")) responderEdicionSinAutores(e);
            else responderObraConReferenciaAjena(e);
        };
        var m = catalogo.porIsbn("9788408096238").metadatos();
        assertThat(m.autores()).isEmpty(); assertThat(m.titulo()).isEqualTo("Edición parcial");
        assertThat(llamadas).hasValue(2);
    }
    @Test void obraAusenteNoImpideConfirmarLaEdicion() {
        respuesta = e -> {
            if (e.getRequestURI().getPath().startsWith("/isbn/")) responderEdicionSinAutores(e);
            else responder(e, 404, "{}");
        };
        assertThat(catalogo.porIsbn("9788408096238").metadatos().autores()).isEmpty();
        assertThat(llamadas).hasValue(2);
    }
    private void responderEdicionSinAutores(HttpExchange e) throws IOException {
        responder(e, 200, "{\"title\":\"Edición parcial\",\"key\":\"/books/OL1M\",\"works\":[{\"key\":\"/works/OL1W\"}]}");
    }
    private void responderObraConReferenciaAjena(HttpExchange e) throws IOException {
        responder(e, 200, "{\"authors\":[{\"author\":{\"key\":\"https://otro.example/authors/OL1A\"}}]}");
    }
    @Test void ausenciaTieneCacheBreveYNoSeConfundeConFallo() throws Exception {
        respuesta = e -> responder(e, 404, "{}");
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("ISBN_INEXISTENTE");
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class); assertThat(llamadas).hasValue(1);
        TimeUnit.MILLISECONDS.sleep(40);
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class); assertThat(llamadas).hasValue(2);
    }
    @Test void isbnInvalidoNoLlamaProveedor() {
        assertThatThrownBy(() -> catalogo.porIsbn("123")).isInstanceOf(ExcepcionNegocio.class); assertThat(llamadas).hasValue(0);
    }
    @Test void busquedaVaciaDevuelveListaYTotalEstimadoEsExplicito() {
        respuesta = e -> responder(e, 200, "{\"num_found\":0,\"docs\":[]}");
        var resultado = catalogo.buscar("sin resultados", 1, 20);
        assertThat(resultado.elementos()).isEmpty(); assertThat(resultado.totalEstimado()).isTrue();
    }
    @Test void timeoutEsDistintoDeAusencia() {
        catalogo = adaptador(Duration.ofMillis(50), Duration.ofMillis(100));
        respuesta = e -> { try { TimeUnit.MILLISECONDS.sleep(200); responder(e, 200, "{}"); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); } };
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("CATALOGO_TIEMPO_AGOTADO");
    }
    @Test void limiteExternoRespetaRetryAfterSinCachearError() {
        respuesta = e -> { e.getResponseHeaders().set("Retry-After", "60"); responder(e, 429, "{}"); };
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("CATALOGO_LIMITADO");
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class); assertThat(llamadas).hasValue(1);
    }
    @Test void fallaTransitoriaReintentaSoloUnaVez() throws Exception {
        String obra = recurso("obra"); respuesta = e -> responder(e, llamadas.get() == 1 ? 502 : 200, llamadas.get() == 1 ? "{}" : obra);
        assertThat(catalogo.buscar("obra", 1, 20).elementos()).hasSize(1); assertThat(llamadas).hasValue(2);
    }
    @Test void caidaPersistenteNoHaceMasDeDosIntentos() {
        respuesta = e -> responder(e, 503, "{}");
        assertThatThrownBy(() -> catalogo.buscar("obra", 1, 20)).isInstanceOf(ExcepcionNegocio.class); assertThat(llamadas).hasValue(2);
    }
    @Test void redireccionAHostAjenoYRespuestaInvalidaSeRechazan() {
        respuesta = e -> { e.getResponseHeaders().set("Location", "https://example.org/books/OL1M.json"); responder(e, 302, ""); };
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("CATALOGO_RESPUESTA_INVALIDA");
        respuesta = e -> responder(e, 200, "no es json");
        assertThatThrownBy(() -> catalogo.porIsbn("0140328726")).isInstanceOf(ExcepcionNegocio.class).extracting("codigo").isEqualTo("CATALOGO_RESPUESTA_INVALIDA");
    }
}
