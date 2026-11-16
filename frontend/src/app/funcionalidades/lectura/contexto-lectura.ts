import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DetalleLibro } from '../biblioteca/modelos/biblioteca';

@Component({
  selector: 'nivi-contexto-lectura',
  imports: [DatePipe],
  template: `<section class="contexto" aria-labelledby="titulo-contexto"><span class="ceja">VOLVÉ A TU HISTORIA</span><h2 id="titulo-contexto">Antes de seguir…</h2>
    <p class="posicion">Te quedaste en la página {{ detalle().libro.paginaActual }}.</p>
    @if (detalle().ultimoRegistro; as ultimo) {
      @if (ultimo.nota) { <p class="nota">{{ ultimo.nota }}</p> }
      @else { <p class="sin-nota">Guardaste tu posición sin una nota.</p> }
      <time [attr.datetime]="ultimo.creadoEn">{{ ultimo.creadoEn | date:'d MMM y, HH:mm' }}</time>
    } @else { <p class="sin-nota">Todavía no registraste un avance en este libro.</p> }
  </section>`,
  styles: `.contexto { padding: 28px; border-radius: 16px; background: var(--nivi-suave); }h2 { font: 400 29px/1.2 var(--nivi-serif); margin: 12px 0 18px; }.posicion { font-size: 13px; }.nota { font: 400 18px/1.7 var(--nivi-serif); white-space: pre-wrap; overflow-wrap: anywhere; margin: 18px 0; }.sin-nota, time { color: var(--nivi-secundario); font-size: 12px; line-height: 1.7; }`
})
export class ContextoLectura { readonly detalle = input.required<DetalleLibro>(); }
