export type EstadoLectura = 'PENDIENTE' | 'LEYENDO' | 'PAUSADO' | 'TERMINADO';
export type OrigenLibro = 'MANUAL' | 'OPEN_LIBRARY';

export interface MetadatosLibro {
  titulo: string;
  autores: string[];
  isbn: string | null;
  idEdicionExterna: string | null;
  idObraExterna: string | null;
  urlPortada: string | null;
  totalPaginas: number | null;
}
export interface Libro extends MetadatosLibro {
  id: string;
  paginaActual: number;
  estado: EstadoLectura;
  origen: OrigenLibro;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
  terminadoEn: string | null;
  porcentaje: number | null;
}
export interface RegistroLectura {
  id: string;
  libroId: string;
  paginaAnterior: number;
  paginaActual: number;
  nota: string | null;
  creadoEn: string;
  idOperacion: string;
}
export interface DetalleLibro { libro: Libro; ultimoRegistro: RegistroLectura | null }
export interface EscrituraLibro { libro: Libro; registro: RegistroLectura | null; advertencias: string[] }
export interface Pagina<T> { elementos: T[]; pagina: number; tamano: number; totalElementos: number; totalPaginas: number }
export interface ResumenLecturas { conteos: Record<EstadoLectura, number>; lecturasActivas: DetalleLibro[] }
export interface AltaLibro { idOperacion: string; metadatos: MetadatosLibro; origen: OrigenLibro }
export interface AvanceLectura { idOperacion: string; versionLibro: number; paginaActual: number; nota: string | null }
export interface CandidatoLibro extends MetadatosLibro { enlaceFuente: string }
export interface EdicionCatalogo { libro: CandidatoLibro; idiomas: string[]; editorial: string | null; publicacion: string | null }
export interface PaginaEdiciones { elementos: EdicionCatalogo[]; pagina: number; tamano: number; totalElementos: number; haySiguiente: boolean }
export interface PaginaCatalogo {
  elementos: CandidatoLibro[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalEstimado: boolean;
  haySiguiente: boolean;
}

export const nombresEstado: Record<EstadoLectura, string> = {
  PENDIENTE: 'Pendiente', LEYENDO: 'Leyendo', PAUSADO: 'Pausado', TERMINADO: 'Terminado'
};
export const metadatosVacios = (): MetadatosLibro => ({
  titulo: '', autores: [], isbn: null, idEdicionExterna: null, idObraExterna: null, urlPortada: null, totalPaginas: null
});
export function extraerMetadatos(libro: MetadatosLibro): MetadatosLibro {
  return { titulo: libro.titulo, autores: [...libro.autores], isbn: libro.isbn, idEdicionExterna: libro.idEdicionExterna,
    idObraExterna: libro.idObraExterna, urlPortada: libro.urlPortada, totalPaginas: libro.totalPaginas };
}
