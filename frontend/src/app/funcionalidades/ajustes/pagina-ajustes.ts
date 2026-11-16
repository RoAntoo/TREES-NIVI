import { DatePipe } from '@angular/common';
import { IonButton } from '@ionic/angular/ion-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { Preferencias } from '../../nucleo/almacenamiento/preferencias';
import { ApiBiblioteca } from '../biblioteca/datos/api-biblioteca';
import { Confirmaciones } from '../../compartido/confirmar';
import { AvisoCopia } from '../../compartido/componentes/aviso-copia';
import { Component, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ServicioCapacidades } from '../../nucleo/capacidades/servicio-capacidades';
import { Marca } from '../../compartido/componentes/marca';

@Component({
  selector: 'nivi-pagina-ajustes',
  imports: [DatePipe, IonButton, IonSelect, IonSelectOption, IonToggle, AvisoCopia, IonContent, IonHeader, IonTitle, IonToolbar, Marca],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Ajustes</ion-title></ion-toolbar></ion-header>
    <ion-content><main class="pagina ajustes"><nivi-aviso-copia />
      <div class="encabezado-pagina"><span class="ceja">A TU MANERA</span><h1>Tu espacio de lectura.</h1><p>Libros físicos. Notas personales. Lecturas a tu ritmo.</p></div>
      <section><h2>Tu biblioteca</h2><p>Usá NIVI directamente, sin cuenta ni contraseña. Tus libros físicos y sus avances se guardan en el servidor de tu biblioteca.</p><p>Para buscar en el catálogo o guardar cambios en libros físicos, el servidor debe estar disponible.</p></section>
      <section><h2>Archivos de lectura</h2><p>Los EPUB y su posición se conservan en este dispositivo. Desinstalar NIVI o borrar sus datos puede eliminar los archivos y el seguimiento.</p></section>
      <section><h2>Cámara e ISBN</h2><p>{{ capacidades.escaneoDisponible ? 'Escaneá el código de barras de tu libro desde Agregar. La cámara se solicita al tocar Escanear ISBN.' : 'Podés agregar libros buscando por título o escribiendo el ISBN. El escáner está disponible en la app Android.' }}</p></section>
      <section><h2>Apariencia</h2>
        <ion-select label="Tema" labelPlacement="stacked" interface="popover" [value]="preferencias.apariencia()" (ionChange)="preferencias.cambiar($event.detail.value)">
          <ion-select-option value="sistema">Según el dispositivo</ion-select-option><ion-select-option value="claro">Claro</ion-select-option><ion-select-option value="oscuro">Oscuro</ion-select-option>
        </ion-select>
        @if (preferencias.aviso()) { <p role="status">{{ preferencias.aviso() }}</p> }
      </section>
      <section><h2>Copia de consulta</h2>
        <p>Elegí si querés guardar libros y la última nota de lectura en este dispositivo. Usalo en un dispositivo personal. La copia no incluye imágenes de portadas ni historial completo.</p>
        <ion-toggle [checked]="api.copia.habilitada()" [disabled]="ocupado() || api.sincronizando()" (ionChange)="activar($event.detail.checked)">Guardar copia local</ion-toggle>
        <p>Hasta 100 libros recientes. Los libros consultados se actualizan al navegar; Actualizar copia recupera también sus últimos registros. Sin red, los filtros y conteos abarcan solo lo guardado. No hay escrituras ni sincronización offline.</p>
        @if (api.copia.fecha(); as fecha) { <p role="status">Copia guardada · {{ api.copia.entradas().length }} libros · {{ fecha | date:'d MMM y, HH:mm' }}</p> }
        @else { <p>Todavía no hay libros guardados en la copia.</p> }
        <ion-button [disabled]="!api.copia.habilitada() || api.sincronizando() || ocupado() || api.copia.sinRed()" (click)="actualizar()">{{ api.sincronizando() ? 'Guardando copia…' : 'Actualizar copia' }}</ion-button>
        <ion-button fill="outline" [disabled]="ocupado() || api.sincronizando()" (click)="borrar()">Borrar y desactivar copia</ion-button>
        <p>Después de abrir la app, necesitás una consulta correcta al servidor para habilitar la copia. Una pestaña ya cargada o la app Android pueden consultarla si luego se pierde la red. No se garantiza abrir la web sin conexión.</p>
        @if (mensaje()) { <p role="status">{{ mensaje() }}</p> }
      </section>
      <section><h2>Acerca de NIVI</h2><p>Versión 0.6.4 · {{ capacidades.esNativa ? 'Aplicación nativa' : 'Navegador' }}</p></section>
      <footer><nivi-marca /><p>Un capítulo a la vez.</p></footer>
    </main></ion-content>
  `,
  styles: `.ajustes { max-width: 860px; }section { padding: 22px; border: 1px solid var(--nivi-borde); border-radius: 14px; background: var(--nivi-superficie); margin: 20px 0; }h2 { font: 400 24px var(--nivi-serif); margin: 0 0 12px; }section p { font-size: 13px; line-height: 1.8; color: var(--nivi-secundario); }footer { border-top: 1px solid var(--nivi-borde); margin-top: 35px; padding-top: 25px; display: flex; align-items: center; gap: 25px; }footer p { font: italic 16px var(--nivi-serif); color: var(--nivi-secundario); }`
})
export class PaginaAjustes {
  readonly capacidades = inject(ServicioCapacidades);
  readonly preferencias = inject(Preferencias);
  readonly api = inject(ApiBiblioteca);
  private readonly confirmaciones = inject(Confirmaciones);
  readonly ocupado = signal(false);
  readonly mensaje = signal('');
  async activar(valor: boolean): Promise<void> {
    this.ocupado.set(true);
    try { await this.api.copia.activar(valor); this.api.actualizarVistas(); }
    finally { this.ocupado.set(false); }
  }
  async actualizar(): Promise<void> {
    this.mensaje.set('');
    try { await this.api.actualizarCopia(); this.mensaje.set(this.api.copia.aviso() || 'Copia actualizada.'); }
    catch { this.mensaje.set('No pudimos actualizar la copia. Revisá la conexión y reintentá; la copia anterior se conserva ante un fallo de red.'); }
  }
  async borrar(): Promise<void> {
    if (!await this.confirmaciones.pedir('¿Borrar la copia local?', 'Se borrarán los libros y notas guardados en este dispositivo. Tu biblioteca del servidor se conserva.', 'Borrar copia')) return;
    await this.activar(false); this.mensaje.set(this.api.copia.aviso() || 'Copia local borrada y desactivada.');
  }
}
