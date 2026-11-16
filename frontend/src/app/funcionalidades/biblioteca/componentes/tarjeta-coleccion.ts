import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntradaColeccion } from '../datos/coleccion-lecturas';
import { Portada } from '../../../compartido/componentes/portada';
import { EstadoLibro } from './estado-libro';
import { PresionProlongada } from '../../../compartido/interacciones/presion-prolongada';

@Component({
  selector:'nivi-tarjeta-coleccion',
  imports:[RouterLink,DecimalPipe,Portada,EstadoLibro,PresionProlongada],
  template:`
    <article><a class="tarjeta" [routerLink]="entrada().ruta" [attr.aria-label]="'Abrir ' + entrada().titulo" [niviPresionProlongada]="opciones()" (mantener)="abrirAcciones.emit(entrada())" draggable="false">
      <nivi-portada [titulo]="entrada().titulo" [url]="entrada().portada" />
      <div class="datos"><div class="etiquetas"><span class="formato" [class.digital]="entrada().tipo === 'epub'">{{ entrada().tipo === 'epub' ? 'EPUB' : 'Físico' }}</span><nivi-estado-libro [estado]="entrada().estado" /></div>
        <h2>{{ entrada().titulo }}</h2><p>{{ entrada().autores.join(', ') || 'Autor no indicado' }}</p>
        <p class="detalle">{{ entrada().detalle }}</p>
        @if (entrada().porcentaje !== null) { <div class="progreso" role="progressbar" [attr.aria-label]="'Avance de ' + entrada().titulo" [attr.aria-valuenow]="entrada().porcentaje" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="entrada().porcentaje"></span></div><small>{{ entrada().porcentaje | number:'1.0-1' }} %{{ entrada().tipo === 'epub' ? ' de lectura digital' : '' }}</small> }
      </div>
    </a>
    @if (opciones()) { <button type="button" class="mas-opciones" [attr.aria-label]="'Acciones de ' + entrada().titulo" (click)="abrirAcciones.emit(entrada())">⋯</button> }
    </article>
  `,
  styles:`
    .tarjeta[aria-haspopup="dialog"] { padding-right:52px;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y; }.mas-opciones { position:absolute;right:8px;top:8px;display:grid;place-items:center;width:44px;height:44px;min-height:44px;padding:0;margin:0;border:0;border-radius:50%;color:var(--nivi-tinta);background:var(--nivi-suave);font-size:28px;cursor:pointer; }nivi-portada { pointer-events:none; }

    :host { display:block;min-width:0;height:100%; }article { position:relative;height:100%;border:1px solid var(--nivi-borde);border-radius:16px;background:var(--nivi-superficie);overflow:hidden; }article:has(a:hover) { border-color:var(--ion-color-primary); }.tarjeta { display:flex;gap:18px;padding:22px;text-decoration:none;color:var(--nivi-tinta);min-height:190px; }nivi-portada { width:78px;flex-shrink:0;align-self:center; }.datos { min-width:0;flex:1; }.etiquetas { display:flex;align-items:center;gap:7px;flex-wrap:wrap; }.formato { font-size:10px;letter-spacing:.5px;font-weight:700;padding:6px 10px;border-radius:7px;background:var(--nivi-suave); }.digital { background:var(--nivi-ciruela);color:var(--nivi-acento); }h2 { font:400 22px/1.3 var(--nivi-serif);margin:12px 0 8px;overflow-wrap:anywhere; }p { font-size:12px;line-height:1.6;color:var(--nivi-secundario);margin:0 0 12px; }.detalle { margin-bottom:8px; }.progreso { height:5px;background:var(--nivi-suave);border-radius:8px;overflow:hidden; }.progreso span { display:block;height:100%;background:var(--ion-color-primary); }small { display:block;margin-top:7px;font-size:11px;color:var(--nivi-secundario); }@media(max-width:450px) { .tarjeta { padding:18px;gap:14px; }nivi-portada { width:68px; }h2 { font-size:21px; } }
  `
})
export class TarjetaColeccion {
  readonly entrada = input.required<EntradaColeccion>();
  readonly opciones = input(false);
  readonly abrirAcciones = output<EntradaColeccion>();
}

