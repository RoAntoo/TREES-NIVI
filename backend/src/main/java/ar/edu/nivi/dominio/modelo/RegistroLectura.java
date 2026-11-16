package ar.edu.nivi.dominio.modelo;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import java.time.Instant;
import java.util.UUID;

public record RegistroLectura(UUID id, UUID libroId, int paginaAnterior, int paginaActual,
        String nota, Instant creadoEn, UUID idOperacion) {
    public RegistroLectura {
        nota = nota == null || nota.isBlank() ? null : nota.strip();
        if (nota != null && nota.length() > 2000) throw ExcepcionNegocio.campo("NOTA_LARGA", "nota", "La nota admite hasta 2000 caracteres.");
    }
}
