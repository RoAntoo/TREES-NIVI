import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterLink, provideRouter } from '@angular/router';
import { PresionProlongada } from './presion-prolongada';

@Component({selector:'nivi-prueba-presion',imports:[PresionProlongada,RouterLink],template:`<a [routerLink]="['/lector','uno']" [niviPresionProlongada]="habilitada" (mantener)="abrir()">Libro</a>`})
class PruebaPresion { habilitada = true; abrir = vi.fn(); }

describe('Presión prolongada en una tarjeta con enlace',() => {
  beforeEach(() => { vi.useFakeTimers(); TestBed.configureTestingModule({imports:[PruebaPresion],providers:[provideRouter([])]}); });
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  function preparar() {
    const fixture = TestBed.createComponent(PruebaPresion); fixture.detectChanges();
    const enlace = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const navegar = vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    const puntero = (tipo:string,x = 0,y = 0) => {
      const evento = new MouseEvent(tipo,{bubbles:true,clientX:x,clientY:y,button:0});
      Object.defineProperties(evento,{isPrimary:{value:true},pointerId:{value:1}}); enlace.dispatchEvent(evento);
    };
    const click = () => enlace.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
    return {fixture,enlace,navegar,puntero,click,abrir:fixture.componentInstance.abrir};
  }
  it('conserva la navegación del toque corto',() => {
    const p = preparar(); p.puntero('pointerdown'); vi.advanceTimersByTime(150); p.puntero('pointerup');
    vi.advanceTimersByTime(600); p.click(); expect(p.abrir).not.toHaveBeenCalled(); expect(p.navegar).toHaveBeenCalledOnce();
  });
  it('abre una sola vez y consume el click posterior sin navegar',() => {
    const p = preparar(); p.puntero('pointerdown'); vi.advanceTimersByTime(500);
    p.enlace.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    p.puntero('pointerup'); p.click(); expect(p.abrir).toHaveBeenCalledOnce(); expect(p.navegar).not.toHaveBeenCalled();
    p.puntero('pointerdown'); p.puntero('pointerup'); p.click(); expect(p.navegar).toHaveBeenCalledOnce();
  });
  it('no abre acciones ni navega cuando el dedo se desplaza para recorrer la lista',() => {
    const p = preparar(); p.puntero('pointerdown'); p.puntero('pointermove',0,30); vi.advanceTimersByTime(700);
    p.puntero('pointerup'); p.click(); expect(p.abrir).not.toHaveBeenCalled(); expect(p.navegar).not.toHaveBeenCalled();
  });
  it.each(['pointercancel','pointerleave'])('cancela la espera con %s',tipo => {
    const p = preparar(); p.puntero('pointerdown'); p.puntero(tipo); vi.advanceTimersByTime(700); expect(p.abrir).not.toHaveBeenCalled();
  });
  it('cancela el temporizador al destruir la tarjeta y respeta las tarjetas sin acciones',() => {
    const p = preparar(); p.fixture.componentInstance.habilitada = false; p.fixture.detectChanges();
    p.puntero('pointerdown'); vi.advanceTimersByTime(700); expect(p.abrir).not.toHaveBeenCalled();
    p.fixture.componentInstance.habilitada = true; p.fixture.detectChanges(); p.puntero('pointerdown'); p.fixture.destroy();
    vi.advanceTimersByTime(700); expect(p.abrir).not.toHaveBeenCalled();
  });
});
