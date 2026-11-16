import { InjectionToken } from '@angular/core';

export interface ConfiguracionApi {
  readonly url: string;
  readonly origen: string;
  readonly prefijo: string;
}

export const CONFIGURACION_API = new InjectionToken<ConfiguracionApi>('Configuración de API');

export function leerConfiguracionApi(datos: unknown, origenAplicacion: string): ConfiguracionApi {
  if (!datos || typeof datos !== 'object' || !('apiUrl' in datos) || typeof datos.apiUrl !== 'string') {
    throw new Error('Falta la URL de API.');
  }
  const api = new URL(datos.apiUrl, origenAplicacion);
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash
    || api.pathname.replace(/\/$/, '') !== '/api/v1') {
    throw new Error('La URL debe usar HTTP(S) y el prefijo /api/v1.');
  }
  if (new URL(origenAplicacion).protocol === 'https:' && api.protocol !== 'https:') {
    throw new Error('Una aplicación HTTPS requiere una API HTTPS.');
  }
  return { url: `${api.origin}/api/v1`, origen: api.origin, prefijo: '/api/v1' };
}

export function perteneceALaApi(url: string, api: ConfiguracionApi, origenAplicacion: string): boolean {
  try {
    const destino = new URL(url, origenAplicacion);
    return destino.origin === api.origen && !destino.username && !destino.password
      && (destino.pathname === api.prefijo || destino.pathname.startsWith(`${api.prefijo}/`));
  } catch {
    return false;
  }
}
