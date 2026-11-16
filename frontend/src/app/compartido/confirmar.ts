import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/alert-controller';

@Injectable({ providedIn: 'root' })
export class Confirmaciones {
  private readonly alertas = inject(AlertController);
  async pedir(titulo: string, mensaje: string, accion = 'Confirmar'): Promise<boolean> {
    const alerta = await this.alertas.create({ header: titulo, message: mensaje,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: accion, role: 'confirm' }] });
    await alerta.present();
    return (await alerta.onDidDismiss()).role === 'confirm';
  }
}
