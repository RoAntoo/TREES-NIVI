package ar.edu.nivi.configuracion;

import ar.edu.nivi.infraestructura.seguridad.PropiedadesAcceso;
import ar.edu.nivi.infraestructura.seguridad.FiltroLimites;
import ar.edu.nivi.infraestructura.entrada.http.error.EscritorError;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.filter.CorsFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import ar.edu.nivi.infraestructura.entrada.http.error.ErrorApi;
import org.springframework.web.cors.*;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Configuration @Profile("!local & !azure") @EnableConfigurationProperties(PropiedadesAcceso.class)
public class ConfiguracionSeguridad {
    @Bean JwtEncoder codificadorJwt(PropiedadesAcceso p) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(p.secreto().getBytes(StandardCharsets.UTF_8)));
    }
    @Bean JwtDecoder decodificadorJwt(PropiedadesAcceso p) {
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(p.secreto().getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> audiencia = jwt -> jwt.getAudience().contains("nivi-lectura")
                && p.usuario().equals(jwt.getSubject()) ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer("nivi"), audiencia));
        return decoder;
    }
    @Bean public CorsConfigurationSource origenes(@Value("${nivi.cors.origenes}") String origenes) {
        List<String> lista = Arrays.stream(origenes.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
        if (lista.isEmpty() || lista.stream().anyMatch(s -> s.contains("*"))) throw new IllegalArgumentException("Configurá orígenes CORS explícitos.");
        var cors = new CorsConfiguration(); cors.setAllowedOrigins(lista);
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        cors.setExposedHeaders(List.of("Location", "X-Request-Id", "Retry-After")); cors.setAllowCredentials(false); cors.setMaxAge(600L);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", cors); return source;
    }
    @Bean SecurityFilterChain seguridad(HttpSecurity http, EscritorError errores,
            @Qualifier("origenes") CorsConfigurationSource origenes, ObjectMapper json) throws Exception {
        var filtroCors = filtroCors(origenes, json);
        return http.csrf(c -> c.disable()).cors(c -> c.disable()).addFilterAt(filtroCors, CorsFilter.class)
                .addFilterAfter(new FiltroLimites(errores), CorsFilter.class)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.POST, "/api/v1/acceso").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll().anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> errores.escribir(req, res, 401, "SESION_REQUERIDA", "Accedé para continuar."))
                        .accessDeniedHandler((req, res, ex) -> errores.escribir(req, res, 403, "ACCESO_DENEGADO", "No se permite esta operación.")))
                .oauth2ResourceServer(o -> o.jwt(j -> {}).authenticationEntryPoint((req, res, ex) -> errores.escribir(req, res, 401, "SESION_INVALIDA", "La sesión venció o no es válida.")))
                .build();
    }
    static CorsFilter filtroCors(CorsConfigurationSource origenes, ObjectMapper json) {
        var filtroCors = new CorsFilter(origenes);
        filtroCors.setCorsProcessor(new DefaultCorsProcessor() {
            @Override protected void rejectRequest(org.springframework.http.server.ServerHttpResponse res) throws java.io.IOException {
                res.setStatusCode(org.springframework.http.HttpStatus.FORBIDDEN);
                res.getHeaders().setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                json.writeValue(res.getBody(), new ErrorApi("ORIGEN_NO_PERMITIDO", "El origen no está permitido.", Map.of(), res.getHeaders().getFirst("X-Request-Id")));
                res.flush();
            }
        });
        return filtroCors;
    }
}
