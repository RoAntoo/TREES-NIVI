import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonModal } from '@ionic/angular/ion-modal';
import { Confirmaciones } from '../../../compartido/confirmar';
import { interpretarError } from '../../../nucleo/http/error-operacion';
import { EscriturasPendientes } from '../datos/escrituras-pendientes';
import { AccionesLibro } from '../componentes/acciones-libro';
import { AvisoCopia } from '../../../compartido/componentes/aviso-copia';
import { Consulta, ControlRefresco } from '../../../compartido/datos/consulta';
import { EstadoVista } from '../../../compartido/componentes/estado-vista';
import { Paginador } from '../../../compartido/componentes/paginador';
import { ApiBiblioteca } from '../datos/api-biblioteca';
import { ColeccionLecturas, EntradaColeccion, OrdenColeccion, ordenarColeccion } from '../datos/coleccion-lecturas';
import { EstadoLectura, Libro, nombresEstado } from '../modelos/biblioteca';
import { TarjetaColeccion } from '../componentes/tarjeta-coleccion';

@Component({
  selector:'nivi-pagina-biblioteca',
  imports:[AvisoCopia,IonButton,IonContent,IonHeader,IonRefresher,IonRefresherContent,IonSelect,IonSelectOption,IonTitle,IonToolbar,EstadoVista,Paginador,TarjetaColeccion,IonModal,AccionesLibro],
  template:`
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Biblioteca</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content pullingText="Deslizá para actualizar" refreshingText="Actualizando biblioteca" /></ion-refresher>
      <main class="pagina"><nivi-aviso-copia />
        <div class="encabezado-pagina"><span class="ceja">TUS LIBROS, TU MUNDO</span><h1>Un lugar para cada historia.</h1></div>
        <div class="clasificador">
          <ion-select label="Ordenar por" labelPlacement="stacked" fill="outline" [value]="orden()" (ionChange)="ordenar($event.detail.value)" interface="popover"><ion-select-option value="actividad">Última lectura o actividad</ion-select-option><ion-select-option value="agregados">Agregados recientemente</ion-select-option><ion-select-option value="titulo">Título · A–Z</ion-select-option></ion-select>
          <ion-select label="Estado" labelPlacement="stacked" fill="outline" [value]="estado()" (ionChange)="filtrar($event.detail.value)" interface="popover"><ion-select-option value="">Todos</ion-select-option>@for (estado of estados; track estado) { <ion-select-option [value]="estado">{{ nombres[estado] }}</ion-select-option> }</ion-select>
        </div>
        @if (consulta.error()) { <p role="status">No pudimos actualizar tus libros físicos. Tus EPUB siguen disponibles. <ion-button fill="clear" (click)="cargar()">Reintentar</ion-button></p> }
        @if (coleccion.errorEpub()) { <p role="alert">{{ coleccion.errorEpub() }}</p> }
        @if (error()) { <p role="alert">{{ error() }}</p> }
        <div class="resultado-conteo" aria-live="polite">{{ resultados().length }} {{ resultados().length === 1 ? 'libro' : 'libros' }}</div>
        @if (visibles().length) {
          <div class="rejilla-libros">@for (entrada of visibles(); track entrada.clave) { <nivi-tarjeta-coleccion [entrada]="entrada" [opciones]="true" (abrirAcciones)="mostrarAcciones($event)" /> }</div>
          <nivi-paginador [pagina]="paginaActual()" [totalPaginas]="totalPaginas()" [haySiguiente]="paginaActual() < totalPaginas()" (cambiar)="irAPagina($event)" />
        } @else if (consulta.cargando()) { <nivi-estado-vista tipo="carga" titulo="Buscando tus historias" descripcion="Estamos consultando tu biblioteca." /> }
        @else { <nivi-estado-vista [titulo]="estado() ? 'No hay libros en este estado' : 'Tu primera historia te espera'" descripcion="Tus libros aparecerán acá cuando los agregues o cargues un EPUB." /> }
      </main>
    </ion-content>
    <ion-modal #acciones class="menu-libro" [isOpen]="!!seleccion()" [backdropDismiss]="true" aria-labelledby="titulo-acciones-libro" (didDismiss)="resolverAccion($event.detail.role, $event.detail.data)">
      <ng-template>@if (seleccion(); as entrada) { <nivi-acciones-libro [entrada]="entrada" [puedeEliminar]="puedeEliminar(entrada)" (accion)="acciones.dismiss(entrada, $event)" /> }</ng-template>
    </ion-modal>
  `,
  styles:`
    .menu-libro { --width:min(92vw,440px);--height:auto;--max-height:85dvh;--border-radius:24px;--background:var(--nivi-superficie);--box-shadow:0 18px 60px #0004; }
    .clasificador { display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin:12px 0 24px; }ion-select { --border-radius:10px;--border-color:var(--nivi-borde);min-height:58px;font-size:13px; }.rejilla-libros { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px; }.resultado-conteo { color:var(--nivi-secundario);font-size:11px;margin:10px 0 17px; }@media(max-width:700px) { .rejilla-libros { grid-template-columns:1fr; } }
  `
})
export class PaginaBiblioteca {
  private readonly api = inject(ApiBiblioteca);
  readonly coleccion = inject(ColeccionLecturas);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmaciones = inject(Confirmaciones);
  private readonly pendientes = inject(EscriturasPendientes);
  readonly seleccion = signal<EntradaColeccion | undefined>(undefined);
  readonly eliminando = signal(false);
  private readonly visible = signal(false);
  private readonly pagina = signal(1);
  readonly consulta = new Consulta<Libro[]>();
  readonly error = signal('');
  readonly nombres = nombresEstado;
  readonly estados:EstadoLectura[] = ['PENDIENTE','LEYENDO','PAUSADO','TERMINADO'];
  readonly estado = signal<EstadoLectura | ''>('');
  readonly orden = signal<OrdenColeccion>('actividad');
  readonly resultados = computed(() => {
    return ordenarColeccion(this.coleccion.entradas().filter(l => !this.estado() || l.estado === this.estado()),this.orden());
  });
  readonly totalPaginas = computed(() => Math.max(1,Math.ceil(this.resultados().length / 12)));
  readonly paginaActual = computed(() => Math.min(this.pagina(),this.totalPaginas()));
  readonly visibles = computed(() => this.resultados().slice((this.paginaActual()-1)*12,this.paginaActual()*12));
  constructor() {
    effect(() => { const visible = this.visible(); this.api.revision(); untracked(() => { if (visible) this.cargar(); }); });
    inject(DestroyRef).onDestroy(() => this.consulta.cancelar());
  }
  ionViewWillEnter():void {
    const estado = this.ruta.snapshot.queryParamMap.get('estado');
    if (this.estados.includes(estado as EstadoLectura)) { this.estado.set(estado as EstadoLectura); this.pagina.set(1); }
    this.visible.set(true);
  }
  ionViewWillLeave():void { this.visible.set(false); this.seleccion.set(undefined); this.consulta.cancelar(); }
  filtrar(estado:EstadoLectura | ''):void { if (!estado || this.estados.includes(estado)) { this.estado.set(estado); this.pagina.set(1); } }
  ordenar(orden:OrdenColeccion):void { if (['actividad','agregados','titulo'].includes(orden)) { this.orden.set(orden); this.pagina.set(1); } }
  irAPagina(pagina:number):void { this.pagina.set(Math.max(1,Math.min(pagina,this.totalPaginas()))); }
  cargar(refresco?:ControlRefresco):void { this.consulta.cargar(this.coleccion.consultar(),refresco); }
  refrescar(evento:Event):void { this.cargar(evento.target as HTMLIonRefresherElement); }
  mostrarAcciones(entrada:EntradaColeccion):void {
    if (!this.eliminando() && !this.seleccion()) this.seleccion.set(entrada);
  }
  puedeEliminar(entrada:EntradaColeccion):boolean {
    return !this.eliminando() && (entrada.tipo === 'epub' || (!this.api.copia.bloqueada() && !this.api.sincronizando()));
  }
  async resolverAccion(rol?:string,entrada?:EntradaColeccion):Promise<void> {
    const elegida = this.seleccion(); this.seleccion.set(undefined);
    if (!elegida || (entrada && entrada.clave !== elegida.clave)) return;
    if (rol === 'abrir') await this.router.navigate(elegida.ruta);
    if (rol === 'eliminar') await this.eliminar(elegida);
  }
  private async eliminar(entrada:EntradaColeccion):Promise<void> {
    if (!this.puedeEliminar(entrada)) return;
    this.eliminando.set(true); this.error.set('');
    try {
      const digital = entrada.tipo === 'epub';
      if (!await this.confirmaciones.pedir(digital ? '¿Eliminar EPUB?' : '¿Eliminar el libro?',digital
        ? 'Se borrarán este archivo y su progreso de este dispositivo. Esta acción no se puede deshacer.'
        : 'Se eliminarán este libro, sus notas y todo su historial de lectura. Esta acción no se puede deshacer.','Eliminar')) return;
      if (digital && entrada.epub) {
        await this.coleccion.epub.eliminar(entrada.epub.id);
        try { localStorage.removeItem(`nivi.epub.posicion.${entrada.epub.id}`); } catch { /* El archivo y su registro ya fueron eliminados. */ }
      } else if (entrada.fisico) {
        await firstValueFrom(this.api.eliminar(entrada.fisico.id,entrada.fisico.version));
        this.coleccion.quitarFisico(entrada.fisico.id); this.pendientes.resolverAvance(entrada.fisico.id);
      }
    } catch (error:unknown) {
      if (entrada.tipo === 'epub') this.error.set('No pudimos eliminar el EPUB. Volvé a intentarlo.');
      else {
        const interpretado = interpretarError(error); this.error.set(interpretado.mensaje);
        if (interpretado.conflictoVersion || interpretado.incierto) this.api.actualizarVistas();
      }
    } finally { this.eliminando.set(false); }
  }
}

