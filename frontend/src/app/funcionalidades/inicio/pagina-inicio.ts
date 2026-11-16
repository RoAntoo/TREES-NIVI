import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { Marca } from '../../compartido/componentes/marca';
import { AvisoCopia } from '../../compartido/componentes/aviso-copia';
import { EstadoVista } from '../../compartido/componentes/estado-vista';
import { Consulta, ControlRefresco } from '../../compartido/datos/consulta';
import { ApiBiblioteca } from '../biblioteca/datos/api-biblioteca';
import { ColeccionLecturas } from '../biblioteca/datos/coleccion-lecturas';
import { EstadoLectura, Libro, nombresEstado } from '../biblioteca/modelos/biblioteca';
import { TarjetaColeccion } from '../biblioteca/componentes/tarjeta-coleccion';

@Component({
  selector:'nivi-pagina-inicio',
  imports:[AvisoCopia,EstadoVista,IonButton,IonContent,IonHeader,IonIcon,IonRefresher,IonRefresherContent,IonToolbar,Marca,RouterLink,TarjetaColeccion],
  template:`
    <ion-header class="ion-no-border"><ion-toolbar><div class="barra-marca"><nivi-marca /><span class="etiqueta-sesion"><span></span> Tu espacio personal</span><ion-button fill="clear" routerLink="/app/ajustes" aria-label="Abrir ajustes"><ion-icon name="settings-outline" aria-hidden="true" /></ion-button></div></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content pullingText="Actualizar tus lecturas" refreshingText="Consultando tu biblioteca" /></ion-refresher>
      <main class="pagina"><nivi-aviso-copia />
        <div class="encabezado-pagina"><span class="ceja">BIENVENIDO A NIVI</span><h1>Las historias te esperan.</h1><p>Un espacio para leer con calma y volver sin perder el hilo.</p></div>
        @if (consulta.error()) { <p class="aviso" role="status">No pudimos actualizar tus libros físicos. Tus EPUB siguen disponibles. <ion-button fill="clear" (click)="cargar()">Reintentar</ion-button></p> }
        @if (coleccion.errorEpub()) { <p role="alert">{{ coleccion.errorEpub() }}</p> }
        <section class="conteos" aria-label="Tus libros físicos y EPUB por estado">
          @for (estado of estados; track estado) { <a routerLink="/app/biblioteca" [queryParams]="{estado}"><strong>{{ coleccion.conteos()[estado] }}</strong><span>{{ nombres[estado] }}</span></a> }
        </section>
        <section aria-labelledby="titulo-recientes"><div class="titulo-recientes"><div><span class="ceja">UN CAPÍTULO MÁS</span><h2 id="titulo-recientes">Tus últimas historias.</h2><p>Las tres lecturas con actividad más reciente.</p></div><ion-button fill="clear" routerLink="/app/biblioteca">Ver biblioteca</ion-button></div>
          @if (coleccion.recientes().length) {
            <div class="lista-recientes">@for (entrada of coleccion.recientes(); track entrada.clave) { <nivi-tarjeta-coleccion [entrada]="entrada" /> }</div>
          } @else if (consulta.cargando()) { <nivi-estado-vista tipo="carga" titulo="Volviendo a tus historias" descripcion="Estamos consultando tu biblioteca." /> }
          @else { <nivi-estado-vista icono="book-outline" titulo="Una historia está por empezar" descripcion="Agregá un libro o cargá un EPUB para empezar."><ion-button routerLink="/app/leer">Cargar EPUB</ion-button></nivi-estado-vista> }
        </section>
        <footer class="pie-lectura"><span>MENOS DISTRACCIONES, MÁS HISTORIAS.</span><ion-icon name="leaf-outline" aria-hidden="true" /><p>Leer también es hacer una pausa.</p></footer>
      </main>
    </ion-content>
  `,
  styles:`
    .conteos { display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:10px 0 38px; }.conteos a { text-decoration:none;padding:23px;border:1px solid var(--nivi-borde);background:var(--nivi-superficie);border-radius:14px;color:var(--nivi-tinta); }.conteos strong { font:400 33px var(--nivi-serif);display:block;margin-bottom:10px; }.conteos span { font-size:12px;color:var(--nivi-secundario); }.titulo-recientes { display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:20px; }.titulo-recientes h2 { font:400 30px/1.3 var(--nivi-serif);margin:12px 0; }.titulo-recientes p { color:var(--nivi-secundario);font-size:13px;line-height:1.6; }.lista-recientes { display:grid;gap:18px;grid-template-columns:repeat(3,minmax(0,1fr)); }.aviso { font-size:13px;line-height:1.6; }.pie-lectura { text-align:center;margin:44px 0 12px;color:var(--nivi-secundario); }.pie-lectura span { font-size:8px;letter-spacing:2px;display:block;margin-bottom:17px; }.pie-lectura ion-icon { font-size:20px; }.pie-lectura p { font:italic 16px var(--nivi-serif); }ion-button { min-height:44px; }@media(max-width:1000px) { .lista-recientes { grid-template-columns:1fr; } }@media(max-width:650px) { .conteos { grid-template-columns:repeat(2,1fr);gap:12px; }.conteos a { padding:20px; }.titulo-recientes { align-items:start; }.titulo-recientes h2 { font-size:27px; }.etiqueta-sesion { display:none; } }
  `
})
export class PaginaInicio {
  private readonly api = inject(ApiBiblioteca);
  readonly coleccion = inject(ColeccionLecturas);
  private readonly visible = signal(false);
  readonly consulta = new Consulta<Libro[]>();
  readonly estados: EstadoLectura[] = ['PENDIENTE','LEYENDO','PAUSADO','TERMINADO'];
  readonly nombres = nombresEstado;
  constructor() {
    effect(() => { const visible = this.visible(); this.api.revision(); untracked(() => { if (visible) this.cargar(); }); });
    inject(DestroyRef).onDestroy(() => this.consulta.cancelar());
  }
  ionViewWillEnter(): void { this.visible.set(true); }
  ionViewWillLeave(): void { this.visible.set(false); this.consulta.cancelar(); }
  cargar(refresco?:ControlRefresco): void { this.consulta.cargar(this.coleccion.consultar(),refresco); }
  refrescar(evento:Event): void { this.cargar(evento.target as HTMLIonRefresherElement); }
}
