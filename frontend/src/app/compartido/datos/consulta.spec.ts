import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Consulta } from './consulta';

describe('Consultas y refresco Ionic', () => {
  it('completa el refresco tanto con éxito como ante error', () => {
    const consulta = new Consulta<string>(); const complete = vi.fn().mockResolvedValue(undefined);
    consulta.cargar(of('resultado'), { complete }); expect(complete).toHaveBeenCalledTimes(1); expect(consulta.datos()).toBe('resultado');
    consulta.cargar(throwError(() => new Error('Fallo simulado')), { complete }); expect(complete).toHaveBeenCalledTimes(2);
    expect(consulta.error()).not.toBeNull(); expect(consulta.cargando()).toBe(false);
  });
  it('cancela una búsqueda anterior y no deja aplicar resultados obsoletos', () => {
    const consulta = new Consulta<string>(); const anterior = new Subject<string>(); const actual = new Subject<string>();
    const complete = vi.fn().mockResolvedValue(undefined); consulta.cargar(anterior, { complete }); consulta.cargar(actual);
    anterior.next('viejo'); actual.next('nuevo'); expect(consulta.datos()).toBe('nuevo'); expect(complete).toHaveBeenCalledTimes(1);
    consulta.cancelar(); expect(consulta.cargando()).toBe(false);
  });
  it('no conserva un libro anterior cuando el servidor informa que fue eliminado', () => {
    const consulta = new Consulta<string>(); consulta.cargar(of('Libro con nota'));
    consulta.cargar(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(consulta.datos()).toBeNull(); expect(consulta.error()?.estado).toBe(404);
  });
  it.each([401, 403])('retira los datos de la vista si el servidor responde %i', estado => {
    const consulta = new Consulta<string>(); consulta.cargar(of('Libro con nota'));
    consulta.cargar(throwError(() => new HttpErrorResponse({ status: estado })));
    expect(consulta.datos()).toBeNull(); expect(consulta.error()?.estado).toBe(estado);
  });
});
