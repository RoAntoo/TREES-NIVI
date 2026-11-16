package ar.edu.nivi.aplicacion.modelo;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import java.util.List;

public record Pagina<T>(List<T> elementos, int pagina, int tamano, long totalElementos, int totalPaginas) {
    public Pagina { elementos = List.copyOf(elementos); }
    public static void validar(int pagina, int tamano) {
        if (pagina < 1 || pagina > 100000 || tamano < 1 || tamano > 50)
            throw ExcepcionNegocio.campo("PAGINACION_INVALIDA", "pagina", "Usá página entre 1 y 100000 y tamaño entre 1 y 50.");
    }
}
