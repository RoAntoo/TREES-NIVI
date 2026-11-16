import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AlmacenamientoLocal } from './almacenamiento-local';
import { CopiaBiblioteca } from './copia-biblioteca';
import { CONFIGURACION_API } from '../configuracion/configuracion-api';
import { libroPrueba, registroPrueba } from '../../pruebas/datos-lectura';

describe('Copia de consulta voluntaria y acotada', () => {
  let objetos: Map<string, unknown>; let ajustes: Map<string, string>;
  let almacen: { leerAjuste: ReturnType<typeof vi.fn>; guardarAjuste: ReturnType<typeof vi.fn>; leer: ReturnType<typeof vi.fn>; guardar: ReturnType<typeof vi.fn>; borrar: ReturnType<typeof vi.fn> };
  const api = 'https://api.ejemplo.org/api/v1';
  const clave = `biblioteca.v1:${api}`;
  const fallo = () => new HttpErrorResponse({ status: 0 });
  const detalle = () => ({ libro: libroPrueba(), ultimoRegistro: registroPrueba() });
  beforeEach(() => {
    objetos = new Map(); ajustes = new Map();
    almacen = {
      leerAjuste: vi.fn((c: string) => ajustes.get(c) ?? null),
      guardarAjuste: vi.fn((c: string, v: string) => { ajustes.set(c, v); }),
      leer: vi.fn(async (c: string) => objetos.get(c)),
      guardar: vi.fn(async (c: string, v: unknown) => { objetos.set(c, structuredClone(v)); }),
      borrar: vi.fn(async (c: string) => { objetos.delete(c); })
    };
    TestBed.configureTestingModule({ providers: [{ provide: AlmacenamientoLocal, useValue: almacen }, { provide: CONFIGURACION_API, useValue: { url: api } }] });
  });
  async function iniciar(activar = true): Promise<CopiaBiblioteca> {
    const copia = TestBed.inject(CopiaBiblioteca); await copia.lista;
    if (activar) await copia.activar(true);
    return copia;
  }
  it('no guarda libros sin elección explícita', async () => {
    const copia = await iniciar(false); await copia.guardarLibros([libroPrueba()], [detalle()]);
    expect(almacen.guardar).not.toHaveBeenCalled(); expect(copia.entradas()).toEqual([]);
  });
  it('conserva solo 100 libros recientes y filtra/pagina exclusivamente esa cobertura', async () => {
    const copia = await iniciar();
    await copia.guardarLibros(Array.from({ length: 130 }, (_, i) => libroPrueba({ id: String(i), titulo: `Libro ${i}`, actualizadoEn: new Date(2026, 0, i + 1).toISOString() })));
    expect(copia.entradas()).toHaveLength(100); expect(copia.entradas()[0].libro.id).toBe('129');
    const pagina = copia.pagina('Autora ficticia', 'LEYENDO', 2, 12)!;
    expect(pagina.totalElementos).toBe(100); expect(pagina.elementos).toHaveLength(12);
    expect(copia.pagina('inexistente', '', 1, 12)?.totalElementos).toBe(0);
  });
  it('requiere servidor válido en este arranque, incluso con copia persistida', async () => {
    ajustes.set('nivi.copia.v1', 'si');
    objetos.set(clave, { version: 1, api, entradas: [{ libro: libroPrueba(), detalle: detalle(), guardadoEn: new Date().toISOString() }] });
    const copia = await iniciar(false);
    await expect(copia.recuperar(fallo(), () => copia.detalle(libroPrueba().id))).rejects.toBeInstanceOf(HttpErrorResponse);
    copia.confirmarConexion();
    expect(await copia.recuperar(fallo(), () => copia.detalle(libroPrueba().id))).toEqual(detalle());
    expect(copia.modoCopia()).toBe(true); expect(copia.bloqueada()).toBe(true);
  });
  it.each([401, 403])('un %i elimina la copia y revoca el arranque; no ofrece fallback', async status => {
    const copia = await iniciar(); copia.confirmarConexion(); await copia.guardarLibros([libroPrueba()], [detalle()]);
    await expect(copia.recuperar(new HttpErrorResponse({ status }), () => detalle())).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(copia.entradas()).toEqual([]); expect(objetos.has(clave)).toBe(false); expect(copia.disponibleEnArranque()).toBe(false);
  });
  it.each([404, 409, 429, 500])('un %i conserva la copia sin ocultar el error del servidor', async status => {
    const copia = await iniciar(); copia.confirmarConexion(); await copia.guardarLibros([libroPrueba()]);
    await expect(copia.recuperar(new HttpErrorResponse({ status }), () => detalle())).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(copia.entradas()).toHaveLength(1); expect(copia.modoCopia()).toBe(false);
  });
  it('descarta objetos corruptos sin romper la aplicación', async () => {
    ajustes.set('nivi.copia.v1', 'si'); objetos.set(clave, { version: 1, api, entradas: [{ libro: {} }] });
    const copia = await iniciar(false); expect(copia.entradas()).toEqual([]); expect(copia.aviso()).toBeTruthy(); expect(objetos.has(clave)).toBe(false);
  });
  it('un fallo de cuota invalida la copia anterior y mantiene la consulta en línea', async () => {
    const copia = await iniciar(); copia.confirmarConexion(); await copia.guardarLibros([libroPrueba()]);
    almacen.guardar.mockRejectedValueOnce(new DOMException('Cuota', 'QuotaExceededError'));
    await expect(copia.guardarLibros([libroPrueba({ titulo: 'Nuevo título' })])).resolves.toBeUndefined();
    expect(copia.entradas()).toEqual([]); expect(objetos.has(clave)).toBe(false); expect(copia.aviso()).toContain('espacio');
  });
  it('invalida un último registro desconocido al cambiar la versión y elimina libros confirmados', async () => {
    const copia = await iniciar(); await copia.guardarLibros([libroPrueba()], [detalle()]);
    await copia.guardarLibros([libroPrueba({ version: 4 })]); expect(copia.detalle(libroPrueba().id)).toBeUndefined();
    await copia.quitar(libroPrueba().id); expect(copia.entradas()).toEqual([]);
  });
  it('borrar espera escrituras pendientes y evita que la copia reaparezca', async () => {
    const copia = await iniciar();
    const guardado = copia.guardarLibros([libroPrueba()], [detalle()]);
    await copia.activar(false); await guardado;
    expect(copia.entradas()).toEqual([]); expect(objetos.has(clave)).toBe(false); expect(copia.habilitada()).toBe(false);
  });
  it('descarta una actualización interrumpida antes de mostrar datos', async () => {
    ajustes.set('nivi.copia.v1', 'si'); ajustes.set(`nivi.copia.pendiente:${api}`, 'si'); objetos.set(clave, { antiguo: true });
    const copia = await iniciar(false); expect(objetos.has(clave)).toBe(false); expect(copia.entradas()).toEqual([]);
  });
  it('una respuesta demorada no pisa una versión más reciente', async () => {
    const copia = await iniciar();
    await copia.guardarLibros([libroPrueba({ version: 4, titulo: 'Datos nuevos' })]);
    await copia.guardarLibros([libroPrueba({ version: 3, titulo: 'Datos viejos' })]);
    expect(copia.entradas()[0].libro.titulo).toBe('Datos nuevos');
  });
});
