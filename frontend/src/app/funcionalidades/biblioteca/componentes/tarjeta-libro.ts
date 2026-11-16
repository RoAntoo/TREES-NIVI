import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Portada } from '../../../compartido/componentes/portada';
import { EstadoLibro } from './estado-libro';
import { ProgresoLectura } from './progreso-lectura';
import { Libro } from '../modelos/biblioteca';

@Component({
  selector: 'nivi-tarjeta-libro',
  imports: [RouterLink, Portada, EstadoLibro, ProgresoLectura],
  template: `<a class="tarjeta-libro" [routerLink]="['/app/biblioteca', libro().id]" [attr.aria-label]="'Abrir ' + libro().titulo">
    <nivi-portada [titulo]="libro().titulo" [url]="libro().urlPortada" />
    <div class="datos-libro"><nivi-estado-libro [estado]="libro().estado" /><h2>{{ libro().titulo }}</h2><p>{{ libro().autores.join(', ') || 'Autor sin informar' }}</p><nivi-progreso-lectura [libro]="libro()" /></div>
  </a>`,
  styles: `.tarjeta-libro { display: flex; gap: 20px; border: 1px solid var(--nivi-borde); border-radius: 14px; padding: 22px; background: var(--nivi-superficie); color: inherit; text-decoration: none; min-height: 190px; height: 100%; transition: border-color .15s; }.tarjeta-libro:hover { border-color: var(--ion-color-primary); }nivi-portada { width: 82px; flex-shrink: 0; align-self: center; }.datos-libro { min-width: 0; flex: 1; }h2 { font: 400 22px/1.25 var(--nivi-serif); margin: 14px 0 8px; overflow-wrap: anywhere; }p { font-size: 12px; line-height: 1.6; color: var(--nivi-secundario); margin: 0 0 18px; }@media(max-width:450px) { .tarjeta-libro { padding: 18px; gap: 16px; }nivi-portada { width: 68px; }h2 { font-size: 21px; } }`
})
export class TarjetaLibro { readonly libro = input.required<Libro>(); }
