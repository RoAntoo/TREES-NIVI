import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonProgressBar } from '@ionic/angular/ion-progress-bar';
import { Libro } from '../modelos/biblioteca';

@Component({
  selector: 'nivi-progreso-lectura',
  imports: [DecimalPipe, IonProgressBar],
  template: `<div class="progreso-texto"><span>{{ libro().estado === 'TERMINADO' ? 'Lectura terminada' : 'Página ' + libro().paginaActual + (libro().totalPaginas === null ? '' : ' de ' + libro().totalPaginas) }}</span>
    @if (porcentaje() !== null) { <strong>{{ porcentaje() | number:'1.0-1' }} %</strong> }
    </div>
    @if (porcentaje() !== null) { <ion-progress-bar [value]="porcentaje()! / 100" [attr.aria-label]="'Progreso de lectura: ' + porcentaje() + ' por ciento'" /> }
    @if (libro().estado === 'TERMINADO') { <p class="ultima-posicion">Última posición registrada: página {{ libro().paginaActual }}.</p> }`,
  styles: `.progreso-texto { display: flex; justify-content: space-between; gap: 15px; margin: 8px 0 12px; color: var(--nivi-secundario); font-size: 12px; }strong { color: var(--nivi-tinta); font-weight: 500; }ion-progress-bar { height: 5px; border-radius: 10px; --background: var(--nivi-borde); --progress-background: var(--nivi-acento); }.ultima-posicion { color: var(--nivi-secundario); font-size: 11px; line-height: 1.6; margin: 9px 0 0; }`
})
export class ProgresoLectura {
  readonly libro = input.required<Pick<Libro, 'paginaActual' | 'totalPaginas' | 'estado'>>();
  readonly porcentaje = computed(() => this.libro().estado === 'TERMINADO' ? 100 : this.libro().totalPaginas === null ? null : Math.floor(1000 * this.libro().paginaActual / this.libro().totalPaginas!) / 10);
}
