import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccionesLibro } from './acciones-libro';
import { entradaDigital } from '../datos/coleccion-lecturas';

@Component({selector:'nivi-prueba-acciones',imports:[AccionesLibro],template:`<nivi-acciones-libro [entrada]="entrada" (accion)="accion($event)" />`})
class PruebaAcciones {
  readonly entrada = entradaDigital({id:'digital',titulo:'Un EPUB',autores:['Una autora'],referenciaArchivo:'digital',huellaSha256:'hash',nombreArchivoOriginal:'libro.epub',tipoMime:'application/epub+zip',tamanoBytes:1048576,importadoEn:'2026-11-15T10:00:00Z',versionFormato:1});
  readonly accion = vi.fn();
}

describe('Ventana de acciones de un libro',() => {
  it('permite consultar información y regresar sin navegar ni eliminar',() => {
    const fixture = TestBed.createComponent(PruebaAcciones); fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Comenzar a leer');
    host.querySelector<HTMLButtonElement>('.ver-info')!.click(); fixture.detectChanges();
    expect(host.textContent).toContain('libro.epub'); expect(host.textContent).toContain('Pendiente');
    expect(host.querySelector('.eliminar')).toBeNull(); expect(fixture.componentInstance.accion).not.toHaveBeenCalled();
    host.querySelector<HTMLButtonElement>('.volver')!.click(); fixture.detectChanges(); expect(host.querySelector('.eliminar')).not.toBeNull();
  });
  it('la X pide cerrar desde las acciones y desde la información',() => {
    const fixture = TestBed.createComponent(PruebaAcciones); fixture.detectChanges(); const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.cerrar')!.click(); expect(fixture.componentInstance.accion).toHaveBeenLastCalledWith('cerrar');
    host.querySelector<HTMLButtonElement>('.ver-info')!.click(); fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.cerrar')!.click(); expect(fixture.componentInstance.accion).toHaveBeenCalledTimes(2);
  });
});
