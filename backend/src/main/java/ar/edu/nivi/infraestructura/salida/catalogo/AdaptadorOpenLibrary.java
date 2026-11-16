package ar.edu.nivi.infraestructura.salida.catalogo;

import ar.edu.nivi.aplicacion.caso.GestionBiblioteca;
import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.aplicacion.modelo.Resultados.*;
import ar.edu.nivi.aplicacion.puerto.salida.CatalogoLibros;
import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import ar.edu.nivi.dominio.modelo.*;
import com.fasterxml.jackson.databind.*;
import com.github.benmanes.caffeine.cache.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import static ar.edu.nivi.dominio.excepcion.ExcepcionNegocio.Tipo.*;

public final class AdaptadorOpenLibrary implements CatalogoLibros {
    private final PropiedadesCatalogo propiedades;
    private final ObjectMapper json;
    private final HttpClient cliente;
    private final Cache<String, Entrada> cache;
    private long siguienteLlamada;
    private long bloqueadoHasta;
    private record Entrada(Optional<JsonNode> datos, long vence) { }

    public AdaptadorOpenLibrary(PropiedadesCatalogo propiedades, ObjectMapper json) {
        this.propiedades = propiedades; this.json = json;
        cliente = HttpClient.newBuilder().connectTimeout(propiedades.conexion()).followRedirects(HttpClient.Redirect.NEVER).build();
        cache = Caffeine.newBuilder().maximumSize(propiedades.cacheEntradas()).expireAfterWrite(propiedades.cacheDuracion()).build();
    }
    @Override public Catalogo buscar(String consulta, int pagina, int tamano) {
        Pagina.validar(pagina, tamano); String q = GestionBiblioteca.validarConsulta(consulta);
        if (q.isEmpty()) throw ExcepcionNegocio.campo("CONSULTA_VACIA", "q", "Ingresá un título o autor.");
        long limite = System.nanoTime() + propiedades.presupuesto().toNanos();
        String ruta = "/search.json?q=" + URLEncoder.encode(q, StandardCharsets.UTF_8) + "&page=" + pagina + "&limit=" + tamano
                + "&fields=key,title,author_name,cover_i";
        JsonNode datos = obtener(ruta, limite).orElseThrow(() -> fallo(NO_DISPONIBLE, "CATALOGO_NO_DISPONIBLE", "El catálogo no está disponible."));
        if (!datos.path("docs").isArray()) throw respuestaInvalida();
        List<Candidato> elementos = new ArrayList<>();
        for (JsonNode fila : datos.path("docs")) {
            String obra = identificador(fila.path("key").asText(), "W");
            String titulo = texto(fila, "title", 255);
            if (titulo == null) continue;
            List<String> autores = new ArrayList<>();
            if (fila.path("author_name").isArray()) for (JsonNode a : fila.path("author_name")) {
                if (a.isTextual() && !a.asText().isBlank() && autores.size() < 10) autores.add(recortar(a.asText(), 150));
            }
            Long portada = fila.path("cover_i").canConvertToLong() ? fila.path("cover_i").asLong() : null;
            elementos.add(new Candidato(new MetadatosLibro(titulo, autores, null, null, obra, portada(portada), null),
                    obra == null ? "https://openlibrary.org" : "https://openlibrary.org/works/" + obra));
        }
        long total = Math.max(0, datos.path("numFound").asLong(datos.path("num_found").asLong(0)));
        boolean estimado = !datos.path("numFoundExact").asBoolean(false);
        return new Catalogo(elementos, pagina, tamano, total, estimado, (long) pagina * tamano < total);
    }
    @Override public Candidato porIsbn(String valor) {
        if (valor != null && valor.length() > 40) throw ExcepcionNegocio.campo("ISBN_INVALIDO", "isbn", "El ISBN admite hasta 40 caracteres antes de normalizar.");
        String isbn = Isbn.normalizar(valor);
        if (isbn == null) throw ExcepcionNegocio.campo("ISBN_INVALIDO", "isbn", "Ingresá un ISBN.");
        long limite = System.nanoTime() + propiedades.presupuesto().toNanos();
        JsonNode datos = obtener("/isbn/" + isbn + ".json", limite).orElseThrow(() -> fallo(NO_ENCONTRADO, "ISBN_INEXISTENTE", "No se encontró esa edición en Open Library."));
        return completarEdicion(datos, isbn, limite);
    }
    @Override public Candidato porEdicion(String idEdicion) {
        validarIdentificador(idEdicion, "M");
        long limite = System.nanoTime() + propiedades.presupuesto().toNanos();
        JsonNode datos = obtener("/books/" + idEdicion + ".json", limite)
                .orElseThrow(() -> fallo(NO_ENCONTRADO, "EDICION_INEXISTENTE", "No se encontró esa edición en Open Library."));
        if (!idEdicion.equals(identificador(datos.path("key").asText(), "M"))) throw respuestaInvalida();
        return completarEdicion(datos, isbnEdicion(datos), limite);
    }
    @Override public EdicionesCatalogo ediciones(String idObra, int pagina, int tamano) {
        validarIdentificador(idObra, "W"); Pagina.validar(pagina, tamano);
        long limite = System.nanoTime() + propiedades.presupuesto().toNanos();
        JsonNode datos = obtener("/works/" + idObra + "/editions.json?limit=" + tamano + "&offset=" + ((long) (pagina - 1) * tamano), limite)
                .orElseThrow(() -> fallo(NO_ENCONTRADO, "OBRA_INEXISTENTE", "No se encontró esa obra en Open Library."));
        if (!datos.path("entries").isArray() || !datos.path("size").canConvertToLong()) throw respuestaInvalida();
        List<EdicionCatalogo> elementos = new ArrayList<>();
        for (JsonNode fila : datos.path("entries")) {
            String id = identificador(fila.path("key").asText(), "M"), titulo = texto(fila, "title", 255);
            if (id == null || titulo == null) continue;
            // La lista no resuelve autores por cada fila: solo la edición elegida se completa.
            var metadatos = new MetadatosLibro(titulo, List.of(), isbnEdicion(fila), id, idObra, cubierta(fila), paginas(fila));
            List<String> idiomas = new ArrayList<>();
            if (fila.path("languages").isArray()) for (JsonNode idioma : fila.path("languages")) {
                String clave = idioma.path("key").asText();
                if (clave.matches("/languages/[a-z]{3}") && idiomas.size() < 10) idiomas.add(clave.substring(11));
            }
            String editorial = null;
            if (fila.path("publishers").isArray() && !fila.path("publishers").isEmpty() && fila.path("publishers").get(0).isTextual())
                editorial = recortar(fila.path("publishers").get(0).asText(), 200);
            elementos.add(new EdicionCatalogo(new Candidato(metadatos, "https://openlibrary.org/books/" + id), idiomas,
                    editorial, texto(fila, "publish_date", 100)));
        }
        long total = Math.max(0, datos.path("size").asLong());
        return new EdicionesCatalogo(elementos, pagina, tamano, total, (long) pagina * tamano < total);
    }
    private Candidato completarEdicion(JsonNode datos, String isbn, long limite) {
        String titulo = texto(datos, "title", 255), edicion = identificador(datos.path("key").asText(), "M");
        if (titulo == null || edicion == null) throw respuestaInvalida();
        String obra = datos.path("works").isArray() && !datos.path("works").isEmpty()
                ? identificador(datos.path("works").get(0).path("key").asText(), "W") : null;
        List<String> autores = new ArrayList<>();
        cargarAutores(datos.path("authors"), autores, limite);
        // Algunas ediciones omiten autores y solo enlazan la obra. No tomar ISBN/páginas de otra edición.
        if (autores.isEmpty() && obra != null && limite - System.nanoTime() > propiedades.intervalo().toNanos()) {
            try {
                obtener("/works/" + obra + ".json", limite).ifPresent(n -> cargarAutores(n.path("authors"), autores, limite));
            } catch (ExcepcionNegocio ex) { /* Los autores siguen siendo opcionales dentro del presupuesto total. */ }
        }
        return new Candidato(new MetadatosLibro(titulo, autores, isbn, edicion, obra, cubierta(datos), paginas(datos)), "https://openlibrary.org/books/" + edicion);
    }
    private void validarIdentificador(String id, String sufijo) {
        if (id == null || id.length() > 40 || !id.matches("OL[0-9]+" + sufijo))
            throw ExcepcionNegocio.campo("IDENTIFICADOR_INVALIDO", "id", "Identificador de Open Library inválido.");
    }
    private String isbnEdicion(JsonNode datos) {
        for (String campo : List.of("isbn_13", "isbn_10")) if (datos.path(campo).isArray()) for (JsonNode valor : datos.path(campo)) {
            if (!valor.isTextual()) continue;
            try { String isbn = Isbn.normalizar(valor.asText()); if (isbn != null) return isbn; }
            catch (ExcepcionNegocio ex) { /* Un identificador externo inválido no invalida los demás datos. */ }
        }
        return null;
    }
    private Integer paginas(JsonNode datos) {
        JsonNode valor = datos.path("number_of_pages");
        if (!valor.isIntegralNumber() || !valor.canConvertToInt()) return null;
        int paginas = valor.asInt(); return paginas >= 1 && paginas <= 100000 ? paginas : null;
    }
    private String cubierta(JsonNode datos) {
        if (datos.path("covers").isArray()) for (JsonNode c : datos.path("covers"))
            if (c.canConvertToLong() && c.asLong() > 0) return portada(c.asLong());
        return null;
    }
    private void cargarAutores(JsonNode referencias, List<String> autores, long limite) {
        if (!referencias.isArray()) return;
        for (JsonNode a : referencias) {
            if (autores.size() >= 10 || limite - System.nanoTime() < propiedades.intervalo().toNanos()) break;
            String clave = a.path("author").path("key").asText(a.path("key").asText());
            if (!clave.matches("/authors/OL[0-9]+A")) continue;
            try {
                obtener(clave + ".json", limite).map(n -> texto(n, "name", 150)).ifPresent(nombre -> {
                    if (!autores.contains(nombre)) autores.add(nombre);
                });
            } catch (ExcepcionNegocio ex) { break; }
        }
    }
    private Optional<JsonNode> obtener(String ruta, long limite) {
        Entrada guardada = cache.getIfPresent(ruta);
        if (guardada != null && guardada.vence() > System.nanoTime()) return guardada.datos();
        URI uri = propiedades.base().resolve(ruta);
        int reintentos = 0, redirecciones = 0;
        while (true) {
            esperarTurno(limite);
            long restante = limite - System.nanoTime();
            if (restante <= 0) throw tiempo();
            Duration espera = Duration.ofNanos(Math.min(restante, propiedades.lectura().toNanos()));
            var solicitud = HttpRequest.newBuilder(uri).timeout(espera).header("User-Agent", propiedades.identificacion()).header("Accept", "application/json").GET().build();
            CompletableFuture<HttpResponse<String>> pendiente = cliente.sendAsync(solicitud, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            HttpResponse<String> respuesta;
            try { respuesta = pendiente.get(espera.toNanos(), TimeUnit.NANOSECONDS); }
            catch (TimeoutException ex) { pendiente.cancel(true); throw tiempo(); }
            catch (InterruptedException ex) { pendiente.cancel(true); Thread.currentThread().interrupt(); throw tiempo(); }
            catch (ExecutionException ex) {
                if (ex.getCause() instanceof HttpTimeoutException) throw tiempo();
                if (reintentos++ == 0 && limite - System.nanoTime() > propiedades.intervalo().toNanos()) continue;
                throw fallo(NO_DISPONIBLE, "CATALOGO_NO_DISPONIBLE", "No se pudo conectar con Open Library.");
            }
            int estado = respuesta.statusCode();
            if (estado == 301 || estado == 302 || estado == 307 || estado == 308) {
                URI destino = uri.resolve(respuesta.headers().firstValue("Location").orElse(""));
                if (++redirecciones > 2 || !Objects.equals(destino.getHost(), propiedades.base().getHost())
                        || !Objects.equals(destino.getScheme(), propiedades.base().getScheme()) || destino.getPort() != propiedades.base().getPort()
                        || !destino.getPath().matches("/books/OL[0-9]+M\\.json") || destino.getUserInfo() != null) throw respuestaInvalida();
                uri = destino; continue;
            }
            if (estado == 429 || estado == 502 || estado == 503 || estado == 504) {
                long esperaProveedor = esperaProveedor(respuesta);
                if (estado == 429 || respuesta.headers().firstValue("Retry-After").isPresent()) bloquearProveedor(esperaProveedor);
                if (reintentos++ == 0 && limite - System.nanoTime() > esperaProveedor + propiedades.lectura().toNanos()) {
                    dormir(esperaProveedor); continue;
                }
                throw fallo(NO_DISPONIBLE, "CATALOGO_LIMITADO", "Open Library está temporalmente limitado o no disponible.");
            }
            Optional<JsonNode> datos;
            if (estado == 404) datos = Optional.empty();
            else if (estado == 200) {
                try {
                    if (respuesta.body().length() > 2_000_000) throw respuestaInvalida();
                    JsonNode nodo = json.readTree(respuesta.body());
                    if (nodo == null || !nodo.isObject()) throw respuestaInvalida();
                    datos = Optional.of(nodo);
                } catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw respuestaInvalida(); }
            } else throw respuestaInvalida();
            cache.put(ruta, new Entrada(datos, System.nanoTime() + (datos.isEmpty() ? propiedades.cacheAusencias() : propiedades.cacheDuracion()).toNanos()));
            return datos;
        }
    }
    private void esperarTurno(long limite) {
        long espera;
        synchronized (this) {
            long ahora = System.nanoTime();
            if (bloqueadoHasta > ahora) throw fallo(NO_DISPONIBLE, "CATALOGO_LIMITADO", "Open Library solicitó una pausa. Intentá más tarde.");
            espera = Math.max(0, siguienteLlamada - ahora);
            if (ahora + espera >= limite) throw fallo(LIMITE, "LIMITE_CATALOGO", "Hay demasiadas consultas al catálogo. Intentá más tarde.");
            siguienteLlamada = ahora + espera + propiedades.intervalo().toNanos();
        }
        dormir(espera);
    }
    private synchronized void bloquearProveedor(long nanos) { bloqueadoHasta = Math.max(bloqueadoHasta, System.nanoTime() + nanos); }
    private long esperaProveedor(HttpResponse<?> r) {
        String valor = r.headers().firstValue("Retry-After").orElse("1");
        try { return Duration.ofSeconds(Math.min(3600, Math.max(0, Long.parseLong(valor)))).toNanos(); }
        catch (NumberFormatException ex) {
            try { return Math.min(Duration.ofHours(1).toNanos(), Math.max(0, Duration.between(Instant.now(), ZonedDateTime.parse(valor, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).toNanos())); }
            catch (RuntimeException ignorada) { return Duration.ofSeconds(1).toNanos(); }
        }
    }
    private void dormir(long nanos) {
        try { TimeUnit.NANOSECONDS.sleep(nanos); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw tiempo(); }
    }
    private String texto(JsonNode nodo, String campo, int maximo) {
        JsonNode valor = nodo.path(campo); return valor.isTextual() && !valor.asText().isBlank() ? recortar(valor.asText(), maximo) : null;
    }
    private String recortar(String texto, int maximo) { String valor = texto.strip(); return valor.substring(0, Math.min(valor.length(), maximo)); }
    private String identificador(String clave, String sufijo) {
        String valor = clave.replaceFirst("^/(works|books)/", ""); return valor.matches("OL[0-9]+" + sufijo) ? valor : null;
    }
    private String portada(Long id) { return id != null && id > 0 ? "https://covers.openlibrary.org/b/id/" + id + "-M.jpg" : null; }
    private ExcepcionNegocio tiempo() { return fallo(TIEMPO, "CATALOGO_TIEMPO_AGOTADO", "Open Library demoró demasiado. Podés agregar el libro manualmente."); }
    private ExcepcionNegocio respuestaInvalida() { return fallo(NO_DISPONIBLE, "CATALOGO_RESPUESTA_INVALIDA", "Open Library devolvió una respuesta no utilizable."); }
    private ExcepcionNegocio fallo(ExcepcionNegocio.Tipo tipo, String codigo, String mensaje) { return new ExcepcionNegocio(tipo, codigo, mensaje); }
}
