import { Component, computed, inject } from '@angular/core';
import { Preferencias } from './nucleo/almacenamiento/preferencias';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { IonToast } from '@ionic/angular/ion-toast';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonButton } from '@ionic/angular/ion-button';
import { RecepcionArchivos } from './nucleo/capacidades/recepcion-archivos';

@Component({
  selector: 'nivi-app',
  imports: [IonApp, IonRouterOutlet, IonToast, IonModal, IonButton],
  template: `
    <ion-app><ion-router-outlet />
      <ion-toast [isOpen]="!!recepcion.mensaje()" [message]="recepcion.mensaje()" [duration]="10000" [buttons]="accionesRecepcion()" (didDismiss)="recepcion.mensaje.set('')" />
      <ion-modal #exito class="confirmacion-carga" [isOpen]="!!recepcion.confirmacion()" aria-labelledby="titulo-carga" (willDismiss)="recepcion.responder($event.detail.role === 'leer', $event.detail.data ?? recepcion.confirmacion())">
        <ng-template>
          @if (recepcion.confirmacion(); as resultado) {
            <section class="carga-exitosa">
              <div class="marca-exito" aria-hidden="true">✓</div><span class="ceja">TU PRÓXIMA HISTORIA</span>
              <h2 id="titulo-carga">{{ resultado.cantidad > 1 ? '¡Tus libros se cargaron perfectamente!' : resultado.duplicado ? '¡Este libro ya está en tu biblioteca!' : '¡El libro se cargó perfectamente!' }}</h2>
              <p class="libro-cargado">{{ resultado.libro.titulo }}</p>
              <p>{{ resultado.cantidad > 1 ? 'Ya están guardados en tu biblioteca. Podés empezar por este libro.' : resultado.duplicado ? 'Conservamos tu progreso para que sigas donde te quedaste.' : 'Ya está guardado en tu biblioteca y listo para acompañarte.' }}</p>
              <ion-button expand="block" (click)="exito.dismiss(resultado, 'leer')">Comenzar a leer</ion-button>
              <ion-button expand="block" fill="outline" (click)="exito.dismiss(resultado, 'inicio')">Cerrar</ion-button>
            </section>
          }
        </ng-template>
      </ion-modal>
    </ion-app>
  `,
  styles:`
    .confirmacion-carga { --width:min(92vw,430px);--height:auto;--border-radius:24px;--background:var(--nivi-superficie);--box-shadow:0 18px 60px #0004; }
    .carga-exitosa { padding:32px 26px 24px;max-height:85vh;overflow:auto;text-align:center;color:var(--nivi-tinta); }
    .marca-exito { display:grid;place-items:center;width:70px;height:70px;margin:0 auto 24px;border-radius:50%;background:var(--nivi-acento);color:var(--nivi-ciruela);font-size:38px; }
    h2 { font:400 30px/1.2 var(--nivi-serif);margin:14px 0 18px; }p { font-size:14px;line-height:1.7;color:var(--nivi-secundario);margin:12px 0 22px; }
    .libro-cargado { font:400 21px/1.35 var(--nivi-serif);color:var(--nivi-tinta);overflow-wrap:anywhere;margin-bottom:12px; }
    ion-button { min-height:50px;margin:12px 0 0; }
  `
})
export class App {
  readonly preferencias = inject(Preferencias);
  readonly recepcion = inject(RecepcionArchivos);
  readonly accionesRecepcion = computed(() => this.recepcion.puedeReintentar() && !this.recepcion.procesando()
    ? [{text:'Reintentar',handler:() => { void this.recepcion.procesar(); return false; }},{text:'Cerrar',role:'cancel'}]
    : [{text:'Cerrar',role:'cancel'}]);
  constructor() {
    void this.recepcion.iniciar();
    try { window.sessionStorage.removeItem('nivi.sesion.v1'); } catch { /* Migración desde la versión con acceso. */ }
  }
}
