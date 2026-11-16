import { signal } from '@angular/core';
import { Observable, Subscription, finalize } from 'rxjs';
import { ErrorOperacion, interpretarError } from '../../nucleo/http/error-operacion';

export interface ControlRefresco { complete(): Promise<void> }

/** Una consulta activa por vista. Cancelar también termina cualquier refresco pendiente. */
export class Consulta<T> {
  readonly datos = signal<T | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<ErrorOperacion | null>(null);
  private suscripcion?: Subscription;

  cargar(fuente: Observable<T>, refresco?: ControlRefresco): void {
    this.cancelar(); this.cargando.set(true); this.error.set(null);
    this.suscripcion = fuente.pipe(finalize(() => {
      this.cargando.set(false);
      if (refresco) void refresco.complete().catch(() => { /* El refresco puede haberse destruido al navegar. */ });
    })).subscribe({ next: datos => this.datos.set(datos), error: (error: unknown) => {
      const interpretado = interpretarError(error);
      if (interpretado.estado === 404 || interpretado.estado === 401 || interpretado.estado === 403) this.datos.set(null);
      this.error.set(interpretado);
    } });
  }
  cancelar(): void { this.suscripcion?.unsubscribe(); }
  limpiar(): void { this.cancelar(); this.datos.set(null); this.error.set(null); }
}
