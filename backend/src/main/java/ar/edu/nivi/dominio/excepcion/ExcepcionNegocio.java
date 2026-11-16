package ar.edu.nivi.dominio.excepcion;

import java.util.Map;

public class ExcepcionNegocio extends RuntimeException {
    public enum Tipo { INVALIDO, NO_ENCONTRADO, CONFLICTO, LIMITE, NO_DISPONIBLE, TIEMPO }
    private final String codigo;
    private final Tipo tipo;
    private final Map<String, String> campos;

    public ExcepcionNegocio(Tipo tipo, String codigo, String mensaje) {
        this(tipo, codigo, mensaje, Map.of());
    }

    public ExcepcionNegocio(Tipo tipo, String codigo, String mensaje, Map<String, String> campos) {
        super(mensaje);
        this.tipo = tipo;
        this.codigo = codigo;
        this.campos = Map.copyOf(campos);
    }

    public static ExcepcionNegocio campo(String codigo, String campo, String mensaje) {
        return new ExcepcionNegocio(Tipo.INVALIDO, codigo, mensaje, Map.of(campo, mensaje));
    }

    public String codigo() { return codigo; }
    public Tipo tipo() { return tipo; }
    public Map<String, String> campos() { return campos; }
}
