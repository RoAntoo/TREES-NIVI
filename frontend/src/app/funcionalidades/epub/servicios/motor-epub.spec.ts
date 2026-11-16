import { TestBed } from '@angular/core/testing';
import { MotorEpub, RECURSOS_MOTOR_EPUB } from './motor-epub';
import { preferenciasIniciales, ProgresoEpub } from '../modelos/libro-epub';

const simulado = (() => {
  const cfi = 'epubcfi(/6/2!/4/2/1:12)';
  const ubicacion = { start:{cfi,href:'cap.xhtml',index:0}, end:{cfi,href:'cap.xhtml',index:0} };
  const eventos: Record<string, (valor: typeof ubicacion) => void> = {};
  let terminarCalculo: () => void = () => undefined;
  const vista = {
    hooks:{content:{register:vi.fn()}}, themes:{default:vi.fn()},
    on:vi.fn((nombre: string, callback: (valor: typeof ubicacion) => void) => { eventos[nombre] = callback; }),
    display:vi.fn(async () => undefined), next:vi.fn(async () => undefined), prev:vi.fn(async () => undefined),
    reportLocation:vi.fn(async () => eventos['relocated']?.(ubicacion)), currentLocation:vi.fn(() => ubicacion),
    getContents:vi.fn(() => []), resize:vi.fn(), flow:vi.fn(), epubcfi:{compare:vi.fn(() => 0)}
  };
  const libro = {
    open:vi.fn(async (): Promise<void> => undefined), ready:Promise.resolve(),
    navigation:{toc:[{href:'cap.xhtml',label:'Capítulo uno',subitems:[]}]}, spine:{each:vi.fn()},
    renderTo:vi.fn(() => vista), getRange:vi.fn(async () => ({})), destroy:vi.fn(),
    locations:{ length:vi.fn(() => 10), percentageFromCfi:vi.fn(() => .42),
      generate:vi.fn(() => new Promise<void>(resolve => { terminarCalculo = resolve; })) }
  };
  return {cfi,ubicacion,eventos,vista,libro,terminar:() => terminarCalculo()};
})();

describe('Contrato del motor EPUB', () => {
  let motor: MotorEpub;
  const cambio = vi.fn();
  const aviso = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks(); cambio.mockClear(); aviso.mockClear();
    vi.stubGlobal('ResizeObserver',class { observe() { /* Sin diseño real en una prueba unitaria. */ } disconnect() { /* Liberación. */ } });
    TestBed.configureTestingModule({providers:[MotorEpub, {provide:RECURSOS_MOTOR_EPUB,useValue:{
      cargar:async () => () => simulado.libro, preparar:async () => ({contenido:new ArrayBuffer(1)})
    }}]}); motor = TestBed.inject(MotorEpub);
  });
  afterEach(() => { motor.cerrar(); vi.unstubAllGlobals(); });
  const abrir = (guardado?: ProgresoEpub) => motor.abrir(new ArrayBuffer(1),document.createElement('div'),preferenciasIniciales,guardado,cambio,aviso);
  it('no publica un porcentaje parcial mientras se calculan las ubicaciones', async () => {
    await abrir(); expect(cambio.mock.lastCall?.[0].porcentaje).toBeUndefined();
    simulado.terminar(); await Promise.resolve();
    expect(cambio.mock.lastCall?.[0].porcentaje).toBe(42);
  });
  it('conserva el CFI lógico al cambiar fuente y tema y descarta eventos tras cerrar', async () => {
    const guardado: ProgresoEpub = {cfi:simulado.cfi,hrefCapitulo:'cap.xhtml',capitulo:'Capítulo uno',actualizadoEn:'2026-11-15T12:00:00Z',versionMotor:'prueba'};
    await abrir(guardado); await motor.aplicar({...preferenciasIniciales,tamanoFuente:28,tema:'oscuro'});
    expect(simulado.vista.display).toHaveBeenLastCalledWith(guardado.cfi);
    expect(cambio.mock.lastCall?.[0].cfi).toBe(guardado.cfi);
    motor.cerrar(); cambio.mockClear(); simulado.eventos['relocated'](simulado.ubicacion); expect(cambio).not.toHaveBeenCalled();
  });
  it('usa el capítulo de respaldo si el CFI ya no encuentra un rango', async () => {
    simulado.libro.getRange.mockRejectedValueOnce(new Error('No existe'));
    await abrir({cfi:simulado.cfi,hrefCapitulo:'cap.xhtml',capitulo:'Capítulo uno',actualizadoEn:'2026-11-15T12:00:00Z',versionMotor:'prueba'});
    expect(simulado.vista.display).toHaveBeenCalledWith('cap.xhtml');
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('capítulo guardado'));
  });
  it('cambia a cascada y vuelve a páginas conservando el CFI',async () => {
    await abrir();
    await motor.aplicar({...preferenciasIniciales,navegacion:'vertical'});
    expect(simulado.vista.flow).toHaveBeenLastCalledWith('scrolled-continuous');
    expect(simulado.vista.display).toHaveBeenLastCalledWith(simulado.cfi);
    await motor.aplicar({...preferenciasIniciales,navegacion:'toques'});
    expect(simulado.vista.flow).toHaveBeenLastCalledWith('paginated');
    expect(simulado.vista.display).toHaveBeenLastCalledWith(simulado.cfi);
  });
  it('salir durante una apertura espera su finalización antes de liberar el libro', async () => {
    let terminar: () => void = () => undefined;
    simulado.libro.open.mockImplementationOnce(() => new Promise<void>(resolve => { terminar = resolve; }));
    const apertura = abrir(); await vi.waitFor(() => expect(simulado.libro.open).toHaveBeenCalled());
    motor.cerrar(); expect(simulado.libro.destroy).not.toHaveBeenCalled();
    terminar(); await apertura; await Promise.resolve();
    expect(simulado.libro.renderTo).not.toHaveBeenCalled(); expect(simulado.libro.destroy).toHaveBeenCalledTimes(1);
  });
});
