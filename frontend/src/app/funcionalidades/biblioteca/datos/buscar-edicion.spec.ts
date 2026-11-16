import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiBiblioteca } from './api-biblioteca';
import { BuscarEdicion } from './buscar-edicion';
import { extraerMetadatos } from '../modelos/biblioteca';
import { libroPrueba } from '../../../pruebas/datos-lectura';

describe('Encontrar edición guardada sin cambiar el contrato', () => {
  const listar = vi.fn();
  beforeEach(() => {
    listar.mockReset(); TestBed.configureTestingModule({ providers: [{ provide: ApiBiblioteca, useValue: { listar } }] });
  });
  it('encuentra ISBN-10 equivalente al ISBN-13 en otra página, sin confundir títulos', async () => {
    const existente = libroPrueba({ isbn: '0140328726' });
    listar.mockReturnValueOnce(of({ elementos: [libroPrueba({ isbn: '9780306406157' })], totalPaginas: 2 }))
      .mockReturnValueOnce(of({ elementos: [existente], totalPaginas: 2 }));
    expect(await TestBed.inject(BuscarEdicion).existente(extraerMetadatos(libroPrueba({ isbn: '9780140328721' })))).toEqual(existente);
    expect(listar).toHaveBeenCalledTimes(2);
  });
  it('reconoce edición externa aunque falte ISBN', async () => {
    const existente = libroPrueba({ idEdicionExterna: 'OL123M' }); listar.mockReturnValue(of({ elementos: [existente], totalPaginas: 1 }));
    expect(await TestBed.inject(BuscarEdicion).existente(extraerMetadatos(existente))).toEqual(existente);
  });
  it('no adivina una edición por título ni recorre páginas si falta identidad', async () => {
    expect(await TestBed.inject(BuscarEdicion).existente(extraerMetadatos(libroPrueba()))).toBeNull();
    expect(listar).not.toHaveBeenCalled();
  });
});
