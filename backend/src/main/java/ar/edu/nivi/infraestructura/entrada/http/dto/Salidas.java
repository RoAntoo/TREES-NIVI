package ar.edu.nivi.infraestructura.entrada.http.dto;

import ar.edu.nivi.aplicacion.modelo.*;
import ar.edu.nivi.aplicacion.modelo.Resultados;
import ar.edu.nivi.dominio.modelo.*;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;

public final class Salidas {
    private Salidas() { }
    public record LibroRespuesta(UUID id, String titulo, List<String> autores, String isbn, String idEdicionExterna,
            String idObraExterna, String urlPortada, Integer totalPaginas, int paginaActual, EstadoLectura estado,
            OrigenLibro origen, long version, Instant creadoEn, Instant actualizadoEn, Instant terminadoEn, Double porcentaje) { }
    public record RegistroRespuesta(UUID id, UUID libroId, int paginaAnterior, int paginaActual, String nota, Instant creadoEn, UUID idOperacion) { }
    public record DetalleRespuesta(LibroRespuesta libro, RegistroRespuesta ultimoRegistro) { }
    public record EscrituraRespuesta(LibroRespuesta libro, RegistroRespuesta registro, List<String> advertencias) { }
    public record ResumenRespuesta(Map<EstadoLectura, Long> conteos, List<DetalleRespuesta> lecturasActivas) { }
    public record CandidatoRespuesta(String titulo, List<String> autores, String isbn, String idEdicionExterna,
            String idObraExterna, String urlPortada, Integer totalPaginas, String enlaceFuente) { }
    public record CatalogoRespuesta(List<CandidatoRespuesta> elementos, int pagina, int tamano,
            long totalElementos, boolean totalEstimado, boolean haySiguiente) { }
    public record EdicionCatalogoRespuesta(CandidatoRespuesta libro, List<String> idiomas, String editorial, String publicacion) { }
    public record EdicionesCatalogoRespuesta(List<EdicionCatalogoRespuesta> elementos, int pagina, int tamano, long totalElementos, boolean haySiguiente) { }
    public static LibroRespuesta libro(Libro l) {
        var m = l.metadatos();
        return new LibroRespuesta(l.id(), m.titulo(), m.autores(), m.isbn(), m.idEdicionExterna(), m.idObraExterna(),
                m.urlPortada(), m.totalPaginas(), l.paginaActual(), l.estado(), l.origen(), l.version(), l.creadoEn(),
                l.actualizadoEn(), l.terminadoEn(), m.totalPaginas() == null ? null : 100.0 * l.paginaActual() / m.totalPaginas());
    }
    public static RegistroRespuesta registro(RegistroLectura r) {
        return r == null ? null : new RegistroRespuesta(r.id(), r.libroId(), r.paginaAnterior(), r.paginaActual(), r.nota(), r.creadoEn(), r.idOperacion());
    }
    public static DetalleRespuesta detalle(Resultados.Detalle d) { return new DetalleRespuesta(libro(d.libro()), registro(d.ultimoRegistro())); }
    public static EscrituraRespuesta escritura(Resultados.Escritura e) { return new EscrituraRespuesta(libro(e.libro()), registro(e.registro()), e.advertencias()); }
    public static ResumenRespuesta resumen(Resultados.Resumen r) { return new ResumenRespuesta(r.conteos(), r.lecturasActivas().stream().map(Salidas::detalle).toList()); }
    public static CandidatoRespuesta candidato(Resultados.Candidato c) {
        var m = c.metadatos(); return new CandidatoRespuesta(m.titulo(), m.autores(), m.isbn(), m.idEdicionExterna(),
                m.idObraExterna(), m.urlPortada(), m.totalPaginas(), c.enlaceFuente());
    }
    public static CatalogoRespuesta catalogo(Resultados.Catalogo c) {
        return new CatalogoRespuesta(c.elementos().stream().map(Salidas::candidato).toList(), c.pagina(), c.tamano(), c.totalElementos(), c.totalEstimado(), c.haySiguiente());
    }
    public static EdicionesCatalogoRespuesta ediciones(Resultados.EdicionesCatalogo e) {
        return new EdicionesCatalogoRespuesta(e.elementos().stream().map(d -> new EdicionCatalogoRespuesta(
                candidato(d.libro()), d.idiomas(), d.editorial(), d.publicacion())).toList(),
                e.pagina(), e.tamano(), e.totalElementos(), e.haySiguiente());
    }
    public static <T, R> Pagina<R> pagina(Pagina<T> p, Function<T, R> convertir) {
        return new Pagina<>(p.elementos().stream().map(convertir).toList(), p.pagina(), p.tamano(), p.totalElementos(), p.totalPaginas());
    }
}
