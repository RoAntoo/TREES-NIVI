package ar.edu.nivi.infraestructura.entrada.http.controlador;

import ar.edu.nivi.aplicacion.puerto.salida.CatalogoLibros;
import ar.edu.nivi.infraestructura.entrada.http.dto.Salidas;
import ar.edu.nivi.infraestructura.entrada.http.dto.Salidas.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/catalogo")
public class ControladorCatalogo {
    private final CatalogoLibros catalogo;
    public ControladorCatalogo(CatalogoLibros catalogo) { this.catalogo = catalogo; }
    @GetMapping("/busqueda") public CatalogoRespuesta buscar(@RequestParam String q, @RequestParam(defaultValue = "1") int pagina,
            @RequestParam(defaultValue = "20") int tamano) { return Salidas.catalogo(catalogo.buscar(q, pagina, tamano)); }
    @GetMapping("/isbn/{isbn}") public CandidatoRespuesta isbn(@PathVariable String isbn) { return Salidas.candidato(catalogo.porIsbn(isbn)); }
    @GetMapping("/ediciones/{id}") public CandidatoRespuesta edicion(@PathVariable String id) { return Salidas.candidato(catalogo.porEdicion(id)); }
    @GetMapping("/obras/{id}/ediciones") public EdicionesCatalogoRespuesta ediciones(@PathVariable String id,
            @RequestParam(defaultValue = "1") int pagina, @RequestParam(defaultValue = "10") int tamano) {
        return Salidas.ediciones(catalogo.ediciones(id, pagina, tamano));
    }
}
