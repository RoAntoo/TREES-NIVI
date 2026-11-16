import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { PaginaAgregar } from './pagina-agregar';
import { CONFIGURACION_API, leerConfiguracionApi } from '../../nucleo/configuracion/configuracion-api';
import { Confirmaciones } from '../../compartido/confirmar';
import { extraerMetadatos } from '../biblioteca/modelos/biblioteca';
import { libroPrueba } from '../../pruebas/datos-lectura';
import { EscanerIsbn } from '../../nucleo/capacidades/escaner-isbn';
import { FormularioLibro } from '../../compartido/componentes/formulario-libro';
import { CandidatoLibro } from '../biblioteca/modelos/biblioteca';

describe('Reintento de alta manual', () => {
  it('conserva la misma operación y su contenido tras un fallo de red', async () => {
    TestBed.configureTestingModule({ imports: [PaginaAgregar], providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: Confirmaciones, useValue: { pedir: vi.fn().mockResolvedValue(true) } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } }] });
    TestBed.overrideComponent(PaginaAgregar, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(PaginaAgregar); fixture.detectChanges();
    const pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController), datos = extraerMetadatos(libroPrueba());
    const primero = pagina.guardar(datos); const solicitud = http.expectOne('http://localhost/api/v1/libros'); const cuerpo: unknown = solicitud.request.body;
    solicitud.error(new ProgressEvent('error')); await primero;
    const segundo = pagina.guardar({ ...datos, titulo: 'No reemplazar un intento sin confirmar' });
    const repetida = http.expectOne('http://localhost/api/v1/libros'); expect(repetida.request.body).toEqual(cuerpo);
    repetida.flush({ libro: libroPrueba(), registro: null, advertencias: [] }); await segundo;
    expect(pagina.pendientes.alta()).toBeNull(); expect(pagina.modo()).toBe('busqueda'); http.verify(); fixture.destroy();
  });
});

