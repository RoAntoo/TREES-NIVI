import { AvisoCopia } from '../../../compartido/componentes/aviso-copia';
import { Component, DestroyRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { Consulta, ControlRefresco } from '../../../compartido/datos/consulta';
import { EstadoVista } from '../../../compartido/componentes/estado-vista';
import { Portada } from '../../../compartido/componentes/portada';
import { Paginador } from '../../../compartido/componentes/paginador';
import { FormularioLibro } from '../../../compartido/componentes/formulario-libro';
import { Confirmaciones } from '../../../compartido/confirmar';
import { ErrorOperacion, interpretarError } from '../../../nucleo/http/error-operacion';
import { ApiBiblioteca } from '../datos/api-biblioteca';
import { EscriturasPendientes } from '../datos/escrituras-pendientes';
import { DetalleLibro, EscrituraLibro, EstadoLectura, Libro, MetadatosLibro, Pagina, RegistroLectura, extraerMetadatos } from '../modelos/biblioteca';
import { EstadoLibro } from '../componentes/estado-libro';
import { ProgresoLectura } from '../componentes/progreso-lectura';
import { ContextoLectura } from '../../lectura/contexto-lectura';
import { ModalAvance } from '../../lectura/modal-avance';
import { CelebracionLectura } from '../../lectura/celebracion-lectura';

@Component({
  selector: 'nivi-pagina-detalle',
  imports: [AvisoCopia, DatePipe, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonModal, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
    EstadoVista, Portada, Paginador, FormularioLibro, EstadoLibro, ProgresoLectura, ContextoLectura, ModalAvance, CelebracionLectura],
  templateUrl: './pagina-detalle.html',
  styleUrl: './pagina-detalle.scss'
})
export class PaginaDetalle {
  readonly api = inject(ApiBiblioteca);
  readonly pendientes = inject(EscriturasPendientes);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmaciones = inject(Confirmaciones);
  private readonly visible = signal(false);
  readonly id = signal('');
  readonly consulta = new Consulta<DetalleLibro>();
  readonly historial = new Consulta<Pagina<RegistroLectura>>();
  readonly errorOperacion = signal<ErrorOperacion | null>(null);
  readonly errorEdicion = signal<ErrorOperacion | null>(null);
  readonly ocupado = signal(false);
  readonly avanceAbierto = signal(false);
  readonly edicionAbierta = signal(false);
  readonly datosEdicion = signal<MetadatosLibro | null>(null);
  readonly esperandoEdicion = signal(false);
  readonly avisoEdicion = signal('');
  readonly mensaje = signal('');
  readonly libroCelebrado = signal<string | null>(null);
  readonly formularioEdicion = viewChild<FormularioLibro>('editorFormulario');
  readonly modalEdicion = viewChild<IonModal>('editorModal');
  private versionEdicion = 0;

  constructor() {
    effect(() => {
      const visible = this.visible(), id = this.id(); this.api.revision();
      untracked(() => { if (visible && id) this.cargar(); });
    });
    effect(() => {
      const datos = this.consulta.datos();
      untracked(() => {
        if (datos && this.esperandoEdicion()) {
          this.versionEdicion = datos.libro.version; this.esperandoEdicion.set(false);
          this.avisoEdicion.set('Se recuperó la versión actual del libro. Revisá tus datos antes de confirmar de nuevo.');
        }
      });
    });
    const avisos: unknown = this.router.currentNavigation()?.extras.state?.['advertencias'];
    if (Array.isArray(avisos)) this.mensaje.set(avisos.filter((a): a is string => typeof a === 'string').join(' '));
    inject(DestroyRef).onDestroy(() => { this.consulta.cancelar(); this.historial.cancelar(); });
  }
  ionViewWillEnter(): void { this.id.set(this.ruta.snapshot.paramMap.get('id') ?? ''); this.visible.set(true); }
  ionViewWillLeave(): void { this.visible.set(false); this.libroCelebrado.set(null); this.consulta.cancelar(); this.historial.cancelar(); }
  cargar(refresco?: ControlRefresco): void {
    this.consulta.cargar(this.api.detalle(this.id()), refresco); this.cargarHistorial(1);
  }
  refrescar(evento: Event): void { this.cargar(evento.target as HTMLIonRefresherElement); }
  cargarHistorial(pagina = 1): void { this.historial.cargar(this.api.historial(this.id(), pagina)); }
  async cambiarEstado(estado: EstadoLectura): Promise<void> {
    const libro = this.consulta.datos()?.libro;
    if (!libro || this.ocupado() || this.consulta.cargando()) return;
    this.ocupado.set(true); this.errorOperacion.set(null);
    try {
      const confirmar = estado === 'TERMINADO' && (libro.totalPaginas === null || libro.paginaActual !== libro.totalPaginas);
      if (confirmar && !await this.confirmaciones.pedir('¿Terminaste este libro?', 'La lectura se mostrará al 100%. Conservaremos tu última página registrada y tus notas.', 'Marcar terminado')) return;
      const actualizado = await firstValueFrom(this.api.estado(libro.id, libro.version, estado, confirmar));
      this.aplicarLibroConfirmado(actualizado, libro.estado);
      this.mensaje.set(estado === 'TERMINADO' ? 'Lectura terminada. Cada historia deja algo.' : 'Estado de lectura actualizado.');
    } catch (error: unknown) { this.tratarError(error); }
    finally { this.ocupado.set(false); }
  }
  avanceGuardado(evento: { resultado: EscrituraLibro; estadoAnterior: EstadoLectura }): void {
    const { resultado, estadoAnterior } = evento;
    this.aplicarLibroConfirmado(resultado.libro, estadoAnterior);
    if (resultado.libro.id === this.id()) this.consulta.datos.update(detalle => detalle ? { ...detalle, ultimoRegistro: resultado.registro } : detalle);
    this.mensaje.set('Avance guardado. Ya tenés un punto al que volver.');
  }
  private aplicarLibroConfirmado(libro: Libro, anterior: EstadoLectura | undefined): void {
    if (libro.id !== this.id()) return;
    this.consulta.datos.update(detalle => detalle ? { ...detalle, libro } : detalle);
    if (this.visible() && libro.estado === 'TERMINADO' && anterior !== 'TERMINADO') this.libroCelebrado.set(libro.titulo);
  }
  abrirEdicion(): void {
    const libro = this.consulta.datos()?.libro; if (!libro) return;
    this.versionEdicion = libro.version; this.datosEdicion.set(extraerMetadatos(libro)); this.errorEdicion.set(null); this.avisoEdicion.set(''); this.esperandoEdicion.set(false); this.edicionAbierta.set(true);
  }
  readonly puedeCerrarEdicion = async (_datos?: unknown, rol?: string): Promise<boolean> => {
    if (rol === 'guardado') return true;
    if (this.ocupado()) return false;
    if (this.formularioEdicion()?.formulario.dirty) return this.confirmaciones.pedir('¿Descartar cambios?', 'Los cambios de metadatos todavía no se guardaron.', 'Descartar');
    return true;
  };
  async guardarEdicion(datos: MetadatosLibro): Promise<void> {
    if (this.ocupado() || this.esperandoEdicion()) return;
    this.ocupado.set(true); this.errorEdicion.set(null); this.datosEdicion.set(datos);
    try {
      await firstValueFrom(this.api.editar(this.id(), this.versionEdicion, datos));
      await this.modalEdicion()?.dismiss(undefined, 'guardado'); this.mensaje.set('Datos del libro actualizados.');
    } catch (error: unknown) {
      const interpretado = interpretarError(error);
      if (interpretado.campos['paginaActual']) interpretado.campos['totalPaginas'] = interpretado.campos['paginaActual'];
      this.errorEdicion.set(interpretado);
      if (interpretado.conflictoVersion || interpretado.incierto) { this.esperandoEdicion.set(true); this.api.actualizarVistas(); }
    } finally { this.ocupado.set(false); }
  }
  async eliminar(): Promise<void> {
    const libro = this.consulta.datos()?.libro;
    if (!libro || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      if (!await this.confirmaciones.pedir('¿Eliminar el libro?', 'Se eliminarán este libro, sus notas y todo su historial de lectura. Esta acción no se puede deshacer.', 'Eliminar libro')) return;
      await firstValueFrom(this.api.eliminar(libro.id, libro.version));
      this.visible.set(false); this.consulta.limpiar(); this.historial.limpiar(); this.datosEdicion.set(null);
      this.pendientes.resolverAvance(libro.id); await this.router.navigateByUrl('/app/biblioteca', { replaceUrl: true });
    } catch (error: unknown) { this.tratarError(error); }
    finally { this.ocupado.set(false); }
  }
  private tratarError(error: unknown): void {
    const interpretado = interpretarError(error); this.errorOperacion.set(interpretado);
    if (interpretado.conflictoVersion || interpretado.incierto) {
      this.mensaje.set('Volvimos a consultar el libro. Revisá el estado actual antes de confirmar otra operación.'); this.api.actualizarVistas();
    }
  }
}
