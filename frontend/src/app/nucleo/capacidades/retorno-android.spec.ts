import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular/platform';
import { NavController } from '@ionic/angular/nav-controller';
import { RetornoAndroid, SALIDA_ANDROID } from './retorno-android';

describe('Atrás de Android al terminar la navegación', () => {
  let volver: () => Promise<void>;
  const registrar = vi.fn(), salir = vi.fn(), cancelar = vi.fn(), raiz = vi.fn(), atras = vi.fn();
  const router = { url: '/app/inicio' };
  let disponible = true;
  beforeEach(() => {
    disponible = true; router.url = '/app/inicio';
    registrar.mockReset().mockImplementation((_prioridad: number, accion: () => Promise<void>) => { volver = accion; return { unsubscribe: cancelar }; });
    salir.mockReset().mockResolvedValue(undefined); cancelar.mockReset(); raiz.mockReset().mockResolvedValue(true); atras.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [
      { provide: Platform, useValue: { backButton: { subscribeWithPriority: registrar } } },
      { provide: Router, useValue: router },
      { provide: NavController, useValue: { navigateRoot: raiz, navigateBack: atras } },
      { provide: SALIDA_ANDROID, useValue: { disponible: () => disponible, salir } }
    ] });
  });
  it('desde Inicio sale después de los handlers de modal, menú y navegación', async () => {
    TestBed.inject(RetornoAndroid).registrar(() => false);
    expect(registrar).toHaveBeenCalledWith(-1, expect.any(Function));
    await volver(); expect(salir).toHaveBeenCalledOnce(); expect(raiz).not.toHaveBeenCalled();
  });
  it('con una vista anterior permite que Ionic vuelva sin salir ni cambiar otra vez de ruta', async () => {
    TestBed.inject(RetornoAndroid).registrar(() => true);
    await volver(); expect(salir).not.toHaveBeenCalled(); expect(raiz).not.toHaveBeenCalled(); expect(atras).not.toHaveBeenCalled();
  });
  it.each(['/app/biblioteca', '/app/agregar', '/app/ajustes'])('desde la raíz %s vuelve a Inicio sin salir', async ruta => {
    router.url = ruta; TestBed.inject(RetornoAndroid).registrar(() => false);
    await volver(); expect(raiz).toHaveBeenCalledWith('/app/inicio', { replaceUrl: true }); expect(salir).not.toHaveBeenCalled();
  });
  it('un detalle abierto directamente vuelve a Biblioteca si no tiene pila anterior', async () => {
    router.url = '/app/biblioteca/libro-de-prueba'; TestBed.inject(RetornoAndroid).registrar(() => false);
    await volver(); expect(atras).toHaveBeenCalledWith('/app/biblioteca', { replaceUrl: true }); expect(salir).not.toHaveBeenCalled();
  });
  it('Inicio admite parámetros y fragmentos sin perder la salida nativa', async () => {
    router.url = '/app/inicio?aviso=prueba#lecturas'; TestBed.inject(RetornoAndroid).registrar(() => false);
    await volver(); expect(salir).toHaveBeenCalledOnce();
  });
  it('no registra salida de app en navegador u otra plataforma', () => {
    disponible = false; const limpiar = TestBed.inject(RetornoAndroid).registrar(() => false); limpiar();
    expect(registrar).not.toHaveBeenCalled(); expect(salir).not.toHaveBeenCalled();
  });
  it('libera la suscripción al destruir el contenedor', () => {
    const limpiar = TestBed.inject(RetornoAndroid).registrar(() => false); limpiar(); expect(cancelar).toHaveBeenCalledOnce();
  });
  it('no duplica una salida si llegan gestos mientras se está cerrando', async () => {
    let terminar!: () => void;
    salir.mockReturnValue(new Promise<void>(resolve => { terminar = resolve; }));
    TestBed.inject(RetornoAndroid).registrar(() => false);
    const primero = volver(); await volver(); expect(salir).toHaveBeenCalledOnce(); terminar(); await primero;
  });
});
