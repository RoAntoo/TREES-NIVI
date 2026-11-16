package ar.edu.nivi.infraestructura.salida.catalogo;

import jakarta.validation.constraints.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import java.net.URI;
import java.time.Duration;

@Validated @ConfigurationProperties("nivi.catalogo")
public record PropiedadesCatalogo(@NotNull URI base, @NotBlank @Size(max = 200) String identificacion,
        @NotNull Duration conexion, @NotNull Duration lectura, @NotNull Duration presupuesto,
        @NotNull Duration intervalo, @Min(1) @Max(10000) int cacheEntradas,
        @NotNull Duration cacheDuracion, @NotNull Duration cacheAusencias) {
    @AssertTrue(message = "El catálogo debe usar https://openlibrary.org y una identificación con contacto.")
    public boolean isProveedorValido() {
        return URI.create("https://openlibrary.org").equals(base) && identificacion != null
                && identificacion.contains("@") && !identificacion.contains("\n") && !identificacion.contains("\r");
    }
    @AssertTrue(message = "Los tiempos deben ser positivos y el presupuesto no puede superar diez segundos.")
    public boolean isTiemposValidos() {
        return positivos(conexion, lectura, presupuesto, intervalo, cacheDuracion, cacheAusencias)
                && presupuesto.compareTo(Duration.ofSeconds(10)) <= 0;
    }
    private boolean positivos(Duration... valores) {
        for (var d : valores) if (d == null || d.isNegative() || d.isZero()) return false;
        return true;
    }
}
