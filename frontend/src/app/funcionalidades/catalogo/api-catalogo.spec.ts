import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiCatalogo } from './api-catalogo';
import { CONFIGURACION_API, leerConfiguracionApi } from '../../nucleo/configuracion/configuracion-api';

describe('Catálogo mediante API propia', () => {
  let api: ApiCatalogo; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') }] });
    api = TestBed.inject(ApiCatalogo); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('distingue búsqueda vacía de error y conserva el total estimado', () => {
    api.buscar(' sin coincidencias ').subscribe(resultado => { expect(resultado.elementos).toEqual([]); expect(resultado.totalEstimado).toBe(true); });
    const peticion = http.expectOne(p => p.url === 'http://localhost/api/v1/catalogo/busqueda');
    expect(peticion.request.params.get('q')).toBe('sin coincidencias'); peticion.flush({ elementos: [], pagina: 1, tamano: 10, totalElementos: 0, totalEstimado: true, haySiguiente: false });
  });
  it('mantiene datos parciales sin inventar autores, páginas o portada', () => {
    api.porIsbn('0-140-32872-6').subscribe(libro => { expect(libro.autores).toEqual([]); expect(libro.totalPaginas).toBeNull(); expect(libro.urlPortada).toBeNull(); });
    http.expectOne('http://localhost/api/v1/catalogo/isbn/0140328726').flush({ titulo: 'Edición parcial', autores: [], isbn: '0140328726', idEdicionExterna: 'OL1M', idObraExterna: null, totalPaginas: null, urlPortada: null, enlaceFuente: 'https://openlibrary.org/books/OL1M' });
  });
  it.each([404, 503, 504])('propaga el error HTTP %s para ofrecer recuperación manual', estado => {
    const fallo = vi.fn(); api.porIsbn('0140328726').subscribe({ error: fallo });
    http.expectOne('http://localhost/api/v1/catalogo/isbn/0140328726').flush({ codigo: 'CATALOGO_ERROR', mensaje: 'No disponible.' }, { status: estado, statusText: 'Error simulado' });
    expect(fallo).toHaveBeenCalledWith(expect.any(HttpErrorResponse)); expect(fallo.mock.calls[0][0].status).toBe(estado);
  });
  it('ISBN inválido no envía solicitud alguna', () => {
    expect(() => api.porIsbn('123')).toThrow(); http.expectNone(() => true);
  });
  it('lista ediciones por obra y consulta una edición concreta sin necesitar ISBN', () => {
    api.ediciones('OL8127201W', 2).subscribe();
    const lista = http.expectOne(p => p.url.endsWith('/catalogo/obras/OL8127201W/ediciones'));
    expect(lista.request.params.get('pagina')).toBe('2'); lista.flush({ elementos: [], pagina: 2, tamano: 10, totalElementos: 0, haySiguiente: false });
    api.porEdicion('OL49631747M').subscribe();
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M').flush({});
  });
  it('rechaza referencias ajenas o identificadores de otro tipo antes de enviar', () => {
    expect(() => api.ediciones('OL1M')).toThrow(); expect(() => api.porEdicion('../OL1M')).toThrow(); http.expectNone(() => true);
  });
});
