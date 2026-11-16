package ar.edu.nivi;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

class MigracionesPrueba {
    @TempDir Path temporal;
    @Test void migraBaseVaciaYReabreSinPerderDatos() throws Exception {
        String url = "jdbc:h2:file:" + temporal.resolve("lecturas").toAbsolutePath().toString().replace('\\', '/');
        Flyway primera = Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration").load();
        assertThat(primera.migrate().migrationsExecuted).isEqualTo(1);
        try (var c = DriverManager.getConnection(url, "sa", ""); var sentencia = c.createStatement()) {
            sentencia.executeUpdate("insert into operaciones (id,libro_id,huella,resultado) values (random_uuid(),random_uuid(),'prueba','')");
        }
        Flyway segunda = Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration").load();
        segunda.validate(); assertThat(segunda.migrate().migrationsExecuted).isZero();
        try (var c = DriverManager.getConnection(url, "sa", ""); var s = c.createStatement(); var r = s.executeQuery("select count(*) from operaciones")) {
            r.next(); assertThat(r.getInt(1)).isEqualTo(1);
        }
    }
}
