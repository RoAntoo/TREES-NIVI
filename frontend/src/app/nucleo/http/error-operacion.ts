import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorOperacion {
  codigo?: string;
  mensaje: string;
  campos: Record<string, string>;
  conflictoVersion: boolean;
  incierto: boolean;
  estado: number;
}
export function interpretarError(error: unknown): ErrorOperacion {
  const estado = error instanceof HttpErrorResponse ? error.status : 0;
  const cuerpo: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const datos = cuerpo && typeof cuerpo === 'object' ? cuerpo as Record<string, unknown> : {};
  const campos: Record<string, string> = {};
  if (datos['campos'] && typeof datos['campos'] === 'object') {
    for (const [campo, valor] of Object.entries(datos['campos'])) if (typeof valor === 'string') campos[campo.replace(/^metadatos\./, '')] = valor;
  }
  let mensaje = typeof datos['mensaje'] === 'string' ? datos['mensaje'] : 'No pudimos completar la operación. Volvé a intentar.';
  if (estado === 0) mensaje = 'No pudimos conectar con el servidor. Revisá la conexión y volvé a intentar.';
  if (estado === 401) mensaje = 'No pudimos acceder a la biblioteca. Revisá la configuración de conexión del servidor.';
  if (estado === 429) mensaje = 'Hay varias solicitudes seguidas. Esperá un momento antes de reintentar.';
  return { mensaje, campos, estado, codigo: typeof datos['codigo'] === 'string' ? datos['codigo'] : undefined, conflictoVersion: datos['codigo'] === 'VERSION_DESACTUALIZADA',
    incierto: estado === 0 || estado === 408 || estado === 429 || estado >= 500 };
}
