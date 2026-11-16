import { Injectable, InjectionToken, Injector, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ENTRADA_EPUB } from './entrada-epub';
import { LibroEpub, EpubNoValido } from '../../funcionalidades/epub/modelos/libro-epub';

export interface ImportacionEntrante { importar(archivo:File):Promise<{libro:LibroEpub;duplicado:boolean}> }
export interface ConfirmacionCargaEpub { libro:LibroEpub; duplicado:boolean; cantidad:number }
export const IMPORTACION_ENTRANTE = new InjectionToken<() => Promise<ImportacionEntrante>>('Importador diferido de EPUB recibidos', {
  providedIn:'root',factory:() => {
    const injector = inject(Injector);
    return async () => { const {ImportadorEpub} = await import('../../funcionalidades/epub/servicios/importador-epub'); return injector.get(ImportadorEpub); };
  }
});

@Injectable({providedIn:'root'})
export class RecepcionArchivos {
  private readonly entrada = inject(ENTRADA_EPUB);
  private readonly cargarImportador = inject(IMPORTACION_ENTRANTE);
  private readonly router = inject(Router);
  private readonly zona = inject(NgZone);
  readonly mensaje = signal('');
  readonly puedeReintentar = signal(false);
  readonly procesando = signal(false);
  readonly confirmacion = signal<ConfirmacionCargaEpub | undefined>(undefined);
  private iniciada?:Promise<void>;
  private tarea?:Promise<void>;
  private revisar = false;
  private eligiendo = false;
  iniciar():Promise<void> {
    return this.iniciada ??= this.conectar();
  }
  private async conectar():Promise<void> {
    if (!this.entrada.disponible()) return;
    try {
      await this.entrada.escuchar(() => { void this.procesar(); },mensaje => this.zona.run(() => { this.mensaje.set(mensaje); this.puedeReintentar.set(false); }));
      await this.procesar();
    } catch { this.zona.run(() => { this.mensaje.set('No pudimos recuperar los archivos recibidos. Volvé a intentarlo.'); this.puedeReintentar.set(true); }); }
  }
  procesar():Promise<void> {
    if (!this.entrada.disponible()) return Promise.resolve();
    this.revisar = true;
    if (this.tarea) return this.tarea;
    this.procesando.set(true); this.puedeReintentar.set(false);
    this.tarea = this.recorrer().catch(() => this.zona.run(() => {
      this.mensaje.set('No pudimos guardar el EPUB recibido. Revisá el espacio disponible y tocá Reintentar.'); this.puedeReintentar.set(true);
    })).finally(() => { this.tarea = undefined; this.procesando.set(false); if (this.revisar) void this.procesar(); });
    return this.tarea;
  }
  private async recorrer():Promise<void> {
    const vistos = new Set<string>(), guardados = new Set<string>();
    let ultimo:ConfirmacionCargaEpub | undefined; let falloFinal:string | undefined; let reintentable = false;
    do {
      this.revisar = false;
      const archivos = await this.entrada.pendientes();
      for (const archivo of archivos) {
        if (vistos.has(archivo.id)) continue; vistos.add(archivo.id);
        if (archivo.error) {
          falloFinal = archivo.error; this.zona.run(() => this.mensaje.set(archivo.error!)); await this.entrada.confirmar(archivo.id); continue;
        }
        this.zona.run(() => this.mensaje.set('Guardando el EPUB recibido…'));
        try {
          const importador = await this.cargarImportador();
          const {libro,duplicado} = await importador.importar(await this.entrada.leer(archivo));
          // Solo retirar la copia de entrada después de que el repositorio confirmó el guardado.
          await this.entrada.confirmar(archivo.id); guardados.add(libro.id); ultimo = {libro,duplicado,cantidad:guardados.size};
        } catch (error) {
          if (error instanceof EpubNoValido) {
            falloFinal = error.message; await this.entrada.confirmar(archivo.id);
          } else { falloFinal = 'No pudimos guardar el EPUB recibido. Revisá el espacio disponible y tocá Reintentar.'; reintentable = true; }
          this.zona.run(() => this.mensaje.set(falloFinal!));
        }
      }
    } while (this.revisar);
    if (ultimo) {
      const confirmacion = ultimo;
      this.zona.run(() => { this.confirmacion.set(confirmacion); if (!falloFinal) this.mensaje.set(''); });
    }
    this.zona.run(() => { this.puedeReintentar.set(reintentable); if (falloFinal) this.mensaje.set(falloFinal); });
  }
  async responder(leer:boolean, resultado = this.confirmacion()):Promise<void> {
    if (!resultado || this.eligiendo) return;
    this.eligiendo = true;
    if (this.confirmacion() === resultado) this.confirmacion.set(undefined);
    try {
      await this.zona.run(async () => {
        if (!leer) { await this.router.navigateByUrl('/app/inicio',{replaceUrl:true}); return; }
        const ruta = `/lector/${resultado.libro.id}`;
        if (this.router.url.split(/[?#]/)[0] === ruta) return;
        // Guarda y abandona el lector previo solo después de elegir Comenzar a leer.
        if (this.router.url.startsWith('/lector/')) await this.router.navigateByUrl('/app/leer',{replaceUrl:true});
        await this.router.navigateByUrl(ruta);
      });
    } catch {
      if (!this.confirmacion()) this.confirmacion.set(resultado);
      this.mensaje.set('El libro está guardado, pero no pudimos abrir la pantalla. Volvé a elegir una opción.'); this.puedeReintentar.set(false);
    } finally { this.eligiendo = false; }
  }
}
