import { Injectable, InjectionToken, inject } from '@angular/core';
import { Capacitor, SystemBars } from '@capacitor/core';

export const BARRAS_LECTOR = new InjectionToken('Barras del sistema para lectura', {
  providedIn:'root',factory:() => ({disponible:() => Capacitor.getPlatform() === 'android',ocultar:() => SystemBars.hide(),mostrar:() => SystemBars.show()})
});

@Injectable({providedIn:'root'})
export class PantallaInmersiva {
  private readonly barras = inject(BARRAS_LECTOR);
  private cola:Promise<unknown> = Promise.resolve();
  cambiar(ocultar:boolean):Promise<void> {
    if (!this.barras.disponible()) return Promise.resolve();
    const tarea = this.cola.catch(() => undefined).then(() => ocultar ? this.barras.ocultar() : this.barras.mostrar());
    this.cola = tarea; return tarea;
  }
}
