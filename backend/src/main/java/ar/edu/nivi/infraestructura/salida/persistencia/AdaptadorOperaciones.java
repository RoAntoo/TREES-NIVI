package ar.edu.nivi.infraestructura.salida.persistencia;

import ar.edu.nivi.aplicacion.modelo.Resultados.*;
import ar.edu.nivi.aplicacion.puerto.salida.RepositorioOperaciones;
import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class AdaptadorOperaciones implements RepositorioOperaciones {
    @PersistenceContext private EntityManager em;
    private final ObjectMapper json;
    public AdaptadorOperaciones(ObjectMapper json) { this.json = json; }
    @Override public Optional<Operacion> buscarOperacion(UUID id) {
        OperacionEntidad e = em.find(OperacionEntidad.class, id);
        if (e == null) return Optional.empty();
        if (e.resultado.isEmpty()) throw new ExcepcionNegocio(ExcepcionNegocio.Tipo.CONFLICTO,
                "OPERACION_ELIMINADA", "La operación corresponde a un libro eliminado.");
        try { return Optional.of(new Operacion(e.huella, json.readValue(e.resultado, Escritura.class))); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("No se pudo leer la operación guardada."); }
    }
    @Override public void guardarOperacion(UUID id, UUID libroId, Operacion operacion) {
        try {
            var e = new OperacionEntidad(); e.id = id; e.libroId = libroId; e.huella = operacion.huella();
            e.resultado = json.writeValueAsString(operacion.resultado()); em.persist(e); em.flush();
        } catch (JsonProcessingException ex) { throw new IllegalStateException("No se pudo guardar la operación."); }
    }
}
