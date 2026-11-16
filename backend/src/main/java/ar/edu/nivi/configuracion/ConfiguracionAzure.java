package ar.edu.nivi.configuracion;

import ar.edu.nivi.infraestructura.entrada.http.error.EscritorError;
import ar.edu.nivi.infraestructura.seguridad.FiltroLimites;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/** Biblioteca de demostración protegida por restricciones IP de App Service. */
@Configuration @Profile("azure & !local")
public class ConfiguracionAzure {
    @Bean CorsConfigurationSource origenesAzure(@Value("${nivi.cors.origenes}") String origenes) {
        return new ConfiguracionSeguridad().origenes(origenes);
    }
    @Bean public SecurityFilterChain seguridadAzure(HttpSecurity http, EscritorError errores,
            @Qualifier("origenesAzure") CorsConfigurationSource origenesAzure, ObjectMapper json) throws Exception {
        return http.csrf(c -> c.disable()).cors(c -> c.disable())
                .addFilterAt(ConfiguracionSeguridad.filtroCors(origenesAzure, json), CorsFilter.class)
                .addFilterAfter(new FiltroLimites(errores), CorsFilter.class)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers("/api/v1/**").permitAll().anyRequest().denyAll())
                .build();
    }
}
