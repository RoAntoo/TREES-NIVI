package ar.edu.nivi.aplicacion.modelo;

import ar.edu.nivi.dominio.modelo.*;
import java.util.UUID;

public final class Solicitudes {
    private Solicitudes() { }
    public record Alta(UUID idOperacion, MetadatosLibro metadatos, OrigenLibro origen) { }
    public record Edicion(long versionLibro, MetadatosLibro metadatos) { }
    public record Estado(long versionLibro, EstadoLectura estado, boolean confirmarFinalizacion) { }
    public record Avance(UUID idOperacion, long versionLibro, int paginaActual, String nota) { }
}
