package ar.edu.nivi.infraestructura.entrada.http.controlador;

import ar.edu.nivi.infraestructura.seguridad.PropiedadesAcceso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.context.annotation.Profile;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;

@RestController @Profile("!local & !azure") @RequestMapping("/api/v1/acceso")
public class ControladorAcceso {
    private final PropiedadesAcceso propiedades;
    private final JwtEncoder jwt;
    private final BCryptPasswordEncoder contrasenas = new BCryptPasswordEncoder(12);
    private final String hash;
    public ControladorAcceso(PropiedadesAcceso propiedades, JwtEncoder jwt) {
        this.propiedades = propiedades; this.jwt = jwt; hash = contrasenas.encode(propiedades.contrasena());
    }
    public record Entrada(@NotBlank @Size(max = 100) String usuario, @NotBlank @Size(max = 72) String contrasena) {
        @Override public String toString() { return "Entrada[credenciales ocultas]"; }
    }
    public record Sesion(String token, Instant venceEn, String tipo) { }
    @PostMapping public ResponseEntity<Sesion> acceder(@Valid @RequestBody Entrada entrada) {
        boolean usuario = MessageDigest.isEqual(entrada.usuario().getBytes(StandardCharsets.UTF_8), propiedades.usuario().getBytes(StandardCharsets.UTF_8));
        boolean contrasena = entrada.contrasena().getBytes(StandardCharsets.UTF_8).length <= 72
                && contrasenas.matches(entrada.contrasena(), hash);
        if (!(usuario & contrasena)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas.");
        Instant ahora = Instant.now(), vencimiento = ahora.plus(propiedades.duracion());
        var claims = JwtClaimsSet.builder().issuer("nivi").subject(propiedades.usuario()).audience(List.of("nivi-lectura"))
                .issuedAt(ahora).expiresAt(vencimiento).build();
        String token = jwt.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Sesion(token, vencimiento, "Bearer"));
    }
}
