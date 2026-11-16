import { registrarGestos, resolverGesto, GestoLector } from './gestos-lector';
const toque:GestoLector = {dx:0,dy:0,duracion:120,movimiento:0,x:150,ancho:300};
function puntero(target:Element,tipo:string,x:number,y:number,tiempo:number):void {
  const evento = new MouseEvent(tipo,{clientX:x,clientY:y,bubbles:true,button:0});
  Object.defineProperties(evento,{isPrimary:{value:true},pointerId:{value:1},timeStamp:{value:tiempo}}); target.dispatchEvent(evento);
}
describe('Gestos del lector',() => {
  it('distingue lados y centro para no confundir avance con pantalla completa',() => {
    expect(resolverGesto('toques',{...toque,x:20})).toBe('retroceder');
    expect(resolverGesto('toques',{...toque,x:280})).toBe('avanzar');
    expect(resolverGesto('toques',toque)).toBe('alternar');
    expect(resolverGesto('deslizar',{...toque,x:280})).toBe('alternar');
    expect(resolverGesto('botones',{...toque,x:20})).toBe('alternar');
  });
  it('reconoce deslizamientos horizontales y descarta scroll vertical, selección larga y movimiento incidental',() => {
    expect(resolverGesto('deslizar',{...toque,dx:-85,dy:8,movimiento:85})).toBe('avanzar');
    expect(resolverGesto('deslizar',{...toque,dx:85,dy:8,movimiento:85})).toBe('retroceder');
    expect(resolverGesto('deslizar',{...toque,dx:20,dy:100,movimiento:100})).toBeUndefined();
    expect(resolverGesto('toques',{...toque,duracion:700})).toBeUndefined();
    expect(resolverGesto('botones',{...toque,dx:90,movimiento:90})).toBeUndefined();
    expect(resolverGesto('toques',{...toque,movimiento:30})).toBeUndefined();
  });
  it('emite una sola acción desde el documento del EPUB y bloquea el click sintético posterior',() => {
    const doc = document.implementation.createHTMLDocument('EPUB'), host = document.createElement('div'), emitir = vi.fn();
    vi.spyOn(host,'getBoundingClientRect').mockReturnValue({left:0,width:300} as DOMRect);
    registrarGestos(doc,host,() => 'deslizar',emitir);
    puntero(doc.body,'pointerdown',260,100,0); puntero(doc.body,'pointermove',160,110,100); puntero(doc.body,'pointerup',150,110,150);
    expect(emitir).toHaveBeenCalledExactlyOnceWith('avanzar');
    const click = new MouseEvent('click',{bubbles:true,cancelable:true}); doc.body.dispatchEvent(click); expect(click.defaultPrevented).toBe(true);
  });
  it('compensa el iframe desplazado en capítulos con varias pantallas',() => {
    const frame = document.createElement('iframe'); document.body.append(frame);
    const doc = frame.contentDocument!, host = document.createElement('div'), emitir = vi.fn();
    vi.spyOn(host,'getBoundingClientRect').mockReturnValue({left:10,width:300} as DOMRect);
    vi.spyOn(frame,'getBoundingClientRect').mockReturnValue({left:-590,width:3000} as DOMRect);
    registrarGestos(doc,host,() => 'toques',emitir);
    puntero(doc.body,'pointerdown',850,100,0); puntero(doc.body,'pointerup',850,100,100);
    expect(emitir).toHaveBeenCalledExactlyOnceWith('avanzar'); frame.remove();
  });
  it('respeta enlaces del libro y no cambia de página al tocarlos',() => {
    const doc = document.implementation.createHTMLDocument('EPUB'), host = document.createElement('div'), emitir = vi.fn();
    doc.body.innerHTML = '<a href="#nota">Nota</a>'; registrarGestos(doc,host,() => 'toques',emitir);
    const enlace = doc.querySelector('a')!; puntero(enlace,'pointerdown',280,100,0); puntero(enlace,'pointerup',280,100,100);
    expect(emitir).not.toHaveBeenCalled();
  });
  it('en cascada deja libre el scroll vertical y conserva el toque para mostrar controles',() => {
    expect(resolverGesto('vertical',{...toque,dy:100,movimiento:100})).toBeUndefined();
    expect(resolverGesto('vertical',{...toque,dx:-100,movimiento:100})).toBeUndefined();
    expect(resolverGesto('vertical',toque)).toBe('alternar');
    const doc = document.implementation.createHTMLDocument('Vertical'), host = document.createElement('div'), desplazar = vi.fn();
    registrarGestos(doc,host,() => 'vertical',vi.fn(),desplazar);
    puntero(doc.body,'pointerdown',100,100,0); puntero(doc.body,'pointermove',100,200,100);
    expect(desplazar).toHaveBeenCalledOnce();
  });
});
