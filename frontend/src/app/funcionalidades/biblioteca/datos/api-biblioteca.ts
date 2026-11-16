import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, from, defer, throwError, concatMap, firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CopiaBiblioteca } from '../../../nucleo/almacenamiento/copia-biblioteca';
import { CONFIGURACION_API } from '../../../nucleo/configuracion/configuracion-api';
import { AltaLibro, AvanceLectura, DetalleLibro, EscrituraLibro, EstadoLectura, Libro, MetadatosLibro, Pagina, RegistroLectura, ResumenLecturas } from '../modelos/biblioteca';

@Injectable({ providedIn: 'root' })
export class ApiBiblioteca {
  private readonly http = inject(HttpClient);
  private readonly base = inject(CONFIGURACION_API).url;
  readonly copia = inject(CopiaBiblioteca);
  readonly sincronizando = signal(false);
  readonly revision = signal(0);
  actualizarVistas(): void { this.revision.update(valor => valor + 1); }
  listar(q = '', estado: EstadoLectura | '' = '', pagina = 1, tamano = 12): Observable<Pagina<Libro>> {
    let params = new HttpParams().set('q', q.trim()).set('pagina', pagina).set('tamano', tamano);
    if (estado) params = params.set('estado', estado);
    return this.lectura(this.http.get<Pagina<Libro>>(`${this.base}/libros`, { params }), datos => { void this.copia.guardarLibros(datos.elementos); }, () => this.copia.pagina(q, estado, pagina, tamano));
  }
  detalle(id: string): Observable<DetalleLibro> { return this.lectura(this.http.get<DetalleLibro>(`${this.base}/libros/${id}`), datos => { void this.copia.guardarLibros([datos.libro], [datos]); }, () => this.copia.detalle(id)).pipe(catchError(error => { if (error instanceof HttpErrorResponse && error.status === 404) void this.copia.quitar(id); return throwError(() => error); })); }
  resumen(): Observable<ResumenLecturas> { return this.lectura(this.http.get<ResumenLecturas>(`${this.base}/resumen`), datos => { void this.copia.guardarLibros(datos.lecturasActivas.map(d => d.libro), datos.lecturasActivas); }, () => this.copia.resumen()); }
  historial(id: string, pagina = 1): Observable<Pagina<RegistroLectura>> {
    return this.lectura(this.http.get<Pagina<RegistroLectura>>(`${this.base}/libros/${id}/registros`, { params: { pagina, tamano: 10 } }), () => undefined, () => undefined, false);
  }
  agregar(entrada: AltaLibro): Observable<EscrituraLibro> { return this.escritura(this.http.post<EscrituraLibro>(`${this.base}/libros`, entrada), datos => this.copia.guardarLibros([datos.libro], [{ libro: datos.libro, ultimoRegistro: datos.registro }])); }
  registrar(id: string, entrada: AvanceLectura): Observable<EscrituraLibro> { return this.escritura(this.http.post<EscrituraLibro>(`${this.base}/libros/${id}/registros`, entrada), datos => this.copia.guardarLibros([datos.libro], [{ libro: datos.libro, ultimoRegistro: datos.registro }])); }
  editar(id: string, versionLibro: number, metadatos: MetadatosLibro): Observable<Libro> {
    return this.escritura(this.http.put<Libro>(`${this.base}/libros/${id}/metadatos`, { versionLibro, metadatos }), datos => this.copia.guardarLibros([datos]));
  }
  estado(id: string, versionLibro: number, estado: EstadoLectura, confirmarFinalizacion = false): Observable<Libro> {
    return this.escritura(this.http.put<Libro>(`${this.base}/libros/${id}/estado`, { versionLibro, estado, confirmarFinalizacion }), datos => this.copia.guardarLibros([datos]));
  }
  eliminar(id: string, version: number): Observable<void> {
    return this.escritura(this.http.delete<void>(`${this.base}/libros/${id}`, { params: { version } }), () => this.copia.quitar(id));
  }
  async actualizarCopia(): Promise<void> {
    if (this.sincronizando() || !this.copia.habilitada()) return;
    const revision = this.revision(), generacion = this.copia.generacionActual;
    this.sincronizando.set(true);
    try {
      const pagina = await firstValueFrom(this.http.get<Pagina<Libro>>(`${this.base}/libros`, { params: { pagina: 1, tamano: 50 } }));
      const libros = [...pagina.elementos];
      if (pagina.totalPaginas > 1) {
        const segunda = await firstValueFrom(this.http.get<Pagina<Libro>>(`${this.base}/libros`, { params: { pagina: 2, tamano: 50 } }));
        libros.push(...segunda.elementos);
      }
      const detalles: DetalleLibro[] = [];
      // Cuatro consultas concurrentes como máximo; nunca guardar historial completo.
      for (let i = 0; i < libros.length; i += 4) {
        detalles.push(...await Promise.all(libros.slice(i, i + 4).map(l => firstValueFrom(this.http.get<DetalleLibro>(`${this.base}/libros/${l.id}`)))));
      }
      if (revision !== this.revision() || generacion !== this.copia.generacionActual || !this.copia.habilitada()) throw new Error('La biblioteca cambió durante la actualización. Reintentá.');
      this.copia.confirmarConexion();
      await this.copia.borrar();
      await this.copia.guardarLibros(detalles.map(d => d.libro), detalles);
      this.actualizarVistas();
    } catch (error) {
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) await this.copia.invalidarAcceso();
      throw error;
    } finally { this.sincronizando.set(false); }
  }
  private lectura<T>(peticion: Observable<T>, guardar: (datos: T) => void, local: () => T | undefined, confirmarConexion = true): Observable<T> {
    return peticion.pipe(tap(datos => { if (confirmarConexion) this.copia.confirmarConexion(); guardar(datos); }),
      catchError(error => from(this.copia.recuperar(error, local))));
  }
  private escritura<T>(peticion: Observable<T>, guardar: (datos: T) => Promise<void>): Observable<T> {
    return defer(() => {
      if (this.copia.bloqueada() || this.sincronizando()) return throwError(() => new HttpErrorResponse({ status: 503, error: { mensaje: 'Estás consultando una copia. Volvé a actualizar con conexión antes de guardar cambios.' } }));
      return peticion.pipe(concatMap(async datos => {
        this.copia.confirmarConexion(); await guardar(datos); this.actualizarVistas(); return datos;
      }), catchError(error => {
        if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) void this.copia.invalidarAcceso();
        return throwError(() => error);
      }));
    });
  }
}
