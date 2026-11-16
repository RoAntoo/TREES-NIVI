import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MetadatosLibro } from '../../funcionalidades/biblioteca/modelos/biblioteca';

export const textoRequerido: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { requerido: true };
export const entero: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || control.value === '' || Number.isInteger(control.value) ? null : { entero: true };

export function normalizarIsbn(valor: string): string | null {
  const isbn = valor.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const suma = [...isbn].reduce((s, c, i) => s + (10 - i) * (c === 'X' ? 10 : Number(c)), 0);
    return suma % 11 === 0 ? isbn : null;
  }
  if (/^(978|979)\d{10}$/.test(isbn)) {
    const suma = [...isbn].reduce((s, c, i) => s + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
    return suma % 10 === 0 ? isbn : null;
  }
  return null;
}
export const isbnValido: ValidatorFn = control => !control.value || normalizarIsbn(String(control.value)) ? null : { isbn: true };
export const autoresValidos: ValidatorFn = control => {
  const autores = String(control.value ?? '').split('\n').map(a => a.trim()).filter(Boolean);
  return autores.length <= 10 && autores.every(a => a.length <= 150) ? null : { autores: true };
};
export const portadaValida: ValidatorFn = control => {
  if (!control.value) return null;
  try {
    const url = new URL(String(control.value));
    return url.protocol === 'https:' && url.hostname === 'covers.openlibrary.org' && !url.port && !url.username && !url.password && !url.hash ? null : { portada: true };
  } catch { return { portada: true }; }
};

export function crearFormularioLibro() {
  return new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [textoRequerido, Validators.maxLength(255)] }),
    autores: new FormControl('', { nonNullable: true, validators: [autoresValidos] }),
    isbn: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40), isbnValido] }),
    totalPaginas: new FormControl<number | null>(null, [entero, Validators.min(1), Validators.max(100000)]),
    urlPortada: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500), portadaValida] })
  });
}
export function crearFormularioAvance(total: number | null) {
  return new FormGroup({
    paginaActual: new FormControl<number | null>(null, [Validators.required, entero, Validators.min(0), Validators.max(total ?? 2147483647)]),
    nota: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] })
  });
}
export function valoresMetadatos(formulario: ReturnType<typeof crearFormularioLibro>, originales: MetadatosLibro): MetadatosLibro {
  const valores = formulario.getRawValue();
  return { titulo: valores.titulo.trim(), autores: valores.autores.split('\n').map(a => a.trim()).filter(Boolean),
    isbn: valores.isbn.trim() ? normalizarIsbn(valores.isbn) : null, totalPaginas: valores.totalPaginas,
    urlPortada: valores.urlPortada.trim() || null, idEdicionExterna: originales.idEdicionExterna, idObraExterna: originales.idObraExterna };
}
