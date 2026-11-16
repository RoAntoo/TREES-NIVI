import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PaginaBiblioteca } from './pagina-biblioteca';
import { ApiBiblioteca } from '../datos/api-biblioteca';
import { CONFIGURACION_API, leerConfiguracionApi } from '../../../nucleo/configuracion/configuracion-api';
import { ColeccionLecturas, entradaDigital, entradaFisica } from '../datos/coleccion-lecturas';
import { Confirmaciones } from '../../../compartido/confirmar';
import { EscriturasPendientes } from '../datos/escrituras-pendientes';
import { libroPrueba } from '../../../pruebas/datos-lectura';

describe('Ida y vuelta de Biblioteca con caché Ionic', () => {
  it('presenta solamente los clasificadores, sin buscador ni botón Agregar libro',() => {
    TestBed.configureTestingModule({imports:[PaginaBiblioteca],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
      {provide:CONFIGURACION_API,useValue:leerConfiguracionApi({apiUrl:'/api/v1'},'http://localhost')},
      {provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:convertToParamMap({})}}}]});
    const fixture = TestBed.createComponent(PaginaBiblioteca); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-input,input[type="search"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Agregar libro');
    expect(fixture.nativeElement.querySelectorAll('.clasificador ion-select')).toHaveLength(2);
    fixture.destroy();
  });
  it('consulta una vez por entrada y cancela la consulta al salir', () => {
    TestBed.configureTestingModule({ imports: [PaginaBiblioteca], providers: [provideRouter([]),provideHttpClient(), provideHttpClientTesting(),
      { provide: CONFIGURACION_API, useValue: leerConfiguracionApi({ apiUrl: '/api/v1' }, 'http://localhost') },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }] });
    TestBed.overrideComponent(PaginaBiblioteca, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(PaginaBiblioteca); const pagina = fixture.componentInstance; const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); http.expectNone(() => true);
    pagina.ionViewWillEnter(); fixture.detectChanges(); const primera = http.expectOne(p => p.url.endsWith('/libros'));
    pagina.ionViewWillLeave(); expect(primera.cancelled).toBe(true); fixture.detectChanges();
    pagina.ionViewWillEnter(); fixture.detectChanges();
    http.expectOne(p => p.url.endsWith('/libros')).flush({ elementos: [], pagina: 1, tamano: 12, totalElementos: 0, totalPaginas: 0 });
    TestBed.inject(ApiBiblioteca).actualizarVistas(); fixture.detectChanges();
    http.expectOne(p => p.url.endsWith('/libros')).flush({ elementos: [], pagina: 1, tamano: 12, totalElementos: 0, totalPaginas: 0 });
    http.verify(); fixture.destroy();
  });
});

