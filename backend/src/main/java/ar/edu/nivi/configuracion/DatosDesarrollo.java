package ar.edu.nivi.configuracion;

import ar.edu.nivi.aplicacion.modelo.Solicitudes.Alta;
import ar.edu.nivi.aplicacion.puerto.entrada.Biblioteca;
import ar.edu.nivi.dominio.modelo.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import java.util.*;

@Configuration @Profile("desarrollo")
@ConditionalOnProperty(name = "nivi.desarrollo.cargar-ejemplo", havingValue = "true")
public class DatosDesarrollo {
    @Bean ApplicationRunner cargarEjemplo(Biblioteca biblioteca) {
        return args -> {
            if (biblioteca.listar(null, "", 1, 1).totalElementos() == 0) {
                biblioteca.agregar(new Alta(UUID.fromString("11111111-1111-4111-8111-111111111111"),
                        new MetadatosLibro("El viaje de ejemplo", List.of("Autora ficticia"), null, null, null, null, 120), OrigenLibro.MANUAL));
            }
        };
    }
}
