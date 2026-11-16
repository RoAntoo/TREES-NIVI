package ar.edu.nivi.configuracion;

import ar.edu.nivi.aplicacion.puerto.salida.CatalogoLibros;
import ar.edu.nivi.infraestructura.salida.catalogo.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

@Configuration @EnableConfigurationProperties(PropiedadesCatalogo.class)
public class ConfiguracionCatalogo {
    @Bean CatalogoLibros catalogo(PropiedadesCatalogo propiedades, ObjectMapper json) { return new AdaptadorOpenLibrary(propiedades, json); }
}
