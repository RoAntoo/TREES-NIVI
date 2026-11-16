package ar.edu.nivi.dominio;

import ar.edu.nivi.dominio.excepcion.ExcepcionNegocio;
import ar.edu.nivi.dominio.modelo.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class LibroPrueba {
    private final Instant ahora = Instant.parse("2026-11-14T12:00:00Z");
    private MetadatosLibro datos(Integer total) { return new MetadatosLibro(" Libro ", List.of(" Autora "), null, null, null, null, total); }
    private Libro leyendo(Integer total) { return Libro.nuevo(datos(total), OrigenLibro.MANUAL, ahora).cambiarEstado(EstadoLectura.LEYENDO, false, ahora); }
    @Test void normalizaYComienzaPendiente() {
        Libro libro = Libro.nuevo(datos(100), OrigenLibro.MANUAL, ahora);
        assertThat(libro.metadatos().titulo()).isEqualTo("Libro"); assertThat(libro.metadatos().autores()).containsExactly("Autora");
        assertThat(libro.estado()).isEqualTo(EstadoLectura.PENDIENTE); assertThat(libro.paginaActual()).isZero();
    }
    @Test void finalizarEsAtomicoYReabrirConservaPosicion() {
        Libro terminado = leyendo(100).avanzar(100, ahora.plusSeconds(60));
        assertThat(terminado.estado()).isEqualTo(EstadoLectura.TERMINADO);
        assertThat(terminado.terminadoEn()).isEqualTo(ahora.plusSeconds(60));
        assertThat(terminado.cambiarEstado(EstadoLectura.TERMINADO, true, ahora.plusSeconds(70))).isSameAs(terminado);
        Libro abierto = terminado.cambiarEstado(EstadoLectura.LEYENDO, false, ahora.plusSeconds(80));
        assertThat(abierto.paginaActual()).isEqualTo(100); assertThat(abierto.terminadoEn()).isNull();
    }
    @Test void admiteCorreccionesYSinTotal() {
        Libro libro = leyendo(null).avanzar(400, ahora).avanzar(20, ahora);
        assertThat(libro.paginaActual()).isEqualTo(20); assertThat(libro.estado()).isEqualTo(EstadoLectura.LEYENDO);
        assertThat(libro.metadatos().totalPaginas()).isNull();
    }
    @Test void pausaConservaYNoPermiteAvances() {
        Libro pausado = leyendo(100).avanzar(20, ahora).cambiarEstado(EstadoLectura.PAUSADO, false, ahora);
        assertThatThrownBy(() -> pausado.avanzar(21, ahora)).isInstanceOf(ExcepcionNegocio.class);
        assertThat(pausado.cambiarEstado(EstadoLectura.LEYENDO, false, ahora).paginaActual()).isEqualTo(20);
    }
    @Test void exigeConfirmacionSinInventarProgreso() {
        Libro libro = leyendo(null).avanzar(20, ahora);
        assertThatThrownBy(() -> libro.cambiarEstado(EstadoLectura.TERMINADO, false, ahora)).isInstanceOf(ExcepcionNegocio.class);
        assertThat(libro.cambiarEstado(EstadoLectura.TERMINADO, true, ahora).paginaActual()).isEqualTo(20);
    }
    @ParameterizedTest @ValueSource(ints = {-1, 101}) void rechazaPaginasFueraDeLimites(int pagina) {
        assertThatThrownBy(() -> leyendo(100).avanzar(pagina, ahora)).isInstanceOf(ExcepcionNegocio.class);
    }
    @Test void noPermiteTotalPorDebajoDePosicionNiVolverAPendiente() {
        Libro libro = leyendo(100).avanzar(50, ahora);
        assertThatThrownBy(() -> libro.editar(datos(49), ahora)).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> libro.cambiarEstado(EstadoLectura.PENDIENTE, false, ahora)).isInstanceOf(ExcepcionNegocio.class);
    }
    @Test void editarNoFinalizaAutomaticamente() {
        Libro libro = leyendo(null).avanzar(50, ahora).editar(datos(50), ahora);
        assertThat(libro.estado()).isEqualTo(EstadoLectura.LEYENDO); assertThat(libro.terminadoEn()).isNull();
    }
    @ParameterizedTest @CsvSource({"0140328726,9780140328721", "0-8044-2957-X,9780804429573", "9780140328721,9780140328721"})
    void isbnCanonico(String entrada, String esperado) { assertThat(Isbn.canonico(entrada)).isEqualTo(esperado); }
    @ParameterizedTest @ValueSource(strings = {"123", "9780140328722", "1234567890128", "014032872X", "9791234567890", "978014032872X"})
    void isbnInvalido(String entrada) { assertThatThrownBy(() -> Isbn.normalizar(entrada)).isInstanceOf(ExcepcionNegocio.class); }
    @Test void noAdmiteUrlArbitrariaNiDatosImposibles() {
        assertThatThrownBy(() -> new MetadatosLibro("A", List.of(), null, null, null, "https://example.org/portada", 1)).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> datos(0)).isInstanceOf(ExcepcionNegocio.class);
        assertThatThrownBy(() -> new MetadatosLibro(" ", List.of(), null, null, null, null, null)).isInstanceOf(ExcepcionNegocio.class);
    }
}
