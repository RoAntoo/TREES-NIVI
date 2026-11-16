import { Component, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';

@Component({
  selector: 'nivi-portada',
  imports: [IonIcon],
  template: `
    @if (url() && fallida() !== url()) {
      <img [src]="url()" [alt]="'Portada de ' + titulo()" loading="lazy" referrerpolicy="no-referrer" (error)="fallida.set(url())">
    } @else {
      <div class="sin-portada" role="img" [attr.aria-label]="'Sin portada: ' + titulo()">
        <ion-icon name="book-outline" aria-hidden="true" /><span>{{ titulo() }}</span>
      </div>
    }
  `,
  styles: `
    :host { display: block; width: 100%; aspect-ratio: 2 / 3; overflow: hidden; border-radius: 4px 10px 10px 4px; }
    img { width: 100%; height: 100%; object-fit: cover; }
    .sin-portada { height: 100%; background: var(--nivi-suave); color: var(--nivi-tinta); padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 14px; border-left: 5px solid var(--nivi-borde); }
    ion-icon { font-size: 30px; } span { font: 18px/1.3 var(--nivi-serif); overflow-wrap: anywhere; }
  `
})
export class Portada {
  readonly url = input<string | null>(null);
  readonly titulo = input.required<string>();
  readonly fallida = signal<string | null>(null);
}
