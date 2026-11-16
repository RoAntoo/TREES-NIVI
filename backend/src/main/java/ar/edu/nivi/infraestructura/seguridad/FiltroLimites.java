package ar.edu.nivi.infraestructura.seguridad;

import ar.edu.nivi.infraestructura.entrada.http.error.EscritorError;
import com.github.benmanes.caffeine.cache.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;

public final class FiltroLimites extends OncePerRequestFilter {
    private final EscritorError errores;
    private final Cache<String, Ventana> limites = Caffeine.newBuilder().maximumSize(10000).expireAfterAccess(Duration.ofMinutes(2)).build();
    public FiltroLimites(EscritorError errores) { this.errores = errores; }
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena) throws ServletException, IOException {
        if (!req.getMethod().equals("OPTIONS") && req.getRequestURI().startsWith("/api/v1/")) {
            boolean acceso = req.getRequestURI().equals("/api/v1/acceso");
            Ventana ventana = limites.get(req.getRemoteAddr() + (acceso ? ":acceso" : ":api"), k -> new Ventana());
            if (!ventana.admitir(acceso ? 10 : 120)) {
                res.setHeader("Retry-After", "60"); errores.escribir(req, res, 429, "LIMITE_PETICIONES", "Esperá un minuto antes de volver a intentar."); return;
            }
        }
        cadena.doFilter(req, res);
    }
    private static class Ventana {
        private long inicio = System.nanoTime(); private int cantidad;
        synchronized boolean admitir(int maximo) {
            long ahora = System.nanoTime(); if (ahora - inicio >= Duration.ofMinutes(1).toNanos()) { inicio = ahora; cantidad = 0; }
            return ++cantidad <= maximo;
        }
    }
}
