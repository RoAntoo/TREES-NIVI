import { Component, DestroyRef, ElementRef, HostListener, NgZone, effect, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/nav-controller';
import { Platform } from '@ionic/angular/platform';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { IonContent } from '@ionic/angular/ion-content';
import { IonButton } from '@ionic/angular/ion-button';
import { RepositorioEpub } from '../datos/repositorio-epub';
import { CapituloEpub, LibroEpub, PreferenciasLector, ProgresoEpub, preferenciasIniciales } from '../modelos/libro-epub';
import { MotorEpub, coloresLector } from '../servicios/motor-epub';
import { AccionLector } from '../servicios/gestos-lector';
import { ProgresoLector } from '../servicios/progreso-epub';
import { PantallaInmersiva } from '../../../nucleo/capacidades/pantalla-inmersiva';

@Component({
  selector:'nivi-pagina-lector',
  imports:[DecimalPipe,IonHeader,IonToolbar,IonContent,IonButton],
  providers:[MotorEpub,ProgresoLector],
  host:{'[style.--lector-fondo]':'colores().fondo','[style.--lector-texto]':'colores().texto'},
  template:`
    <ion-header class="ion-no-border" [hidden]="pantallaCompleta()"><ion-toolbar><div class="cabecera">
      <ion-button fill="clear" (click)="salir()" aria-label="Volver a tus libros">← Volver</ion-button>
      <span class="titulo">{{ libro()?.titulo || 'Lector EPUB' }}</span>
      <ion-button fill="clear" (click)="abrirPanel('indice')" [attr.aria-expanded]="panel() === 'indice'" aria-controls="indice" [disabled]="cargando()">Índice</ion-button>
      <ion-button fill="clear" (click)="abrirPanel('ajustes')" [attr.aria-expanded]="panel() === 'ajustes'" aria-controls="ajustes" aria-label="Opciones de lectura">Aa</ion-button>
      <ion-button fill="clear" (click)="alternarPantalla()" aria-label="Pantalla completa">⛶</ion-button>
    </div></ion-toolbar></ion-header>
    <ion-content [scrollY]="false" [fullscreen]="pantallaCompleta()"><div class="lector">
      @if (panel()) { <button type="button" class="velo" aria-label="Cerrar opciones y volver al texto" (click)="panel.set('')"></button> }
      @if (panel() === 'ajustes') {
        <section id="ajustes" class="panel" aria-label="Preferencias del lector">
          <div class="fila"><span>Tamaño de letra: {{ preferencias().tamanoFuente }} px</span><button type="button" (click)="fuente(-2)" [disabled]="preferencias().tamanoFuente <= 14" aria-label="Reducir letra">A−</button><button type="button" (click)="fuente(2)" [disabled]="preferencias().tamanoFuente >= 36" aria-label="Aumentar letra">A+</button></div>
          <label for="interlineado">Interlineado: {{ preferencias().interlineado }}</label><input id="interlineado" type="range" min="1.2" max="2.4" step="0.1" [value]="preferencias().interlineado" (input)="numero('interlineado',$event)" />
          <label for="tema">Fondo y contraste</label><select id="tema" [value]="preferencias().tema" (change)="tema($event)"><option value="claro">Claro · texto oscuro</option><option value="sepia">Sepia · texto marrón</option><option value="oscuro">Negro · texto claro</option></select>
          <label for="calidez">Filtro cálido/naranja: {{ preferencias().calidez }} %</label><input id="calidez" type="range" min="0" max="70" step="5" [value]="preferencias().calidez" (input)="numero('calidez',$event)" />
          <label for="navegacion">Forma de lectura</label><select id="navegacion" [value]="modoPaso()" (change)="modo($event)"><option value="vertical">Cascada · deslizar hacia abajo</option><option value="deslizar">Páginas · deslizar a los lados</option><option value="toques">Páginas · tocar los laterales</option><option value="botones">Páginas · usar botones</option></select>
          <p>{{ modoPaso() === 'vertical' ? 'Deslizá hacia arriba o abajo para recorrer el libro de forma continua. Un toque muestra u oculta las opciones.' : modoPaso() === 'toques' ? 'Tocá a la derecha para avanzar o a la izquierda para volver. Un toque en el centro muestra u oculta las opciones.' : modoPaso() === 'deslizar' ? 'Deslizá a la izquierda para avanzar o a la derecha para volver. Un toque en el texto muestra u oculta las opciones.' : 'Usá Anterior y Siguiente. Un toque en el texto muestra u oculta las opciones.' }}</p>
          <p>El filtro cálido solo se aplica al lector de NIVI.</p><button type="button" (click)="panel.set('')">Volver al texto</button>
        </section>
      }
      @if (panel() === 'indice') {
        <nav id="indice" class="panel" aria-label="Índice de capítulos"><h2>Índice</h2>
          @for (capitulo of capitulos(); track $index) { <button type="button" class="capitulo" [style.padding-left.px]="12 + capitulo.nivel*16" (click)="ir(capitulo.href)">{{ capitulo.titulo }}</button> }
          <button type="button" (click)="panel.set('')">Cerrar índice</button>
        </nav>
      }
      @if (cargando()) { <p role="status" class="estado carga">Preparando tu lectura…</p> }
      @if (error()) { <p role="alert" class="estado">{{ error() }}</p> }
      @if (aviso() && !pantallaCompleta()) { <p role="status" class="aviso">{{ aviso() }}</p> }
      @if (seguimiento.aviso()) { <div role="alert" class="aviso">{{ seguimiento.aviso() }}<button type="button" (click)="seguimiento.guardar()">Reintentar guardado</button></div> }
      <div class="texto"><div #visor class="visor" aria-label="Contenido del EPUB"></div></div>
      <footer [hidden]="pantallaCompleta()" [attr.data-cfi]="ubicacion()?.cfi"><p class="ubicacion">@if (ubicacion(); as posicion) { {{ posicion.capitulo }} @if (posicion.porcentaje !== undefined) { <span> · {{ posicion.porcentaje | number:'1.0-1' }} %</span> } } @else { Libro EPUB }</p>
        @if (modoPaso() === 'botones') { <div class="pasos"><button type="button" [disabled]="cargando() || !!error()" (click)="pasar(false)">← Anterior</button><button type="button" [disabled]="cargando() || !!error()" (click)="pasar(true)">Siguiente →</button></div> }
      </footer>
      <div class="filtro" [style.opacity]="preferencias().calidez/100" aria-hidden="true"></div>
    </div></ion-content>
  `,
  styles:`
    :host { height:100%;background:var(--lector-fondo);color:var(--lector-texto); }ion-header[hidden],footer[hidden] { display:none!important; }ion-toolbar { --background:var(--lector-fondo);--color:var(--lector-texto); }ion-content { --background:var(--lector-fondo); }ion-button { --color:var(--lector-texto); }.cabecera { display:flex;align-items:center;gap:2px;padding-right:6px; }.cabecera ion-button { font-size:12px;min-height:44px;margin:0; }.titulo { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px; }.lector { height:100%;display:flex;flex-direction:column;position:relative;background:var(--lector-fondo);color:var(--lector-texto); }.texto { flex:1;min-height:0;position:relative; }.visor { height:100%;width:100%; }.filtro { position:absolute;inset:0;background:#ff9c29;pointer-events:none;z-index:6;mix-blend-mode:multiply; }.velo { position:absolute;inset:0;z-index:8;border:0;border-radius:0;background:#0003;width:100%;height:100%;padding:0; }.panel { position:absolute;inset:0 0 auto;max-height:76%;overflow:auto;background:var(--lector-fondo);color:var(--lector-texto);padding:20px;z-index:10;border-bottom:1px solid #8885;box-shadow:0 12px 28px #0002;overscroll-behavior:contain; }.panel label { display:block;margin:16px 0 8px; }.panel input,.panel select { width:100%;min-height:44px; }.panel select { background:var(--lector-fondo);color:var(--lector-texto);padding:10px;border:1px solid currentColor;border-radius:8px; }.fila { display:flex;align-items:center;gap:12px; }.fila span { flex:1; }.panel p { font-size:12px;line-height:1.6; }button { min-height:46px;padding:10px 16px;border:1px solid currentColor;border-radius:10px;background:var(--lector-fondo);color:var(--lector-texto);cursor:pointer; }button:disabled { opacity:.45;cursor:default; }.capitulo { display:block;text-align:left;width:100%;border:0;border-radius:0;border-bottom:1px solid #8884; }.estado,.aviso { padding:10px 18px;margin:0;font-size:13px;line-height:1.5; }.carga { position:absolute;inset:0 0 auto;z-index:5; }.aviso { max-height:100px;overflow:auto; }footer { padding:8px 16px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #8884;background:var(--lector-fondo);color:var(--lector-texto); }.ubicacion { font-size:12px;text-align:center;margin:2px 0 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.pasos { display:flex;justify-content:space-between;gap:12px;margin-top:8px; }.pasos button { flex:1;max-width:260px; }
  `
})
export class PaginaLector {
  private readonly repositorio = inject(RepositorioEpub);
  private readonly motor = inject(MotorEpub);
  private readonly inmersiva = inject(PantallaInmersiva);
  readonly seguimiento = inject(ProgresoLector);
  private readonly ruta = inject(ActivatedRoute);
  private readonly navegacion = inject(NavController);
  private readonly zona = inject(NgZone);
  private readonly visor = viewChild.required<ElementRef<HTMLElement>>('visor');
  readonly libro = signal<LibroEpub | undefined>(undefined);
  readonly preferencias = signal<PreferenciasLector>({...preferenciasIniciales});
  readonly capitulos = signal<CapituloEpub[]>([]);
  readonly ubicacion = signal<ProgresoEpub | undefined>(undefined);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly panel = signal('');
  readonly pantallaCompleta = signal(false);
  readonly colores = () => coloresLector[this.preferencias().tema];
  readonly modoPaso = () => this.preferencias().navegacion ?? 'deslizar';
  private activo = false;
  private visita = 0;
  private salirEnCurso = false;
  constructor() {
    effect(() => { void this.inmersiva.cambiar(this.pantallaCompleta()).catch(() => this.aviso.set('No pudimos cambiar la visibilidad de las barras del sistema.')); });
    const suscripcion = inject(Platform).backButton.subscribeWithPriority(10,siguiente => {
      if (!this.activo) { siguiente(); return; }
      if (this.panel()) this.panel.set('');
      else if (this.pantallaCompleta()) this.pantallaCompleta.set(false);
      else void this.salir();
    });
    inject(DestroyRef).onDestroy(() => { suscripcion.unsubscribe(); this.motor.cerrar(); void this.seguimiento.cerrar(); void this.inmersiva.cambiar(false).catch(() => undefined); });
  }
  @HostListener('document:keydown.escape') cerrarOpciones():void { if (this.activo) { this.panel.set(''); this.pantallaCompleta.set(false); } }
  abrirPanel(panel:string):void { this.pantallaCompleta.set(false); this.panel.set(this.panel() === panel ? '' : panel); }
  alternarPantalla():void { if (this.cargando() || this.error()) return; this.panel.set(''); this.pantallaCompleta.update(v => !v); }
  interactuar(accion:AccionLector):void {
    if (this.panel() || this.cargando() || this.error()) return;
    if (accion === 'alternar') this.alternarPantalla(); else void this.pasar(accion === 'avanzar');
  }
  async ionViewDidEnter():Promise<void> {
    const visita = ++this.visita; this.activo = true; this.cargando.set(true); this.error.set(''); this.pantallaCompleta.set(false);
    try {
      await this.repositorio.listo; if (!this.activo || visita !== this.visita) return;
      const id = this.ruta.snapshot.paramMap.get('id')!, libro = this.repositorio.libros().find(l => l.id === id);
      if (!libro) throw new Error('Este EPUB ya no está en el dispositivo.');
      this.libro.set(libro); this.preferencias.set({...this.repositorio.preferencias()}); await this.seguimiento.iniciar(id);
      if (!this.activo || visita !== this.visita) return;
      const datos = await this.repositorio.archivo(id); if (!this.activo || visita !== this.visita) return;
      this.capitulos.set(await this.motor.abrir(datos,this.visor().nativeElement,this.preferencias(),this.seguimiento.recuperar(libro.progreso),
        progreso => { if (this.activo && visita === this.visita) this.zona.run(() => { this.ubicacion.set(progreso); this.seguimiento.actualizar(progreso); }); },
        aviso => { if (this.activo && visita === this.visita) this.zona.run(() => this.aviso.set(aviso)); },
        accion => { if (this.activo && visita === this.visita) this.zona.run(() => this.interactuar(accion)); }));
    } catch (error) { if (visita === this.visita) { this.error.set(error instanceof Error ? error.message : 'No pudimos abrir el EPUB.'); this.motor.cerrar(); } }
    finally { if (visita === this.visita) this.cargando.set(false); }
  }
  async ionViewWillLeave():Promise<void> { this.activo = false; this.visita++; this.pantallaCompleta.set(false); this.motor.cerrar(); await Promise.all([this.seguimiento.cerrar(),this.inmersiva.cambiar(false).catch(() => undefined)]); }
  async salir():Promise<void> {
    if (this.salirEnCurso) return; this.salirEnCurso = true;
    try { await this.seguimiento.guardar(); await this.navegacion.navigateBack('/app/biblioteca'); } finally { this.salirEnCurso = false; }
  }
  async pasar(siguiente:boolean):Promise<void> { try { if (siguiente) await this.motor.avanzar(); else await this.motor.retroceder(); } catch { this.aviso.set('No pudimos cambiar de posición. Volvé a intentarlo.'); } }
  async ir(href:string):Promise<void> { this.panel.set(''); try { await this.motor.mostrar(href); } catch { this.aviso.set('No pudimos abrir este capítulo.'); } }
  fuente(delta:number):void { void this.cambiar({...this.preferencias(),tamanoFuente:Math.max(14,Math.min(36,this.preferencias().tamanoFuente+delta))}); }
  numero(clave:'interlineado'|'calidez',evento:Event):void {
    const valor = Number((evento.target as HTMLInputElement).value); if (!Number.isFinite(valor)) return;
    void this.cambiar({...this.preferencias(),[clave]:clave === 'calidez' ? Math.max(0,Math.min(70,valor)) : Math.max(1.2,Math.min(2.4,valor))});
  }
  tema(evento:Event):void { const tema = (evento.target as HTMLSelectElement).value; if (tema === 'claro' || tema === 'sepia' || tema === 'oscuro') void this.cambiar({...this.preferencias(),tema}); }
  modo(evento:Event):void { const navegacion = (evento.target as HTMLSelectElement).value; if (navegacion === 'vertical' || navegacion === 'deslizar' || navegacion === 'toques' || navegacion === 'botones') void this.cambiar({...this.preferencias(),navegacion}); }
  private async cambiar(preferencias:PreferenciasLector):Promise<void> {
    this.preferencias.set(preferencias);
    try { await Promise.all([this.repositorio.cambiarPreferencias(preferencias),this.motor.aplicar(preferencias)]); }
    catch { this.aviso.set('No pudimos guardar o aplicar las preferencias. Revisá el espacio disponible.'); }
  }
}
