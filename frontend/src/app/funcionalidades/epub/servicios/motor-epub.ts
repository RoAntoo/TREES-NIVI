import { Injectable, InjectionToken, inject } from '@angular/core';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type { Location } from 'epubjs/types/rendition';
import type Contents from 'epubjs/types/contents';
import type { NavItem } from 'epubjs/types/navigation';
import { CapituloEpub, PreferenciasLector, ProgresoEpub } from '../modelos/libro-epub';
import { prepararEpub } from './importador-epub';
import { AccionLector, registrarGestos } from './gestos-lector';

export const coloresLector = {
  claro: { fondo: '#fffdf9', texto: '#24221f' },
  sepia: { fondo: '#f3e5c9', texto: '#3d2d1e' },
  oscuro: { fondo: '#101010', texto: '#e9e5df' }
};

export const RECURSOS_MOTOR_EPUB = new InjectionToken<{
  cargar: () => Promise<typeof import('epubjs')['default']>;
  preparar: typeof prepararEpub;
}>('Recursos locales del motor EPUB', {
  providedIn: 'root',
  factory: () => ({ cargar: async () => (await import('epubjs')).default, preparar: prepararEpub })
});

/** Único punto de contacto con epub.js; instancia privada de cada lector. */
@Injectable()
export class MotorEpub {
  private readonly recursos = inject(RECURSOS_MOTOR_EPUB);
  private libro?: Book;
  private vista?: Rendition;
  private contenedor?: HTMLElement;
  private observador?: ResizeObserver;
  private preferencias?: PreferenciasLector;
  private ultima?: Location;
  private ancla?: string;
  private listo = false;
  private porcentajeListo = false;
  private activo = false;
  private reajustando = false;
  private sesion = 0;
  private apertura?: Promise<unknown>;
  private cola: Promise<unknown> = Promise.resolve();
  private cambio?: (progreso: ProgresoEpub) => void;
  private aviso?: (texto: string) => void;
  private capitulos: CapituloEpub[] = [];

