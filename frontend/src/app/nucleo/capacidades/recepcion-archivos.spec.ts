import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ArchivoEntrante, ENTRADA_EPUB } from './entrada-epub';
import { IMPORTACION_ENTRANTE, RecepcionArchivos } from './recepcion-archivos';
import { EpubNoValido, LibroEpub } from '../../funcionalidades/epub/modelos/libro-epub';

const libro:LibroEpub = {id:'guardado',titulo:'Compartido',autores:[],referenciaArchivo:'guardado',huellaSha256:'hash',nombreArchivoOriginal:'libro.epub',tipoMime:'application/epub+zip',tamanoBytes:12,importadoEn:'2026-11-16T12:00:00Z',versionFormato:1};
describe('EPUB recibidos desde otras aplicaciones',() => {
  let cola:ArchivoEntrante[], recibido:() => void, servicio:RecepcionArchivos;
  const importar = vi.fn(), confirmar = vi.fn(), navegar = vi.fn();
  const router = {url:'/app/inicio',navigateByUrl:navegar};
  beforeEach(() => {
    cola = [{id:'entrada',nombre:'libro.epub',ruta:'file:///privado/entrada.epub'}]; recibido = () => undefined;
    importar.mockReset().mockResolvedValue({libro,duplicado:false});
    confirmar.mockReset().mockImplementation(async (id:string) => { cola = cola.filter(a => a.id !== id); });
    router.url = '/app/inicio'; navegar.mockReset().mockImplementation(async (ruta:string) => {router.url = ruta; return true;});
    TestBed.configureTestingModule({providers:[
      {provide:Router,useValue:router},
      {provide:IMPORTACION_ENTRANTE,useValue:async () => ({importar})},
      {provide:ENTRADA_EPUB,useValue:{disponible:() => true,pendientes:async () => [...cola],confirmar,
        escuchar:async (callback:() => void) => {recibido = callback;},leer:async (a:ArchivoEntrante) => new File(['EPUB'],a.nombre || 'archivo.epub')}}
    ]}); servicio = TestBed.inject(RecepcionArchivos);
  });
  it('guarda el archivo y muestra la confirmación sin entrar automáticamente al lector',async () => {
    await servicio.iniciar(); expect(importar).toHaveBeenCalledOnce(); expect(confirmar).toHaveBeenCalledWith('entrada');
    expect(cola).toEqual([]); expect(navegar).not.toHaveBeenCalled();
    expect(servicio.confirmacion()).toEqual({libro,duplicado:false,cantidad:1});
    expect(servicio.mensaje()).toBe(''); expect(servicio.puedeReintentar()).toBe(false);
    await servicio.responder(true); expect(navegar).toHaveBeenLastCalledWith('/lector/guardado'); expect(servicio.confirmacion()).toBeUndefined();
  });
  it('al recibir otro libro dentro del lector cierra la ruta anterior antes de abrir el nuevo',async () => {
    router.url = '/lector/anterior'; await servicio.iniciar();
    expect(navegar).not.toHaveBeenCalled(); await servicio.responder(true);
    expect(navegar.mock.calls).toEqual([['/app/leer',{replaceUrl:true}],['/lector/guardado']]);
  });
  it('mantiene la copia pendiente ante falta de espacio y la puede reintentar',async () => {
    importar.mockRejectedValueOnce(new DOMException('Cuota','QuotaExceededError'));
    await servicio.iniciar(); expect(confirmar).not.toHaveBeenCalled(); expect(cola).toHaveLength(1); expect(servicio.mensaje()).toContain('Reintentar'); expect(servicio.puedeReintentar()).toBe(true);
    await servicio.procesar(); expect(cola).toEqual([]); expect(importar).toHaveBeenCalledTimes(2); expect(servicio.puedeReintentar()).toBe(false);
  });
  it('descarta un archivo inválido con aviso sin dejar una importación que se repita en cada arranque',async () => {
    importar.mockRejectedValueOnce(new EpubNoValido('El archivo tiene DRM.'));
    await servicio.iniciar(); expect(cola).toEqual([]); expect(servicio.mensaje()).toContain('DRM'); expect(navegar).not.toHaveBeenCalled(); expect(servicio.puedeReintentar()).toBe(false);
  });
  it('conserva la posición de un duplicado y no reinicia el lector si ya es el mismo libro',async () => {
    router.url = '/lector/guardado'; importar.mockResolvedValue({libro:{...libro,progreso:{cfi:'epubcfi(/6/2!/4/2/1:12)'}},duplicado:true});
    await servicio.iniciar(); expect(confirmar).toHaveBeenCalledOnce(); expect(navegar).not.toHaveBeenCalled();
    expect(servicio.confirmacion()?.duplicado).toBe(true); await servicio.responder(true); expect(navegar).not.toHaveBeenCalled();
  });
  it('serializa avisos simultáneos y procesa archivos que llegan mientras importa otro',async () => {
    let terminar!:() => void;
    importar.mockImplementationOnce(() => new Promise(resolve => {terminar = () => resolve({libro,duplicado:false});}));
    const tarea = servicio.iniciar(); await vi.waitFor(() => expect(importar).toHaveBeenCalledOnce());
    cola.push({id:'segundo',nombre:'otro.epub',ruta:'file:///privado/otro.epub'}); recibido(); recibido(); terminar();
    await tarea; expect(importar).toHaveBeenCalledTimes(2); expect(cola).toEqual([]);
  });
  it('consume un fallo del proveedor informado por Android sin intentar abrir un archivo inexistente',async () => {
    cola = [{id:'fallo',error:'El archivo está vacío.'}]; await servicio.iniciar();
    expect(importar).not.toHaveBeenCalled(); expect(cola).toEqual([]); expect(servicio.mensaje()).toContain('vacío');
  });
  it('ofrece leer los EPUB válidos de un envío múltiple y conserva el aviso de los que fallaron',async () => {
    cola.unshift({id:'vacio',error:'Uno de los archivos está vacío.'}); await servicio.iniciar();
    expect(cola).toEqual([]); expect(navegar).not.toHaveBeenCalled(); expect(servicio.confirmacion()?.libro.id).toBe('guardado');
    expect(servicio.mensaje()).toContain('vacío');
  });
  it('Cerrar lleva a Inicio y conserva el libro ya guardado',async () => {
    router.url = '/lector/anterior'; await servicio.iniciar(); await servicio.responder(false);
    expect(navegar).toHaveBeenCalledExactlyOnceWith('/app/inicio',{replaceUrl:true});
    expect(confirmar).toHaveBeenCalledOnce(); expect(servicio.confirmacion()).toBeUndefined();
  });
  it('no repite la navegación si llegan dos eventos de cierre del mismo emergente',async () => {
    await servicio.iniciar(); await servicio.responder(false); await servicio.responder(false);
    expect(navegar).toHaveBeenCalledOnce();
  });
  it('puede volver a mostrar las opciones si falla la navegación, sin reimportar el libro',async () => {
    await servicio.iniciar(); navegar.mockRejectedValueOnce(new Error('No disponible')); await servicio.responder(true);
    expect(servicio.confirmacion()?.libro.id).toBe('guardado'); expect(importar).toHaveBeenCalledOnce(); expect(servicio.puedeReintentar()).toBe(false);
  });
});
