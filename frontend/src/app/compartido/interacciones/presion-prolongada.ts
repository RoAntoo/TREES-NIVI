import { DestroyRef, Directive, ElementRef, NgZone, inject, input, output } from '@angular/core';

/** Conserva el enlace normal; solo consume el click que sigue a una pulsación larga. */
@Directive({selector:'[niviPresionProlongada]',host:{'[attr.aria-haspopup]':'niviPresionProlongada() ? "dialog" : null'}})
export class PresionProlongada {
  readonly niviPresionProlongada = input(true);
  readonly mantener = output<void>();
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zona = inject(NgZone);
  private inicio?:{id:number;x:number;y:number};
  private temporizador?:ReturnType<typeof setTimeout>;
  private consumirClick = false;
  private activada = false;

  constructor() {
    const down = (e:PointerEvent) => {
      this.cancelar(); this.consumirClick = false; this.activada = false;
      if (!this.niviPresionProlongada() || !e.isPrimary || e.button !== 0) return;
      this.inicio = {id:e.pointerId,x:e.clientX,y:e.clientY};
      this.temporizador = setTimeout(() => this.abrir(),500);
    };
    const move = (e:PointerEvent) => {
      if (this.inicio?.id === e.pointerId && Math.hypot(e.clientX-this.inicio.x,e.clientY-this.inicio.y) > 12) {
        this.cancelar(); this.consumirClick = true;
      }
    };
    const fin = () => this.cancelar();
    const click = (e:MouseEvent) => {
      if (this.consumirClick) { e.preventDefault(); e.stopImmediatePropagation(); this.consumirClick = false; }
    };
    const contexto = (e:MouseEvent) => {
      if (!this.niviPresionProlongada()) return;
      e.preventDefault(); e.stopPropagation(); this.cancelar(); this.abrir();
    };
    const teclado = (e:KeyboardEvent) => {
      if (this.niviPresionProlongada() && !e.repeat && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
        e.preventDefault(); this.activada = false; this.abrir();
      }
    };
    this.elemento.addEventListener('pointerdown',down,{passive:true});
    this.elemento.addEventListener('pointermove',move,{passive:true});
    this.elemento.addEventListener('pointerup',fin,{passive:true});
    this.elemento.addEventListener('pointercancel',fin,{passive:true});
    this.elemento.addEventListener('pointerleave',fin,{passive:true});
    this.elemento.addEventListener('click',click,true);
    this.elemento.addEventListener('contextmenu',contexto);
    this.elemento.addEventListener('keydown',teclado);
    inject(DestroyRef).onDestroy(() => {
      this.cancelar(); this.elemento.removeEventListener('pointerdown',down); this.elemento.removeEventListener('pointermove',move);
      this.elemento.removeEventListener('pointerup',fin); this.elemento.removeEventListener('pointercancel',fin);
      this.elemento.removeEventListener('pointerleave',fin);
      this.elemento.removeEventListener('click',click,true); this.elemento.removeEventListener('contextmenu',contexto); this.elemento.removeEventListener('keydown',teclado);
    });
  }
  private abrir():void {
    if (!this.niviPresionProlongada() || this.activada) return;
    this.activada = true; this.consumirClick = true;
    this.zona.run(() => this.mantener.emit());
  }
  private cancelar():void { clearTimeout(this.temporizador); this.temporizador = undefined; this.inicio = undefined; }
}
