import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiBiblioteca } from './api-biblioteca';
import { AlmacenamientoLocal } from '../../../nucleo/almacenamiento/almacenamiento-local';
import { CONFIGURACION_API } from '../../../nucleo/configuracion/configuracion-api';
import { libroPrueba, registroPrueba } from '../../../pruebas/datos-lectura';

describe('Integración HTTP con copia de lectura', () => {
  let api: ApiBiblioteca; let http: HttpTestingController;
  const detalle = { libro: libroPrueba(), ultimoRegistro: registroPrueba() };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: { url: 'http://localhost/api/v1' } },
      { provide: AlmacenamientoLocal, useValue: { leerAjuste: () => null, guardarAjuste: () => undefined, leer: async () => undefined, guardar: async () => undefined, borrar: async () => undefined } }] });
    api = TestBed.inject(ApiBiblioteca); http = TestBed.inject(HttpTestingController);
    await api.copia.activar(true);
  });
  afterEach(() => http.verify());
  it('muestra el último registro ante fallo de red y bloquea PUT sin enviarlo', async () => {
    const consulta = firstValueFrom(api.detalle(detalle.libro.id)); http.expectOne(p => p.url.endsWith(detalle.libro.id)).flush(detalle); await consulta;
    const sinRed = firstValueFrom(api.detalle(detalle.libro.id)); http.expectOne(p => p.url.endsWith(detalle.libro.id)).error(new ProgressEvent('error'));
    expect(await sinRed).toEqual(detalle);
    const historialEnLinea = firstValueFrom(api.historial(detalle.libro.id));
    http.expectOne(p => p.url.endsWith('/registros')).flush({ elementos: [], pagina: 1, tamano: 10, totalElementos: 0, totalPaginas: 0 });
    await historialEnLinea; expect(api.copia.modoCopia()).toBe(true);
    await expect(firstValueFrom(api.estado(detalle.libro.id, 3, 'PAUSADO'))).rejects.toMatchObject({ status: 503 });
    http.expectNone(p => p.method === 'PUT');
  });
  it('un DELETE confirmado retira la copia antes de completar la operación', async () => {
    await api.copia.guardarLibros([detalle.libro], [detalle]);
    const borrado = firstValueFrom(api.eliminar(detalle.libro.id, 3));
    http.expectOne(p => p.method === 'DELETE').flush(null, { status: 204, statusText: 'No Content' }); await borrado;
    expect(api.copia.entradas()).toEqual([]);
  });
  it('no fabrica historial completo a partir del último registro', async () => {
    api.copia.confirmarConexion(); await api.copia.guardarLibros([detalle.libro], [detalle]);
    const historial = firstValueFrom(api.historial(detalle.libro.id)); http.expectOne(p => p.url.endsWith('/registros')).error(new ProgressEvent('error'));
    await expect(historial).rejects.toMatchObject({ status: 0 });
  });
  it('prepara la cobertura con páginas de 50 y recupera cada último registro', async () => {
    const otro = { libro: libroPrueba({ id: 'otro-libro' }), ultimoRegistro: null };
    const tarea = api.actualizarCopia();
    const primera = http.expectOne(p => p.url.endsWith('/libros'));
    expect(primera.request.params.get('tamano')).toBe('50');
    primera.flush({ elementos: [detalle.libro], totalPaginas: 2 }); await Promise.resolve();
    const segunda = http.expectOne(p => p.url.endsWith('/libros'));
    expect(segunda.request.params.get('pagina')).toBe('2');
    segunda.flush({ elementos: [otro.libro], totalPaginas: 2 }); await Promise.resolve();
    http.expectOne(p => p.url.endsWith(detalle.libro.id)).flush(detalle);
    http.expectOne(p => p.url.endsWith(otro.libro.id)).flush(otro);
    await tarea;
    expect(api.copia.entradas()).toHaveLength(2); expect(api.copia.detalle(detalle.libro.id)).toEqual(detalle);
  });
  it('no reemplaza la copia si la biblioteca cambia durante la preparación', async () => {
    await api.copia.guardarLibros([detalle.libro], [detalle]);
    const tarea = api.actualizarCopia();
    http.expectOne(p => p.url.endsWith('/libros')).flush({ elementos: [detalle.libro], totalPaginas: 1 }); await Promise.resolve();
    api.actualizarVistas();
    http.expectOne(p => p.url.endsWith(detalle.libro.id)).flush(detalle);
    await expect(tarea).rejects.toThrow('La biblioteca cambió'); expect(api.copia.detalle(detalle.libro.id)).toEqual(detalle);
  });
});
