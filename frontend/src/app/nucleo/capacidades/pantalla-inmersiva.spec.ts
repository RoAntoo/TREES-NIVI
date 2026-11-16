import { TestBed } from '@angular/core/testing';
import { BARRAS_LECTOR, PantallaInmersiva } from './pantalla-inmersiva';
describe('Barras del sistema durante la lectura',() => {
  it('restaura las barras al salir aunque el ocultado anterior siga en curso',async () => {
    let terminar!:() => void;
    const ocultar = vi.fn(() => new Promise<void>(resolve => {terminar = resolve;})), mostrar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({providers:[{provide:BARRAS_LECTOR,useValue:{disponible:() => true,ocultar,mostrar}}]});
    const pantalla = TestBed.inject(PantallaInmersiva), ocultado = pantalla.cambiar(true), restaurado = pantalla.cambiar(false);
    await vi.waitFor(() => expect(ocultar).toHaveBeenCalledOnce()); expect(mostrar).not.toHaveBeenCalled();
    terminar(); await Promise.all([ocultado,restaurado]); expect(mostrar).toHaveBeenCalledOnce();
  });
  it('no llama APIs Android al usar la aplicación web',async () => {
    const ocultar = vi.fn(), mostrar = vi.fn();
    TestBed.configureTestingModule({providers:[{provide:BARRAS_LECTOR,useValue:{disponible:() => false,ocultar,mostrar}}]});
    await TestBed.inject(PantallaInmersiva).cambiar(true); expect(ocultar).not.toHaveBeenCalled(); expect(mostrar).not.toHaveBeenCalled();
  });
});
