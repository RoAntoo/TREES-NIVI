package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.dominio.modelo.*;
import java.util.ArrayList;

final class MapeadorPersistencia {
    private MapeadorPersistencia() { }
    static Libro dominio(LibroEntidad e) {
        return new Libro(e.id, new MetadatosLibro(e.titulo, e.autores, e.isbn, e.idEdicionExterna,
                e.idObraExterna, e.urlPortada, e.totalPaginas), e.paginaActual, e.estado, e.origen,
                e.version, e.creadoEn, e.actualizadoEn, e.terminadoEn);
    }
    static void copiar(Libro l, LibroEntidad e) {
        var m = l.metadatos();
        e.id = l.id(); e.titulo = m.titulo(); e.autores = new ArrayList<>(m.autores());
        e.isbn = m.isbn(); e.isbnCanonico = Isbn.canonico(m.isbn()); e.idEdicionExterna = m.idEdicionExterna();
        e.idObraExterna = m.idObraExterna(); e.urlPortada = m.urlPortada(); e.totalPaginas = m.totalPaginas();
        e.paginaActual = l.paginaActual(); e.estado = l.estado(); e.origen = l.origen();
        e.creadoEn = l.creadoEn(); e.actualizadoEn = l.actualizadoEn(); e.terminadoEn = l.terminadoEn();
    }
    static RegistroLectura dominio(RegistroEntidad e) {
        return new RegistroLectura(e.id, e.libroId, e.paginaAnterior, e.paginaActual, e.nota, e.creadoEn, e.idOperacion);
    }
    static RegistroEntidad entidad(RegistroLectura r) {
        var e = new RegistroEntidad(); e.id = r.id(); e.libroId = r.libroId(); e.paginaAnterior = r.paginaAnterior();
        e.paginaActual = r.paginaActual(); e.nota = r.nota(); e.creadoEn = r.creadoEn(); e.idOperacion = r.idOperacion();
        return e;
    }
}
