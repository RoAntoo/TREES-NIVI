import { AvisoCopia } from '../../compartido/componentes/aviso-copia';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, tap } from 'rxjs';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ApiCatalogo } from './api-catalogo';
import { ApiBiblioteca } from '../biblioteca/datos/api-biblioteca';
import { EscriturasPendientes } from '../biblioteca/datos/escrituras-pendientes';
import { CandidatoLibro, MetadatosLibro, OrigenLibro, PaginaCatalogo, PaginaEdiciones, extraerMetadatos, metadatosVacios } from '../biblioteca/modelos/biblioteca';
import { ErrorOperacion, interpretarError } from '../../nucleo/http/error-operacion';
import { Consulta } from '../../compartido/datos/consulta';
import { EstadoVista } from '../../compartido/componentes/estado-vista';
import { FormularioLibro } from '../../compartido/componentes/formulario-libro';
import { Portada } from '../../compartido/componentes/portada';
import { Paginador } from '../../compartido/componentes/paginador';
import { Confirmaciones } from '../../compartido/confirmar';
import { isbnValido, textoRequerido } from '../../compartido/validadores/validadores-lectura';
import { EscanerIsbn } from '../../nucleo/capacidades/escaner-isbn';
import { BuscarEdicion } from '../biblioteca/datos/buscar-edicion';
import { Libro } from '../biblioteca/modelos/biblioteca';

