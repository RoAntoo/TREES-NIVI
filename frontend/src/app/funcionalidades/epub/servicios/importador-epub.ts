import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { RepositorioEpub } from '../datos/repositorio-epub';
import { EpubNoValido, LibroEpub } from '../modelos/libro-epub';

const MIB = 1024 * 1024;
const ERROR = 'El archivo no es un EPUB válido o contiene una estructura no admitida.';
export function rutaLocal(base: string, referencia: string): string {
  const ref = decodeURIComponent(referencia.split('#')[0]);
  if (!ref || /[\\:?#]/.test(ref) || Array.from(ref).some(c => c.charCodeAt(0) < 32) || ref.startsWith('/')) throw new Error(ERROR);
  const partes = base.split('/').slice(0, -1);
  for (const parte of ref.split('/')) {
    if (parte === '..') { if (!partes.length) throw new Error(ERROR); partes.pop(); }
    else if (parte && parte !== '.') partes.push(parte);
  }
  return partes.join('/');
}
function xml(texto: string): Document {
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(texto)) throw new Error(ERROR);
  // EPUB 2 suele declarar un DTD externo. No se carga: se retira antes del parseo.
  const doc = new DOMParser().parseFromString(texto.replace(/<!DOCTYPE[^>]*>/gi, ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(ERROR);
  return doc;
}
function elementos(doc: Document | Element, nombre: string): Element[] { return Array.from(doc.getElementsByTagNameNS('*', nombre)); }

/** Revisa el directorio ZIP antes de descomprimir; no confía en la extensión. */
export function validarZip(datos: ArrayBuffer): void {
  if (!datos.byteLength || datos.byteLength > 20 * MIB) throw new Error('El EPUB debe ocupar entre 1 byte y 20 MiB.');
  const v = new DataView(datos); let fin = -1;
  for (let i = datos.byteLength - 22; i >= Math.max(0, datos.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === datos.byteLength) { fin = i; break; }
  }
  if (fin < 0 || v.getUint16(fin + 4, true) || v.getUint16(fin + 6, true)) throw new Error(ERROR);
  const cantidad = v.getUint16(fin + 10, true), longitud = v.getUint32(fin + 12, true);
  let offset = v.getUint32(fin + 16, true), total = 0;
  if (!cantidad || cantidad > 2000 || offset + longitud !== fin) throw new Error(ERROR);
  const nombres = new Set<string>();
  for (let i = 0; i < cantidad; i++) {
    if (offset + 46 > fin || v.getUint32(offset, true) !== 0x02014b50) throw new Error(ERROR);
    const comprimido = v.getUint32(offset + 20, true), tamano = v.getUint32(offset + 24, true);
    const n = v.getUint16(offset + 28, true), extra = v.getUint16(offset + 30, true), comentario = v.getUint16(offset + 32, true);
    if (offset + 46 + n + extra + comentario > fin || v.getUint16(offset + 8, true) & 1) throw new Error(ERROR);
    const nombre = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(datos, offset + 46, n));
    if (!nombre || nombre.startsWith('/') || /[\\:%]/.test(nombre) || Array.from(nombre).some(c => c.charCodeAt(0) < 32) || nombre.split('/').some(p => p === '..' || p === '.') || nombres.has(nombre)) throw new Error(ERROR);
    nombres.add(nombre); total += tamano;
    if (tamano > 16 * MIB || total > 80 * MIB || tamano > Math.max(MIB, comprimido * 250)) throw new Error('El EPUB supera los límites de descompresión segura.');
    offset += 46 + n + extra + comentario;
  }
  if (offset !== fin) throw new Error(ERROR);
}
async function extraer(entrada: JSZip.JSZipObject, limite: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const trozos: Uint8Array[] = []; let total = 0;
    const flujo = (entrada as JSZip.JSZipObject & { internalStream(tipo: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }).internalStream('uint8array');
    flujo.on('data', (trozo: Uint8Array) => {
      total += trozo.length;
      if (total > limite) { flujo.pause(); reject(new Error('El contenido descomprimido supera el límite permitido.')); }
      else trozos.push(trozo);
    });
    flujo.on('error', reject);
    flujo.on('end', () => { const salida = new Uint8Array(total); let i = 0; for (const t of trozos) { salida.set(t, i); i += t.length; } resolve(salida); });
    flujo.resume();
  });
}

export async function prepararEpub(datos: ArrayBuffer): Promise<{ contenido: ArrayBuffer; titulo: string; autores: string[]; portada?: string }> {
  validarZip(datos);
  const origen = await JSZip.loadAsync(datos), seguro = new JSZip();
  const archivos = new Map<string, Uint8Array>(); let total = 0;
  for (const entrada of Object.values(origen.files)) {
    if (entrada.dir) continue;
    const contenido = await extraer(entrada, /\.(xhtml|html|xml|opf|ncx)$/i.test(entrada.name) ? 2 * MIB : 16 * MIB);
    total += contenido.length; if (total > 80 * MIB) throw new Error('El EPUB supera 80 MiB descomprimido.');
    archivos.set(entrada.name, contenido);
  }
  const texto = (ruta: string) => { const contenido = archivos.get(ruta); if (!contenido) throw new Error(ERROR); return new TextDecoder().decode(contenido); };
  if (texto('mimetype').trim() !== 'application/epub+zip') throw new Error(ERROR);
  const contenedor = xml(texto('META-INF/container.xml'));
  const opfRuta = elementos(contenedor, 'rootfile')[0]?.getAttribute('full-path');
  if (!opfRuta || rutaLocal('', opfRuta) !== opfRuta) throw new Error(ERROR);
  const opf = xml(texto(opfRuta));
  if (archivos.has('META-INF/encryption.xml') || elementos(opf, 'meta').some(e =>
    (e.getAttribute('property') === 'rendition:layout' && e.textContent?.trim() === 'pre-paginated') ||
    (e.getAttribute('name') === 'fixed-layout' && e.getAttribute('content') === 'true')) ||
    elementos(opf, 'itemref').some(e => e.getAttribute('properties')?.includes('rendition:layout-pre-paginated'))) throw new Error('Solo se admiten EPUB sin DRM y con texto adaptable.');
  const items = elementos(opf, 'item');
  const mapa = new Map(items.map(e => [e.getAttribute('id'), e]));
  const rutas = new Set<string>();
  for (const item of items) {
    const href = item.getAttribute('href'); if (!href) throw new Error(ERROR);
    const ruta = rutaLocal(opfRuta, href); rutas.add(ruta);
    if (!archivos.has(ruta)) throw new Error(ERROR);
    if (item.getAttribute('properties')?.includes('scripted')) item.removeAttribute('properties');
  }
  const spine = elementos(opf, 'itemref');
  if (!spine.length || spine.some(e => mapa.get(e.getAttribute('idref'))?.getAttribute('media-type') !== 'application/xhtml+xml')) throw new Error(ERROR);
  const titulo = elementos(opf, 'title')[0]?.textContent?.trim() ?? '';
  const autores = elementos(opf, 'creator').map(e => e.textContent?.trim() ?? '').filter(Boolean);
  const idPortada = elementos(opf, 'meta').find(e => e.getAttribute('name') === 'cover')?.getAttribute('content');
  const portadaItem = items.find(e => e.getAttribute('properties')?.split(/\s+/).includes('cover-image')) ?? mapa.get(idPortada ?? '');
  let portada: string | undefined;
  if (portadaItem) {
    const mime = portadaItem.getAttribute('media-type') ?? '';
    const bytes = archivos.get(rutaLocal(opfRuta, portadaItem.getAttribute('href') ?? ''));
    if (/^image\/(png|jpeg|gif|webp)$/.test(mime) && bytes && bytes.length <= 2 * MIB) {
      let binario = ''; for (const byte of bytes) binario += String.fromCharCode(byte);
      portada = `data:${mime};base64,${btoa(binario)}`;
    }
  }
  seguro.file('mimetype', 'application/epub+zip');
  seguro.file('META-INF/container.xml', new XMLSerializer().serializeToString(contenedor));
  seguro.file(opfRuta, new XMLSerializer().serializeToString(opf));
  for (const item of items) {
    const ruta = rutaLocal(opfRuta, item.getAttribute('href')!), mime = item.getAttribute('media-type');
    if (mime === 'application/xhtml+xml') {
      const doc = xml(texto(ruta));
      const limpio = DOMPurify.sanitize(new XMLSerializer().serializeToString(doc), {
        WHOLE_DOCUMENT: true, USE_PROFILES: { html: true }, ADD_ATTR: ['epub:type'],
        FORBID_TAGS: ['script', 'style', 'link', 'base', 'meta', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'video', 'audio', 'source', 'svg', 'math'],
        FORBID_ATTR: ['style', 'srcset', 'background', 'poster', 'ping', 'action', 'formaction', 'target'],
      });
      const saneado = new DOMParser().parseFromString(limpio, 'text/html');
      for (const e of Array.from(saneado.querySelectorAll('[src], [href]'))) {
        for (const atributo of ['src', 'href']) {
          const ref = e.getAttribute(atributo); if (!ref) continue;
          if (atributo === 'href' && ref.startsWith('#')) continue;
          try {
            const destino = rutaLocal(ruta, ref);
            if (!rutas.has(destino) || (atributo === 'src' && !/\.(png|jpe?g|gif|webp)$/i.test(destino))) e.removeAttribute(atributo);
          } catch { e.removeAttribute(atributo); }
        }
      }
      const csp = saneado.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
      csp.content = "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline'; font-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; script-src 'none'";
      saneado.head.prepend(csp);
      saneado.documentElement.removeAttribute('xmlns');
      saneado.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:epub', 'http://www.idpf.org/2007/ops');
      seguro.file(ruta, new XMLSerializer().serializeToString(saneado));
    } else if (mime === 'application/x-dtbncx+xml') {
      const doc = xml(texto(ruta));
      for (const e of elementos(doc, 'content')) rutaLocal(ruta, e.getAttribute('src') ?? '');
      seguro.file(ruta, new XMLSerializer().serializeToString(doc));
    } else if (/^image\/(png|jpeg|gif|webp)$/.test(mime ?? '')) seguro.file(ruta, archivos.get(ruta)!);
    else if (mime === 'text/css') seguro.file(ruta, '');
    else seguro.file(ruta, '');
  }
  return { contenido: await seguro.generateAsync({ type: 'arraybuffer', compression: 'STORE' }), titulo, autores, portada };
}

@Injectable({ providedIn: 'root' })
export class ImportadorEpub {
  private readonly repositorio = inject(RepositorioEpub);
  async importar(archivo: File): Promise<{ libro: LibroEpub; duplicado: boolean }> {
    if (!archivo.size || archivo.size > 20 * MIB) throw new EpubNoValido('Elegí un EPUB de hasta 20 MiB.');
    const datos = await archivo.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', datos)), b => b.toString(16).padStart(2, '0')).join('');
    let preparado:Awaited<ReturnType<typeof prepararEpub>>;
    try { preparado = await prepararEpub(datos); }
    catch (error) { throw new EpubNoValido(error instanceof Error ? error.message : 'El archivo no es un EPUB válido.'); }
    const {titulo,autores,portada} = preparado;
    const id = crypto.randomUUID();
    return this.repositorio.agregar({ id, titulo: titulo || archivo.name.replace(/\.epub$/i, ''), autores, portada,
      nombreArchivoOriginal: archivo.name, tipoMime: 'application/epub+zip', tamanoBytes: archivo.size,
      huellaSha256: hash, referenciaArchivo: id, importadoEn: new Date().toISOString(), versionFormato: 1 }, archivo);
  }
}
