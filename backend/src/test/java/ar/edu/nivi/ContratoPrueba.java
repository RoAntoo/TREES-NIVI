package ar.edu.nivi;

import io.swagger.v3.parser.OpenAPIV3Parser;
import io.swagger.v3.parser.core.models.ParseOptions;
import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.*;

class ContratoPrueba {
    @Test void contratoOpenApiEsValidoYContieneTodasLasOperaciones() {
        var opciones = new ParseOptions(); opciones.setResolve(true);
        var resultado = new OpenAPIV3Parser().readLocation(Path.of("../docs/contrato-api.yaml").toAbsolutePath().toString(), null, opciones);
        assertThat(resultado.getMessages()).isEmpty(); assertThat(resultado.getOpenAPI()).isNotNull();
        var api = resultado.getOpenAPI();
        assertThat(api.getPaths().values().stream().flatMap(p -> p.readOperations().stream()).map(o -> o.getOperationId()).toList())
                .containsExactlyInAnyOrder("acceder", "listarLibros", "agregarLibro", "detalleLibro", "eliminarLibro", "editarMetadatos",
                        "cambiarEstado", "historialLectura", "registrarAvance", "resumenInicio", "buscarCatalogo", "identificarIsbn", "consultarEdicion", "listarEdiciones");
        assertThat(api.getSecurity()).hasSize(1);
    }
}
