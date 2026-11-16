package ar.edu.nivi.infraestructura.salida.persistencia;

import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name = "operaciones")
public class OperacionEntidad {
    @Id UUID id;
    @Column(nullable = false) UUID libroId;
    @Column(nullable = false, length = 64) String huella;
    @Column(nullable = false, length = org.hibernate.Length.LONG32) String resultado;
    protected OperacionEntidad() { }
}
