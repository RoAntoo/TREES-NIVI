import { Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ApiBiblioteca } from '../biblioteca/datos/api-biblioteca';
import { EscriturasPendientes } from '../biblioteca/datos/escrituras-pendientes';
import { EstadoLectura, EscrituraLibro, Libro } from '../biblioteca/modelos/biblioteca';
import { ErrorOperacion, interpretarError } from '../../nucleo/http/error-operacion';
import { Confirmaciones } from '../../compartido/confirmar';
import { crearFormularioAvance, entero } from '../../compartido/validadores/validadores-lectura';

@Component({
  selector: 'nivi-modal-avance',
  imports: [ReactiveFormsModule, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSpinner, IonTextarea, IonTitle, IonToolbar],
  template: `<ion-modal [isOpen]="abierto()" [canDismiss]="puedeCerrar" (didDismiss)="cerrado.emit()" aria-label="Registrar avance de lectura">
    <ng-template>
      <ion-header class="ion-no-border"><ion-toolbar><ion-title>Registrar avance</ion-title><ion-buttons slot="end"><ion-button [disabled]="guardando()" (click)="modal()?.dismiss()">Cerrar</ion-button></ion-buttons></ion-toolbar></ion-header>
      <ion-content><section class="contenido-modal">
        <span class="ceja">UN CAPÍTULO MÁS</span><h2>¿Por dónde vas?</h2><p class="libro-modal">{{ libro().titulo }}</p>
        <p class="ayuda-campo">Última posición: página {{ libro().paginaActual }}{{ libro().totalPaginas === null ? '. Total de páginas sin informar.' : ' de ' + libro().totalPaginas + '.' }}</p>
        @if (error(); as error) { <p class="error-operacion" role="alert">{{ error.mensaje }}</p> }
        @if (esperandoVersion()) { <p class="aviso-sesion" role="status">Estamos recuperando la versión actual. Conservamos tu página y nota para que las revises.</p><ion-button fill="clear" (click)="api.actualizarVistas()">Volver a consultar el libro</ion-button> }
        @if (revisionRecibida()) { <p class="aviso-sesion" role="status">El libro cambió y ya tiene la versión actual. Revisá la página y la nota antes de guardar de nuevo.</p> }
        @if (pendiente() && !guardando()) { <p class="aviso-sesion" role="status">Hay un avance sin confirmar. El reintento usa la misma página, nota y clave para evitar duplicarlo.</p> }
        <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate [attr.aria-busy]="guardando()">
          <ion-input label="Página actual" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric" formControlName="paginaActual" [readonly]="guardando() || !!pendiente()" aria-describedby="error-pagina" />
          @if (formulario.controls.paginaActual.touched && formulario.controls.paginaActual.invalid) { <p id="error-pagina" class="error-campo">Ingresá un entero desde 0{{ libro().totalPaginas === null ? '' : ' hasta ' + libro().totalPaginas }}.</p> }
          @if (error()?.campos?.['paginaActual']) { <p class="error-campo">{{ error()!.campos['paginaActual'] }}</p> }
          <ion-textarea label="Una nota para retomar (opcional)" labelPlacement="stacked" fill="outline" formControlName="nota" [rows]="5" [autoGrow]="true" [readonly]="guardando() || !!pendiente()" placeholder="¿Qué te gustaría recordar antes de seguir?" aria-describedby="error-nota" />
          @if (formulario.controls.nota.touched && formulario.controls.nota.invalid) { <p id="error-nota" class="error-campo">La nota admite hasta 2000 caracteres.</p> }
          @if (error()?.campos?.['nota']) { <p class="error-campo">{{ error()!.campos['nota'] }}</p> }
          <p class="ayuda-campo">La nota se guarda como texto personal. Si corregís una página anterior, el historial se conserva.</p>
          <ion-button expand="block" type="submit" [disabled]="api.copia.bloqueada() || api.sincronizando() || guardando() || esperandoVersion()">@if (guardando()) { <ion-spinner name="crescent" aria-label="Guardando avance" /> } @else { {{ pendiente() ? 'Reintentar el mismo avance' : 'Guardar avance' }} }</ion-button>
        </form>
      </section></ion-content>
    </ng-template>
  </ion-modal>`,
  styles: `.contenido-modal { padding: 30px; max-width: 680px; margin: auto; }h2 { font: 400 35px/1.2 var(--nivi-serif); margin: 14px 0; }.libro-modal { font-size: 14px; line-height: 1.7; }.ayuda-campo { font-size: 12px; line-height: 1.8; color: var(--nivi-secundario); }form { display: grid; gap: 18px; margin-top: 26px; }ion-input, ion-textarea { --border-radius: 10px; --border-color: var(--nivi-borde); --padding-start: 16px; --padding-end: 16px; font-size: 14px; min-height: 62px; }ion-button[type=submit] { min-height: 48px; }`
})
export class ModalAvance {
  readonly libro = input.required<Libro>();
  readonly abierto = input.required<boolean>();
  readonly cerrado = output<void>();
  readonly guardado = output<{ resultado: EscrituraLibro; estadoAnterior: EstadoLectura }>();
  readonly modal = viewChild(IonModal);
  readonly api = inject(ApiBiblioteca);
  private readonly pendientes = inject(EscriturasPendientes);
  private readonly confirmaciones = inject(Confirmaciones);
  readonly pendiente = computed(() => this.pendientes.avances()[this.libro().id]);
  readonly formulario = crearFormularioAvance(null);
  readonly guardando = signal(false);
  readonly error = signal<ErrorOperacion | null>(null);
  readonly esperandoVersion = signal(false);
  readonly revisionRecibida = signal(false);
  private estabaAbierto = false;
  private version = 0;

