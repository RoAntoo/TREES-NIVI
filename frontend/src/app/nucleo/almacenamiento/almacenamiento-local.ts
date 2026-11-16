import { Injectable } from '@angular/core';

/** Objetos en IndexedDB; ajustes pequeños en localStorage. Sin credenciales. */
@Injectable({ providedIn: 'root' })
export class AlmacenamientoLocal {
  leerAjuste(clave: string): string | null { return localStorage.getItem(clave); }
  guardarAjuste(clave: string, valor: string): void { localStorage.setItem(clave, valor); }
  async leer(clave: string): Promise<unknown> { return this.operar('readonly', tabla => tabla.get(clave)); }
  async guardar(clave: string, valor: unknown): Promise<void> { await this.operar('readwrite', tabla => tabla.put(valor, clave)); }
  async borrar(clave: string): Promise<void> { await this.operar('readwrite', tabla => tabla.delete(clave)); }
  private operar(modo: IDBTransactionMode, accion: (tabla: IDBObjectStore) => IDBRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const apertura = indexedDB.open('nivi-consulta', 1);
      apertura.onupgradeneeded = () => apertura.result.createObjectStore('copias');
      apertura.onerror = () => reject(apertura.error);
      apertura.onblocked = () => reject(new Error('Almacenamiento ocupado.'));
      apertura.onsuccess = () => {
        const db = apertura.result;
        db.onversionchange = () => db.close();
        try {
          const tx = db.transaction('copias', modo);
          const solicitud = accion(tx.objectStore('copias'));
          tx.oncomplete = () => { db.close(); resolve(solicitud.result); };
          tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
        } catch (error) { db.close(); reject(error); }
      };
    });
  }
}
