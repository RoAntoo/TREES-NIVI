import { TestBed } from '@angular/core/testing';
import { AlmacenamientoLocal } from './almacenamiento-local';
import { Preferencias } from './preferencias';

describe('Apariencia persistida y recuperación del almacenamiento', () => {
  afterEach(() => { document.documentElement.classList.remove('ion-palette-dark'); document.documentElement.style.colorScheme = ''; vi.unstubAllGlobals(); });
  it('recupera oscuro y permite forzar claro aunque el sistema sea oscuro', () => {
    const guardar = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn() }));
    TestBed.configureTestingModule({ providers: [{ provide: AlmacenamientoLocal, useValue: { leerAjuste: () => 'oscuro', guardarAjuste: guardar } }] });
    const preferencias = TestBed.inject(Preferencias);
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
    preferencias.cambiar('claro'); expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
    expect(guardar).toHaveBeenCalledWith('nivi.apariencia.v1', 'claro');
  });
  it('aplica la elección en memoria si el dispositivo rechaza guardarla', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
    TestBed.configureTestingModule({ providers: [{ provide: AlmacenamientoLocal, useValue: { leerAjuste: () => null, guardarAjuste: () => { throw new Error('Sin espacio'); } } }] });
    const preferencias = TestBed.inject(Preferencias); preferencias.cambiar('oscuro');
    expect(preferencias.apariencia()).toBe('oscuro'); expect(preferencias.aviso()).toContain('no se pudo guardar');
  });
});
