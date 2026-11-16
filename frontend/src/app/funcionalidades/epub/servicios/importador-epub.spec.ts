import JSZip from 'jszip';
import { prepararEpub, rutaLocal, validarZip } from './importador-epub';

async function fixture(contenido = '<h1>Hola</h1><p>Un libro local.</p>'): Promise<JSZip> {
  const zip = new JSZip(); zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="EPUB/libro.opf"/></rootfiles></container>');
  zip.file('EPUB/libro.opf', '<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Prueba</dc:title><dc:creator>Autora</dc:creator></metadata><manifest><item id="c1" href="texto.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>');
  zip.file('EPUB/texto.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Prueba</title></head><body>${contenido}</body></html>`);
  zip.file('EPUB/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Índice</title></head><body><nav epub:type="toc"><ol><li><a href="texto.xhtml">Primero</a></li></ol></nav></body></html>');
  return zip;
}
describe('Validación y aislamiento EPUB', () => {
  it('abre sin portada, extrae metadatos y conserva el índice EPUB 3', async () => {
    const preparado = await prepararEpub(await (await fixture()).generateAsync({ type:'arraybuffer' }));
    expect(preparado.titulo).toBe('Prueba'); expect(preparado.autores).toEqual(['Autora']); expect(preparado.portada).toBeUndefined();
    const seguro = await JSZip.loadAsync(preparado.contenido);
    const indice = new DOMParser().parseFromString(await seguro.file('EPUB/nav.xhtml')!.async('string'), 'application/xhtml+xml');
    expect(indice.querySelector('parsererror')).toBeNull();
    expect(indice.querySelector('nav')?.getAttributeNS('http://www.idpf.org/2007/ops','type')).toBe('toc');
  });
  it('elimina scripts, estilos, formularios y recursos externos antes de renderizar', async () => {
    const zip = await fixture('<script>alert(1)</script><style>@import "https://malicioso.invalid/x";</style><form><input /></form><iframe src="https://malicioso.invalid"/><img src="https://malicioso.invalid/track" onerror="alert(1)"/><p style="background:url(https://malicioso.invalid)">Texto seguro</p><a href="javascript:alert(1)">Enlace</a>');
    const preparado = await prepararEpub(await zip.generateAsync({ type:'arraybuffer' }));
    const seguro = await JSZip.loadAsync(preparado.contenido), html = await seguro.file('EPUB/texto.xhtml')!.async('string');
    expect(html).toContain('Texto seguro'); expect(html).not.toMatch(/malicioso|onerror|javascript:|<script|<form|<iframe|style=/);
    expect(html).toContain("connect-src 'none'");
  });
  it('rechaza documentos corruptos, DRM, diseño fijo y rutas fuera del contenedor', async () => {
    expect(() => validarZip(new ArrayBuffer(4))).toThrow();
    const zip = await fixture(); zip.file('META-INF/encryption.xml', '<encryption/>');
    await expect(prepararEpub(await zip.generateAsync({ type:'arraybuffer' }))).rejects.toThrow('sin DRM');
    zip.remove('META-INF/encryption.xml'); zip.file('fuera/../../ataque', 'x');
    await expect(prepararEpub(await zip.generateAsync({ type:'arraybuffer' }))).rejects.toThrow();
    expect(() => rutaLocal('EPUB/cap.xhtml', '../../fuera')).toThrow();
    expect(() => rutaLocal('EPUB/cap.xhtml', 'https://externo.invalid/x')).toThrow();
    expect(rutaLocal('EPUB/texto/cap.xhtml', '../imagen.png')).toBe('EPUB/imagen.png');
  });
  it('rechaza expansión ZIP excesiva sin descomprimir', async () => {
    const zip = await fixture(); zip.file('grande.txt', 'a'.repeat(3 * 1024 * 1024));
    const awaitBuffer = await zip.generateAsync({ type:'arraybuffer', compression:'DEFLATE' });
    expect(() => validarZip(awaitBuffer)).toThrow('descompresión');
  });
});
