import { Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular/platform';
import { NavController } from '@ionic/angular/nav-controller';

interface SalidaAndroid { disponible(): boolean; salir(): Promise<void> }
export const SALIDA_ANDROID = new InjectionToken<SalidaAndroid>('Salida nativa de Android', {
  providedIn: 'root',
  factory: () => ({
    disponible: () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('App'),
    salir: async () => { const { App } = await import('@capacitor/app'); await App.exitApp(); }
  })
});

@Injectable({ providedIn: 'root' })
export class RetornoAndroid {
  private readonly plataforma = inject(Platform);
  private readonly router = inject(Router);
  private readonly navegacion = inject(NavController);
  private readonly salida = inject(SALIDA_ANDROID);

  registrar(puedeVolver: () => boolean): () => void {
    if (!this.salida.disponible()) return () => undefined;
    let ocupado = false;
    // Overlays (100), menú (99) y navegación (0) conservan su prioridad.
    const suscripcion = this.plataforma.backButton.subscribeWithPriority(-1, async () => {
      if (ocupado || puedeVolver()) return;
      ocupado = true;
      try {
        const ruta = this.router.url.split(/[?#]/)[0].replace(/\/$/, '');
        if (ruta === '/app/inicio') await this.salida.salir();
        else if (['/app/biblioteca', '/app/agregar', '/app/ajustes', '/app/leer'].includes(ruta)) {
          await this.navegacion.navigateRoot('/app/inicio', { replaceUrl: true });
        } else if (/^\/app\/biblioteca\/[^/]+$/.test(ruta)) {
          await this.navegacion.navigateBack('/app/biblioteca', { replaceUrl: true });
        }
      } finally { ocupado = false; }
    });
    return () => suscripcion.unsubscribe();
  }
}
