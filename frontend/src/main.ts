import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { configuracionApp } from './app/app.config';
import { leerConfiguracionApi } from './app/nucleo/configuracion/configuracion-api';

async function iniciar(): Promise<void> {
try {
  const respuesta = await fetch('configuracion.json', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error('Configuración no disponible.');
  const configuracion: unknown = await respuesta.json();
  await bootstrapApplication(App, configuracionApp(leerConfiguracionApi(configuracion, window.location.origin)));
} catch {
  const aviso = document.createElement('p');
  aviso.textContent = 'No pudimos iniciar NIVI. Revisá la configuración de conexión y volvé a cargar la página.';
  aviso.setAttribute('role', 'alert');
  aviso.style.cssText = 'max-width:36rem;margin:15vh auto;padding:2rem;font:1.15rem/1.6 system-ui;color:#4B1D45';
  document.body.replaceChildren(aviso);
}

}

void iniciar();