describe('Completar la edición elegida sin perder datos manuales', () => {
  const obra: CandidatoLibro = { ...extraerMetadatos(libroPrueba({ titulo: 'The King in Yellow', autores: [], isbn: null, idObraExterna: 'OL8127201W', idEdicionExterna: null, totalPaginas: null })), enlaceFuente: 'https://openlibrary.org/works/OL8127201W' };
  const edicion: CandidatoLibro = { ...obra, titulo: 'The king in yellow', idEdicionExterna: 'OL49631747M', totalPaginas: 308, autores: ['Robert W. Chambers'] };
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginaAgregar], providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: Confirmaciones, useValue: { pedir: vi.fn().mockResolvedValue(true) } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } }] });
    TestBed.overrideComponent(FormularioLibro, { set: { template: '', imports: [] } });
    TestBed.overrideComponent(PaginaAgregar, { set: { imports: [FormularioLibro], template: '@if (datosFormulario(); as datos) { <nivi-formulario-libro [datos]="datos" [actualizando]="detalleEdicion.cargando()" (confirmar)="guardar($event)" /> }' } });
  });
  function abrirObra() {
    const fixture = TestBed.createComponent(PaginaAgregar), pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController);
    pagina.elegir(obra); fixture.detectChanges();
    http.expectOne(p => p.url.endsWith('/catalogo/obras/OL8127201W/ediciones'))
      .flush({ elementos: [{ libro: { ...edicion, autores: [] }, idiomas: ['eng'], editorial: 'Editorial de prueba', publicacion: '2023' }], pagina: 1, tamano: 10, totalElementos: 1, haySiguiente: false });
    return { fixture, pagina, http };
  }
  it('lista sin consultas por fila, completa el elegido y guarda conservando cambios tardíos', async () => {
    const { fixture, pagina, http } = abrirObra();
    http.expectNone(p => p.url.includes('/catalogo/ediciones/'));
    pagina.usarEdicion(edicion);
    const solicitud = http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M');
    const formulario = pagina.formularioLibro()!.formulario;
    formulario.controls.titulo.setValue('Mi título manual'); formulario.controls.titulo.markAsDirty();
    formulario.controls.totalPaginas.setValue(333); formulario.controls.totalPaginas.markAsDirty();
    solicitud.flush(edicion); fixture.detectChanges();
    expect(formulario.controls.titulo.value).toBe('Mi título manual'); expect(formulario.controls.totalPaginas.value).toBe(333);
    expect(formulario.controls.autores.value).toBe('Robert W. Chambers'); expect(formulario.controls.isbn.value).toBe('');
    http.expectNone(p => p.method === 'POST');
    const guardado = pagina.guardar({ ...pagina.seleccion()!, titulo: formulario.controls.titulo.value, totalPaginas: formulario.controls.totalPaginas.value });
    const alta = http.expectOne('http://localhost/api/v1/libros');
    expect(alta.request.body.metadatos).toMatchObject({ titulo: 'Mi título manual', totalPaginas: 333, idEdicionExterna: 'OL49631747M', autores: ['Robert W. Chambers'] });
    alta.flush({ libro: libroPrueba(), registro: null, advertencias: [] }); await guardado; http.verify(); fixture.destroy();
  });
  it('otra edición cancela la anterior y cambia solo las páginas de la elección vigente', () => {
    const { fixture, pagina, http } = abrirObra();
    pagina.usarEdicion(edicion); const anterior = http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M');
    pagina.usarEdicion({ ...edicion, idEdicionExterna: 'OL2M' }); expect(anterior.cancelled).toBe(true);
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL2M').flush({ ...edicion, idEdicionExterna: 'OL2M', totalPaginas: 144 }); fixture.detectChanges();
    expect(pagina.formularioLibro()!.formulario.controls.totalPaginas.value).toBe(144);
    expect(pagina.seleccion()?.idEdicionExterna).toBe('OL2M'); http.verify(); fixture.destroy();
  });
  it('un error conserva el formulario y permite reintentar sin atribuir otra edición', () => {
    const { fixture, pagina, http } = abrirObra();
    pagina.formularioLibro()!.formulario.controls.autores.setValue('Autor escrito a mano'); pagina.formularioLibro()!.formulario.controls.autores.markAsDirty();
    pagina.usarEdicion(edicion);
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M').flush({ mensaje: 'Catálogo temporalmente caído' }, { status: 503, statusText: 'Unavailable' });
    expect(pagina.seleccion()?.idEdicionExterna).toBeNull();
    expect(pagina.formularioLibro()!.formulario.controls.autores.value).toBe('Autor escrito a mano');
    pagina.reintentarEdicion(); http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M').flush(edicion); fixture.detectChanges();
    expect(pagina.formularioLibro()!.formulario.controls.autores.value).toBe('Autor escrito a mano');
    expect(pagina.formularioLibro()!.formulario.controls.totalPaginas.value).toBe(308); http.verify(); fixture.destroy();
  });
  it('al salir cancela la consulta pendiente y no modifica la selección', () => {
    const { fixture, pagina, http } = abrirObra();
    pagina.usarEdicion(edicion); const pendiente = http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M');
    pagina.ionViewWillLeave(); expect(pendiente.cancelled).toBe(true);
    expect(pagina.seleccion()?.idEdicionExterna).toBeNull(); http.verify(); fixture.destroy();
  });
  it('una respuesta parcial conserva datos de la misma edición y el autor de su obra conocida', () => {
    const { fixture, pagina, http } = abrirObra();
    pagina.obraSeleccionada.set({ ...obra, autores: ['Robert W. Chambers'] });
    pagina.usarEdicion({ ...edicion, autores: [] });
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M').flush({ ...edicion, autores: [], totalPaginas: null, idObraExterna: null }); fixture.detectChanges();
    expect(pagina.seleccion()?.idEdicionExterna).toBe('OL49631747M');
    expect(pagina.formularioLibro()!.formulario.controls.autores.value).toBe('Robert W. Chambers');
    expect(pagina.formularioLibro()!.formulario.controls.totalPaginas.value).toBe(308);
    http.verify(); fixture.destroy();
  });
  it('reintentar otra edición no reutiliza las páginas de la selección anterior', () => {
    const { fixture, pagina, http } = abrirObra();
    pagina.usarEdicion(edicion); http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL49631747M').flush(edicion); fixture.detectChanges();
    pagina.usarEdicion({ ...edicion, idEdicionExterna: 'OL2M', totalPaginas: 144 });
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL2M').flush({}, { status: 503, statusText: 'Unavailable' });
    pagina.reintentarEdicion();
    http.expectOne('http://localhost/api/v1/catalogo/ediciones/OL2M').flush({ ...edicion, idEdicionExterna: 'OL2M', totalPaginas: null }); fixture.detectChanges();
    expect(pagina.formularioLibro()!.formulario.controls.totalPaginas.value).toBe(144);
    expect(pagina.seleccion()?.idEdicionExterna).toBe('OL2M'); http.verify(); fixture.destroy();
  });
});

