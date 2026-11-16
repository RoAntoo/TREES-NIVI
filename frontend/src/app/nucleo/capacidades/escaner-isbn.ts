import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { normalizarIsbn } from '../../compartido/validadores/validadores-lectura';

export type ResultadoEscaneo =
  | { tipo: 'isbn'; isbn: string }
  | { tipo: 'cancelado' | 'permiso-denegado' | 'no-disponible' | 'invalido' | 'error' | 'ocupado' };

export interface CamaraIsbn {
  disponible(): boolean;
  leer(): Promise<{ ScanResult: string; format: number }>;
}

/** El plugin se carga y pide acceso a cámara únicamente tras una acción explícita. */
export const CAMARA_ISBN = new InjectionToken<CamaraIsbn>('camaraIsbn', {
  providedIn: 'root',
  factory: () => ({
    disponible: () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CapacitorBarcodeScanner'),
    leer: async () => {
      const plugin = await import('@capacitor/barcode-scanner');
      return plugin.CapacitorBarcodeScanner.scanBarcode({
        hint: plugin.CapacitorBarcodeScannerTypeHint.EAN_13,
        cameraDirection: plugin.CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: plugin.CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
        scanInstructions: 'Apuntá al código de barras ISBN de tu libro',
        cancelButtonAccessibilityLabel: 'Cancelar escaneo',
        torchButtonOnAccessibilityLabel: 'Apagar linterna',
        torchButtonOffAccessibilityLabel: 'Encender linterna',
        android: { scanningLibrary: plugin.CapacitorBarcodeScannerAndroidScanningLibrary.ZXING }
      });
    }
  })
});

@Injectable({ providedIn: 'root' })
export class EscanerIsbn {
  private readonly camara = inject(CAMARA_ISBN);
  readonly ocupado = signal(false);
  get disponible(): boolean { return this.camara.disponible(); }

  async escanear(): Promise<ResultadoEscaneo> {
    if (this.ocupado()) return { tipo: 'ocupado' };
    if (!this.disponible) return { tipo: 'no-disponible' };
    this.ocupado.set(true);
    try {
      const lectura = await this.camara.leer();
      if (!lectura.ScanResult?.trim()) return { tipo: 'cancelado' };
      // EAN-13 (9): además del formato, validar prefijo de libro y dígito verificador.
      const isbn = lectura.format === 9 ? normalizarIsbn(lectura.ScanResult) : null;
      return isbn && isbn.length === 13 ? { tipo: 'isbn', isbn } : { tipo: 'invalido' };
    } catch (error: unknown) {
      const codigo = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (codigo === 'OS-PLUG-BARC-0006') return { tipo: 'cancelado' };
      if (codigo === 'OS-PLUG-BARC-0007') return { tipo: 'permiso-denegado' };
      if (codigo === 'UNAVAILABLE' || codigo === 'UNIMPLEMENTED') return { tipo: 'no-disponible' };
      return { tipo: 'error' };
    } finally { this.ocupado.set(false); }
  }
}