  constructor() {
    effect(() => {
      const abierto = this.abierto(), libro = this.libro(), pendiente = this.pendiente();
      untracked(() => {
        if (abierto && !this.estabaAbierto) {
          this.version = libro.version; this.error.set(null); this.esperandoVersion.set(false); this.revisionRecibida.set(false);
          this.formulario.reset({ paginaActual: pendiente?.paginaActual ?? libro.paginaActual, nota: pendiente?.nota ?? '' });
        }
        this.formulario.controls.paginaActual.setValidators([Validators.required, entero, Validators.min(0), Validators.max(libro.totalPaginas ?? 2147483647)]);
        this.formulario.controls.paginaActual.updateValueAndValidity();
        if (abierto && this.esperandoVersion() && libro.version !== this.version) {
          this.version = libro.version; this.esperandoVersion.set(false); this.revisionRecibida.set(true);
        }
        this.estabaAbierto = abierto;
      });
    });
  }
  readonly puedeCerrar = async (_datos?: unknown, rol?: string): Promise<boolean> => {
    if (rol === 'guardado') return true;
    if (this.guardando()) return false;
    if (this.pendiente()) return this.confirmaciones.pedir('¿Cerrar por ahora?', 'El avance sin confirmar queda en memoria mientras la app siga abierta. Podés reintentarlo desde este libro.', 'Cerrar');
    if (this.formulario.dirty) return this.confirmaciones.pedir('¿Descartar el avance?', 'Se perderán la página y la nota que todavía no guardaste.', 'Descartar');
    return true;
  };
  async guardar(): Promise<void> {
    if (this.guardando() || this.esperandoVersion()) return;
    this.formulario.markAllAsTouched();
    if (!this.pendiente() && this.formulario.invalid) return;
    const estadoAnterior = this.libro().estado;
    this.guardando.set(true);
    try {
      const valores = this.formulario.getRawValue();
      if (!this.pendiente() && valores.paginaActual! < this.libro().paginaActual
        && !await this.confirmaciones.pedir('¿Corregir la página?', 'La nueva posición es anterior a la última guardada. Se creará un registro nuevo y se conservará el historial.', 'Guardar corrección')) return;
      const entrada = this.pendientes.prepararAvance(this.libro().id, { versionLibro: this.version, paginaActual: valores.paginaActual!, nota: valores.nota.trim() || null });
      this.error.set(null);
      const resultado = await firstValueFrom(this.api.registrar(this.libro().id, entrada));
      this.pendientes.resolverAvance(this.libro().id); this.formulario.markAsPristine();
      await this.modal()?.dismiss(undefined, 'guardado'); this.guardado.emit({ resultado, estadoAnterior });
    } catch (error: unknown) {
      const interpretado = interpretarError(error); this.error.set(interpretado);
      if (!interpretado.incierto) this.pendientes.resolverAvance(this.libro().id);
      if (interpretado.conflictoVersion) { this.esperandoVersion.set(true); this.api.actualizarVistas(); }
    } finally { this.guardando.set(false); }
  }
}
