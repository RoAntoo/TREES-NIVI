package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.aplicacion.caso.GestionBiblioteca;
import ar.edu.nivi.aplicacion.modelo.*;
import ar.edu.nivi.aplicacion.modelo.Resultados.*;
import ar.edu.nivi.aplicacion.modelo.Solicitudes.*;
import ar.edu.nivi.aplicacion.puerto.entrada.Biblioteca;
import ar.edu.nivi.aplicacion.puerto.salida.*;
import ar.edu.nivi.dominio.modelo.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.util.UUID;

@Service @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class BibliotecaTransaccional implements Biblioteca {
    @PersistenceContext private EntityManager em;
    private final GestionBiblioteca casos;
    public BibliotecaTransaccional(RepositorioLibros libros, RepositorioRegistrosLectura registros,
            RepositorioOperaciones operaciones, Reloj reloj) { casos = new GestionBiblioteca(libros, registros, operaciones, reloj); }
    private void bloquear() { em.createNativeQuery("SELECT id FROM bloqueo_biblioteca WHERE id = 1 FOR UPDATE").getSingleResult(); }
    @Override @Transactional public Escritura agregar(Alta s) { bloquear(); return casos.agregar(s); }
    @Override public Detalle detalle(UUID id) { return casos.detalle(id); }
    @Override public Pagina<Libro> listar(EstadoLectura e, String q, int p, int t) { return casos.listar(e, q, p, t); }
    @Override @Transactional public Libro editar(UUID id, Edicion s) { bloquear(); return casos.editar(id, s); }
    @Override @Transactional public Libro cambiarEstado(UUID id, Estado s) { bloquear(); return casos.cambiarEstado(id, s); }
    @Override @Transactional public void eliminar(UUID id, long v) { bloquear(); casos.eliminar(id, v); }
    @Override @Transactional public Escritura registrar(UUID id, Avance s) { bloquear(); return casos.registrar(id, s); }
    @Override public Pagina<RegistroLectura> historial(UUID id, int p, int t) { return casos.historial(id, p, t); }
    @Override public Resumen resumen() { return casos.resumen(); }
}
