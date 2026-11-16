import { Libro, RegistroLectura } from '../funcionalidades/biblioteca/modelos/biblioteca';

export function libroPrueba(cambios: Partial<Libro> = {}): Libro {
  return { id: '9425c038-255b-4db0-a4e6-3af4a334f26a', titulo: 'Una historia de prueba', autores: ['Autora ficticia'],
    isbn: null, idEdicionExterna: null, idObraExterna: null, urlPortada: null, totalPaginas: 120,
    paginaActual: 20, estado: 'LEYENDO', origen: 'MANUAL', version: 3,
    creadoEn: '2026-11-14T12:00:00Z', actualizadoEn: '2026-11-14T13:00:00Z', terminadoEn: null, porcentaje: 100 * 20 / 120, ...cambios };
}
export function registroPrueba(cambios: Partial<RegistroLectura> = {}): RegistroLectura {
  return { id: '7cbd090c-712a-4b70-a73f-cf45764c6115', libroId: libroPrueba().id, paginaAnterior: 10, paginaActual: 20,
    nota: 'La hermana llegó a la estación.', creadoEn: '2026-11-14T13:00:00Z', idOperacion: '11111111-1111-4111-8111-111111111111', ...cambios };
}
