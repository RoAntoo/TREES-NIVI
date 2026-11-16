import { Injectable, signal } from '@angular/core';
import { AltaLibro, AvanceLectura, MetadatosLibro, OrigenLibro } from '../modelos/biblioteca';

/** Conserva el cuerpo exacto de una escritura incierta, solo durante la sesión en memoria. */
@Injectable({ providedIn: 'root' })
export class EscriturasPendientes {
  readonly alta = signal<AltaLibro | null>(null);
  readonly avances = signal<Readonly<Record<string, AvanceLectura>>>({});
  prepararAlta(metadatos: MetadatosLibro, origen: OrigenLibro): AltaLibro {
    if (!this.alta()) this.alta.set({ idOperacion: crypto.randomUUID(), origen, metadatos: structuredClone(metadatos) });
    return this.alta()!;
  }
  prepararAvance(id: string, datos: Omit<AvanceLectura, 'idOperacion'>): AvanceLectura {
    const anterior = this.avances()[id];
    if (anterior) return anterior;
    const entrada = { idOperacion: crypto.randomUUID(), ...structuredClone(datos) };
    this.avances.update(valores => ({ ...valores, [id]: entrada }));
    return entrada;
  }
  resolverAvance(id: string): void { this.avances.update(valores => Object.fromEntries(Object.entries(valores).filter(([clave]) => clave !== id))); }
}
