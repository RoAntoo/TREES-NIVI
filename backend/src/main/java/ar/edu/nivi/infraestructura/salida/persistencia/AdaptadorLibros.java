package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.aplicacion.puerto.salida.RepositorioLibros;
import ar.edu.nivi.dominio.modelo.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class AdaptadorLibros implements RepositorioLibros {
    @PersistenceContext private EntityManager em;
    @Override public Optional<Libro> buscar(UUID id) {
        return Optional.ofNullable(em.find(LibroEntidad.class, id)).map(MapeadorPersistencia::dominio);
    }
    @Override public Libro guardar(Libro libro) {
        LibroEntidad entidad = em.find(LibroEntidad.class, libro.id());
        if (entidad == null) {
            entidad = new LibroEntidad(); MapeadorPersistencia.copiar(libro, entidad); em.persist(entidad);
        } else { MapeadorPersistencia.copiar(libro, entidad); }
        em.flush();
        return MapeadorPersistencia.dominio(entidad);
    }
    @Override public void eliminar(UUID id) {
        // Borra las copias con notas; conserva solamente la identidad de operaciones como tombstone.
        em.createQuery("delete from RegistroEntidad r where r.libroId = :id").setParameter("id", id).executeUpdate();
        em.createQuery("update OperacionEntidad o set o.resultado = '' where o.libroId = :id").setParameter("id", id).executeUpdate();
        em.remove(em.find(LibroEntidad.class, id)); em.flush();
    }
    @Override public boolean existeEdicion(MetadatosLibro datos, UUID excluir) {
        return em.createQuery("select count(l) from LibroEntidad l where (:excluir is null or l.id <> :excluir) and "
                + "((:isbn is not null and l.isbnCanonico = :isbn) or (:edicion is not null and l.idEdicionExterna = :edicion))", Long.class)
                .setParameter("excluir", excluir).setParameter("isbn", Isbn.canonico(datos.isbn()))
                .setParameter("edicion", datos.idEdicionExterna()).getSingleResult() > 0;
    }
    @Override public boolean hayCoincidencia(MetadatosLibro datos) {
        return em.createQuery("select l from LibroEntidad l where lower(l.titulo) = :titulo", LibroEntidad.class)
                .setParameter("titulo", datos.titulo().toLowerCase(Locale.ROOT)).getResultStream()
                .anyMatch(l -> l.autores.stream().map(a -> a.toLowerCase(Locale.ROOT)).toList()
                        .equals(datos.autores().stream().map(a -> a.toLowerCase(Locale.ROOT)).toList()));
    }
    @Override public Pagina<Libro> listar(EstadoLectura estado, String consulta, int pagina, int tamano) {
        String filtro = " where (:estado is null or l.estado = :estado) and (lower(l.titulo) like :q escape '!' "
                + "or exists (select a from LibroEntidad x join x.autores a where x.id = l.id and lower(a) like :q escape '!'))";
        String q = "%" + consulta.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        long total = em.createQuery("select count(l) from LibroEntidad l" + filtro, Long.class)
                .setParameter("estado", estado).setParameter("q", q).getSingleResult();
        List<Libro> elementos = em.createQuery("select l from LibroEntidad l" + filtro + " order by l.creadoEn desc, l.id desc", LibroEntidad.class)
                .setParameter("estado", estado).setParameter("q", q).setFirstResult((pagina - 1) * tamano)
                .setMaxResults(tamano).getResultStream().map(MapeadorPersistencia::dominio).toList();
        return new Pagina<>(elementos, pagina, tamano, total, (int) ((total + tamano - 1) / tamano));
    }
    @Override public Map<EstadoLectura, Long> contarPorEstado() {
        var conteos = new EnumMap<EstadoLectura, Long>(EstadoLectura.class);
        for (var estado : EstadoLectura.values()) conteos.put(estado, 0L);
        em.createQuery("select l.estado, count(l) from LibroEntidad l group by l.estado", Object[].class)
                .getResultList().forEach(fila -> conteos.put((EstadoLectura) fila[0], (Long) fila[1]));
        return conteos;
    }
    @Override public List<Libro> lecturasActivas(int limite) {
        return em.createQuery("select l from LibroEntidad l where l.estado = :estado order by l.actualizadoEn desc, l.id desc", LibroEntidad.class)
                .setParameter("estado", EstadoLectura.LEYENDO).setMaxResults(limite).getResultStream().map(MapeadorPersistencia::dominio).toList();
    }
}
