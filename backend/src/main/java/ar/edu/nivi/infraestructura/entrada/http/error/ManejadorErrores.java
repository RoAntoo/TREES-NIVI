package ar.edu.nivi.infraestructura.entrada.http.error;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.*;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.util.*;

@RestControllerAdvice
public class ManejadorErrores {
    private static final Logger LOG = LoggerFactory.getLogger(ManejadorErrores.class);
    @ExceptionHandler(ExcepcionNegocio.class) ResponseEntity<ErrorApi> negocio(ExcepcionNegocio ex, HttpServletRequest req) {
        int estado = switch (ex.tipo()) {
            case INVALIDO -> 400; case NO_ENCONTRADO -> 404; case CONFLICTO -> 409; case LIMITE -> 429;
            case NO_DISPONIBLE -> 503; case TIEMPO -> 504;
        };
        var respuesta = respuesta(estado, ex.codigo(), ex.getMessage(), ex.campos(), req);
        if (estado == 429 || estado == 503) return ResponseEntity.status(estado).header("Retry-After", "10").body(respuesta.getBody());
        return respuesta;
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<ErrorApi> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        var campos = new LinkedHashMap<String, String>();
        ex.getBindingResult().getFieldErrors().forEach(e -> campos.put(e.getField(), "Revisá el valor y los límites de este campo."));
        return respuesta(400, "ENTRADA_INVALIDA", "Revisá los campos indicados.", campos, req);
    }
    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ErrorApi> entrada(Exception ex, HttpServletRequest req) {
        return respuesta(400, "ENTRADA_INVALIDA", "Revisá los tipos, campos obligatorios y valores de la solicitud.", Map.of(), req);
    }
    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class, CannotAcquireLockException.class})
    ResponseEntity<ErrorApi> conflicto(Exception ex, HttpServletRequest req) {
        return respuesta(409, "CONFLICTO_PERSISTENCIA", "Se detectó una edición duplicada o un cambio concurrente. Consultá los datos actuales.", Map.of(), req);
    }
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<ErrorApi> estado(ResponseStatusException ex, HttpServletRequest req) {
        return respuesta(ex.getStatusCode().value(), "CREDENCIALES_INCORRECTAS", "Usuario o contraseña incorrectos.", Map.of(), req);
    }
    @ExceptionHandler(NoResourceFoundException.class) ResponseEntity<ErrorApi> inexistente(Exception ex, HttpServletRequest req) {
        return respuesta(404, "RUTA_INEXISTENTE", "No existe esa ruta.", Map.of(), req);
    }
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class) ResponseEntity<ErrorApi> metodo(Exception ex, HttpServletRequest req) {
        return respuesta(405, "METODO_NO_ADMITIDO", "Ese método no está disponible para esta ruta.", Map.of(), req);
    }
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class) ResponseEntity<ErrorApi> formato(Exception ex, HttpServletRequest req) {
        return respuesta(415, "FORMATO_NO_ADMITIDO", "Enviá el cuerpo como application/json.", Map.of(), req);
    }
    @ExceptionHandler(Exception.class) ResponseEntity<ErrorApi> interno(Exception ex, HttpServletRequest req) {
        // No incluir cuerpos, notas, credenciales, SQL ni trazas en los logs.
        LOG.error("Fallo interno: tipo={}, idSolicitud={}", ex.getClass().getSimpleName(), req.getAttribute("idSolicitud"));
        return respuesta(500, "ERROR_INTERNO", "No se pudo completar la operación.", Map.of(), req);
    }
    private ResponseEntity<ErrorApi> respuesta(int estado, String codigo, String mensaje, Map<String, String> campos, HttpServletRequest req) {
        return ResponseEntity.status(estado).body(new ErrorApi(codigo, mensaje, campos, (String) req.getAttribute("idSolicitud")));
    }
}
