import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { Marca } from '../../../compartido/componentes/marca';
import { Portada } from '../../../compartido/componentes/portada';
import { RepositorioEpub } from '../datos/repositorio-epub';
import { ImportadorEpub } from '../servicios/importador-epub';

@Component({
  selector:'nivi-pagina-leer',
  imports:[RouterLink,IonHeader,IonToolbar,IonContent,IonButton,Marca,Portada],
  template:`
    <ion-header class="ion-no-border"><ion-toolbar><div class="barra-marca"><nivi-marca /><span>Un momento para leer</span></div></ion-toolbar></ion-header>
    <ion-content><main class="pagina">
      <div class="encabezado-pagina"><span class="ceja">UN CAPÍTULO MÁS</span><h1>Tu espacio de lectura</h1><p>Elegí un EPUB de tu celular y empezá una historia.</p></div>
      <input #selector type="file" accept=".epub,application/epub+zip" hidden (change)="importar($event)" />
      <ion-button (click)="selector.click()" [disabled]="ocupado() || cargando()">{{ ocupado() ? 'Importando…' : 'Buscar y cargar EPUB' }}</ion-button>
      @if (error()) { <p role="alert">{{ error() }}</p><ion-button fill="clear" (click)="cargar(true)">Reintentar</ion-button> }
      @if (mensaje()) { <p role="status">{{ mensaje() }}</p> }
      @if (cargando()) { <p role="status">Abriendo tus lecturas…</p> }
      @if (ultimo(); as libro) {
        <a class="retomar" [routerLink]="['/lector',libro.id]" [attr.aria-label]="'Leer ' + libro.titulo">
          <nivi-portada [titulo]="libro.titulo" [url]="libro.portada ?? null" />
          <div><span class="ceja">{{ libro.progreso ? 'SEGUÍ LEYENDO' : 'RECIÉN AGREGADO' }}</span><h2>{{ libro.titulo }}</h2><p>{{ libro.progreso?.capitulo || libro.autores.join(', ') }}</p><span class="accion">{{ libro.progreso ? 'Continuar leyendo' : 'Empezar a leer' }} →</span></div>
        </a>
      }
      <ion-button fill="clear" routerLink="/app/biblioteca">Ver todos mis libros</ion-button>
    </main></ion-content>
  `,
  styles:`
    .retomar { display:flex;align-items:center;gap:22px;background:var(--nivi-suave);color:var(--nivi-tinta);text-decoration:none;padding:28px;border:1px solid var(--nivi-borde);border-radius:18px;margin:32px 0 18px; }.retomar:hover { border-color:var(--ion-color-primary); }.retomar nivi-portada { width:84px;flex-shrink:0; }.retomar>div { min-width:0; }.retomar h2 { font:400 28px/1.3 var(--nivi-serif);margin:14px 0;overflow-wrap:anywhere; }.retomar p { font-size:13px;color:var(--nivi-secundario);line-height:1.6; }.accion { display:block;margin-top:18px;font-size:13px;font-weight:600; }ion-button { min-height:46px; }@media(max-width:450px) { .retomar { padding:22px 18px;gap:16px; }.retomar h2 { font-size:24px; }.retomar nivi-portada { width:68px; } }
  `
})
export class PaginaLeer {
  readonly repositorio = inject(RepositorioEpub);
  private readonly importador = inject(ImportadorEpub);
  readonly ocupado = signal(false);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly mensaje = signal('');
  private readonly elegido = signal<string | undefined>(undefined);
  readonly ultimo = computed(() => this.repositorio.libros().find(l => l.id === this.elegido()) ?? [...this.repositorio.libros()].sort((a,b) => (b.ultimaLecturaEn ?? b.importadoEn).localeCompare(a.ultimaLecturaEn ?? a.importadoEn))[0]);
  constructor() { void this.cargar(); }
  ionViewWillEnter():void { this.elegido.set(undefined); }
  async cargar(reintentar = false): Promise<void> {
    this.cargando.set(true);
    try { await (reintentar ? this.repositorio.reintentar() : this.repositorio.listo); this.error.set(''); }
    catch { this.error.set('No pudimos abrir tus EPUB. Revisá el espacio disponible y volvé a intentarlo.'); }
    finally { this.cargando.set(false); }
  }
  async importar(evento:Event): Promise<void> {
    const input = evento.target as HTMLInputElement, archivo = input.files?.[0]; input.value = '';
    if (!archivo) return;
    this.ocupado.set(true); this.error.set(''); this.mensaje.set('');
    try { const {libro,duplicado} = await this.importador.importar(archivo); this.elegido.set(libro.id); this.mensaje.set(duplicado ? 'Este EPUB ya está en tu biblioteca.' : 'Listo. Tocá la tarjeta para empezar a leer.'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No pudimos cargar el EPUB.'); }
    finally { this.ocupado.set(false); }
  }
}
