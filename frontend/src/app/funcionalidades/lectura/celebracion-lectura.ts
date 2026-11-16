import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonModal } from '@ionic/angular/ion-modal';

@Component({
  selector: 'nivi-celebracion-lectura',
  imports: [IonButton, IonModal],
  template: `<ion-modal #modal class="celebracion-lectura" [isOpen]="!!titulo()" (didDismiss)="cerrada.emit()"
      [backdropDismiss]="true" aria-labelledby="titulo-felicitacion" aria-describedby="libro-felicitacion">
    <ng-template>
      <section class="felicitacion">
        <div class="sello" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M18 33l10 10 20-23" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></svg></div>
        <span class="ceja">UNA HISTORIA QUE SE QUEDA CON VOS</span>
        <h2 id="titulo-felicitacion">¡Felicidades!</h2>
        <p id="libro-felicitacion">Terminaste <strong>«{{ titulo() }}»</strong>.</p>
        <div class="barra-completa" aria-hidden="true"><span></span></div>
        <span class="completado">Lectura completada · 100%</span>
        <p class="despedida">Cada última página deja algo nuevo.</p>
        <ion-button expand="block" (click)="modal.dismiss()">Seguir explorando</ion-button>
      </section>
    </ng-template>
  </ion-modal>`,
  styles: `
    .felicitacion { padding: 36px 30px 28px; color: var(--nivi-tinta); background: var(--nivi-superficie); text-align: center; overflow-y: auto; }
    .sello { width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; background: var(--nivi-acento); color: var(--nivi-ciruela); display: grid; place-items: center; }
    svg { width: 58px; height: 58px; }.ceja { display: block; font-size: 9px; letter-spacing: 1.5px; line-height: 1.8; }
    h2 { font: 400 clamp(32px, 6vw, 42px)/1.2 var(--nivi-serif); margin: 15px 0; }p { font-size: 15px; line-height: 1.8; margin: 0; overflow-wrap: anywhere; }
    strong { font-weight: 650; }.barra-completa { height: 7px; background: var(--nivi-borde); border-radius: 12px; margin: 24px 0 10px; overflow: hidden; }.barra-completa span { display: block; width: 100%; height: 100%; background: var(--nivi-acento); }
    .completado { font-size: 12px; font-weight: 650; }.despedida { font: italic 16px/1.7 var(--nivi-serif); color: var(--nivi-secundario); margin: 20px 0 24px; }ion-button { min-height: 48px; margin: 0; }
    @media(max-width:400px) { .felicitacion { padding: 30px 22px 22px; } }
  `
})
export class CelebracionLectura {
  readonly titulo = input<string | null>(null);
  readonly cerrada = output<void>();
}
