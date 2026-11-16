import { Injectable, inject, signal } from '@angular/core';
import { AlmacenamientoLocal } from './almacenamiento-local';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';
@Injectable({ providedIn: 'root' })
export class Preferencias {
  private readonly almacen = inject(AlmacenamientoLocal);
  readonly apariencia = signal<Apariencia>('sistema');
  readonly aviso = signal('');
  constructor() {
    try {
      const valor = this.almacen.leerAjuste('nivi.apariencia.v1');
      if (valor === 'claro' || valor === 'oscuro') this.apariencia.set(valor);
    } catch { this.aviso.set('No pudimos recuperar tus preferencias.'); }
    this.aplicar();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.aplicar());
  }
  cambiar(valor: string): void {
    if (valor !== 'sistema' && valor !== 'claro' && valor !== 'oscuro') return;
    this.apariencia.set(valor); this.aplicar();
    try { this.almacen.guardarAjuste('nivi.apariencia.v1', valor); this.aviso.set(''); }
    catch { this.aviso.set('La apariencia se aplicó, pero no se pudo guardar en este dispositivo.'); }
  }
  private aplicar(): void {
    const oscuro = this.apariencia() === 'oscuro' || (this.apariencia() === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('ion-palette-dark', oscuro);
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
  }
}
