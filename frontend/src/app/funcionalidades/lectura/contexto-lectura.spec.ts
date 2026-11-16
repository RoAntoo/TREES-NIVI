import { TestBed } from '@angular/core/testing';
import { ContextoLectura } from './contexto-lectura';
import { ProgresoLectura } from '../biblioteca/componentes/progreso-lectura';
import { libroPrueba, registroPrueba } from '../../pruebas/datos-lectura';

describe('Contexto real y progreso sin total', () => {
  it('muestra última nota como texto plano, posición y fecha', () => {
    const fixture = TestBed.createComponent(ContextoLectura);
    fixture.componentRef.setInput('detalle', { libro: libroPrueba({ totalPaginas: null }), ultimoRegistro: registroPrueba({ nota: '<b>La hermana llegó.</b>' }) }); fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.textContent).toContain('Antes de seguir…'); expect(elemento.textContent).toContain('página 20');
    expect(elemento.textContent).toContain('<b>La hermana llegó.</b>'); expect(elemento.querySelector('b')).toBeNull(); expect(elemento.querySelector('time')).not.toBeNull();
  });
  it('sin nota muestra la posición y no inventa contexto', () => {
    const fixture = TestBed.createComponent(ContextoLectura);
    fixture.componentRef.setInput('detalle', { libro: libroPrueba(), ultimoRegistro: registroPrueba({ nota: null }) }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sin una nota');
  });
  it('sin total no representa un porcentaje ni una barra ficticia', () => {
    const fixture = TestBed.createComponent(ProgresoLectura);
    fixture.componentRef.setInput('libro', libroPrueba({ totalPaginas: null, paginaActual: 45, porcentaje: null })); fixture.detectChanges();
    const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.textContent).toContain('Página 45'); expect(elemento.textContent).not.toContain('%'); expect(elemento.querySelector('ion-progress-bar')).toBeNull();
  });
  it('no redondea a 100 por ciento una lectura que no alcanzó la última página', () => {
    const fixture = TestBed.createComponent(ProgresoLectura);
    fixture.componentRef.setInput('libro', libroPrueba({ totalPaginas: 1000, paginaActual: 999 }));
    expect(fixture.componentInstance.porcentaje()).toBe(99.9);
  });
  it.each([120, null])('un libro marcado terminado muestra 100%% aunque su total sea %s, sin cambiar la página', totalPaginas => {
    const fixture = TestBed.createComponent(ProgresoLectura);
    const libro = libroPrueba({ estado: 'TERMINADO', paginaActual: 20, totalPaginas });
    fixture.componentRef.setInput('libro', libro); fixture.detectChanges();
    expect(fixture.componentInstance.porcentaje()).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Lectura terminada');
    expect(fixture.nativeElement.textContent).toContain('Última posición registrada: página 20');
    expect(fixture.nativeElement.querySelector('ion-progress-bar').value).toBe(1);
    expect(libro.paginaActual).toBe(20);
  });
  it('reabrir una lectura vuelve a mostrar el avance de la página registrada', () => {
    const fixture = TestBed.createComponent(ProgresoLectura);
    fixture.componentRef.setInput('libro', libroPrueba({ estado: 'TERMINADO', paginaActual: 30, totalPaginas: 120 })); fixture.detectChanges();
    expect(fixture.componentInstance.porcentaje()).toBe(100);
    fixture.componentRef.setInput('libro', libroPrueba({ estado: 'LEYENDO', paginaActual: 30, totalPaginas: 120 })); fixture.detectChanges();
    expect(fixture.componentInstance.porcentaje()).toBe(25);
    expect(fixture.nativeElement.textContent).toContain('Página 30 de 120');
  });
});
