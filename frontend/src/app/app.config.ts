import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular/ionic-route-strategy';
import { provideIonicAngular } from '@ionic/angular/provide';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-AR';
import { addIcons } from 'ionicons';
import { arrowBackOutline, arrowForwardOutline, bookOutline, bookmarksOutline, checkmarkCircleOutline, chevronBackOutline, chevronForwardOutline, searchOutline, helpCircleOutline,
  homeOutline, leafOutline, logOutOutline, personOutline, scanOutline, settingsOutline, shieldCheckmarkOutline, timeOutline, warningOutline } from 'ionicons/icons';
import { rutas } from './app.routes';
import { CONFIGURACION_API, ConfiguracionApi } from './nucleo/configuracion/configuracion-api';

registerLocaleData(localeEs);
addIcons({ arrowBackOutline, arrowForwardOutline, bookOutline, bookmarksOutline, checkmarkCircleOutline, chevronBackOutline, chevronForwardOutline, searchOutline, helpCircleOutline,
  homeOutline, leafOutline, logOutOutline, personOutline, scanOutline, settingsOutline, shieldCheckmarkOutline, timeOutline, warningOutline });

export function configuracionApp(api: ConfiguracionApi): ApplicationConfig {
  return {
    providers: [
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideIonicAngular({ mode: 'md' }),
      provideRouter(rutas),
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      { provide: LOCALE_ID, useValue: 'es-AR' },
      { provide: CONFIGURACION_API, useValue: api },
      provideHttpClient()
    ]
  };
}