describe('Del escaneo a la confirmación de edición', () => {
  const escanear = vi.fn();
  beforeEach(() => {
    escanear.mockReset();
    TestBed.configureTestingModule({ imports: [PaginaAgregar], providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: EscanerIsbn, useValue: { escanear, disponible: true, ocupado: signal(false) } },
      { provide: Confirmaciones, useValue: { pedir: vi.fn().mockResolvedValue(true) } },
      { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } }] });
    TestBed.overrideComponent(PaginaAgregar, { set: { template: '', imports: [] } });
  });
  it('consulta el ISBN leído pero espera revisión y no guarda automáticamente', async () => {
    escanear.mockResolvedValue({ tipo: 'isbn', isbn: '9780140328721' });
    const fixture = TestBed.createComponent(PaginaAgregar); fixture.detectChanges();
    const pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController); pagina.ionViewWillEnter();
    await pagina.escanear();
    const peticion = http.expectOne('http://localhost/api/v1/catalogo/isbn/9780140328721');
    peticion.flush({ ...extraerMetadatos(libroPrueba({ isbn: '9780140328721' })), enlaceFuente: 'https://openlibrary.org' });
    expect(pagina.formularioIsbn.controls.isbn.value).toBe('9780140328721');
    expect(pagina.seleccion()).toBeNull(); expect(pagina.consulta.datos()?.elementos.length).toBe(1);
    http.expectNone(solicitud => solicitud.method === 'POST'); http.verify(); fixture.destroy();
  });
  it.each(['invalido', 'cancelado', 'permiso-denegado', 'no-disponible', 'error'])('mantiene alternativas sin consultar ni guardar ante %s', async tipo => {
    escanear.mockResolvedValue({ tipo });
    const fixture = TestBed.createComponent(PaginaAgregar); fixture.detectChanges();
    const pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController); pagina.ionViewWillEnter();
    await pagina.escanear(); expect(pagina.avisoEscaneo()).not.toBe('');
    http.expectNone(() => true); http.verify(); fixture.destroy();
  });
  it('ignora una lectura que llega después de abandonar la pestaña', async () => {
    let terminar!: (valor: unknown) => void; escanear.mockReturnValue(new Promise(resolve => { terminar = resolve; }));
    const fixture = TestBed.createComponent(PaginaAgregar); fixture.detectChanges();
    const pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController); pagina.ionViewWillEnter();
    const pendiente = pagina.escanear(); pagina.ionViewWillLeave(); terminar({ tipo: 'isbn', isbn: '9780140328721' }); await pendiente;
    http.expectNone(() => true); http.verify(); fixture.destroy();
  });
  it('ante edición duplicada encuentra el libro existente sin repetir el alta', async () => {
    const fixture = TestBed.createComponent(PaginaAgregar); fixture.detectChanges();
    const pagina = fixture.componentInstance, http = TestBed.inject(HttpTestingController);
    const libro = libroPrueba({ isbn: '0140328726' }), datos = extraerMetadatos(libroPrueba({ isbn: '9780140328721' }));
    const guardado = pagina.guardar(datos);
    http.expectOne('http://localhost/api/v1/libros').flush({ codigo: 'EDICION_DUPLICADA', mensaje: 'Ya está guardado.' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    http.expectOne(peticion => peticion.url.endsWith('/libros') && peticion.params.get('tamano') === '50')
      .flush({ elementos: [libro], pagina: 1, tamano: 50, totalElementos: 1, totalPaginas: 1 });
    await guardado; expect(pagina.duplicado()?.id).toBe(libro.id); expect(pagina.seleccion()?.isbn).toBe(datos.isbn);
    expect(pagina.pendientes.alta()).toBeNull(); http.verify(); fixture.destroy();
  });
});
