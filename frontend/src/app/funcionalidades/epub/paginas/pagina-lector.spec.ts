import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular/nav-controller';
import { Platform } from '@ionic/angular/platform';
import { PaginaLector } from './pagina-lector';
import { MotorEpub, coloresLector } from '../servicios/motor-epub';
import { ProgresoLector } from '../servicios/progreso-epub';
import { RepositorioEpub } from '../datos/repositorio-epub';

describe('Opciones y pantalla completa del lector',() => {
  let fixture:ComponentFixture<PaginaLector>;
  const motor = {aplicar:vi.fn(async () => undefined),cerrar:vi.fn(),avanzar:vi.fn(async () => undefined),retroceder:vi.fn(async () => undefined)};
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({imports:[PaginaLector],providers:[
      {provide:RepositorioEpub,useValue:{cambiarPreferencias:vi.fn(async () => undefined)}},
      {provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({id:'uno'})}}},
      {provide:NavController,useValue:{navigateBack:vi.fn(async () => true)}},
      {provide:Platform,useValue:{backButton:{subscribeWithPriority:vi.fn(() => ({unsubscribe:vi.fn()}))}}}
    ]});
    TestBed.overrideComponent(PaginaLector,{set:{providers:[{provide:MotorEpub,useValue:motor},{provide:ProgresoLector,useValue:{aviso:signal(''),cerrar:vi.fn(async () => undefined),guardar:vi.fn(async () => undefined)}}]}});
    fixture = TestBed.createComponent(PaginaLector); fixture.componentInstance.cargando.set(false); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());
  it('oculta botones con gestos y permite elegir botones conservando la preferencia',() => {
    expect(fixture.nativeElement.querySelector('.pasos')).toBeNull();
    fixture.componentInstance.modo({target:{value:'botones'}} as unknown as Event); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.pasos button')).toHaveLength(2);
    expect(TestBed.inject(RepositorioEpub).cambiarPreferencias).toHaveBeenCalledWith(expect.objectContaining({navegacion:'botones'}));
  });
  it('un toque en el fondo cierra las opciones sin pasar de página',() => {
    fixture.componentInstance.abrirPanel('ajustes'); fixture.detectChanges();
    const velo = fixture.nativeElement.querySelector('.velo') as HTMLButtonElement; expect(velo).toBeTruthy();
    velo.click(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('#ajustes')).toBeNull(); expect(motor.avanzar).not.toHaveBeenCalled();
  });
  it('alterna cabecera y pie con un toque del texto sin cambiar la ubicación',() => {
    fixture.componentInstance.interactuar('alternar'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-header').hidden).toBe(true); expect(fixture.nativeElement.querySelector('footer').hidden).toBe(true);
    fixture.componentInstance.interactuar('alternar'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-header').hidden).toBe(false); expect(motor.avanzar).not.toHaveBeenCalled();
  });
  it('aplica el tema a las variables compartidas por texto, panel y controles',() => {
    fixture.componentInstance.tema({target:{value:'sepia'}} as unknown as Event); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--lector-fondo')).toBe(coloresLector.sepia.fondo);
    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--lector-texto')).toBe(coloresLector.sepia.texto);
  });
});
