import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import { Blob as BlobNode } from 'node:buffer';
import { AlmacenEpub } from './almacen-epub';
import { RepositorioEpub } from './repositorio-epub';
import { LibroEpub, ProgresoEpub } from '../modelos/libro-epub';

const libro = (id: string): LibroEpub => ({ id, titulo: 'Prueba', autores: [], referenciaArchivo: id, huellaSha256: id,
  nombreArchivoOriginal:'prueba.epub', tipoMime:'application/epub+zip', tamanoBytes:4, importadoEn:'2026-11-15T12:00:00Z', versionFormato:1 });
const progreso: ProgresoEpub = { cfi:'epubcfi(/6/2!/4/2/1:42)', hrefCapitulo:'capitulo.xhtml', capitulo:'Capítulo', porcentaje:25, actualizadoEn:'2026-11-15T12:05:00Z', versionMotor:'prueba' };

describe('Colección EPUB persistente e independiente', () => {
  beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); TestBed.configureTestingModule({}); });
  afterEach(() => vi.unstubAllGlobals());
  async function abrir(): Promise<RepositorioEpub> { const repo = TestBed.inject(RepositorioEpub); await repo.listo; return repo; }
  it('recupera el archivo completo, CFI, capítulo y preferencias en una instancia nueva', async () => {
    const repo = await abrir();
    const archivo = new BlobNode(['EPUB'], {type:'application/epub+zip'}) as unknown as Blob;
    await repo.agregar(libro('uno'), archivo); await repo.progreso('uno', progreso);
    await repo.cambiarPreferencias({ tamanoFuente:26, interlineado:2, tema:'oscuro', calidez:40 });
    TestBed.resetTestingModule();
    const reabierto = await abrir();
    expect(reabierto.libros()[0].progreso).toEqual(progreso);
    expect(reabierto.libros()[0].ultimaLecturaEn).toBe(progreso.actualizadoEn);
    expect(reabierto.preferencias()).toEqual({ tamanoFuente:26, interlineado:2, tema:'oscuro', calidez:40 });
    expect(new TextDecoder().decode(await reabierto.archivo('uno'))).toBe('EPUB');
  });
  it('no duplica un archivo ni reemplaza su progreso y elimina solo el libro elegido', async () => {
    const repo = await abrir(), blob = new Blob(['EPUB']);
    await repo.agregar(libro('uno'), blob); await repo.agregar(libro('dos'), blob); await repo.progreso('uno', progreso);
    const resultado = await repo.agregar({...libro('otro'), huellaSha256:'uno'}, blob);
    expect(resultado.duplicado).toBe(true); expect(resultado.libro.progreso).toEqual(progreso); expect(repo.libros()).toHaveLength(2);
    await repo.eliminar('dos');
    expect(repo.libros()).toHaveLength(1); expect(repo.libros()[0].progreso).toEqual(progreso);
    await expect(repo.archivo('dos')).rejects.toThrow();
  });
  it('limpia el archivo si falla la escritura de los metadatos por falta de espacio', async () => {
    const repo = await abrir(), almacen = TestBed.inject(AlmacenEpub);
    const borrar = vi.spyOn(almacen,'borrarArchivo'); vi.spyOn(almacen,'guardar').mockRejectedValueOnce(new DOMException('Sin espacio','QuotaExceededError'));
    await expect(repo.agregar(libro('uno'), new Blob(['EPUB']))).rejects.toThrow('Sin espacio');
    expect(repo.libros()).toEqual([]); expect(borrar).toHaveBeenCalledWith('uno');
    await expect(almacen.archivo('uno')).rejects.toThrow();
  });
  it('serializa escrituras para que una preferencia no sobrescriba la última posición', async () => {
    const repo = await abrir(); await repo.agregar(libro('uno'), new Blob(['EPUB']));
    await Promise.all([repo.progreso('uno', progreso), repo.cambiarPreferencias({tamanoFuente:30,interlineado:1.8,tema:'sepia',calidez:20})]);
    TestBed.resetTestingModule(); const reabierto = await abrir();
    expect(reabierto.libros()[0].progreso).toEqual(progreso); expect(reabierto.preferencias().tamanoFuente).toBe(30);
  });
  it('migra preferencias anteriores y conserva la forma de pasar de página al reiniciar',async () => {
    const repo = await abrir(); expect(repo.preferencias().navegacion).toBeUndefined();
    await repo.cambiarPreferencias({...repo.preferencias(),navegacion:'toques'});
    TestBed.resetTestingModule(); expect((await abrir()).preferencias().navegacion).toBe('toques');
  });
  it('recupera la lectura en cascada como preferencia persistente',async () => {
    const repo = await abrir(); await repo.cambiarPreferencias({...repo.preferencias(),navegacion:'vertical'});
    TestBed.resetTestingModule(); expect((await abrir()).preferencias().navegacion).toBe('vertical');
  });
  it('rechaza referencias de archivo dañadas sin borrar datos y permite reintentar', async () => {
    const almacen = TestBed.inject(AlmacenEpub);
    await almacen.guardar('estado',{version:1,libros:[{...libro('uno'),referenciaArchivo:'../../otro'}]});
    const repo = TestBed.inject(RepositorioEpub); await expect(repo.listo).rejects.toThrow('No se modificaron');
    expect(await almacen.leer('estado')).toBeDefined();
    await almacen.guardar('estado',{version:1,libros:[libro('uno')],preferencias:{tema:'invalido',tamanoFuente:900,interlineado:0,calidez:-20}});
    await repo.reintentar(); expect(repo.libros()).toHaveLength(1);
    expect(repo.preferencias()).toEqual({tema:'claro',tamanoFuente:36,interlineado:1.2,calidez:0});
  });
});
