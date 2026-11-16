import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CopiaBiblioteca } from '../../nucleo/almacenamiento/copia-biblioteca';

@Component({
  selector: 'nivi-aviso-copia',
  imports: [DatePipe],
  template: `
    @if (copia.modoCopia() || copia.sinRed()) {
      <aside class="aviso-copia" role="status"><strong>{{ copia.modoCopia() ? 'Consultando copia guardada' : 'Sin conexión' }}</strong>
        @if (copia.modoCopia()) { <div>Última actualización: {{ copia.fecha() | date:'d MMM y, HH:mm' }}. Hasta 100 libros recientes; los conteos y filtros corresponden solo a esta copia. Cada libro puede tener una fecha anterior.</div> }
        <div>Altas, cambios, avances, catálogo e historial completo requieren conexión. Actualizá la vista para volver al servidor.</div>
      </aside>
    }
    @if (copia.aviso()) { <p class="aviso-copia" role="status">{{ copia.aviso() }}</p> }
  `
})
export class AvisoCopia { readonly copia = inject(CopiaBiblioteca); }
