import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No pudimos completar la operación. Volvé a intentar.';
  if (error.status === 0) return 'No pudimos conectar con el servidor. Revisá la conexión y volvé a intentar.';
  if (error.status === 401) return 'El usuario o la contraseña no son correctos.';
  if (error.status === 429) return 'Hubo varios intentos seguidos. Esperá un minuto y volvé a intentar.';
  return 'El servidor no pudo completar la operación. Volvé a intentar en un momento.';
}
