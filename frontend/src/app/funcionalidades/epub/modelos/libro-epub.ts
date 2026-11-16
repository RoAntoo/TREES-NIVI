export type ModoPaso = 'deslizar' | 'toques' | 'botones' | 'vertical';
export interface PreferenciasLector {
  tamanoFuente: number;
  interlineado: number;
  tema: 'claro' | 'sepia' | 'oscuro';
  calidez: number;
  navegacion?: ModoPaso;
}
export const preferenciasIniciales: PreferenciasLector = { tamanoFuente: 20, interlineado: 1.6, tema: 'claro', calidez: 0 };
export interface ProgresoEpub {
  cfi: string;
  hrefCapitulo: string;
  capitulo: string;
  porcentaje?: number;
  actualizadoEn: string;
  versionMotor: string;
  terminado?: boolean;
}
export interface LibroEpub {
  id: string;
  titulo: string;
  autores: string[];
  nombreArchivoOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
  huellaSha256: string;
  referenciaArchivo: string;
  portada?: string;
  importadoEn: string;
  ultimaLecturaEn?: string;
  progreso?: ProgresoEpub;
  versionFormato: 1;
}
export interface EstadoEpub { version: 1; libros: LibroEpub[]; preferencias: PreferenciasLector }
export interface CapituloEpub { href: string; titulo: string; nivel: number }
export class EpubNoValido extends Error {}
