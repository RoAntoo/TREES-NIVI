import { InjectionToken } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface ArchivoEntrante { id:string; nombre?:string; ruta?:string; tamano?:number; error?:string }
interface PluginEntradaEpub {
  pendientes():Promise<{archivos:ArchivoEntrante[]}>;
  confirmar(opciones:{id:string}):Promise<void>;
  addListener(evento:'epubRecibido' | 'errorRecepcion', callback:(datos:{mensaje?:string}) => void):Promise<PluginListenerHandle>;
}
const plugin = registerPlugin<PluginEntradaEpub>('EntradaEpub');
export interface EntradaEpub {
  disponible():boolean;
  pendientes():Promise<ArchivoEntrante[]>;
  confirmar(id:string):Promise<void>;
  escuchar(recibido:() => void, error:(mensaje:string) => void):Promise<void>;
  leer(archivo:ArchivoEntrante):Promise<File>;
}
export const ENTRADA_EPUB = new InjectionToken<EntradaEpub>('Archivos EPUB compartidos con Android', {
  providedIn:'root',factory:() => ({
    disponible:() => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('EntradaEpub'),
    pendientes:async () => (await plugin.pendientes()).archivos,
    confirmar:async id => plugin.confirmar({id}),
    escuchar:async (recibido,error) => {
      await plugin.addListener('epubRecibido',recibido);
      await plugin.addListener('errorRecepcion',datos => error(datos.mensaje ?? 'No pudimos recibir el EPUB.'));
    },
    leer:async archivo => {
      if (!archivo.ruta?.startsWith('file:')) throw new Error('No encontramos la copia del archivo recibido.');
      const respuesta = await fetch(Capacitor.convertFileSrc(archivo.ruta));
      if (!respuesta.ok) throw new Error('No pudimos abrir la copia del archivo recibido.');
      return new File([await respuesta.blob()],archivo.nombre || 'Libro compartido.epub',{type:'application/epub+zip'});
    }
  })
});
