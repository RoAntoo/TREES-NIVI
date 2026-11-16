import { TestBed } from '@angular/core/testing';
import { CAMARA_ISBN, EscanerIsbn } from './escaner-isbn';

describe('Escáner ISBN con cámara simulada', () => {
  const leer = vi.fn(), disponible = vi.fn();
  beforeEach(() => {
    leer.mockReset(); disponible.mockReturnValue(true);
    TestBed.configureTestingModule({ providers: [{ provide: CAMARA_ISBN, useValue: { leer, disponible } }] });
  });
  it('no abre la cámara al construirse ni en navegador', async () => {
    disponible.mockReturnValue(false); const escaner = TestBed.inject(EscanerIsbn);
    expect(leer).not.toHaveBeenCalled();
    expect(await escaner.escanear()).toEqual({ tipo: 'no-disponible' }); expect(leer).not.toHaveBeenCalled();
  });
  it('normaliza un ISBN escaneado y libera la cámara', async () => {
    leer.mockResolvedValue({ ScanResult: '978-0-14-032872-1', format: 9 });
    const escaner = TestBed.inject(EscanerIsbn);
    expect(await escaner.escanear()).toEqual({ tipo: 'isbn', isbn: '9780140328721' }); expect(escaner.ocupado()).toBe(false);
  });
  it.each([
    ['4006381333931', 9], ['9780140328722', 9], ['9780140328721', 0], ['0140328726', 9]
  ])('rechaza producto, checksum inválido o formato ajeno: %s / %s', async (ScanResult, format) => {
    leer.mockResolvedValue({ ScanResult, format }); expect(await TestBed.inject(EscanerIsbn).escanear()).toEqual({ tipo: 'invalido' });
  });
  it.each([
    ['OS-PLUG-BARC-0006', 'cancelado'], ['OS-PLUG-BARC-0007', 'permiso-denegado'],
    ['UNAVAILABLE', 'no-disponible'], ['OS-PLUG-BARC-0009', 'error']
  ])('interpreta %s y permite otro intento', async (code, tipo) => {
    leer.mockRejectedValueOnce({ code }).mockResolvedValueOnce({ ScanResult: '9780140328721', format: 9 });
    const escaner = TestBed.inject(EscanerIsbn);
    expect(await escaner.escanear()).toEqual({ tipo }); expect(escaner.ocupado()).toBe(false);
    expect((await escaner.escanear()).tipo).toBe('isbn');
  });
  it('trata el resultado vacío como cancelación', async () => {
    leer.mockResolvedValue({ ScanResult: '', format: 9 });
    expect(await TestBed.inject(EscanerIsbn).escanear()).toEqual({ tipo: 'cancelado' });
  });
  it('evita dos cámaras simultáneas', async () => {
    let resolver!: (valor: { ScanResult: string; format: number }) => void;
    leer.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
    const escaner = TestBed.inject(EscanerIsbn), primero = escaner.escanear();
    expect(await escaner.escanear()).toEqual({ tipo: 'ocupado' }); expect(leer).toHaveBeenCalledTimes(1);
    resolver({ ScanResult: '', format: 9 }); await primero; expect(escaner.ocupado()).toBe(false);
  });
});
