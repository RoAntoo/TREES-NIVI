package ar.edu.nivi.infraestructura.salida.persistencia;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "registros_lectura")
public class RegistroEntidad {
    @Id UUID id;
    @Column(nullable = false) UUID libroId;
    @Column(nullable = false) int paginaAnterior;
    @Column(nullable = false) int paginaActual;
    @Column(length = 2000) String nota;
    @Column(nullable = false) Instant creadoEn;
    @Column(nullable = false, unique = true) UUID idOperacion;
    protected RegistroEntidad() { }
}
