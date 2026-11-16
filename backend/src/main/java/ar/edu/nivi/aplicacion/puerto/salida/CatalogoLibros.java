package ar.edu.nivi.aplicacion.puerto.salida;

import ar.edu.nivi.aplicacion.modelo.Resultados.*;

public interface CatalogoLibros {
    Catalogo buscar(String consulta, int pagina, int tamano);
    Candidato porIsbn(String isbn);
    Candidato porEdicion(String idEdicion);
    EdicionesCatalogo ediciones(String idObra, int pagina, int tamano);
}
