import { Component, DestroyRef, inject, viewChild } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonTabBar } from '@ionic/angular/ion-tab-bar';
import { IonTabButton } from '@ionic/angular/ion-tab-button';
import { IonTabs } from '@ionic/angular/ion-tabs';
import { RetornoAndroid } from '../nucleo/capacidades/retorno-android';

@Component({
  selector: 'nivi-pestanas',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" aria-label="Navegación principal">
        <ion-tab-button tab="inicio" href="/app/inicio"><ion-icon name="home-outline" aria-hidden="true" /><ion-label>Inicio</ion-label></ion-tab-button>
        <ion-tab-button tab="biblioteca" href="/app/biblioteca"><ion-icon name="book-outline" aria-hidden="true" /><ion-label>Biblioteca</ion-label></ion-tab-button>
        <ion-tab-button tab="agregar" href="/app/agregar"><ion-icon name="scan-outline" aria-hidden="true" /><ion-label>Agregar</ion-label></ion-tab-button>
        <ion-tab-button tab="leer" href="/app/leer"><ion-icon name="book-outline" aria-hidden="true" /><ion-label>Leer</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: `
    ion-tab-bar { --background: var(--nivi-superficie); --border: 1px solid var(--nivi-borde); min-height: 73px; padding-top: 6px; }
    ion-tab-button { --color: var(--nivi-tinta); --color-selected: var(--nivi-ciruela); max-width: 190px; }
    ion-icon { font-size: 23px; margin-bottom: 5px; }ion-label { font-size: 11px; font-weight: 600; letter-spacing: .2px; }
    ion-tab-button.tab-selected::part(native) { background: var(--nivi-acento); border-radius: 12px; margin: 0 5px 5px; }
  `
})
export class Pestanas {
  private readonly pestanas = viewChild(IonTabs);
  constructor() {
    const cancelar = inject(RetornoAndroid).registrar(() => {
      const salida = this.pestanas()?.outlet;
      // Antes de disponer del outlet no se debe salir ni competir con una transición.
      return !salida || salida.canGoBack();
    });
    inject(DestroyRef).onDestroy(cancelar);
  }
}
