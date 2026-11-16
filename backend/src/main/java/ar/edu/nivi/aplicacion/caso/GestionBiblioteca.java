package ar.edu.nivi.aplicacion.caso;

import ar.edu.nivi.aplicacion.modelo.*;
import ar.edu.nivi.aplicacion.modelo.Resultados.*;
import ar.edu.nivi.aplicacion.modelo.Solicitudes.*;
import ar.edu.nivi.aplicacion.puerto.entrada.Biblioteca;
import ar.edu.nivi.aplicacion.puerto.salida.*;
import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import ar.edu.nivi.dominio.modelo.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public final class GestionBiblioteca implements Biblioteca {
    private final RepositorioLibros libros;
    private final RepositorioRegistrosLectura registros;
    private final RepositorioOperaciones operaciones;
    private final Reloj reloj;

    public GestionBiblioteca(RepositorioLibros libros, RepositorioRegistrosLectura registros,
            RepositorioOperaciones operaciones, Reloj reloj) {
        this.libros = libros; this.registros = registros; this.operaciones = operaciones; this.reloj = reloj;
    }

    @Override public Escritura agregar(Alta solicitud) {
        validarOperacion(solicitud.idOperacion());
        String huella = huella("alta", solicitud.metadatos(), solicitud.origen());
        Optional<Escritura> anterior = repeticion(solicitud.idOperacion(), huella);
        if (anterior.isPresent()) return anterior.get();
        duplicado(solicitud.metadatos(), null);
        List<String> avisos = libros.hayCoincidencia(solicitud.metadatos())
                ? List.of("Ya existe un libro con título y autores coincidentes. Revisá si es otra edición.") : List.of();
        Libro libro = libros.guardar(Libro.nuevo(solicitud.metadatos(), solicitud.origen(), reloj.ahora()));
        return recordar(solicitud.idOperacion(), huella, new Escritura(libro, null, avisos, false));
    }

    @Override public Detalle detalle(UUID id) { return new Detalle(exigir(id), registros.ultimo(id).orElse(null)); }
    @Override public Pagina<Libro> listar(EstadoLectura estado, String consulta, int pagina, int tamano) {
        Pagina.validar(pagina, tamano);
        return libros.listar(estado, validarConsulta(consulta), pagina, tamano);
    }
    @Override public Libro editar(UUID id, Edicion solicitud) {
        Libro libro = exigir(id); libro.comprobarVersion(solicitud.versionLibro());
        Libro editado = libro.editar(solicitud.metadatos(), reloj.ahora());
        duplicado(editado.metadatos(), id);
        return libros.guardar(editado);
    }
    @Override public Libro cambiarEstado(UUID id, Estado solicitud) {
        Libro libro = exigir(id); libro.comprobarVersion(solicitud.versionLibro());
        Libro actualizado = libro.cambiarEstado(solicitud.estado(), solicitud.confirmarFinalizacion(), reloj.ahora());
        return actualizado == libro ? libro : libros.guardar(actualizado);
    }
    @Override public void eliminar(UUID id, long version) {
        Libro libro = exigir(id); libro.comprobarVersion(version); libros.eliminar(id);
    }
    @Override public Escritura registrar(UUID id, Avance solicitud) {
        validarOperacion(solicitud.idOperacion());
        String huella = huella("avance", id, solicitud.versionLibro(), solicitud.paginaActual(), solicitud.nota());
        Optional<Escritura> anterior = repeticion(solicitud.idOperacion(), huella);
        if (anterior.isPresent()) return anterior.get();
        Libro libro = exigir(id); libro.comprobarVersion(solicitud.versionLibro());
        var ahora = reloj.ahora();
        Libro actualizado = libro.avanzar(solicitud.paginaActual(), ahora);
        RegistroLectura registro = new RegistroLectura(UUID.randomUUID(), id, libro.paginaActual(),
                solicitud.paginaActual(), solicitud.nota(), ahora, solicitud.idOperacion());
        actualizado = libros.guardar(actualizado);
        registros.guardar(registro);
        return recordar(solicitud.idOperacion(), huella, new Escritura(actualizado, registro, List.of(), false));
    }
    @Override public Pagina<RegistroLectura> historial(UUID id, int pagina, int tamano) {
        Pagina.validar(pagina, tamano); exigir(id); return registros.listar(id, pagina, tamano);
    }
    @Override public Resumen resumen() {
        return new Resumen(libros.contarPorEstado(), libros.lecturasActivas(3).stream()
                .map(l -> new Detalle(l, registros.ultimo(l.id()).orElse(null))).toList());
    }
    public static String validarConsulta(String consulta) {
        String valor = consulta == null ? "" : consulta.strip();
        if (valor.length() > 200) throw ExcepcionNegocio.campo("CONSULTA_LARGA", "q", "La búsqueda admite hasta 200 caracteres.");
        return valor;
    }
    private Libro exigir(UUID id) {
        return libros.buscar(id).orElseThrow(() -> new ExcepcionNegocio(ExcepcionNegocio.Tipo.NO_ENCONTRADO,
                "LIBRO_INEXISTENTE", "No se encontró el libro."));
    }
    private void duplicado(MetadatosLibro datos, UUID excluir) {
        if (libros.existeEdicion(datos, excluir)) throw new ExcepcionNegocio(ExcepcionNegocio.Tipo.CONFLICTO,
                "EDICION_DUPLICADA", "Esa edición ya está en la biblioteca.");
    }
    private void validarOperacion(UUID id) {
        if (id == null) throw ExcepcionNegocio.campo("OPERACION_OBLIGATORIA", "idOperacion", "Indicá un UUID de operación.");
    }
    private Optional<Escritura> repeticion(UUID id, String huella) {
        return operaciones.buscarOperacion(id).map(op -> {
            if (!op.huella().equals(huella)) throw new ExcepcionNegocio(ExcepcionNegocio.Tipo.CONFLICTO,
                    "OPERACION_REUTILIZADA", "Ese identificador de operación ya se usó con otro contenido.");
            // Una operación conservada nunca restaura un libro eliminado.
            if (libros.buscar(op.resultado().libro().id()).isEmpty()) throw new ExcepcionNegocio(ExcepcionNegocio.Tipo.CONFLICTO,
                    "OPERACION_ELIMINADA", "La operación corresponde a un libro eliminado.");
            return op.resultado().repeticion();
        });
    }
    private Escritura recordar(UUID id, String huella, Escritura resultado) {
        operaciones.guardarOperacion(id, resultado.libro().id(), new Operacion(huella, resultado)); return resultado;
    }
    private String huella(Object... partes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            // Longitudes y marcador de nulo evitan ambigüedades por separadores en textos.
            for (Object parte : partes) {
                if (parte instanceof MetadatosLibro m) {
                    digest.update(huella(m.titulo(), m.autores().size(), huella(m.autores().toArray()),
                            m.isbn(), m.idEdicionExterna(), m.idObraExterna(), m.urlPortada(), m.totalPaginas())
                            .getBytes(StandardCharsets.UTF_8));
                    continue;
                }
                String texto = parte == null ? "N" : "V" + parte.toString().length() + ":" + parte;
                digest.update(texto.getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
