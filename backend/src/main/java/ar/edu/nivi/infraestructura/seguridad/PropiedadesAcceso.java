package ar.edu.nivi.infraestructura.seguridad;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Validated @ConfigurationProperties("nivi.acceso")
public record PropiedadesAcceso(@NotBlank @Size(max = 100) String usuario,
        String contrasena, String secreto, @NotNull Duration duracion) {
    @AssertTrue(message = "AUTH_JWT_SECRET debe tener al menos 32 bytes y AUTH_PASSWORD entre 12 y 72 bytes.")
    public boolean isSecretosValidos() {
        // Validar conjuntamente evita que un error de binding imprima el secreto como valor rechazado.
        return secreto != null && !secreto.isBlank() && secreto.getBytes(StandardCharsets.UTF_8).length >= 32
                && contrasena != null && !contrasena.isBlank()
                && contrasena.getBytes(StandardCharsets.UTF_8).length >= 12 && contrasena.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
    @AssertTrue(message = "La duración de sesión debe estar entre un minuto y 24 horas.")
    public boolean isDuracionValida() { return duracion != null && duracion.compareTo(Duration.ofMinutes(1)) >= 0 && duracion.compareTo(Duration.ofHours(24)) <= 0; }
    @Override public String toString() { return "PropiedadesAcceso[secretos ocultos]"; }
}
