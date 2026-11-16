package ar.edu.nivi.infraestructura.entrada.http.controlador;

import ar.edu.nivi.aplicacion.modelo.Pagina;
import ar.edu.nivi.aplicacion.puerto.entrada.Biblioteca;
import ar.edu.nivi.dominio.modelo.EstadoLectura;
import ar.edu.nivi.infraestructura.entrada.http.dto.*;
import ar.edu.nivi.infraestructura.entrada.http.dto.Salidas.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.UUID;

@RestController @RequestMapping("/api/v1") @Validated
public class ControladorBiblioteca {
    private final Biblioteca biblioteca;
    public ControladorBiblioteca(Biblioteca biblioteca) { this.biblioteca = biblioteca; }
    @GetMapping("/libros") public Pagina<LibroRespuesta> listar(@RequestParam(required = false) EstadoLectura estado,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "1") int pagina, @RequestParam(defaultValue = "20") int tamano) {
        return Salidas.pagina(biblioteca.listar(estado, q, pagina, tamano), Salidas::libro);
    }
    @PostMapping("/libros") public ResponseEntity<EscrituraRespuesta> agregar(@Valid @RequestBody Entradas.Alta entrada) {
        var resultado = biblioteca.agregar(entrada.modelo());
        return ResponseEntity.status(resultado.repetida() ? 200 : 201).location(URI.create("/api/v1/libros/" + resultado.libro().id())).body(Salidas.escritura(resultado));
    }
    @GetMapping("/libros/{id}") public DetalleRespuesta detalle(@PathVariable UUID id) { return Salidas.detalle(biblioteca.detalle(id)); }
    @PutMapping("/libros/{id}/metadatos") public LibroRespuesta editar(@PathVariable UUID id, @Valid @RequestBody Entradas.Edicion entrada) {
        return Salidas.libro(biblioteca.editar(id, entrada.modelo()));
    }
    @PutMapping("/libros/{id}/estado") public LibroRespuesta estado(@PathVariable UUID id, @Valid @RequestBody Entradas.Estado entrada) {
        return Salidas.libro(biblioteca.cambiarEstado(id, entrada.modelo()));
    }
    @DeleteMapping("/libros/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable UUID id, @RequestParam @PositiveOrZero long version) { biblioteca.eliminar(id, version); }
    @GetMapping("/libros/{id}/registros") public Pagina<RegistroRespuesta> historial(@PathVariable UUID id,
            @RequestParam(defaultValue = "1") int pagina, @RequestParam(defaultValue = "20") int tamano) {
        return Salidas.pagina(biblioteca.historial(id, pagina, tamano), Salidas::registro);
    }
    @PostMapping("/libros/{id}/registros") public ResponseEntity<EscrituraRespuesta> registrar(@PathVariable UUID id, @Valid @RequestBody Entradas.Avance entrada) {
        var resultado = biblioteca.registrar(id, entrada.modelo());
        return ResponseEntity.status(resultado.repetida() ? 200 : 201).body(Salidas.escritura(resultado));
    }
    @GetMapping("/resumen") public ResumenRespuesta resumen() { return Salidas.resumen(biblioteca.resumen()); }
}
