package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.dominio.modelo.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "libros")
public class LibroEntidad {
    @Id UUID id;
    @Column(nullable = false, length = 255) String titulo;
    @ElementCollection @CollectionTable(name = "autores_libro", joinColumns = @JoinColumn(name = "libro_id"))
    @OrderColumn(name = "posicion") @Column(name = "nombre", nullable = false, length = 150)
    List<String> autores = new ArrayList<>();
    @Column(length = 13) String isbn;
    @Column(name = "isbn_canonico", length = 13, unique = true) String isbnCanonico;
    @Column(name = "id_edicion_externa", length = 40, unique = true) String idEdicionExterna;
    @Column(name = "id_obra_externa", length = 40) String idObraExterna;
    @Column(length = 500) String urlPortada;
    Integer totalPaginas;
    @Column(nullable = false) int paginaActual;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) EstadoLectura estado;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) OrigenLibro origen;
    @Version Long version;
    @Column(nullable = false) Instant creadoEn;
    @Column(nullable = false) Instant actualizadoEn;
    Instant terminadoEn;
    protected LibroEntidad() { }
}
