import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/** Almacén independiente de la copia de consulta de la biblioteca física. */
@Injectable({ providedIn: 'root' })
export class AlmacenEpub {
  private readonly nativo = Capacitor.isNativePlatform();

  async leer<T>(clave: string): Promise<T | undefined> {
    if (!this.nativo) return await this.web('readonly', t => t.get(clave)) as T | undefined;
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const path = `epub/${clave}.json`;
    try { await Filesystem.stat({ path, directory: Directory.Data }); }
    catch (error) {
      if ((error as { code?: string }).code === 'OS-PLUG-FILE-0008') return undefined;
      throw error;
    }
    const resultado = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 });
    return JSON.parse(resultado.data as string) as T;
  }
  async guardar(clave: string, valor: unknown): Promise<void> {
    if (!this.nativo) { await this.web('readwrite', t => t.put(valor, clave)); return; }
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ path: `epub/${clave}.tmp`, directory: Directory.Data, data: JSON.stringify(valor), encoding: Encoding.UTF8, recursive: true });
    await Filesystem.rename({ from: `epub/${clave}.tmp`, to: `epub/${clave}.json`, directory: Directory.Data });
  }
  async guardarArchivo(clave: string, archivo: Blob): Promise<void> {
    if (!this.nativo) { await this.web('readwrite', t => t.put(archivo, clave)); return; }
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    // Base64 solo durante la transferencia al plugin, nunca durante la lectura.
    const data = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader(); lector.onload = () => resolve((lector.result as string).split(',')[1]);
      lector.onerror = () => reject(lector.error); lector.readAsDataURL(archivo);
    });
    await Filesystem.writeFile({ path: `epub/${clave}.epub`, directory: Directory.Data, data, recursive: true });
  }
  async archivo(clave: string): Promise<ArrayBuffer> {
    if (!this.nativo) {
      const blob = await this.web('readonly', t => t.get(clave)) as Blob | undefined;
      if (!blob) throw new Error('No encontramos el archivo local del libro.');
      return blob.arrayBuffer();
    }
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { uri } = await Filesystem.getUri({ path: `epub/${clave}.epub`, directory: Directory.Data });
    const respuesta = await fetch(Capacitor.convertFileSrc(uri));
    if (!respuesta.ok) throw new Error('No pudimos abrir el archivo privado del libro.');
    return respuesta.arrayBuffer();
  }
  async borrarArchivo(clave: string): Promise<void> {
    if (!this.nativo) { await this.web('readwrite', t => t.delete(clave)); return; }
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.deleteFile({ path: `epub/${clave}.epub`, directory: Directory.Data });
  }
  private web(modo: IDBTransactionMode, accion: (tabla: IDBObjectStore) => IDBRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const apertura = indexedDB.open('nivi-epub', 1);
      apertura.onupgradeneeded = () => apertura.result.createObjectStore('datos');
      apertura.onerror = () => reject(apertura.error);
      apertura.onblocked = () => reject(new Error('Cerrá otras ventanas de NIVI para acceder al almacenamiento.'));
      apertura.onsuccess = () => {
        const db = apertura.result; db.onversionchange = () => db.close();
        try {
          const tx = db.transaction('datos', modo), solicitud = accion(tx.objectStore('datos'));
          tx.oncomplete = () => { db.close(); resolve(solicitud.result); };
          tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('No hay espacio o el almacenamiento no está disponible.')); };
        } catch (error) { db.close(); reject(error); }
      };
    });
  }
}
