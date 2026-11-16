package ar.edu.nivi.aplicacion.puerto.salida;

import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.dominio.modelo.RegistroLectura;
import java.util.*;

public interface RepositorioRegistrosLectura {
    void guardar(RegistroLectura registro);
    Optional<RegistroLectura> ultimo(UUID libroId);
    Pagina<RegistroLectura> listar(UUID libroId, int pagina, int tamano);
}
