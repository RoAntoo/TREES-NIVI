package ar.edu.nivi.infraestructura.entrada.http.dto;

import ar.edu.nivi.aplicacion.modelo.Solicitudes;
import ar.edu.nivi.dominio.modelo.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

public final class Entradas {
    private Entradas() { }
    public record Metadatos(@NotBlank @Size(max = 255) String titulo,
            @Size(max = 10) List<@NotBlank @Size(max = 150) String> autores,
            @Size(max = 40) String isbn, @Size(max = 40) String idEdicionExterna,
            @Size(max = 40) String idObraExterna, @Size(max = 500) String urlPortada,
            @Min(1) @Max(100000) Integer totalPaginas) {
        public MetadatosLibro modelo() { return new MetadatosLibro(titulo, autores, isbn, idEdicionExterna, idObraExterna, urlPortada, totalPaginas); }
    }
    public record Alta(@NotNull UUID idOperacion, @NotNull @Valid Metadatos metadatos, @NotNull OrigenLibro origen) {
        public Solicitudes.Alta modelo() { return new Solicitudes.Alta(idOperacion, metadatos.modelo(), origen); }
    }
    public record Edicion(@NotNull @PositiveOrZero Long versionLibro, @NotNull @Valid Metadatos metadatos) {
        public Solicitudes.Edicion modelo() { return new Solicitudes.Edicion(versionLibro, metadatos.modelo()); }
    }
    public record Estado(@NotNull @PositiveOrZero Long versionLibro, @NotNull EstadoLectura estado, boolean confirmarFinalizacion) {
        public Solicitudes.Estado modelo() { return new Solicitudes.Estado(versionLibro, estado, confirmarFinalizacion); }
    }
    public record Avance(@NotNull UUID idOperacion, @NotNull @PositiveOrZero Long versionLibro,
            @NotNull @PositiveOrZero Integer paginaActual, @Size(max = 2000) String nota) {
        public Solicitudes.Avance modelo() { return new Solicitudes.Avance(idOperacion, versionLibro, paginaActual, nota); }
    }
}
