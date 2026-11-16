import { leerConfiguracionApi, perteneceALaApi } from './configuracion-api';

describe('Configuración y límite de API', () => {
  const origen = 'https://nivi.ejemplo.org';
  const api = leerConfiguracionApi({ apiUrl: '/api/v1' }, origen);
  it('conserva /api/v1 al resolver la configuración pública', () => {
    expect(api.url).toBe(`${origen}/api/v1`);
  });
  it.each([
    'https://otro.ejemplo.org/api/v1/libros', '/api/v10/libros', '/api/v1mal/libros',
    '/assets/portada.jpg', 'https://nivi.ejemplo.org:444/api/v1/libros', '/api/v1/../../fuera',
    'https://usuario:clave@nivi.ejemplo.org/api/v1/libros'
  ])('no considera propia una petición a %s', url => {
    expect(perteneceALaApi(url, api, origen)).toBe(false);
  });
  it('acepta únicamente rutas del prefijo propio', () => {
    expect(perteneceALaApi('/api/v1/libros?q=libro', api, origen)).toBe(true);
    expect(perteneceALaApi(`${origen}/api/v1`, api, origen)).toBe(true);
  });
  it.each([{}, { apiUrl: 'https://api.ejemplo.org/api' }, { apiUrl: 'http://api.ejemplo.org/api/v1' }, { apiUrl: '/api/v1?x=1' }])('rechaza configuración ausente, prefijo incorrecto o contenido mixto: %j', datos => {
      expect(() => leerConfiguracionApi(datos, origen)).toThrow();
    });
});
