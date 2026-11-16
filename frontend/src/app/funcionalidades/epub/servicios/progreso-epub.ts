import { Injectable, inject, signal } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { RepositorioEpub } from '../datos/repositorio-epub';
import { ProgresoEpub } from '../modelos/libro-epub';

@Injectable()
export class ProgresoLector {
  private readonly repositorio = inject(RepositorioEpub);
  readonly aviso = signal('');
  private id = '';
  private pendiente?: ProgresoEpub;
  private temporizador?: ReturnType<typeof setTimeout>;
  private listener?: PluginListenerHandle;
  private activo = false;
  private readonly alOcultar = () => { if (document.visibilityState === 'hidden') void this.guardar(); };
  private readonly alSalir = () => { void this.guardar(); };

  async iniciar(id: string): Promise<void> {
    this.id = id; this.activo = true;
    document.addEventListener('visibilitychange', this.alOcultar);
    window.addEventListener('pagehide', this.alSalir);
    if (Capacitor.isNativePlatform()) {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appStateChange', ({ isActive }) => { if (!isActive) void this.guardar(); });
      if (this.activo) this.listener = listener; else await listener.remove();
    }
  }
  actualizar(progreso: ProgresoEpub): void {
    if (!this.activo) return;
    this.pendiente = progreso;
    // Diario síncrono pequeño: respalda el último CFI aun si el proceso termina sin evento.
    try { localStorage.setItem(`nivi.epub.posicion.${this.id}`, JSON.stringify(progreso)); }
    catch { this.aviso.set('No pudimos crear el respaldo inmediato. Se intentará guardar el progreso local.'); }
    // Ventana acotada: no se posterga indefinidamente al navegar rápido.
    this.temporizador ??= setTimeout(() => { this.temporizador = undefined; void this.guardar(); }, 200);
  }
  recuperar(guardado?: ProgresoEpub): ProgresoEpub | undefined {
    try {
      const texto = localStorage.getItem(`nivi.epub.posicion.${this.id}`);
      if (texto) {
        const diario = JSON.parse(texto) as ProgresoEpub;
        if (typeof diario.cfi === 'string' && diario.cfi.startsWith('epubcfi(') && typeof diario.hrefCapitulo === 'string'
          && Number.isFinite(Date.parse(diario.actualizadoEn)) && (!guardado || diario.actualizadoEn > guardado.actualizadoEn)) return diario;
      }
    } catch { /* El registro principal sigue siendo utilizable. */ }
    return guardado;
  }
  async guardar(): Promise<void> {
    clearTimeout(this.temporizador); this.temporizador = undefined;
    const progreso = this.pendiente; if (!progreso) return;
    try {
      await this.repositorio.progreso(this.id, progreso);
      if (this.pendiente === progreso) this.pendiente = undefined;
      this.aviso.set('');
    } catch { this.aviso.set('No pudimos guardar el progreso. Revisá el espacio del dispositivo; volvé a intentar antes de salir.'); }
  }
  async cerrar(): Promise<void> {
    this.activo = false;
    document.removeEventListener('visibilitychange', this.alOcultar); window.removeEventListener('pagehide', this.alSalir);
    await this.listener?.remove(); this.listener = undefined; await this.guardar();
  }
}
