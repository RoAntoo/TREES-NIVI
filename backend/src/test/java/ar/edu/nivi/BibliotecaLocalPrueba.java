package ar.edu.nivi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:local", "nivi.catalogo.identificacion=NiviPruebas (pruebas@example.org)"})
@ActiveProfiles("local") @AutoConfigureMockMvc
class BibliotecaLocalPrueba {
    @Autowired MockMvc http;
    @Test void consultaYGuardaSinUsuarioContrasenaNiToken() throws Exception {
        http.perform(get("/api/v1/resumen")).andExpect(status().isOk());
        http.perform(post("/api/v1/libros").contentType(MediaType.APPLICATION_JSON).content("""
            {"idOperacion":"%s","origen":"MANUAL","metadatos":{"titulo":"Libro sin cuenta","autores":[]}}
            """.formatted(UUID.randomUUID()))).andExpect(status().isCreated()).andExpect(jsonPath("$.libro.titulo").value("Libro sin cuenta"));
        http.perform(get("/api/v1/libros")).andExpect(status().isOk());
    }
    @Test void noExponeLoginNiAceptaOrigenAjeno() throws Exception {
        http.perform(post("/api/v1/acceso").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
        http.perform(get("/api/v1/resumen").header("Origin", "https://sitio-ajeno.example"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ORIGEN_NO_PERMITIDO"));
    }
}
