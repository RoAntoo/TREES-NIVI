import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CONFIGURACION_API } from '../../nucleo/configuracion/configuracion-api';
import { CandidatoLibro, PaginaCatalogo, PaginaEdiciones } from '../biblioteca/modelos/biblioteca';
import { normalizarIsbn } from '../../compartido/validadores/validadores-lectura';

@Injectable({ providedIn: 'root' })
export class ApiCatalogo {
  private readonly http = inject(HttpClient);
  private readonly base = inject(CONFIGURACION_API).url;
  buscar(q: string, pagina = 1) {
    return this.http.get<PaginaCatalogo>(`${this.base}/catalogo/busqueda`, { params: { q: q.trim(), pagina, tamano: 10 } });
  }
  porIsbn(isbn: string) {
    const normalizado = normalizarIsbn(isbn);
    if (!normalizado) throw new Error('ISBN inválido.');
    return this.http.get<CandidatoLibro>(`${this.base}/catalogo/isbn/${normalizado}`);
  }
  ediciones(idObra: string, pagina = 1) {
    if (idObra.length > 40 || !/^OL\d+W$/.test(idObra)) throw new Error('Obra inválida.');
    return this.http.get<PaginaEdiciones>(`${this.base}/catalogo/obras/${idObra}/ediciones`, { params: { pagina, tamano: 10 } });
  }
  porEdicion(idEdicion: string) {
    if (idEdicion.length > 40 || !/^OL\d+M$/.test(idEdicion)) throw new Error('Edición inválida.');
    return this.http.get<CandidatoLibro>(`${this.base}/catalogo/ediciones/${idEdicion}`);
  }
}