  async abrir(datos: ArrayBuffer, elemento: HTMLElement, preferencias: PreferenciasLector, guardado: ProgresoEpub | undefined,
    cambio: (progreso: ProgresoEpub) => void, aviso: (texto: string) => void, interaccion?: (accion:AccionLector) => void): Promise<CapituloEpub[]> {
    const sesion = ++this.sesion;
    this.activo = true; this.listo = false; this.porcentajeListo = false; this.cambio = cambio; this.aviso = aviso; this.contenedor = elemento;
    const [crearLibro, seguro] = await Promise.all([this.recursos.cargar(), this.recursos.preparar(datos)]);
    if (!this.activo || sesion !== this.sesion) return [];
    const libro = this.libro = crearLibro({ replacements: 'blobUrl', requestMethod: async () => { throw new Error('Los recursos externos están bloqueados.'); } });
    const apertura = libro.open(seguro.contenido, 'binary').then(() => libro.ready);
    this.apertura = apertura;
    try { await apertura; } finally { if (this.apertura === apertura) this.apertura = undefined; }
    if (!this.activo || sesion !== this.sesion) return [];
    const aplanar = (items: NavItem[], nivel = 0): CapituloEpub[] => items.flatMap(i => [{ href: i.href, titulo: i.label.trim(), nivel }, ...aplanar(i.subitems ?? [], nivel + 1)]);
    this.capitulos = aplanar(libro.navigation.toc);
    if (!this.capitulos.length) libro.spine.each((seccion: { href: string; index: number }) => {
      this.capitulos.push({ href: seccion.href, titulo: `Sección ${seccion.index + 1}`, nivel: 0 });
    });
    const vista = this.vista = libro.renderTo(elemento, { width: elemento.clientWidth, height: elemento.clientHeight, manager:'continuous', spread:'none', flow:preferencias.navegacion === 'vertical' ? 'scrolled-continuous' : 'paginated', allowScriptedContent:false });
    vista.hooks.content.register((contenido: Contents) => {
      const doc = contenido.document;
      registrarGestos(doc, elemento, () => this.preferencias?.navegacion ?? 'deslizar', accion => {
        if (this.activo && this.listo && sesion === this.sesion) interaccion?.(accion);
      }, () => { if (this.activo && !this.reajustando && sesion === this.sesion) this.ancla = undefined; });
      if (this.preferencias) this.estilizar(contenido, this.preferencias);
      doc.addEventListener('click', evento => {
        const enlace = (evento.target as Element)?.closest('a');
        if (enlace) {
          const href = enlace.getAttribute('href');
          if (href && /^(https?:|\/\/|mailto:|tel:)/i.test(href)) { evento.preventDefault(); evento.stopImmediatePropagation(); aviso('Los enlaces externos no se abren desde este lector sin conexión.'); }
          else if (href) this.ancla = undefined;
        }
      }, true);
      doc.addEventListener('keydown', evento => {
        if (evento.key === 'ArrowRight') { evento.preventDefault(); void this.avanzar().catch(() => aviso('No pudimos avanzar.')); }
        if (evento.key === 'ArrowLeft') { evento.preventDefault(); void this.retroceder().catch(() => aviso('No pudimos retroceder.')); }
      });
    });
    vista.on('relocated', (ubicacion: Location) => {
      if (!this.activo || sesion !== this.sesion || this.reajustando) return;
      this.ultima = ubicacion;
      if (this.listo) this.notificar();
    });
    this.preferencias = { ...preferencias };
    this.tema(preferencias);
    let restaurado = false;
    if (guardado?.cfi) {
      try {
        // Valida el rango antes de renderizar: epub.js puede dejar pendiente display
        // cuando recibe un CFI que apunta a nodos inexistentes.
        const rango = await libro.getRange(guardado.cfi);
        if (!this.activo || sesion !== this.sesion) return [];
        if (!rango) throw new Error('Posición no encontrada.');
        await this.situar(guardado.cfi);
        if (!this.activo || sesion !== this.sesion) return [];
        this.ancla = guardado.cfi; restaurado = true;
      } catch { /* Respaldo por capítulo. */ }
    }
    if (!this.activo || sesion !== this.sesion) return [];
    if (!restaurado && guardado?.hrefCapitulo) {
      try { await vista.display(guardado.hrefCapitulo); restaurado = true; aviso('Retomamos desde el capítulo guardado porque la posición exacta ya no era válida.'); } catch { /* Respaldo al comienzo. */ }
    }
    if (!restaurado) { await vista.display(); if (guardado) aviso('No pudimos recuperar la posición anterior. Abrimos el comienzo del libro.'); }
    if (!this.activo || sesion !== this.sesion) return [];
    this.listo = true;
    this.ultima = vista.currentLocation() as unknown as Location;
    await vista.reportLocation();
    this.notificar();
    // Porcentaje independiente de las pantallas visibles y de las páginas impresas.
    void libro.locations.generate(1200).then(() => {
      if (this.activo && sesion === this.sesion) { this.porcentajeListo = true; this.notificar(); }
    }).catch(() => { if (this.activo && sesion === this.sesion) aviso('El capítulo y la posición se guardan; no pudimos calcular el porcentaje.'); });
    let ancho = elemento.clientWidth, alto = elemento.clientHeight;
    this.observador = new ResizeObserver(() => {
      if (!this.activo || sesion !== this.sesion || !this.listo) return;
      if (ancho === elemento.clientWidth && alto === elemento.clientHeight) return;
      ancho = elemento.clientWidth; alto = elemento.clientHeight;
      void this.encolar(async () => {
        const cfi = this.ancla ?? this.ultima?.start.cfi;
        this.ancla = cfi;
        this.reajustando = true;
        try { vista.resize(elemento.clientWidth, elemento.clientHeight); if (cfi) await this.situar(cfi); }
        finally { this.reajustando = false; }
        await vista.reportLocation();
      }).catch(() => aviso('No pudimos ajustar la orientación. Tu última posición sigue guardada.'));
    });
    this.observador.observe(elemento);
    return this.capitulos;
  }
  private notificar(): void {
    const inicio = this.ultima?.start, libro = this.libro;
    if (!inicio?.cfi || !libro) return;
    const capitulo = this.capitulos.find(c => c.href.split('#')[0] === inicio.href.split('#')[0]);
    const cfi = this.ancla ?? inicio.cfi;
    const porcentaje = this.porcentajeListo && libro.locations.length() > 1 ? Math.min(100, Math.max(0, libro.locations.percentageFromCfi(cfi) * 100)) : undefined;
    this.cambio?.({ cfi, hrefCapitulo: inicio.href, capitulo: capitulo?.titulo || `Sección ${inicio.index + 1}`,
      porcentaje: Number.isFinite(porcentaje) ? porcentaje : undefined, terminado: this.ultima?.atEnd === true,
      actualizadoEn: new Date().toISOString(), versionMotor: 'epubjs-0.3.93/nivi-1' });
  }
  private encolar(accion: () => Promise<void>): Promise<void> {
    const sesion = this.sesion;
    const tarea = this.cola.catch(() => undefined).then(async () => { if (this.activo && sesion === this.sesion) await accion(); });
    this.cola = tarea; return tarea;
  }
  avanzar(): Promise<void> { return this.encolar(async () => { this.ancla = undefined; await this.vista?.next(); }); }
  retroceder(): Promise<void> { return this.encolar(async () => { this.ancla = undefined; await this.vista?.prev(); }); }
  mostrar(href: string): Promise<void> { return this.encolar(async () => { this.ancla = undefined; await this.vista?.display(href); }); }
  private async situar(cfi: string): Promise<void> {
    const vista = this.vista; if (!vista) return;
    await vista.display(cfi);
    const actual = vista.currentLocation() as unknown as Location;
    // Los límites de columna pueden redondearse al píxel anterior al restaurar.
    // Si el CFI queda fuera de esa pantalla, avanzar hasta incluirlo.
    if (this.preferencias?.navegacion !== 'vertical' && actual?.end?.cfi && vista.epubcfi.compare(cfi, actual.end.cfi) > 0) await vista.next();
  }
  aplicar(preferencias: PreferenciasLector): Promise<void> {
    return this.encolar(async () => {
      const cfi = this.ancla ?? this.ultima?.start.cfi;
      this.ancla = cfi;
      const cambiarFlujo = (this.preferencias?.navegacion === 'vertical') !== (preferencias.navegacion === 'vertical');
      this.reajustando = true; this.preferencias = { ...preferencias };
      try { if (cambiarFlujo) this.vista?.flow(preferencias.navegacion === 'vertical' ? 'scrolled-continuous' : 'paginated'); this.tema(preferencias); if (cfi) await this.situar(cfi); }
      finally { this.reajustando = false; }
      await this.vista?.reportLocation();
    });
  }
  private tema(p: PreferenciasLector): void {
    const colores = coloresLector[p.tema];
    if (this.contenedor) this.contenedor.style.background = colores.fondo;
    this.vista?.themes.default({
      'body': { 'font-size': `${p.tamanoFuente}px !important`, 'line-height': `${p.interlineado} !important`, 'color': `${colores.texto} !important`, 'background': `${colores.fondo} !important`, 'font-family': 'Georgia, serif !important' },
      '*': { 'color': `${colores.texto} !important` },
      'p, div, span, li, h1, h2, h3, h4, a': { 'color': `${colores.texto} !important`, 'line-height': `${p.interlineado} !important` },
      'img': { 'max-width': '100% !important', 'max-height': '80vh !important', 'object-fit': 'contain' }
    });
    // getContents devuelve un arreglo en tiempo de ejecución (los tipos publicados son incorrectos).
    const contenidos = this.vista?.getContents() as unknown as Contents[] | undefined;
    contenidos?.forEach(c => this.estilizar(c, p));
  }
  private estilizar(contenido: Contents, p: PreferenciasLector): void {
    contenido.document.documentElement.style.colorScheme = p.tema === 'oscuro' ? 'dark' : 'light';
    contenido.css('font-size', `${p.tamanoFuente}px`, true);
    contenido.css('line-height', String(p.interlineado), true);
    contenido.css('color', coloresLector[p.tema].texto, true);
    contenido.css('background-color', coloresLector[p.tema].fondo, true);
  }
  cerrar(): void {
    this.activo = false; this.listo = false; this.sesion++; this.observador?.disconnect();
    // Book.destroy también libera la rendition y todas las URL Blob del archivo.
    const libro = this.libro;
    if (libro) {
      if (this.apertura) void this.apertura.catch(() => undefined).then(() => libro.destroy());
      else libro.destroy();
    }
    this.libro = undefined; this.vista = undefined; this.ultima = undefined; this.ancla = undefined; this.cola = Promise.resolve();
  }
}
