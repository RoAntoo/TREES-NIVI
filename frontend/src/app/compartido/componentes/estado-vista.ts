import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSpinner } from '@ionic/angular/ion-spinner';

@Component({
  selector: 'nivi-estado-vista',
  imports: [IonButton, IonIcon, IonSpinner],
  template: `
    <section class="estado-vista" [attr.role]="tipo() === 'error' ? 'alert' : 'status'" aria-live="polite">
      <div class="estado-simbolo">
        @if (tipo() === 'carga') { <ion-spinner name="crescent" aria-label="Cargando" /> }
        @else { <ion-icon [name]="tipo() === 'error' ? 'warning-outline' : icono()" aria-hidden="true" /> }
      </div>
      <h2>{{ titulo() }}</h2>
      <p>{{ descripcion() }}</p>
      @if (tipo() === 'error') { <ion-button fill="outline" (click)="reintentar.emit()">Volver a intentar</ion-button> }
      <ng-content />
    </section>
  `,
  styles: `
    .estado-vista { text-align: center; max-width: 490px; margin: 40px auto; padding: 36px 22px; }
    .estado-simbolo { width: 72px; height: 72px; margin: 0 auto 24px; border-radius: 50%; display: grid; place-items: center; background: var(--nivi-suave); color: var(--ion-color-primary); }
    ion-icon { font-size: 30px; } h2 { font: 500 29px/1.2 var(--nivi-serif); margin: 0 0 14px; color: var(--nivi-tinta); }
    p { color: var(--nivi-secundario); line-height: 1.7; margin-bottom: 24px; }
  `
})
export class EstadoVista {
  readonly tipo = input<'carga' | 'vacio' | 'error' | 'proximo'>('vacio');
  readonly titulo = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly icono = input('book-outline');
  readonly reintentar = output<void>();
}
