package ar.edu.nivi.aplicacion.puerto.salida;

import ar.edu.nivi.aplicacion.modelo.Resultados.Operacion;
import java.util.*;

public interface RepositorioOperaciones {
    Optional<Operacion> buscarOperacion(UUID id);
    void guardarOperacion(UUID id, UUID libroId, Operacion operacion);
}
