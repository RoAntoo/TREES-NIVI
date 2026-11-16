import { Component, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonInput } from '@ionic/angular/ion-input';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { MetadatosLibro } from '../../funcionalidades/biblioteca/modelos/biblioteca';
import { crearFormularioLibro, valoresMetadatos } from '../validadores/validadores-lectura';

@Component({
  selector: 'nivi-formulario-libro',
  imports: [ReactiveFormsModule, IonButton, IonInput, IonSpinner, IonTextarea],
  template: `<form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate [attr.aria-busy]="ocupado()" class="formulario-libro">
    <ion-input label="Título" labelPlacement="stacked" fill="outline" formControlName="titulo" [readonly]="bloqueado() || ocupado()" aria-describedby="error-titulo" />
    @if (errorCampo('titulo')) { <p id="error-titulo" class="error-campo">{{ errorCampo('titulo') }}</p> }
    <ion-textarea label="Autores (uno por línea, opcional)" labelPlacement="stacked" fill="outline" formControlName="autores" [autoGrow]="true" [rows]="2" [readonly]="bloqueado() || ocupado()" aria-describedby="error-autores" />
    @if (errorCampo('autores')) { <p id="error-autores" class="error-campo">{{ errorCampo('autores') }}</p> }
    <div class="dos-campos">
      <div><ion-input label="ISBN (opcional)" labelPlacement="stacked" fill="outline" formControlName="isbn" [readonly]="bloqueado() || ocupado()" aria-describedby="error-isbn" />
        @if (errorCampo('isbn')) { <p id="error-isbn" class="error-campo">{{ errorCampo('isbn') }}</p> }</div>
      <div><ion-input label="Total de páginas (opcional)" labelPlacement="stacked" fill="outline" type="number" inputmode="numeric" formControlName="totalPaginas" [readonly]="bloqueado() || ocupado()" aria-describedby="error-total" />
        @if (errorCampo('totalPaginas')) { <p id="error-total" class="error-campo">{{ errorCampo('totalPaginas') }}</p> }</div>
    </div>
    <ion-input label="URL de portada (opcional)" labelPlacement="stacked" fill="outline" type="url" formControlName="urlPortada" [readonly]="bloqueado() || ocupado()" aria-describedby="error-portada" />
    @if (errorCampo('urlPortada')) { <p id="error-portada" class="error-campo">{{ errorCampo('urlPortada') }}</p> }
    <p class="ayuda-campo">La portada puede quedar vacía. Si usás una URL, debe ser HTTPS de covers.openlibrary.org.</p>
    <ion-button type="submit" [disabled]="ocupado() || actualizando()" expand="block">@if (ocupado()) { <ion-spinner name="crescent" aria-label="Guardando" /> } @else { {{ bloqueado() ? 'Reintentar el mismo guardado' : textoBoton() }} }</ion-button>
  </form>`,
  styles: `.formulario-libro { display: grid; gap: 19px; }.dos-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }ion-input, ion-textarea { --border-radius: 10px; --border-color: var(--nivi-borde); --padding-start: 16px; --padding-end: 14px; font-size: 14px; min-height: 60px; }.error-campo { margin-top: -10px; }.dos-campos .error-campo { margin-top: 8px; }.ayuda-campo { margin: -7px 0 0; font-size: 11px; color: var(--nivi-secundario); line-height: 1.7; }ion-button { min-height: 48px; margin: 3px 0 0; }@media(max-width:540px) { .dos-campos { grid-template-columns: 1fr; } }`
})
export class FormularioLibro {
  readonly datos = input.required<MetadatosLibro>();
  readonly ocupado = input(false);
  readonly bloqueado = input(false);
  readonly actualizando = input(false);
  readonly erroresServidor = input<Record<string, string>>({});
  readonly textoBoton = input('Guardar libro');
  readonly confirmar = output<MetadatosLibro>();
  readonly formulario = crearFormularioLibro();
  private anteriores?: ReturnType<typeof this.formulario.getRawValue>;
  private readonly mensajes: Record<keyof typeof this.formulario.controls, string> = {
    titulo: 'Ingresá un título de 1 a 255 caracteres.', autores: 'Ingresá hasta 10 autores de hasta 150 caracteres, uno por línea.',
    isbn: 'Ingresá un ISBN-10 o ISBN-13 de libro válido, o dejalo vacío.', totalPaginas: 'Ingresá un entero entre 1 y 100000, o dejalo vacío.',
    urlPortada: 'Usá una portada HTTPS de covers.openlibrary.org, sin usuario, puerto ni fragmento.'
  };
  constructor() {
    effect(() => {
      const datos = this.datos();
      const valores = { titulo: datos.titulo, autores: datos.autores.join('\n'), isbn: datos.isbn ?? '', totalPaginas: datos.totalPaginas, urlPortada: datos.urlPortada ?? '' };
      if (!this.anteriores) this.formulario.reset(valores);
      else {
        this.completar(this.formulario.controls.titulo, valores.titulo, this.anteriores.titulo);
        this.completar(this.formulario.controls.autores, valores.autores, this.anteriores.autores);
        this.completar(this.formulario.controls.isbn, valores.isbn, this.anteriores.isbn);
        this.completar(this.formulario.controls.totalPaginas, valores.totalPaginas, this.anteriores.totalPaginas);
        this.completar(this.formulario.controls.urlPortada, valores.urlPortada, this.anteriores.urlPortada);
      }
      this.anteriores = valores;
    });
  }
  private completar<T>(control: FormControl<T>, nuevo: T, anterior: T): void {
    // Un vacío editado también es deliberado. Solo se actualiza un valor automático o sin completar.
    if (!control.dirty && (control.value === anterior || control.value === '' || control.value === null)) control.setValue(nuevo);
  }
  errorCampo(campo: keyof typeof this.formulario.controls): string | null {
    return this.erroresServidor()[campo] ?? (this.formulario.controls[campo].touched && this.formulario.controls[campo].invalid ? this.mensajes[campo] : null);
  }
  enviar(): void {
    if (this.ocupado() || this.actualizando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.valid) this.confirmar.emit(valoresMetadatos(this.formulario, this.datos()));
  }
}
