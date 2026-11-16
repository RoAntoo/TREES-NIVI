package ar.edu.nivi.aplicacion.puerto.entrada;

import ar.edu.nivi.aplicacion.modelo.*;
import ar.edu.nivi.aplicacion.modelo.Resultados.*;
import ar.edu.nivi.aplicacion.modelo.Solicitudes.*;
import ar.edu.nivi.dominio.modelo.*;
import java.util.UUID;

public interface Biblioteca {
    Escritura agregar(Alta solicitud);
    Detalle detalle(UUID id);
    Pagina<Libro> listar(EstadoLectura estado, String consulta, int pagina, int tamano);
    Libro editar(UUID id, Edicion solicitud);
    Libro cambiarEstado(UUID id, Estado solicitud);
    void eliminar(UUID id, long version);
    Escritura registrar(UUID id, Avance solicitud);
    Pagina<RegistroLectura> historial(UUID id, int pagina, int tamano);
    Resumen resumen();
}
