import { crearFormularioAvance, crearFormularioLibro, normalizarIsbn } from './validadores-lectura';

describe('Validaciones de lectura', () => {
  it.each([-1, 1.5, 121])('rechaza página inválida %s', pagina => {
    const formulario = crearFormularioAvance(120); formulario.controls.paginaActual.setValue(pagina); expect(formulario.invalid).toBe(true);
  });
  it('permite una corrección a cero y página válida sin total', () => {
    const formulario = crearFormularioAvance(null); formulario.controls.paginaActual.setValue(250); expect(formulario.valid).toBe(true);
    formulario.controls.paginaActual.setValue(0); expect(formulario.valid).toBe(true);
    formulario.controls.paginaActual.setValue(2147483648); expect(formulario.invalid).toBe(true);
  });
  it('exige página y limita la nota', () => {
    const formulario = crearFormularioAvance(120); expect(formulario.invalid).toBe(true);
    formulario.setValue({ paginaActual: 10, nota: 'a'.repeat(2001) }); expect(formulario.invalid).toBe(true);
    formulario.controls.nota.setValue('Texto personal.'); expect(formulario.valid).toBe(true);
  });
  it.each(['9780140328722', '1234567890128', '978014032872X'])('rechaza checksum o prefijo de producto %s', isbn => {
    expect(normalizarIsbn(isbn)).toBeNull();
  });
  it('admite ISBN-10 con X y guiones y ISBN-13 con espacios', () => {
    expect(normalizarIsbn('0-8044-2957-X')).toBe('080442957X'); expect(normalizarIsbn('978 0140328721')).toBe('9780140328721');
  });
  it('admite libro sin datos opcionales y rechaza páginas decimales o autores excesivos', () => {
    const formulario = crearFormularioLibro(); formulario.controls.titulo.setValue('Libro manual'); expect(formulario.valid).toBe(true);
    formulario.controls.totalPaginas.setValue(15.5); expect(formulario.invalid).toBe(true);
    formulario.controls.totalPaginas.setValue(null); formulario.controls.autores.setValue(Array(11).fill('Autor').join('\n')); expect(formulario.invalid).toBe(true);
    formulario.controls.autores.setValue('a'.repeat(151)); expect(formulario.invalid).toBe(true);
  });
  it('rechaza título vacío y URL de portada arbitraria', () => {
    const formulario = crearFormularioLibro(); formulario.controls.titulo.setValue('  '); expect(formulario.invalid).toBe(true);
    formulario.controls.titulo.setValue('Título'); formulario.controls.urlPortada.setValue('https://externo.local/portada.jpg'); expect(formulario.invalid).toBe(true);
    formulario.controls.urlPortada.setValue('https://covers.openlibrary.org/b/id/1-M.jpg'); expect(formulario.valid).toBe(true);
  });
});
