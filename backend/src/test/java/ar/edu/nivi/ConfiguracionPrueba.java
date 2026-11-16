package ar.edu.nivi;

import ar.edu.nivi.configuracion.ConfiguracionSeguridad;
import ar.edu.nivi.configuracion.ConfiguracionLocal;
import ar.edu.nivi.infraestructura.seguridad.PropiedadesAcceso;
import ar.edu.nivi.infraestructura.salida.catalogo.PropiedadesCatalogo;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;

class ConfiguracionPrueba {
    @Test void rechazaSecretosAusentesDebilesYDuracionExcesiva() {
        try (var fabrica = Validation.buildDefaultValidatorFactory()) {
            var validador = fabrica.getValidator();
            assertThat(validador.validate(new PropiedadesAcceso("", "", "", Duration.ofHours(2)))).isNotEmpty();
            assertThat(validador.validate(new PropiedadesAcceso("personal", "corta", "debil", Duration.ofDays(2)))).isNotEmpty();
            assertThat(validador.validate(new PropiedadesAcceso("personal", "una-contrasena-larga", "un-secreto-aleatorio-con-treinta-y-dos-bytes", Duration.ofHours(2)))).isEmpty();
        }
    }
    @Test void proveedorFijoIdentificadoYConPresupuestoMaximo() {
        try (var fabrica = Validation.buildDefaultValidatorFactory()) {
            var validador = fabrica.getValidator();
            assertThat(validador.validate(new PropiedadesCatalogo(URI.create("https://example.org"), "Sin contacto", Duration.ofSeconds(1),
                    Duration.ofSeconds(2), Duration.ofSeconds(11), Duration.ofSeconds(1), 500, Duration.ofMinutes(15), Duration.ofSeconds(30)))).isNotEmpty();
        }
    }
    @Test void corsNoAdmiteComodin() {
        assertThatThrownBy(() -> new ConfiguracionSeguridad().origenes("*")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void modoSinCuentaNoPuedeEscucharEnLaRed() {
        assertThatThrownBy(() -> new ConfiguracionLocal().seguridadLocal(null, null, null, null, "0.0.0.0"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("127.0.0.1");
    }
}
