package ar.edu.nivi.dominio.modelo;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import static ar.edu.nivi.dominio.modelo.EstadoLectura.*;

public record Libro(UUID id, MetadatosLibro metadatos, int paginaActual, EstadoLectura estado,
        OrigenLibro origen, long version, Instant creadoEn, Instant actualizadoEn, Instant terminadoEn) {
    public static Libro nuevo(MetadatosLibro metadatos, OrigenLibro origen, Instant ahora) {
        Objects.requireNonNull(origen);
        return new Libro(UUID.randomUUID(), metadatos, 0, PENDIENTE, origen, 0, ahora, ahora, null);
    }

    public void comprobarVersion(long esperada) {
        if (esperada != version) throw new ExcepcionNegocio(ExcepcionNegocio.Tipo.CONFLICTO,
                "VERSION_DESACTUALIZADA", "El libro cambió. Consultá su versión actual y volvé a intentar.");
    }

    public Libro editar(MetadatosLibro datos, Instant ahora) {
        validarPagina(paginaActual, datos.totalPaginas());
        return new Libro(id, datos, paginaActual, estado, origen, version + 1, creadoEn, ahora, terminadoEn);
    }

    public Libro cambiarEstado(EstadoLectura nuevo, boolean confirmarFinalizacion, Instant ahora) {
        if (nuevo == null) throw ExcepcionNegocio.campo("ESTADO_INVALIDO", "estado", "Elegí un estado.");
        if (nuevo == estado) return this;
        boolean permitido = switch (estado) {
            case PENDIENTE -> nuevo == LEYENDO || nuevo == TERMINADO;
            case LEYENDO -> nuevo == PAUSADO || nuevo == TERMINADO;
            case PAUSADO -> nuevo == LEYENDO || nuevo == TERMINADO;
            case TERMINADO -> nuevo == LEYENDO;
        };
        if (!permitido) throw ExcepcionNegocio.campo("TRANSICION_INVALIDA", "estado", "No se admite ese cambio de estado.");
        if (nuevo == TERMINADO && !confirmarFinalizacion && !Objects.equals(metadatos.totalPaginas(), paginaActual))
            throw ExcepcionNegocio.campo("CONFIRMACION_REQUERIDA", "confirmarFinalizacion", "Confirmá la finalización anticipada o sin total de páginas.");
        return new Libro(id, metadatos, paginaActual, nuevo, origen, version + 1, creadoEn, ahora,
                nuevo == TERMINADO ? ahora : null);
    }

    public Libro avanzar(int pagina, Instant ahora) {
        if (estado != LEYENDO) throw ExcepcionNegocio.campo("LECTURA_NO_ACTIVA", "estado", "Iniciá o retomá la lectura antes de registrar un avance.");
        validarPagina(pagina, metadatos.totalPaginas());
        boolean terminado = Objects.equals(metadatos.totalPaginas(), pagina);
        return new Libro(id, metadatos, pagina, terminado ? TERMINADO : LEYENDO, origen, version + 1,
                creadoEn, ahora, terminado ? ahora : null);
    }

    private static void validarPagina(int pagina, Integer total) {
        if (pagina < 0) throw ExcepcionNegocio.campo("PAGINA_INVALIDA", "paginaActual", "La página debe ser un entero no negativo.");
        if (total != null && pagina > total) throw ExcepcionNegocio.campo("PAGINA_SUPERA_TOTAL", "paginaActual", "La página actual no puede superar el total del libro.");
    }
}
