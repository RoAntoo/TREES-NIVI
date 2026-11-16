import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';

@Component({
  selector: 'nivi-paginador',
  imports: [IonButton, IonIcon],
  template: `<nav class="paginador" aria-label="Páginas de resultados">
    <ion-button fill="clear" [disabled]="pagina() <= 1 || ocupado()" (click)="cambiar.emit(pagina() - 1)" aria-label="Página anterior"><ion-icon name="chevron-back-outline" aria-hidden="true" /></ion-button>
    <span aria-live="polite">Página {{ pagina() }}{{ totalPaginas() ? ' de ' + totalPaginas() : '' }}</span>
    <ion-button fill="clear" [disabled]="!haySiguiente() || ocupado()" (click)="cambiar.emit(pagina() + 1)" aria-label="Página siguiente"><ion-icon name="chevron-forward-outline" aria-hidden="true" /></ion-button>
  </nav>`,
  styles: `.paginador { display: flex; justify-content: center; align-items: center; gap: 14px; margin: 24px 0 0; }span { font-size: 12px; color: var(--nivi-secundario); }ion-button { min-width: 44px; min-height: 44px; }`
})
export class Paginador {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input<number | null>(null);
  readonly haySiguiente = input.required<boolean>();
  readonly ocupado = input(false);
  readonly cambiar = output<number>();
}
