import { TestBed } from '@angular/core/testing';
import { FormularioLibro } from './formulario-libro';
import { extraerMetadatos } from '../../funcionalidades/biblioteca/modelos/biblioteca';
import { libroPrueba } from '../../pruebas/datos-lectura';

describe('Borrador de metadatos', () => {
  it('conserva datos y marca de cambios al devolver un guardado fallido al formulario', () => {
    TestBed.overrideComponent(FormularioLibro, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(FormularioLibro); const formulario = fixture.componentInstance.formulario;
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba())); fixture.detectChanges();
    formulario.controls.titulo.setValue('Mi título corregido'); formulario.markAsDirty();
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ titulo: 'Mi título corregido' }))); fixture.detectChanges();
    expect(formulario.controls.titulo.value).toBe('Mi título corregido'); expect(formulario.dirty).toBe(true);
  });
  it('una respuesta tardía completa campos automáticos y conserva los que se editaron o vaciaron', () => {
    TestBed.overrideComponent(FormularioLibro, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(FormularioLibro), formulario = fixture.componentInstance.formulario;
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ autores: [], totalPaginas: null }))); fixture.detectChanges();
    formulario.controls.titulo.setValue('Título escrito a mano'); formulario.controls.titulo.markAsDirty();
    formulario.controls.isbn.setValue(''); formulario.controls.isbn.markAsDirty();
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ titulo: 'Título externo', autores: ['Robert W. Chambers'], isbn: '9780306406157', totalPaginas: 308 })));
    fixture.detectChanges();
    expect(formulario.controls.titulo.value).toBe('Título escrito a mano'); expect(formulario.controls.isbn.value).toBe('');
    expect(formulario.controls.autores.value).toBe('Robert W. Chambers'); expect(formulario.controls.totalPaginas.value).toBe(308);
  });
  it('cambiar de edición reemplaza páginas automáticas, pero conserva páginas manuales', () => {
    TestBed.overrideComponent(FormularioLibro, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(FormularioLibro), formulario = fixture.componentInstance.formulario;
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ idEdicionExterna: 'OL1M', totalPaginas: 308 }))); fixture.detectChanges();
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ idEdicionExterna: 'OL2M', totalPaginas: 144 }))); fixture.detectChanges();
    expect(formulario.controls.totalPaginas.value).toBe(144);
    formulario.controls.totalPaginas.setValue(150); formulario.controls.totalPaginas.markAsDirty();
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba({ idEdicionExterna: 'OL3M', totalPaginas: 500 }))); fixture.detectChanges();
    expect(formulario.controls.totalPaginas.value).toBe(150);
  });
  it('no permite guardar mientras está completando una edición', () => {
    TestBed.overrideComponent(FormularioLibro, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(FormularioLibro), confirmar = vi.fn();
    fixture.componentRef.setInput('datos', extraerMetadatos(libroPrueba())); fixture.componentRef.setInput('actualizando', true); fixture.detectChanges();
    fixture.componentInstance.confirmar.subscribe(confirmar); fixture.componentInstance.enviar(); expect(confirmar).not.toHaveBeenCalled();
  });
});
