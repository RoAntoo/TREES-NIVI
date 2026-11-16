import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ModalAvance } from './modal-avance';
import { EscriturasPendientes } from '../biblioteca/datos/escrituras-pendientes';
import { CONFIGURACION_API, leerConfiguracionApi } from '../../nucleo/configuracion/configuracion-api';
import { Confirmaciones } from '../../compartido/confirmar';
import { libroPrueba, registroPrueba } from '../../pruebas/datos-lectura';

describe('Guardar avance y reintentos', () => {
  let fixture: ComponentFixture<ModalAvance>; let componente: ModalAvance; let http: HttpTestingController;
  const pedir = vi.fn().mockResolvedValue(true);
  const ruta = `http://localhost/api/v1/libros/${libroPrueba().id}/registros`;
  beforeEach(() => {
    pedir.mockResolvedValue(true);
    TestBed.configureTestingModule({ imports: [ModalAvance], providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: Confirmaciones, useValue: { pedir } }] });
    // Probar la coordinación HTTP y el formulario sin presentar un overlay nativo en jsdom.
    TestBed.overrideComponent(ModalAvance, { set: { template: '', imports: [] } });
    fixture = TestBed.createComponent(ModalAvance); componente = fixture.componentInstance;
    fixture.componentRef.setInput('libro', libroPrueba()); fixture.componentRef.setInput('abierto', true); fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); fixture.destroy(); });
  it('una respuesta perdida conserva UUID y cuerpo y bloquea doble envío', async () => {
    componente.formulario.setValue({ paginaActual: 40, nota: 'Recordar la estación.' });
    const primero = componente.guardar(); const solicitud = http.expectOne(ruta); const cuerpo: unknown = solicitud.request.body;
    await componente.guardar(); http.expectNone(ruta);
    solicitud.error(new ProgressEvent('error')); await primero;
    expect(componente.pendiente()).toEqual(cuerpo);
    componente.formulario.setValue({ paginaActual: 50, nota: 'No reemplazar el intento incierto.' });
    const reintento = componente.guardar(); const repetida = http.expectOne(ruta); expect(repetida.request.body).toEqual(cuerpo);
    repetida.flush({ libro: libroPrueba({ paginaActual: 40, version: 4 }), registro: registroPrueba({ paginaActual: 40 }), advertencias: [] });
    await reintento; expect(componente.pendiente()).toBeUndefined();
  });
  it('un 409 recarga versión y exige revisión sin perder la nota', async () => {
    componente.formulario.setValue({ paginaActual: 45, nota: 'Conservar esta nota.' });
    const primero = componente.guardar(); const solicitud = http.expectOne(ruta); const idAnterior = solicitud.request.body.idOperacion;
    solicitud.flush({ codigo: 'VERSION_DESACTUALIZADA', mensaje: 'El libro cambió.', campos: {} }, { status: 409, statusText: 'Conflict' }); await primero;
    expect(componente.esperandoVersion()).toBe(true); expect(componente.pendiente()).toBeUndefined();
    await componente.guardar(); http.expectNone(ruta);
    fixture.componentRef.setInput('libro', libroPrueba({ version: 4, paginaActual: 30 })); fixture.detectChanges();
    expect(componente.revisionRecibida()).toBe(true); expect(componente.formulario.controls.nota.value).toBe('Conservar esta nota.');
    const segundo = componente.guardar(); const actual = http.expectOne(ruta);
    expect(actual.request.body.versionLibro).toBe(4); expect(actual.request.body.idOperacion).not.toBe(idAnterior);
    actual.flush({ libro: libroPrueba({ version: 5, paginaActual: 45 }), registro: registroPrueba({ paginaActual: 45 }), advertencias: [] }); await segundo;
  });
  it('cancelar una corrección hacia atrás no guarda ni asigna operación', async () => {
    pedir.mockResolvedValue(false); componente.formulario.setValue({ paginaActual: 5, nota: 'Corrección' });
    await componente.guardar(); http.expectNone(ruta); expect(componente.pendiente()).toBeUndefined(); expect(componente.guardando()).toBe(false);
  });
  it('cerrar y volver al modal conserva el intento incierto mientras la app sigue abierta', () => {
    const pendientes = TestBed.inject(EscriturasPendientes);
    pendientes.prepararAvance(libroPrueba().id, { versionLibro: 3, paginaActual: 40, nota: 'Privada' });
    fixture.componentRef.setInput('abierto', false); fixture.detectChanges();
    fixture.componentRef.setInput('abierto', true); fixture.detectChanges();
    expect(componente.formulario.controls.nota.value).toBe('Privada');
    expect(componente.formulario.controls.paginaActual.value).toBe(40);
  });
  it('al llegar al final informa el estado anterior aunque el detalle se refresque antes de cerrar el modal', async () => {
    const notificar = vi.fn(); componente.guardado.subscribe(notificar);
    componente.formulario.setValue({ paginaActual: 120, nota: 'La última página.' });
    const accion = componente.guardar(); const solicitud = http.expectOne(ruta);
    const terminado = libroPrueba({ estado: 'TERMINADO', paginaActual: 120, version: 4 });
    fixture.componentRef.setInput('libro', terminado); fixture.detectChanges();
    const resultado = { libro: terminado, registro: registroPrueba({ paginaActual: 120 }), advertencias: [] };
    solicitud.flush(resultado); await accion;
    expect(notificar).toHaveBeenCalledWith({ resultado, estadoAnterior: 'LEYENDO' });
  });
});
