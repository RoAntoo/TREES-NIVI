package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.aplicacion.puerto.salida.RepositorioRegistrosLectura;
import ar.edu.nivi.dominio.modelo.RegistroLectura;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class AdaptadorRegistros implements RepositorioRegistrosLectura {
    @PersistenceContext private EntityManager em;
    @Override public void guardar(RegistroLectura registro) { em.persist(MapeadorPersistencia.entidad(registro)); em.flush(); }
    @Override public Optional<RegistroLectura> ultimo(UUID id) {
        return em.createQuery("select r from RegistroEntidad r where r.libroId = :id order by r.creadoEn desc, r.id desc", RegistroEntidad.class)
                .setParameter("id", id).setMaxResults(1).getResultStream().map(MapeadorPersistencia::dominio).findFirst();
    }
    @Override public Pagina<RegistroLectura> listar(UUID id, int pagina, int tamano) {
        long total = em.createQuery("select count(r) from RegistroEntidad r where r.libroId = :id", Long.class)
                .setParameter("id", id).getSingleResult();
        var elementos = em.createQuery("select r from RegistroEntidad r where r.libroId = :id order by r.creadoEn desc, r.id desc", RegistroEntidad.class)
                .setParameter("id", id).setFirstResult((pagina - 1) * tamano).setMaxResults(tamano)
                .getResultStream().map(MapeadorPersistencia::dominio).toList();
        return new Pagina<>(elementos, pagina, tamano, total, (int) ((total + tamano - 1) / tamano));
    }
}
