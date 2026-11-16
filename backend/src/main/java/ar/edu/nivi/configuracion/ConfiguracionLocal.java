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

/** Biblioteca personal directa, accesible desde la PC o mediante ADB reverse. */
@Configuration @Profile("local")
public class ConfiguracionLocal {
    @Bean CorsConfigurationSource origenesLocales(@Value("${nivi.cors.origenes}") String origenes) {
        return new ConfiguracionSeguridad().origenes(origenes);
    }
    @Bean public SecurityFilterChain seguridadLocal(HttpSecurity http, EscritorError errores,
            @Qualifier("origenesLocales") CorsConfigurationSource origenesLocales, ObjectMapper json,
            @Value("${server.address:}") String direccion) throws Exception {
        if (!direccion.equals("127.0.0.1")) throw new IllegalArgumentException("El perfil local sin cuenta requiere server.address=127.0.0.1. Usá ADB reverse para Android.");
        return http.csrf(c -> c.disable()).cors(c -> c.disable())
                .addFilterAt(ConfiguracionSeguridad.filtroCors(origenesLocales, json), CorsFilter.class)
                .addFilterAfter(new FiltroLimites(errores), CorsFilter.class)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers("/api/v1/**").permitAll().anyRequest().denyAll())
                .build();
    }
}
