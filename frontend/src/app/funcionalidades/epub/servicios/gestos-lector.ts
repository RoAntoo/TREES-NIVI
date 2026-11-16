import { ModoPaso } from '../modelos/libro-epub';

export type AccionLector = 'avanzar' | 'retroceder' | 'alternar';
export interface GestoLector { dx:number; dy:number; duracion:number; movimiento:number; x:number; ancho:number }

export function resolverGesto(modo:ModoPaso, gesto:GestoLector):AccionLector | undefined {
  const {dx,dy,duracion,movimiento,x,ancho} = gesto;
  if (modo === 'deslizar' && duracion < 900 && Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)*1.5) return dx < 0 ? 'avanzar' : 'retroceder';
  if (duracion > 400 || movimiento > 12 || Math.abs(dx) > 12 || Math.abs(dy) > 12) return undefined;
  if (modo === 'toques' && ancho > 0) {
    if (x < ancho*.3) return 'retroceder';
    if (x > ancho*.7) return 'avanzar';
  }
  return 'alternar';
}

/** Los eventos se registran dentro del iframe: la capa cálida no intercepta el texto. */
export function registrarGestos(doc:Document, host:HTMLElement, modo:() => ModoPaso, emitir:(accion:AccionLector) => void, alDesplazar:() => void = () => undefined):void {
  doc.documentElement.style.touchAction = 'pan-y pinch-zoom';
  let inicio:{id:number;x:number;y:number;tiempo:number;movimiento:number} | undefined;
  let suprimirClick = false;
  doc.addEventListener('pointerdown', e => {
    suprimirClick = false;
    const elemento = e.target as Element | null;
    if (!e.isPrimary || e.button !== 0 || elemento?.closest?.('a,button,input,select,textarea')) { inicio = undefined; return; }
    inicio = {id:e.pointerId,x:e.clientX,y:e.clientY,tiempo:e.timeStamp,movimiento:0};
  },{passive:true});
  doc.addEventListener('pointermove', e => {
    if (inicio?.id === e.pointerId) inicio.movimiento = Math.max(inicio.movimiento,Math.abs(e.clientX-inicio.x),Math.abs(e.clientY-inicio.y));
    if (modo() === 'vertical' && inicio && inicio.movimiento > 12) alDesplazar();
  },{passive:true});
  doc.addEventListener('pointercancel', () => { if (inicio && modo() === 'vertical') alDesplazar(); inicio = undefined; },{passive:true});
  doc.addEventListener('wheel', () => { if (modo() === 'vertical') alDesplazar(); },{passive:true});
  doc.addEventListener('pointerup', e => {
    const anterior = inicio; inicio = undefined;
    const seleccion = doc.getSelection();
    if (!anterior || anterior.id !== e.pointerId || (seleccion && !seleccion.isCollapsed)) return;
    const rect = host.getBoundingClientRect(), frame = doc.defaultView?.frameElement?.getBoundingClientRect();
    // El iframe mide todo el capítulo; compensar su desplazamiento respecto al visor.
    const x = e.clientX + (frame?.left ?? rect.left) - rect.left;
    const accion = resolverGesto(modo(),{dx:e.clientX-anterior.x,dy:e.clientY-anterior.y,duracion:e.timeStamp-anterior.tiempo,movimiento:anterior.movimiento,x,ancho:rect.width});
    if (accion) { suprimirClick = true; emitir(accion); }
  },{passive:true});
  doc.addEventListener('click', e => {
    if (suprimirClick) { suprimirClick = false; e.preventDefault(); e.stopImmediatePropagation(); }
  },true);
}
