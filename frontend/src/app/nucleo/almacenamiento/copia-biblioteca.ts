import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CONFIGURACION_API } from '../configuracion/configuracion-api';
import { DetalleLibro, EstadoLectura, Libro, Pagina, ResumenLecturas } from '../../funcionalidades/biblioteca/modelos/biblioteca';
import { AlmacenamientoLocal } from './almacenamiento-local';

interface Entrada { libro: Libro; detalle: DetalleLibro | null; guardadoEn: string }
interface Copia { version: 1; api: string; entradas: Entrada[] }
const estados = ['PENDIENTE', 'LEYENDO', 'PAUSADO', 'TERMINADO'];
function fechaValida(valor: unknown): boolean { return typeof valor === 'string' && Number.isFinite(Date.parse(valor)); }
function libroValido(libro: Libro): boolean {
  return !!libro && typeof libro.id === 'string' && typeof libro.titulo === 'string'
    && Array.isArray(libro.autores) && libro.autores.every(a => typeof a === 'string')
    && estados.includes(libro.estado) && ['MANUAL', 'OPEN_LIBRARY'].includes(libro.origen)
    && Number.isInteger(libro.version) && libro.version >= 0 && Number.isInteger(libro.paginaActual) && libro.paginaActual >= 0
    && (libro.totalPaginas === null || (Number.isInteger(libro.totalPaginas) && libro.totalPaginas > 0))
    && fechaValida(libro.creadoEn) && fechaValida(libro.actualizadoEn) && (libro.terminadoEn === null || fechaValida(libro.terminadoEn))
    && [libro.isbn, libro.idEdicionExterna, libro.idObraExterna, libro.urlPortada].every(v => v === null || typeof v === 'string');
}
export function copiaValida(valor: unknown, api: string): valor is Copia {
  if (!valor || typeof valor !== 'object') return false;
  const copia = valor as Copia;
  return copia.version === 1 && copia.api === api && Array.isArray(copia.entradas) && copia.entradas.length <= 100
    && copia.entradas.every(e => e && fechaValida(e.guardadoEn) && libroValido(e.libro)
      && (e.detalle === null || (libroValido(e.detalle?.libro) && e.detalle.libro.id === e.libro.id && e.detalle.libro.version === e.libro.version
        && (e.detalle.ultimoRegistro === null || (fechaValida(e.detalle.ultimoRegistro?.creadoEn)
          && e.detalle.ultimoRegistro.libroId === e.libro.id && Number.isInteger(e.detalle.ultimoRegistro.paginaActual)
          && (e.detalle.ultimoRegistro.nota === null || typeof e.detalle.ultimoRegistro.nota === 'string'))))));
}

