import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, reduce, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiBiblioteca } from './api-biblioteca';
import { EstadoLectura, Libro } from '../modelos/biblioteca';
import { LibroEpub } from '../../epub/modelos/libro-epub';
import { RepositorioEpub } from '../../epub/datos/repositorio-epub';

export interface EntradaColeccion {
  clave: string;
  tipo: 'fisico' | 'epub';
  titulo: string;
  autores: string[];
  portada: string | null;
  estado: EstadoLectura;
  porcentaje: number | null;
  detalle: string;
  actividadEn: string;
  agregadoEn: string;
  ruta: string[];
  epub?: LibroEpub;
  fisico?: Libro;
}
export function entradaFisica(libro: Libro): EntradaColeccion {
  return { clave: `fisico:${libro.id}`, tipo:'fisico', titulo:libro.titulo, autores:libro.autores, portada:libro.urlPortada,
    estado:libro.estado, porcentaje:libro.estado === 'TERMINADO' ? 100 : libro.porcentaje,
    detalle:libro.totalPaginas ? `Página ${libro.paginaActual} de ${libro.totalPaginas}` : `Última página registrada: ${libro.paginaActual}`,
    actividadEn:libro.actualizadoEn, agregadoEn:libro.creadoEn, ruta:['/app/biblioteca',libro.id],fisico:libro };
}
export function entradaDigital(libro: LibroEpub): EntradaColeccion {
  return { clave:`epub:${libro.id}`, tipo:'epub', titulo:libro.titulo, autores:libro.autores, portada:libro.portada ?? null,
    estado:libro.progreso?.terminado || libro.progreso?.porcentaje === 100 ? 'TERMINADO' : libro.progreso ? 'LEYENDO' : 'PENDIENTE',
    porcentaje:libro.progreso?.terminado ? 100 : libro.progreso?.porcentaje ?? null,
    detalle:libro.progreso?.capitulo || 'Listo para empezar', actividadEn:libro.ultimaLecturaEn ?? libro.importadoEn,
    agregadoEn:libro.importadoEn, ruta:['/lector',libro.id], epub:libro };
}
export type OrdenColeccion = 'actividad' | 'agregados' | 'titulo';
export function ordenarColeccion(entradas: EntradaColeccion[], orden:OrdenColeccion = 'actividad'): EntradaColeccion[] {
  return [...entradas].sort((a,b) => (orden === 'titulo' ? a.titulo.localeCompare(b.titulo,'es',{sensitivity:'base'}) :
    orden === 'agregados' ? b.agregadoEn.localeCompare(a.agregadoEn) : b.actividadEn.localeCompare(a.actividadEn)) || a.clave.localeCompare(b.clave));
}

/** Combina vistas en el cliente; los archivos y avances EPUB conservan su almacén local. */
@Injectable({providedIn:'root'})
export class ColeccionLecturas {
  private readonly api = inject(ApiBiblioteca);
  readonly epub = inject(RepositorioEpub);
  private readonly fisicos = signal<Libro[]>([]);
  readonly errorEpub = signal('');
  readonly entradas = computed(() => ordenarColeccion([
    ...this.fisicos().map(entradaFisica), ...this.epub.libros().map(entradaDigital)
  ]));
  readonly recientes = computed(() => this.entradas().slice(0,3));
  readonly conteos = computed(() => {
    const conteos: Record<EstadoLectura,number> = {PENDIENTE:0,LEYENDO:0,PAUSADO:0,TERMINADO:0};
    this.entradas().forEach(l => conteos[l.estado]++); return conteos;
  });
  constructor() {
    void this.epub.listo.catch(() => this.errorEpub.set('No pudimos recuperar tus EPUB. Revisá el espacio disponible y volvé a abrir la app.'));
  }
  quitarFisico(id:string):void { this.fisicos.update(libros => libros.filter(l => l.id !== id)); }
  consultar(): Observable<Libro[]> {
    // El servidor ordena por alta: se recorren todas sus páginas antes de ordenar
    // por actividad. Así un avance reciente en un libro antiguo también aparece.
    return this.api.listar('', '', 1, 50).pipe(
      expand(p => p.pagina < p.totalPaginas ? this.api.listar('', '', p.pagina + 1, 50) : EMPTY),
      reduce((libros,p) => [...libros,...p.elementos], [] as Libro[]),
      tap({next:libros => this.fisicos.set(libros), error:(error:unknown) => {
        if (error instanceof HttpErrorResponse && [401,403,404].includes(error.status)) this.fisicos.set([]);
      }})
    );
  }
}