@Component({
  selector: 'nivi-pagina-agregar',
  imports: [AvisoCopia, ReactiveFormsModule, RouterLink, IonButton, IonContent, IonHeader, IonInput, IonSegment, IonSegmentButton, IonLabel, IonTitle, IonToolbar,
    EstadoVista, FormularioLibro, Portada, Paginador],
  templateUrl: './pagina-agregar.html',
  styleUrl: './pagina-agregar.scss'
})
export class PaginaAgregar {
  private readonly catalogo = inject(ApiCatalogo);
  readonly biblioteca = inject(ApiBiblioteca);
  readonly pendientes = inject(EscriturasPendientes);
  private readonly confirmaciones = inject(Confirmaciones);
  private readonly router = inject(Router);
  readonly escaner = inject(EscanerIsbn);
  private readonly ediciones = inject(BuscarEdicion);
  readonly avisoEscaneo = signal('');
  readonly duplicado = signal<Libro | null>(null);
  readonly buscandoDuplicado = signal(false);
  private visible = false;
  readonly datosVacios = metadatosVacios;
  readonly formularioLibro = viewChild(FormularioLibro);
  readonly modo = signal<'busqueda' | 'isbn' | 'manual'>('busqueda');
  readonly seleccion = signal<MetadatosLibro | null>(null);
  readonly origen = signal<OrigenLibro>('MANUAL');
  readonly errorGuardado = signal<ErrorOperacion | null>(null);
  readonly guardando = signal(false);
  readonly guardado = signal('');
  readonly consulta = new Consulta<PaginaCatalogo>();
  readonly edicionesObra = new Consulta<PaginaEdiciones>();
  readonly detalleEdicion = new Consulta<CandidatoLibro>();
  readonly obraSeleccionada = signal<CandidatoLibro | null>(null);
  readonly edicionSolicitada = signal<CandidatoLibro | null>(null);
  readonly formularioBusqueda = new FormGroup({ q: new FormControl('', { nonNullable: true, validators: [textoRequerido, Validators.maxLength(200)] }) });
  readonly formularioIsbn = new FormGroup({ isbn: new FormControl('', { nonNullable: true, validators: [textoRequerido, Validators.maxLength(40), isbnValido] }) });
  readonly datosFormulario = computed(() => this.pendientes.alta()?.metadatos ?? this.seleccion());
  private busquedaAplicada = '';

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.consulta.cancelar(); this.edicionesObra.cancelar(); this.detalleEdicion.cancelar(); });
  }
  ionViewWillEnter(): void { this.visible = true; }
  ionViewWillLeave(): void { this.visible = false; this.consulta.cancelar(); this.edicionesObra.cancelar(); this.detalleEdicion.cancelar(); }
  async escanear(): Promise<void> {
    if (this.escaner.ocupado() || this.consulta.cargando()) return;
    this.avisoEscaneo.set(''); this.consulta.limpiar();
    const resultado = await this.escaner.escanear();
    if (!this.visible) return;
    if (resultado.tipo === 'isbn') {
      this.modo.set('isbn'); this.formularioIsbn.controls.isbn.setValue(resultado.isbn); this.identificar();
      return;
    }
    const mensajes = {
      cancelado: 'Escaneo cancelado. Podés volver a escanear o escribir el ISBN.',
      'permiso-denegado': 'No se habilitó la cámara. Podés permitirla en Ajustes de Android > Aplicaciones > NIVI Lectura > Permisos y volver a escanear, o escribir el ISBN.',
      'no-disponible': 'La cámara no está disponible. Escribí el ISBN o buscá por título o autor.',
      invalido: 'Ese código no es un ISBN de libro válido. Buscá el código que empieza con 978 o 979, o escribí el ISBN.',
      error: 'No pudimos usar la cámara. Revisá que esté disponible y volvé a intentar, o escribí el ISBN.',
      ocupado: 'Ya hay un escaneo en curso.'
    };
    this.avisoEscaneo.set(mensajes[resultado.tipo]);
  }
  cambiarModo(evento: Event): void {
    const valor: unknown = (evento as CustomEvent<{ value: unknown }>).detail.value;
    if (valor !== 'busqueda' && valor !== 'isbn' && valor !== 'manual') return;
    if (this.escaner.ocupado()) return;
    this.modo.set(valor); this.consulta.limpiar(); this.guardado.set(''); this.avisoEscaneo.set(''); this.duplicado.set(null);
    if (valor === 'manual') { this.origen.set('MANUAL'); this.seleccion.set(metadatosVacios()); }
  }
  buscar(pagina = 1): void {
    this.formularioBusqueda.markAllAsTouched(); if (this.formularioBusqueda.invalid) return;
    if (pagina === 1) this.busquedaAplicada = this.formularioBusqueda.controls.q.value.trim();
    this.consulta.cargar(this.catalogo.buscar(this.busquedaAplicada, pagina));
  }
  identificar(): void {
    this.formularioIsbn.markAllAsTouched(); if (this.formularioIsbn.invalid) return;
    this.consulta.cargar(this.catalogo.porIsbn(this.formularioIsbn.controls.isbn.value).pipe(map(libro => ({
      elementos: [libro], pagina: 1, tamano: 1, totalElementos: 1, totalEstimado: false, haySiguiente: false
    }))));
  }
  elegir(candidato: CandidatoLibro): void {
    this.edicionesObra.limpiar(); this.detalleEdicion.limpiar(); this.edicionSolicitada.set(null);
    this.obraSeleccionada.set(candidato.idEdicionExterna ? null : candidato);
    this.seleccion.set(extraerMetadatos(candidato)); this.origen.set('OPEN_LIBRARY'); this.errorGuardado.set(null); this.duplicado.set(null); this.consulta.cancelar();
    if (!candidato.idEdicionExterna && candidato.idObraExterna) this.cargarEdiciones();
  }
  cargarEdiciones(pagina = 1): void {
    const obra = this.obraSeleccionada()?.idObraExterna;
    if (obra) this.edicionesObra.cargar(this.catalogo.ediciones(obra, pagina));
  }
  usarEdicion(candidato: CandidatoLibro): void {
    if (!candidato.idEdicionExterna || this.guardando() || this.pendientes.alta()) return;
    this.edicionSolicitada.set(structuredClone(candidato));
    this.detalleEdicion.cargar(this.catalogo.porEdicion(candidato.idEdicionExterna).pipe(tap(datos => {
      const obra = datos.idObraExterna ?? candidato.idObraExterna;
      const autoresObra = obra === this.obraSeleccionada()?.idObraExterna ? this.obraSeleccionada()?.autores ?? [] : [];
      // Conservar datos ya obtenidos de ESTA edición; nunca tomar páginas de otra fila u obra.
      this.seleccion.set(extraerMetadatos({ ...datos, idObraExterna: obra,
        autores: datos.autores.length ? datos.autores : autoresObra.length ? autoresObra : candidato.autores,
        totalPaginas: datos.totalPaginas ?? candidato.totalPaginas, isbn: datos.isbn ?? candidato.isbn,
        urlPortada: datos.urlPortada ?? candidato.urlPortada }));
      this.errorGuardado.set(null); this.duplicado.set(null);
    })));
  }
  reintentarEdicion(): void {
    const candidato = this.edicionSolicitada();
    if (candidato) this.usarEdicion(candidato);
  }
  completarSeleccion(): void {
    const datos = this.seleccion();
    if (datos) this.usarEdicion({ ...datos, enlaceFuente: '' });
  }
  nombreIdioma(codigo: string): string {
    const idiomas: Record<string, string> = { eng: 'Inglés', spa: 'Español', fre: 'Francés', fra: 'Francés', ger: 'Alemán', deu: 'Alemán', ita: 'Italiano', por: 'Portugués', cat: 'Catalán', rus: 'Ruso' };
    return idiomas[codigo] ?? codigo;
  }
  async cancelarSeleccion(): Promise<void> {
    if (this.pendientes.alta() || this.guardando()) return;
    if (this.formularioLibro()?.formulario.dirty && !await this.confirmaciones.pedir('¿Descartar cambios?', 'Se perderán los datos del formulario que no guardaste.', 'Descartar')) return;
    this.edicionesObra.limpiar(); this.detalleEdicion.limpiar(); this.obraSeleccionada.set(null); this.edicionSolicitada.set(null);
    this.seleccion.set(null); this.errorGuardado.set(null); this.duplicado.set(null);
    if (this.modo() === 'manual') this.modo.set('busqueda');
  }
  async guardar(datos: MetadatosLibro): Promise<void> {
    if (this.guardando() || this.detalleEdicion.cargando()) return;
    this.seleccion.set(datos); this.errorGuardado.set(null); this.guardando.set(true);
    const entrada = this.pendientes.prepararAlta(datos, this.origen());
    try {
      const resultado = await firstValueFrom(this.biblioteca.agregar(entrada));
      this.pendientes.alta.set(null); this.seleccion.set(null); this.consulta.limpiar(); this.modo.set('busqueda');
      this.edicionesObra.limpiar(); this.detalleEdicion.limpiar(); this.obraSeleccionada.set(null); this.edicionSolicitada.set(null);
      this.guardado.set(resultado.advertencias.join(' ') || 'Libro guardado en tu biblioteca.');
      if (this.visible) void this.router.navigate(['/app/biblioteca', resultado.libro.id], { state: { advertencias: resultado.advertencias } });
    } catch (error: unknown) {
      const interpretado = interpretarError(error); this.errorGuardado.set(interpretado);
      if (!interpretado.incierto) this.pendientes.alta.set(null);
      if (interpretado.codigo === 'EDICION_DUPLICADA') await this.buscarDuplicado(datos);
    } finally { this.guardando.set(false); }
  }
  async buscarDuplicado(datos = this.seleccion()): Promise<void> {
    if (!datos || this.buscandoDuplicado()) return;
    this.buscandoDuplicado.set(true);
    try { this.duplicado.set(await this.ediciones.existente(datos)); }
    catch { /* El error original y el formulario permanecen; se puede volver a consultar. */ }
    finally { this.buscandoDuplicado.set(false); }
  }
}
