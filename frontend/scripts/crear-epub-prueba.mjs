import JSZip from 'jszip';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Texto original de prueba, sin obras de terceros. No se incluye en la app.
const zip = new JSZip();
zip.file('mimetype', 'application/epub+zip');
zip.file('META-INF/container.xml', '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="EPUB/libro.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
zip.file('EPUB/libro.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">nivi-prueba-epub-1</dc:identifier><dc:title>Un paseo por NIVI</dc:title><dc:creator>Equipo NIVI</dc:creator><dc:language>es</dc:language><meta property="dcterms:modified">2026-11-15T00:00:00Z</meta></metadata><manifest><item id="nav" href="indice.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="imagen" href="punto.png" media-type="image/png"/>${[1,2,3].map(i => `<item id="c${i}" href="capitulo${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${[1,2,3].map(i => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
zip.file('EPUB/indice.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Índice</title></head><body><nav epub:type="toc"><h1>Índice</h1><ol>' + [1,2,3].map(i => `<li><a href="capitulo${i}.xhtml">Capítulo ${i}</a></li>`).join('') + '</ol></nav></body></html>');
zip.file('EPUB/punto.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
for (const i of [1,2,3]) zip.file(`EPUB/capitulo${i}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Capítulo ${i}</title></head><body><h1>Capítulo ${i}</h1><img src="punto.png" alt="Imagen local de prueba"/>${Array.from({length:60}, (_, p) => `<p id="p${p}">Capítulo ${i}, párrafo ${p + 1}. Una tarde tranquila invita a abrir un libro. Las historias nos acompañan y cada palabra encuentra su lugar. Esta lectura permite verificar la posición exacta, cambiar la letra y volver a empezar sin perder el hilo.</p>`).join('')}</body></html>`);
const destino = new URL('../../docs/pruebas-epub/', import.meta.url);
mkdirSync(destino, { recursive: true });
writeFileSync(new URL('nivi-prueba.epub', destino), await zip.generateAsync({ type:'nodebuffer', compression:'DEFLATE' }));
console.log(fileURLToPath(new URL('nivi-prueba.epub', destino)));