describe('Acciones de Biblioteca',() => {
  const epub = entradaDigital({id:'digital',titulo:'Un EPUB',autores:[],referenciaArchivo:'digital',huellaSha256:'hash',nombreArchivoOriginal:'libro.epub',tipoMime:'application/epub+zip',tamanoBytes:12,importadoEn:'2026-11-15T10:00:00Z',versionFormato:1});
  const fisico = entradaFisica(libroPrueba({id:'fisico',version:7}));
  const eliminarEpub = vi.fn(), eliminarFisico = vi.fn(), quitarFisico = vi.fn(), confirmar = vi.fn(), navegar = vi.fn(), resolverAvance = vi.fn();
  const bloqueada = signal(false), revision = signal(0);
  beforeEach(() => {
    vi.resetAllMocks(); bloqueada.set(false); revision.set(0); confirmar.mockResolvedValue(true); eliminarEpub.mockResolvedValue(undefined); eliminarFisico.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({imports:[PaginaBiblioteca],providers:[
      {provide:ApiBiblioteca,useValue:{revision,copia:{bloqueada},sincronizando:signal(false),eliminar:eliminarFisico,actualizarVistas:() => revision.update(n => n+1)}},
      {provide:ColeccionLecturas,useValue:{entradas:signal([epub,fisico]),epub:{eliminar:eliminarEpub},quitarFisico}},
      {provide:Confirmaciones,useValue:{pedir:confirmar}}, {provide:Router,useValue:{navigate:navegar}},
      {provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:convertToParamMap({})}}},
      {provide:EscriturasPendientes,useValue:{resolverAvance}}]});
    TestBed.overrideComponent(PaginaBiblioteca,{set:{template:'',imports:[]}});
  });
  function preparar() { return TestBed.createComponent(PaginaBiblioteca).componentInstance; }
  it.each(['backdrop','cerrar',undefined])('cierra con %s sin navegar ni eliminar',async rol => {
    const pagina = preparar(); pagina.mostrarAcciones(epub); expect(pagina.seleccion()).toBe(epub);
    await pagina.resolverAccion(rol); expect(pagina.seleccion()).toBeUndefined();
    expect(navegar).not.toHaveBeenCalled(); expect(confirmar).not.toHaveBeenCalled(); expect(eliminarEpub).not.toHaveBeenCalled(); expect(eliminarFisico).not.toHaveBeenCalled();
  });
  it('abre el lector o el detalle solo al elegir la acción',async () => {
    const pagina = preparar();
    for (const entrada of [epub,fisico]) { pagina.mostrarAcciones(entrada); await pagina.resolverAccion('abrir',entrada); expect(navegar).toHaveBeenLastCalledWith(entrada.ruta); }
  });
  it('respeta la cancelación de la confirmación de borrado',async () => {
    confirmar.mockResolvedValue(false); const pagina = preparar(); pagina.mostrarAcciones(epub); await pagina.resolverAccion('eliminar',epub);
    expect(eliminarEpub).not.toHaveBeenCalled(); expect(pagina.eliminando()).toBe(false);
  });
  it('elimina el EPUB y su posición local sin llamar a la API física',async () => {
    localStorage.setItem('nivi.epub.posicion.digital','posición');
    const pagina = preparar(); pagina.mostrarAcciones(epub); await pagina.resolverAccion('eliminar',epub);
    expect(eliminarEpub).toHaveBeenCalledWith('digital'); expect(localStorage.getItem('nivi.epub.posicion.digital')).toBeNull(); expect(eliminarFisico).not.toHaveBeenCalled();
  });
  it('elimina el físico con su versión y actualiza la colección después de la respuesta',async () => {
    const pagina = preparar(); pagina.mostrarAcciones(fisico); await pagina.resolverAccion('eliminar',fisico);
    expect(eliminarFisico).toHaveBeenCalledWith('fisico',7); expect(quitarFisico).toHaveBeenCalledWith('fisico'); expect(resolverAvance).toHaveBeenCalledWith('fisico'); expect(eliminarEpub).not.toHaveBeenCalled();
  });
  it('impide borrar físicos sin conexión, manteniendo las acciones locales de EPUB',async () => {
    bloqueada.set(true); const pagina = preparar(); expect(pagina.puedeEliminar(fisico)).toBe(false); expect(pagina.puedeEliminar(epub)).toBe(true);
    pagina.mostrarAcciones(fisico); await pagina.resolverAccion('eliminar',fisico); expect(confirmar).not.toHaveBeenCalled(); expect(eliminarFisico).not.toHaveBeenCalled();
  });
  it('conserva la tarjeta y consulta la versión actual si la eliminación entra en conflicto',async () => {
    eliminarFisico.mockReturnValue(throwError(() => new HttpErrorResponse({status:409,error:{codigo:'VERSION_DESACTUALIZADA'}})));
    const pagina = preparar(); pagina.mostrarAcciones(fisico); await pagina.resolverAccion('eliminar',fisico);
    expect(quitarFisico).not.toHaveBeenCalled(); expect(pagina.error()).toBeTruthy(); expect(revision()).toBe(1); expect(pagina.eliminando()).toBe(false);
  });
});
