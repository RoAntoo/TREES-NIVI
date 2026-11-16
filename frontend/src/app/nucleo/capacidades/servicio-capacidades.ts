import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { EscanerIsbn } from './escaner-isbn';

@Injectable({ providedIn: 'root' })
export class ServicioCapacidades {
  readonly plataforma = Capacitor.getPlatform();
  readonly esNativa = Capacitor.isNativePlatform();
  private readonly escaner = inject(EscanerIsbn);
  get escaneoDisponible(): boolean { return this.escaner.disponible; }
}
