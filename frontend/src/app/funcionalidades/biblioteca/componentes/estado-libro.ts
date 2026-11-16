import { Component, input } from '@angular/core';
import { EstadoLectura, nombresEstado } from '../modelos/biblioteca';

@Component({
  selector: 'nivi-estado-libro',
  template: `<span [attr.data-estado]="estado()">{{ nombres[estado()] }}</span>`,
  styles: `span { display: inline-block; font-size: 10px; letter-spacing: .3px; font-weight: 600; padding: 6px 10px; border-radius: 20px; color: var(--nivi-ciruela); background: var(--nivi-acento); }span[data-estado="PAUSADO"], span[data-estado="PENDIENTE"] { color: var(--nivi-secundario); background: var(--nivi-papel); }`
})
export class EstadoLibro {
  readonly estado = input.required<EstadoLectura>();
  readonly nombres = nombresEstado;
}
