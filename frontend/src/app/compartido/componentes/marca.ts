import { Component } from '@angular/core';

@Component({
  selector: 'nivi-marca',
  template: '<img src="icono.svg" width="38" height="38" alt=""><span>NIVI<small>LECTURA</small></span>',
  styles: `
    :host { display: inline-flex; align-items: center; gap: 11px; color: var(--nivi-tinta); }
    span { font-size: 25px; font-weight: 750; letter-spacing: 2px; line-height: 1; }
    small { display: block; font-size: 8px; font-weight: 600; letter-spacing: 3.3px; margin-top: 6px; }
  `
})
export class Marca {}
