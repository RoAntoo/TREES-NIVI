package ar.edu.nivi.configuracion;

import ar.edu.nivi.aplicacion.puerto.salida.Reloj;
import org.springframework.context.annotation.*;
import java.time.Instant;

@Configuration
public class ConfiguracionAplicacion {
    @Bean Reloj reloj() { return Instant::now; }
}