@Injectable({ providedIn: 'root' })
export class CopiaBiblioteca {
  private readonly almacen = inject(AlmacenamientoLocal);
  private readonly api = inject(CONFIGURACION_API).url;
  private readonly clave = `biblioteca.v1:${this.api}`;
  readonly habilitada = signal(false);
  readonly disponibleEnArranque = signal(false);
  readonly modoCopia = signal(false);
  readonly sinRed = signal(!navigator.onLine);
  readonly bloqueada = computed(() => this.modoCopia() || this.sinRed());
  readonly aviso = signal('');
  readonly entradas = signal<Entrada[]>([]);
  readonly fecha = computed(() => this.entradas().map(e => e.guardadoEn).sort().at(-1) ?? null);
  private cola: Promise<void> = Promise.resolve();
  private generacion = 0;
  get generacionActual(): number { return this.generacion; }
  private readonly pendiente = `nivi.copia.pendiente:${this.api}`;
  readonly lista: Promise<void>;
  constructor() {
    this.lista = this.iniciar();
    window.addEventListener('offline', () => this.sinRed.set(true));
    window.addEventListener('online', () => this.sinRed.set(false));
  }
  private async iniciar(): Promise<void> {
    try {
      this.habilitada.set(this.almacen.leerAjuste('nivi.copia.v1') === 'si');
      if (!this.habilitada()) { await this.almacen.borrar(this.clave); return; }
      if (this.almacen.leerAjuste(this.pendiente) === 'si') {
        await this.almacen.borrar(this.clave); this.almacen.guardarAjuste(this.pendiente, 'no');
        this.aviso.set('Se descartó una copia cuya última actualización no pudo completarse.'); return;
      }
      const copia = await this.almacen.leer(this.clave);
      if (copia === undefined) return;
      if (!copiaValida(copia, this.api)) { await this.almacen.borrar(this.clave); throw new Error('Copia incompatible.'); }
      this.entradas.set(copia.entradas);
    } catch { this.aviso.set('La copia local no está disponible. Podés seguir consultando en línea.'); }
  }
  confirmarConexion(): void { this.disponibleEnArranque.set(true); this.modoCopia.set(false); }
  async activar(valor: boolean): Promise<void> {
    await this.lista;
    try { this.almacen.guardarAjuste('nivi.copia.v1', valor ? 'si' : 'no'); }
    catch { this.aviso.set('No pudimos guardar tu elección. La copia no se activó.'); if (valor) return; }
    this.habilitada.set(valor);
    if (!valor) await this.borrar();
  }
  async borrar(): Promise<void> {
    this.generacion++; this.entradas.set([]); this.modoCopia.set(false);
    await this.cola;
    try { this.almacen.guardarAjuste(this.pendiente, 'si'); await this.almacen.borrar(this.clave); this.almacen.guardarAjuste(this.pendiente, 'no'); this.aviso.set(''); }
    catch { this.aviso.set('No pudimos borrar la copia del dispositivo. Reintentá o eliminá los datos de la aplicación.'); }
  }
  async invalidarAcceso(): Promise<void> { this.disponibleEnArranque.set(false); await this.borrar(); }
  guardarLibros(libros: Libro[], detalles: DetalleLibro[] = []): Promise<void> {
    return this.cambiar(entradas => {
      const mapa = new Map(entradas.map(e => [e.libro.id, e]));
      for (const libro of libros) {
        const anterior = mapa.get(libro.id);
        if (anterior && anterior.libro.version > libro.version) continue;
        mapa.set(libro.id, { libro, detalle: detalles.find(d => d.libro.id === libro.id)
          ?? (anterior?.libro.version === libro.version ? anterior.detalle : null), guardadoEn: new Date().toISOString() });
      }
      return [...mapa.values()].sort((a, b) => b.libro.actualizadoEn.localeCompare(a.libro.actualizadoEn)).slice(0, 100);
    });
  }
  quitar(id: string): Promise<void> { return this.cambiar(entradas => entradas.filter(e => e.libro.id !== id)); }
  private cambiar(accion: (entradas: Entrada[]) => Entrada[]): Promise<void> {
    const generacion = this.generacion;
    this.cola = this.cola.then(async () => {
      await this.lista;
      if (!this.habilitada() || generacion !== this.generacion) return;
      const entradas = accion(this.entradas());
      // Ante fallo de cuota no conservar una copia anterior que contradiga una mutación confirmada.
      this.entradas.set(entradas);
      try {
        this.almacen.guardarAjuste(this.pendiente, 'si');
        await this.almacen.guardar(this.clave, { version: 1, api: this.api, entradas });
        this.almacen.guardarAjuste(this.pendiente, 'no'); this.aviso.set('');
      }
      catch {
        this.entradas.set([]);
        try { await this.almacen.borrar(this.clave); } catch { /* Se informa el fallo; la consulta en línea sigue disponible. */ }
        this.aviso.set('No pudimos guardar la copia. Revisá el espacio disponible; la consulta en línea sigue funcionando.');
      }
    });
    return this.cola;
  }
  async recuperar<T>(error: unknown, obtener: () => T | undefined): Promise<T> {
    await this.lista; await this.cola;
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      await this.invalidarAcceso(); throw error;
    }
    if (!(error instanceof HttpErrorResponse) || error.status !== 0 || !this.habilitada() || !this.disponibleEnArranque()) throw error;
    const datos = obtener();
    if (datos === undefined) throw error;
    this.modoCopia.set(true); return datos;
  }
  pagina(q: string, estado: EstadoLectura | '', pagina: number, tamano: number): Pagina<Libro> | undefined {
    if (!this.entradas().length) return undefined;
    const texto = q.trim().toLocaleLowerCase();
    const libros = this.entradas().map(e => e.libro).filter(l => (!estado || l.estado === estado)
      && `${l.titulo} ${l.autores.join(' ')}`.toLocaleLowerCase().includes(texto));
    return { elementos: libros.slice((pagina - 1) * tamano, pagina * tamano), pagina, tamano,
      totalElementos: libros.length, totalPaginas: Math.ceil(libros.length / tamano) };
  }
  detalle(id: string): DetalleLibro | undefined { return this.entradas().find(e => e.libro.id === id)?.detalle ?? undefined; }
  resumen(): ResumenLecturas | undefined {
    if (!this.entradas().length) return undefined;
    const conteos: ResumenLecturas['conteos'] = { PENDIENTE: 0, LEYENDO: 0, PAUSADO: 0, TERMINADO: 0 };
    this.entradas().forEach(e => conteos[e.libro.estado]++);
    return { conteos, lecturasActivas: this.entradas().filter(e => e.libro.estado === 'LEYENDO' && e.detalle).slice(0, 3).map(e => e.detalle!) };
  }
}
