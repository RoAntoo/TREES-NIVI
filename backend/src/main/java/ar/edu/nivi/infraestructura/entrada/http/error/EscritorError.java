package ar.edu.nivi.infraestructura.entrada.http.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Map;

@Component
public class EscritorError {
    private final ObjectMapper json;
    public EscritorError(ObjectMapper json) { this.json = json; }
    public void escribir(HttpServletRequest solicitud, HttpServletResponse respuesta, int estado, String codigo, String mensaje) throws IOException {
        respuesta.setStatus(estado); respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE); respuesta.setCharacterEncoding("UTF-8");
        json.writeValue(respuesta.getWriter(), new ErrorApi(codigo, mensaje, Map.of(), (String) solicitud.getAttribute("idSolicitud")));
    }
}
