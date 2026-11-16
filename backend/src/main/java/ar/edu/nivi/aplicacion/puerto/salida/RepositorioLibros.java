package ar.edu.nivi.aplicacion.puerto.salida;

import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.dominio.modelo.*;
import java.util.*;

public interface RepositorioLibros {
    Optional<Libro> buscar(UUID id);
    Libro guardar(Libro libro);
    void eliminar(UUID id);
    boolean existeEdicion(MetadatosLibro metadatos, UUID excluir);
    boolean hayCoincidencia(MetadatosLibro metadatos);
    Pagina<Libro> listar(EstadoLectura estado, String consulta, int pagina, int tamano);
    Map<EstadoLectura, Long> contarPorEstado();
    List<Libro> lecturasActivas(int limite);
}
