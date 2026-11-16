package ar.edu.nivi.dominio.modelo;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import java.util.Locale;

public final class Isbn {
    private Isbn() { }

    public static String normalizar(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String isbn = valor.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        if (isbn.matches("[0-9]{9}[0-9X]")) {
            int suma = 0;
            for (int i = 0; i < 10; i++) suma += (10 - i) * (isbn.charAt(i) == 'X' ? 10 : isbn.charAt(i) - '0');
            if (suma % 11 == 0) return isbn;
        } else if (isbn.matches("(?:978|979)[0-9]{10}") && control(isbn.substring(0, 12)) == isbn.charAt(12) - '0') {
            return isbn;
        }
        throw ExcepcionNegocio.campo("ISBN_INVALIDO", "isbn", "Ingresá un ISBN-10 o ISBN-13 válido de libro.");
    }

    public static String canonico(String valor) {
        String isbn = normalizar(valor);
        if (isbn == null || isbn.length() == 13) return isbn;
        String base = "978" + isbn.substring(0, 9);
        return base + control(base);
    }

    private static int control(String base) {
        int suma = 0;
        for (int i = 0; i < 12; i++) suma += (base.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
        return (10 - suma % 10) % 10;
    }
}
