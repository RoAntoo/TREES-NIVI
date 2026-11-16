package ar.edu.nivi.aplicacion.modelo;

import ar.edu.nivi.dominio.modelo.*;
import java.util.List;
import java.util.Map;

public final class Resultados {
    private Resultados() { }
    public record Detalle(Libro libro, RegistroLectura ultimoRegistro) { }
    public record Escritura(Libro libro, RegistroLectura registro, List<String> advertencias, boolean repetida) {
        public Escritura { advertencias = List.copyOf(advertencias); }
        public Escritura repeticion() { return new Escritura(libro, registro, advertencias, true); }
    }
    public record Operacion(String huella, Escritura resultado) { }
    public record Resumen(Map<EstadoLectura, Long> conteos, List<Detalle> lecturasActivas) { }
    public record Candidato(MetadatosLibro metadatos, String enlaceFuente) { }
    public record EdicionCatalogo(Candidato libro, List<String> idiomas, String editorial, String publicacion) { }
    public record EdicionesCatalogo(List<EdicionCatalogo> elementos, int pagina, int tamano, long totalElementos, boolean haySiguiente) { }
    public record Catalogo(List<Candidato> elementos, int pagina, int tamano, long totalElementos,
            boolean totalEstimado, boolean haySiguiente) { }
}
