import { test } from 'node:test';
import assert from 'node:assert/strict';
import { politicaRed, validarConfiguracionAndroid, configurarProyectoAndroid } from './android.mjs';
import { copyFileSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Android exige URL explícita, absoluta y el prefijo de API único', () => {
  for (const valor of [undefined, '/api/v1', 'https://api.ejemplo.org/api', 'https://u:clave@api.ejemplo.org/api/v1', 'https://api.ejemplo.org/api/v1?token=x']) {
    assert.throws(() => validarConfiguracionAndroid({ NIVI_API_URL: valor }));
  }
});
test('HTTPS produce una configuración sin excepciones de tráfico claro', () => {
  const configuracion = validarConfiguracionAndroid({ NIVI_API_URL: 'https://api.ejemplo.org/api/v1/' });
  assert.equal(configuracion.apiUrl, 'https://api.ejemplo.org/api/v1');
  assert.equal(configuracion.httpDebug, false);
  assert.doesNotMatch(politicaRed(configuracion), /cleartextTrafficPermitted="true"/);
});
test('HTTP requiere elección explícita y la política limita la excepción al host debug', () => {
  assert.throws(() => validarConfiguracionAndroid({ NIVI_API_URL: 'http://192.0.2.10:8080/api/v1' }));
  const configuracion = validarConfiguracionAndroid({ NIVI_API_URL: 'http://192.0.2.10:8080/api/v1', NIVI_ALLOW_HTTP: '1' });
  assert.equal(configuracion.httpDebug, true);
  assert.match(politicaRed(configuracion), /includeSubdomains="false">192\.0\.2\.10<\/domain>/);
  assert.match(politicaRed(configuracion), /base-config cleartextTrafficPermitted="false"/);
});

test('regenerar Android aplica API 26, cámara opcional y versión de forma repetible', () => {
  const base = mkdtempSync(join(tmpdir(), 'nivi-pr4-'));
  try {
    mkdirSync(join(base, 'android/app/src/main'), { recursive: true });
    mkdirSync(join(base, 'nativo/android'), { recursive: true });
    writeFileSync(join(base, 'package.json'), JSON.stringify({ version: '0.4.0' }));
    writeFileSync(join(base, 'android/build.gradle'), 'apply from: "variables.gradle"\n');
    writeFileSync(join(base, 'android/app/build.gradle'), "apply plugin: 'com.android.application'\n");
    copyFileSync(new URL('../nativo/android/AndroidManifest.xml', import.meta.url), join(base, 'nativo/android/AndroidManifest.xml'));
    cpSync(new URL('../nativo/android/res', import.meta.url), join(base, 'nativo/android/res'), { recursive: true });
    cpSync(new URL('../nativo/android/java', import.meta.url), join(base, 'nativo/android/java'), { recursive: true });
    configurarProyectoAndroid(base);
    const archivos = ['build.gradle', 'nivi.gradle', 'app/build.gradle', 'nivi-app.gradle', 'app/src/main/AndroidManifest.xml', 'app/src/main/res/values/styles.xml', 'app/src/main/res/mipmap-anydpi-v26/nivi_launcher.xml', 'app/src/main/java/ar/edu/nivi/lectura/MainActivity.java', 'app/src/main/java/ar/edu/nivi/lectura/EntradaEpubPlugin.java'];
    const primera = archivos.map(archivo => readFileSync(join(base, 'android', archivo), 'utf8'));
    configurarProyectoAndroid(base);
    assert.deepEqual(archivos.map(archivo => readFileSync(join(base, 'android', archivo), 'utf8')), primera);
    assert.match(primera[1], /minSdkVersion = 26/);
    assert.match(primera[1], /targetSdkVersion = 36/);
    assert.match(primera[3], /versionName '0.4.0'/);
    assert.match(primera[4], /android.permission.CAMERA/);
    assert.match(primera[4], /@mipmap\/nivi_launcher/);
    assert.match(primera[5], /windowSplashScreenAnimatedIcon/);
    assert.match(primera[6], /@drawable\/nivi_icono/);
    assert.deepEqual(readFileSync(join(base, 'android/app/src/main/res/drawable-nodpi/nivi_icono.png')),
      readFileSync(new URL('../nativo/android/res/drawable-nodpi/nivi_icono.png', import.meta.url)));
    assert.match(primera[4], /android.hardware.camera" android:required="false"/);
    assert.doesNotMatch(primera[4], /usesCleartextTraffic="true"/);
    for (const accion of ['VIEW','SEND','SEND_MULTIPLE']) assert.match(primera[4], new RegExp(`android.intent.action.${accion}`));
    assert.match(primera[4], /application\/epub\+zip/);
    assert.doesNotMatch(primera[4], /READ_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/);
    assert.match(primera[7], /registerPlugin\(EntradaEpubPlugin.class\)/);
    assert.match(primera[7], /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);
    assert.match(primera[8], /class EntradaEpubPlugin/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});
