package ar.edu.nivi.dominio.modelo;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import java.net.URI;
import java.util.List;

public record MetadatosLibro(String titulo, List<String> autores, String isbn,
        String idEdicionExterna, String idObraExterna, String urlPortada, Integer totalPaginas) {
    public MetadatosLibro {
        titulo = texto(titulo, "titulo", 255, true);
        autores = autores == null ? List.of() : autores.stream().map(a -> texto(a, "autores", 150, true)).toList();
        if (autores.size() > 10) throw ExcepcionNegocio.campo("AUTORES_INVALIDOS", "autores", "Se admiten hasta diez autores.");
        isbn = Isbn.normalizar(isbn);
        idEdicionExterna = identificador(idEdicionExterna, "idEdicionExterna", "OL[0-9]+M");
        idObraExterna = identificador(idObraExterna, "idObraExterna", "OL[0-9]+W");
        urlPortada = texto(urlPortada, "urlPortada", 500, false);
        if (urlPortada != null) {
            try {
                URI uri = URI.create(urlPortada);
                if (!"https".equals(uri.getScheme()) || !"covers.openlibrary.org".equals(uri.getHost())
                        || uri.getUserInfo() != null || uri.getPort() != -1 || uri.getFragment() != null) throw new IllegalArgumentException();
            } catch (IllegalArgumentException ex) {
                throw ExcepcionNegocio.campo("PORTADA_INVALIDA", "urlPortada", "La portada debe usar HTTPS de covers.openlibrary.org.");
            }
        }
        if (totalPaginas != null && (totalPaginas < 1 || totalPaginas > 100000))
            throw ExcepcionNegocio.campo("TOTAL_INVALIDO", "totalPaginas", "El total debe estar entre 1 y 100000.");
    }

    private static String identificador(String valor, String campo, String patron) {
        valor = texto(valor, campo, 40, false);
        if (valor != null && !valor.matches(patron)) throw ExcepcionNegocio.campo("IDENTIFICADOR_INVALIDO", campo, "Identificador de Open Library inválido.");
        return valor;
    }

    private static String texto(String valor, String campo, int maximo, boolean obligatorio) {
        String limpio = valor == null ? null : valor.strip();
        if (limpio == null || limpio.isEmpty()) {
            if (obligatorio) throw ExcepcionNegocio.campo("CAMPO_OBLIGATORIO", campo, "Completá el campo " + campo + ".");
            return null;
        }
        if (limpio.length() > maximo) throw ExcepcionNegocio.campo("TEXTO_LARGO", campo, "El campo " + campo + " supera " + maximo + " caracteres.");
        return limpio;
    }
}
