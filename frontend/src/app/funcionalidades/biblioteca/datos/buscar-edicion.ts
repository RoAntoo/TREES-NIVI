import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiBiblioteca } from './api-biblioteca';
import { Libro, MetadatosLibro } from '../modelos/biblioteca';
import { normalizarIsbn } from '../../../compartido/validadores/validadores-lectura';

function isbn13(valor: string | null): string | null {
  const isbn = valor ? normalizarIsbn(valor) : null;
  if (!isbn || isbn.length === 13) return isbn;
  const base = '978' + isbn.slice(0, 9);
  const suma = [...base].reduce((total, c, i) => total + Number(c) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - suma % 10) % 10);
}

/** El contrato no ofrece un endpoint de edición existente: recorrer páginas y comparar identidad exacta. */
@Injectable({ providedIn: 'root' })
export class BuscarEdicion {
  private readonly biblioteca = inject(ApiBiblioteca);
  async existente(datos: MetadatosLibro): Promise<Libro | null> {
    const isbn = isbn13(datos.isbn);
    if (!isbn && !datos.idEdicionExterna) return null;
    for (let pagina = 1; ; pagina++) {
      const respuesta = await firstValueFrom(this.biblioteca.listar('', '', pagina, 50));
      const encontrado = respuesta.elementos.find(libro =>
        (isbn !== null && isbn13(libro.isbn) === isbn) ||
        (!!datos.idEdicionExterna && libro.idEdicionExterna === datos.idEdicionExterna));
      if (encontrado) return encontrado;
      if (pagina >= respuesta.totalPaginas) return null;
    }
  }
}
