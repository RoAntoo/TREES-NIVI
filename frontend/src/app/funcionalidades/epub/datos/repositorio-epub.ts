import { Injectable, inject, signal } from '@angular/core';
import { AlmacenEpub } from './almacen-epub';
import { EstadoEpub, LibroEpub, PreferenciasLector, ProgresoEpub, preferenciasIniciales } from '../modelos/libro-epub';

@Injectable({ providedIn: 'root' })
export class RepositorioEpub {
  private readonly almacen = inject(AlmacenEpub);
  readonly libros = signal<LibroEpub[]>([]);
  readonly preferencias = signal<PreferenciasLector>({ ...preferenciasIniciales });
  private carga = this.cargar();
  get listo(): Promise<void> { return this.carga; }
  reintentar(): Promise<void> { this.carga = this.cargar(); return this.carga; }
  private cola: Promise<unknown> = Promise.resolve();

  private async cargar(): Promise<void> {
    const estado = await this.almacen.leer<EstadoEpub>('estado');
    if (estado) {
      if (estado.version !== 1 || !Array.isArray(estado.libros) || estado.libros.some(l => !l ||
        typeof l.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(l.id) || l.referenciaArchivo !== l.id ||
        typeof l.titulo !== 'string' || !Array.isArray(l.autores) || l.autores.some(a => typeof a !== 'string') ||
        typeof l.importadoEn !== 'string' || typeof l.huellaSha256 !== 'string' || l.versionFormato !== 1)) {
        throw new Error('No pudimos leer la colección local. No se modificaron tus archivos.');
      }
      const p = { ...preferenciasIniciales, ...estado.preferencias };
      this.libros.set(estado.libros); this.preferencias.set({
        tamanoFuente: Number.isFinite(p.tamanoFuente) ? Math.max(14, Math.min(36, p.tamanoFuente)) : 20,
        interlineado: Number.isFinite(p.interlineado) ? Math.max(1.2, Math.min(2.4, p.interlineado)) : 1.6,
        calidez: Number.isFinite(p.calidez) ? Math.max(0, Math.min(70, p.calidez)) : 0,
        tema: ['claro', 'sepia', 'oscuro'].includes(p.tema) ? p.tema : 'claro',
        ...(['deslizar','toques','botones','vertical'].includes(p.navegacion ?? '') ? {navegacion:p.navegacion} : {})
      });
    }
  }
  private serializar<T>(accion: () => Promise<T>): Promise<T> {
    const tarea = this.cola.catch(() => undefined).then(async () => { await this.listo; return accion(); });
    this.cola = tarea; return tarea;
  }
  private async guardar(libros = this.libros(), preferencias = this.preferencias()): Promise<void> {
    await this.almacen.guardar('estado', { version: 1, libros, preferencias } satisfies EstadoEpub);
    this.libros.set(libros); this.preferencias.set(preferencias);
  }
  agregar(libro: LibroEpub, archivo: Blob): Promise<{ libro: LibroEpub; duplicado: boolean }> {
    return this.serializar(async () => {
      const existente = this.libros().find(l => l.huellaSha256 === libro.huellaSha256);
      if (existente) return { libro: existente, duplicado: true };
      await this.almacen.guardarArchivo(libro.referenciaArchivo, archivo);
      try { await this.guardar([...this.libros(), libro]); }
      catch (error) { await this.almacen.borrarArchivo(libro.referenciaArchivo).catch(() => undefined); throw error; }
      // La denegación de persist() no convierte el archivo en una caché de la aplicación.
      if (typeof navigator.storage?.persist === 'function') void navigator.storage.persist().catch(() => false);
      return { libro, duplicado: false };
    });
  }
  async archivo(id: string): Promise<ArrayBuffer> {
    await this.listo;
    const libro = this.libros().find(l => l.id === id);
    if (!libro) throw new Error('Este libro ya no está en el dispositivo.');
    return this.almacen.archivo(libro.referenciaArchivo);
  }
  progreso(id: string, progreso: ProgresoEpub): Promise<void> {
    return this.serializar(() => this.guardar(this.libros().map(l => l.id === id ? { ...l, progreso, ultimaLecturaEn: progreso.actualizadoEn } : l)));
  }
  cambiarPreferencias(preferencias: PreferenciasLector): Promise<void> {
    return this.serializar(() => this.guardar(this.libros(), { ...preferencias }));
  }
  eliminar(id: string): Promise<void> {
    return this.serializar(async () => {
      const libro = this.libros().find(l => l.id === id); if (!libro) return;
      const anteriores = this.libros();
      // Una interrupción puede dejar un archivo huérfano, nunca una tarjeta sin archivo.
      await this.guardar(anteriores.filter(l => l.id !== id));
      try { await this.almacen.borrarArchivo(libro.referenciaArchivo); }
      catch (error) { await this.guardar(anteriores); throw error; }
    });
  }
}
