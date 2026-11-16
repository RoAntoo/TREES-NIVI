package ar.edu.nivi.infraestructura.entrada.http.error;

import java.util.Map;

public record ErrorApi(String codigo, String mensaje, Map<String, String> campos, String idSolicitud) { }
