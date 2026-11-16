import { TestBed } from '@angular/core/testing';
import { RepositorioEpub } from '../datos/repositorio-epub';
import { ProgresoLector } from './progreso-epub';
import { ProgresoEpub } from '../modelos/libro-epub';

const ubicacion: ProgresoEpub = { cfi:'epubcfi(/6/2!/4/8/1:35)', hrefCapitulo:'cap.xhtml', capitulo:'Capítulo', porcentaje:42, actualizadoEn:'2026-11-15T15:00:00Z', versionMotor:'prueba' };
describe('Recuperación y ciclo de vida del lector', () => {
  let servicio: ProgresoLector;
  const guardar = vi.fn();
  beforeEach(async () => {
    localStorage.clear(); guardar.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers:[ProgresoLector, {provide:RepositorioEpub, useValue:{progreso:guardar}}] });
    servicio = TestBed.inject(ProgresoLector); await servicio.iniciar('uno');
  });
  afterEach(async () => { await servicio.cerrar(); localStorage.clear(); });
  it('recupera el último CFI del diario inmediato aun sin esperar una escritura asíncrona', () => {
    servicio.actualizar(ubicacion);
    expect(servicio.recuperar({...ubicacion, cfi:'epubcfi(/6/2!/4/2/1:0)',actualizadoEn:'2026-11-15T14:00:00Z'})).toEqual(ubicacion);
  });
  it('guarda al ocultarse la app y no depende de cerrar el lector', async () => {
    servicio.actualizar(ubicacion);
    vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden'); document.dispatchEvent(new Event('visibilitychange'));
    expect(guardar).toHaveBeenCalledWith('uno',ubicacion); await servicio.guardar(); vi.restoreAllMocks();
  });
  it('informa un fallo de persistencia y conserva el pendiente para reintentar', async () => {
    guardar.mockRejectedValueOnce(new Error('Sin espacio')); servicio.actualizar(ubicacion); await servicio.guardar();
    expect(servicio.aviso()).toContain('No pudimos guardar');
    await servicio.guardar(); expect(guardar).toHaveBeenCalledTimes(2); expect(servicio.aviso()).toBe('');
  });
  it('descarta un diario corrupto o más antiguo que el registro principal', () => {
    localStorage.setItem('nivi.epub.posicion.uno','{roto'); expect(servicio.recuperar(ubicacion)).toEqual(ubicacion);
    localStorage.setItem('nivi.epub.posicion.uno',JSON.stringify({...ubicacion,actualizadoEn:'2026-11-15T12:00:00Z'}));
    expect(servicio.recuperar(ubicacion)).toEqual(ubicacion);
  });
});
