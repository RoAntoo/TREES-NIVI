import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { PaginaDetalle } from './pagina-detalle';
import { CONFIGURACION_API, leerConfiguracionApi } from '../../../nucleo/configuracion/configuracion-api';
import { Confirmaciones } from '../../../compartido/confirmar';
import { libroPrueba, registroPrueba } from '../../../pruebas/datos-lectura';

describe('Eliminación confirmada y limpieza del detalle', () => {
  let fixture: ComponentFixture<PaginaDetalle>; let http: HttpTestingController;
  const pedir = vi.fn(), navegar = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    pedir.mockResolvedValue(true); navegar.mockClear();
    TestBed.configureTestingModule({ imports: [PaginaDetalle], providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: Confirmaciones, useValue: { pedir } },
      { provide: Router, useValue: { currentNavigation: () => null, navigateByUrl: navegar } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: libroPrueba().id }) } } }] });
    TestBed.overrideComponent(PaginaDetalle, { set: { template: '', imports: [] } });
    fixture = TestBed.createComponent(PaginaDetalle); fixture.detectChanges();
    const pagina = fixture.componentInstance;
    pagina.id.set(libroPrueba().id); pagina.consulta.datos.set({ libro: libroPrueba(), ultimoRegistro: registroPrueba() });
    pagina.historial.datos.set({ elementos: [registroPrueba()], pagina: 1, tamano: 10, totalElementos: 1, totalPaginas: 1 });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); fixture.destroy(); });
  it('cancelar no envía DELETE ni borra el contexto', async () => {
    pedir.mockResolvedValue(false); await fixture.componentInstance.eliminar();
    http.expectNone(() => true); expect(fixture.componentInstance.consulta.datos()?.ultimoRegistro?.nota).toBe(registroPrueba().nota);
    expect(navegar).not.toHaveBeenCalled(); expect(fixture.componentInstance.ocupado()).toBe(false);
  });
  it('al confirmar usa la versión y limpia libro, notas y operaciones pendientes', async () => {
    const pagina = fixture.componentInstance;
    pagina.pendientes.prepararAvance(libroPrueba().id, { versionLibro: 3, paginaActual: 40, nota: 'Nota pendiente de prueba.' });
    const eliminacion = pagina.eliminar();
    // La confirmación es asíncrona; permitir que continúe antes de capturar el HTTP simulado.
    await Promise.resolve();
    const peticion = http.expectOne(p => p.url.endsWith(`/libros/${libroPrueba().id}`));
    expect(peticion.request.method).toBe('DELETE'); expect(peticion.request.params.get('version')).toBe('3');
    peticion.flush(null, { status: 204, statusText: 'No Content' }); await eliminacion;
    expect(pagina.consulta.datos()).toBeNull(); expect(pagina.historial.datos()).toBeNull(); expect(pagina.pendientes.avances()[libroPrueba().id]).toBeUndefined();
    expect(navegar).toHaveBeenCalledWith('/app/biblioteca', { replaceUrl: true });
  });
  it('al marcar terminado actualiza la barra inmediatamente y celebra solo después del éxito del servidor', async () => {
    const pagina = fixture.componentInstance; pagina.ionViewWillEnter();
    const accion = pagina.cambiarEstado('TERMINADO'); await Promise.resolve();
    expect(pagina.libroCelebrado()).toBeNull();
    const solicitud = http.expectOne(p => p.method === 'PUT' && p.url.endsWith('/estado'));
    expect(solicitud.request.body).toMatchObject({ versionLibro: 3, estado: 'TERMINADO', confirmarFinalizacion: true });
    solicitud.flush(libroPrueba({ estado: 'TERMINADO', version: 4 })); await accion;
    expect(pagina.consulta.datos()?.libro.estado).toBe('TERMINADO');
    expect(pagina.consulta.datos()?.libro.paginaActual).toBe(20);
    expect(pagina.libroCelebrado()).toBe(libroPrueba().titulo);
    pagina.ionViewWillLeave(); expect(pagina.libroCelebrado()).toBeNull();
  });
  it('cancelar la finalización conserva la lectura y no muestra felicitación', async () => {
    pedir.mockResolvedValue(false); const pagina = fixture.componentInstance;
    await pagina.cambiarEstado('TERMINADO'); http.expectNone(p => p.method === 'PUT');
    expect(pagina.consulta.datos()?.libro.estado).toBe('LEYENDO'); expect(pagina.libroCelebrado()).toBeNull();
  });
  it('un fallo al terminar no muestra éxito ni cambia el libro', async () => {
    const pagina = fixture.componentInstance; const accion = pagina.cambiarEstado('TERMINADO'); await Promise.resolve();
    http.expectOne(p => p.method === 'PUT').flush({ mensaje: 'El libro cambió.' }, { status: 409, statusText: 'Conflict' }); await accion;
    expect(pagina.consulta.datos()?.libro.estado).toBe('LEYENDO'); expect(pagina.libroCelebrado()).toBeNull();
    expect(pagina.errorOperacion()?.estado).toBe(409);
  });
});
