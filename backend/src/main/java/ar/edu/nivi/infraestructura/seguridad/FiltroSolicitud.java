package ar.edu.nivi.infraestructura.seguridad;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;

@Component @Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class FiltroSolicitud extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena) throws ServletException, IOException {
        String id = UUID.randomUUID().toString(); req.setAttribute("idSolicitud", id); res.setHeader("X-Request-Id", id);
        MDC.put("idSolicitud", id);
        try {
            cadena.doFilter(req, res);
        } finally { MDC.remove("idSolicitud"); }
    }
}
