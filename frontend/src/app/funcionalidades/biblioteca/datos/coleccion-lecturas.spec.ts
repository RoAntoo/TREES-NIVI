import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ColeccionLecturas, entradaDigital, entradaFisica, ordenarColeccion } from './coleccion-lecturas';
import { ApiBiblioteca } from './api-biblioteca';
import { RepositorioEpub } from '../../epub/datos/repositorio-epub';
import { LibroEpub } from '../../epub/modelos/libro-epub';
import { libroPrueba } from '../../../pruebas/datos-lectura';

const digital = (cambios:Partial<LibroEpub> = {}):LibroEpub => ({id:'digital',titulo:'Un EPUB',autores:[],referenciaArchivo:'digital',huellaSha256:'hash',nombreArchivoOriginal:'libro.epub',tipoMime:'application/epub+zip',tamanoBytes:12,importadoEn:'2026-11-15T10:00:00Z',versionFormato:1,...cambios});
describe('Biblioteca y estadísticas de ambos formatos',() => {
  const libros = signal<LibroEpub[]>([]), listar = vi.fn();
  beforeEach(() => {
    libros.set([]); listar.mockReset();
    TestBed.configureTestingModule({providers:[{provide:ApiBiblioteca,useValue:{listar}},{provide:RepositorioEpub,useValue:{libros,listo:Promise.resolve()}}]});
  });
  it('incluye un avance en un libro físico antiguo aunque esté en otra página del servidor',async () => {
    const fisicoAntiguo = libroPrueba({id:'antiguo',creadoEn:'2020-01-01T00:00:00Z',actualizadoEn:'2026-11-15T13:00:00Z'});
    const nuevo = libroPrueba({id:'nuevo',actualizadoEn:'2026-11-15T11:00:00Z'});
    listar.mockImplementation((_q:string,_estado:string,p:number) => of({elementos:p === 1 ? [nuevo] : [fisicoAntiguo],pagina:p,totalPaginas:2,tamano:50,totalElementos:2}));
    libros.set([digital({ultimaLecturaEn:'2026-11-15T12:00:00Z'}),digital({id:'otro',importadoEn:'2026-11-15T09:00:00Z'})]);
    const coleccion = TestBed.inject(ColeccionLecturas); await firstValueFrom(coleccion.consultar());
    expect(listar).toHaveBeenCalledTimes(2);
    expect(coleccion.recientes().map(l => l.clave)).toEqual(['fisico:antiguo','epub:digital','fisico:nuevo']);
    expect(coleccion.entradas()).toHaveLength(4);
  });
  it('suma estados digitales y actualiza el Home al leer sin enviar progreso al servidor',async () => {
    const fisico = libroPrueba({id:'mismo',estado:'PAUSADO',paginaActual:45});
    listar.mockReturnValue(of({elementos:[fisico],pagina:1,totalPaginas:1}));
    libros.set([digital({id:'mismo'}),digital({id:'leido',progreso:{cfi:'epubcfi(/6/2!/4/2/1:0)',hrefCapitulo:'cap',capitulo:'Final',actualizadoEn:'2026-11-15T12:00:00Z',versionMotor:'prueba',terminado:true}})]);
    const coleccion = TestBed.inject(ColeccionLecturas); await firstValueFrom(coleccion.consultar());
    expect(coleccion.conteos()).toEqual({PENDIENTE:1,LEYENDO:0,PAUSADO:1,TERMINADO:1});
    libros.update(ls => ls.map(l => l.id === 'mismo' ? {...l,ultimaLecturaEn:'2026-11-15T14:00:00Z',progreso:{cfi:'epubcfi(/6/2!/4/2/1:0)',hrefCapitulo:'cap',capitulo:'Inicio',actualizadoEn:'2026-11-15T14:00:00Z',versionMotor:'prueba'}} : l));
    expect(coleccion.conteos()).toEqual({PENDIENTE:0,LEYENDO:1,PAUSADO:1,TERMINADO:1});
    expect(coleccion.recientes()[0].ruta).toEqual(['/lector','mismo']); expect(fisico.paginaActual).toBe(45); expect(listar).toHaveBeenCalledOnce();
  });
  it('mantiene accesibles los EPUB cuando falla la consulta del servidor',async () => {
    listar.mockReturnValue(throwError(() => new HttpErrorResponse({status:0}))); libros.set([digital()]);
    const coleccion = TestBed.inject(ColeccionLecturas); await expect(firstValueFrom(coleccion.consultar())).rejects.toBeDefined();
    expect(coleccion.entradas()[0].tipo).toBe('epub'); expect(coleccion.conteos().PENDIENTE).toBe(1);
  });
  it('permite ordenar por alta, lectura/actividad o título sin mezclar las fechas de ambos formatos',() => {
    const fisico = entradaFisica(libroPrueba({id:'antiguo',titulo:'Zorro',creadoEn:'2020-01-01T00:00:00Z',actualizadoEn:'2026-11-16T12:00:00Z'}));
    const epub = entradaDigital(digital({titulo:'Árbol',importadoEn:'2026-11-15T10:00:00Z'}));
    const entradas = [fisico,epub];
    expect(ordenarColeccion(entradas,'actividad').map(l => l.titulo)).toEqual(['Zorro','Árbol']);
    expect(ordenarColeccion(entradas,'agregados').map(l => l.titulo)).toEqual(['Árbol','Zorro']);
    expect(ordenarColeccion(entradas,'titulo').map(l => l.titulo)).toEqual(['Árbol','Zorro']);
    expect(entradas[0]).toBe(fisico);
  });
});
