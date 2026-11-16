import { Component, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { EntradaColeccion } from '../datos/coleccion-lecturas';
import { nombresEstado } from '../modelos/biblioteca';
import { Portada } from '../../../compartido/componentes/portada';

export type AccionLibro = 'abrir' | 'eliminar' | 'cerrar';

@Component({
  selector:'nivi-acciones-libro',
  imports:[DatePipe,DecimalPipe,Portada],
  template:`
    <section class="acciones-libro">
      <header><span class="ceja">{{ informacion() ? 'INFORMACIÓN DEL LIBRO' : 'TU LIBRO' }}</span><button type="button" class="cerrar" aria-label="Cerrar acciones del libro" (click)="accion.emit('cerrar')">×</button></header>
      <div class="resumen"><nivi-portada [titulo]="entrada().titulo" [url]="entrada().portada" /><div><span class="formato">{{ entrada().tipo === 'epub' ? 'EPUB' : 'Físico' }}</span><h2 id="titulo-acciones-libro">{{ entrada().titulo }}</h2><p>{{ entrada().autores.join(', ') || 'Autor no indicado' }}</p></div></div>
      @if (informacion()) {
        <dl>
          <dt>Estado</dt><dd>{{ nombres[entrada().estado] }}</dd>
          <dt>Avance</dt><dd>{{ entrada().detalle }}@if (entrada().porcentaje !== null) { · {{ entrada().porcentaje | number:'1.0-1' }} % }</dd>
          <dt>Agregado</dt><dd>{{ entrada().agregadoEn | date:'dd/MM/yyyy' }}</dd>
          <dt>Última actividad</dt><dd>{{ entrada().actividadEn | date:'dd/MM/yyyy' }}</dd>
          @if (entrada().epub; as epub) { <dt>Archivo</dt><dd>{{ epub.nombreArchivoOriginal }}</dd><dt>Tamaño</dt><dd>{{ epub.tamanoBytes / 1048576 | number:'1.0-2' }} MB</dd> }
          @if (entrada().fisico; as fisico) { <dt>ISBN</dt><dd>{{ fisico.isbn || 'No indicado' }}</dd><dt>Páginas</dt><dd>{{ fisico.totalPaginas ?? 'No indicado' }}</dd> }
        </dl>
        <button type="button" class="volver" (click)="informacion.set(false)">Volver a las acciones</button>
      } @else {
        <div class="opciones">
          <button type="button" class="principal" (click)="accion.emit('abrir')">{{ entrada().tipo === 'epub' ? entrada().epub?.progreso ? 'Continuar leyendo' : 'Comenzar a leer' : 'Ver libro y registrar avance' }}</button>
          <button type="button" class="ver-info" (click)="informacion.set(true)">Ver información</button>
          <button type="button" class="eliminar" [disabled]="!puedeEliminar()" (click)="accion.emit('eliminar')">{{ entrada().tipo === 'epub' ? 'Eliminar EPUB y progreso' : 'Eliminar libro' }}</button>
          @if (!puedeEliminar()) { <p class="aviso">Actualizá la biblioteca con conexión para eliminar este libro.</p> }
        </div>
      }
    </section>
  `,
  styles:`
    :host { display:block;min-height:0;overflow:auto;max-height:85dvh;color:var(--nivi-tinta); }
    .acciones-libro { padding:18px 24px 24px; }header { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px; }.cerrar { flex-shrink:0;width:44px;height:44px;min-height:44px;border-radius:50%;padding:0;background:var(--nivi-suave);font-size:30px;line-height:1; }
    .resumen { display:flex;gap:18px;align-items:center;margin-bottom:24px; }.resumen>div { min-width:0; }nivi-portada { width:65px;flex-shrink:0; }.formato { display:inline-block;background:var(--nivi-suave);border-radius:6px;padding:5px 9px;font-size:11px;font-weight:700; }h2 { font:400 26px/1.25 var(--nivi-serif);margin:10px 0;overflow-wrap:anywhere; }p { font-size:13px;line-height:1.5;color:var(--nivi-secundario);margin:0;overflow-wrap:anywhere; }
    button { min-height:48px;border:1px solid var(--nivi-borde);border-radius:12px;background:var(--nivi-superficie);color:var(--nivi-tinta);font:inherit;font-size:14px;padding:12px 16px;cursor:pointer; }button:focus-visible { outline:3px solid var(--ion-color-primary);outline-offset:2px; }.opciones { display:grid;gap:12px; }.principal { background:var(--ion-color-primary);color:var(--ion-color-primary-contrast);border-color:var(--ion-color-primary); }.eliminar { color:var(--ion-color-danger); }button:disabled { opacity:.5;cursor:default; }.aviso { font-size:12px; }dl { margin:0 0 24px; }dt { font-size:11px;color:var(--nivi-secundario);margin-top:16px; }dd { font-size:14px;line-height:1.5;margin:5px 0 0;overflow-wrap:anywhere; }.volver { width:100%; }
  `
})
export class AccionesLibro {
  readonly entrada = input.required<EntradaColeccion>();
  readonly puedeEliminar = input(true);
  readonly accion = output<AccionLibro>();
  readonly informacion = signal(false);
  readonly nombres = nombresEstado;
}
