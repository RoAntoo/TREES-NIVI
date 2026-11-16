import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function validarConfiguracionAndroid(entorno) {
  if (!entorno.NIVI_API_URL) throw new Error('Configurá NIVI_API_URL con una URL absoluta terminada en /api/v1.');
  const api = new URL(entorno.NIVI_API_URL);
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash
    || api.pathname.replace(/\/$/, '') !== '/api/v1') throw new Error('NIVI_API_URL debe ser HTTP(S), sin credenciales, parámetros ni fragmentos, y terminar en /api/v1.');
  const httpDebug = api.protocol === 'http:';
  if (httpDebug && entorno.NIVI_ALLOW_HTTP !== '1') throw new Error('HTTP requiere NIVI_ALLOW_HTTP=1 y se habilita exclusivamente en la variante debug. Usá HTTPS para una entrega.');
  return { apiUrl: `${api.origin}/api/v1`, dominio: api.hostname, httpDebug };
}

export function politicaRed(configuracion) {
  const dominio = configuracion.dominio.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
${configuracion.httpDebug ? `  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">${dominio}</domain></domain-config>\n` : ''}</network-security-config>
`;
}

function ejecutarNode(archivo, argumentos) {
  const resultado = spawnSync(process.execPath, [join(raiz, archivo), ...argumentos], { cwd: raiz, stdio: 'inherit', windowsHide: true });
  if (resultado.error || resultado.status !== 0) throw new Error(`Falló ${argumentos.join(' ')}. Revisá el mensaje anterior.`);
}

function guardar(ruta, contenido) { mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, contenido, 'utf8'); }

export function configurarProyectoAndroid(base = raiz) {
  const android = join(base, 'android');
  function aplicar(archivo, linea) {
    const ruta = join(android, archivo), texto = readFileSync(ruta, 'utf8');
    if (!texto.includes(linea)) guardar(ruta, texto.trimEnd() + '\n\n' + linea + '\n');
  }
  // Extensiones propias: se aplican después de la plantilla sin reescribir sus versiones transitivas.
  guardar(join(android, 'nivi.gradle'), 'ext.minSdkVersion = 26\next.compileSdkVersion = 36\next.targetSdkVersion = 36\n');
  aplicar('build.gradle', "apply from: 'nivi.gradle'");
  const version = JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('La versión del cliente debe tener formato mayor.menor.parche.');
  const [mayor, menor, parche] = version.split('.').map(Number);
  guardar(join(android, 'nivi-app.gradle'), `android { defaultConfig { versionCode ${mayor * 10000 + menor * 100 + parche}; versionName '${version}' } }\n`);
  aplicar('app/build.gradle', "apply from: '../nivi-app.gradle'");
  copyFileSync(join(base, 'nativo/android/AndroidManifest.xml'), join(android, 'app/src/main/AndroidManifest.xml'));
  cpSync(join(base, 'nativo/android/res'), join(android, 'app/src/main/res'), { recursive: true });
  if (existsSync(join(base, 'nativo/android/java'))) cpSync(join(base, 'nativo/android/java'), join(android, 'app/src/main/java'), { recursive: true });
}

function comprobarEntornoNativo() {
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const version = spawnSync(java, ['-version'], { encoding: 'utf8', windowsHide: true });
  if (version.error || version.status !== 0 || !/version "21[.\"]/.test(version.stderr + version.stdout)) throw new Error('La compilación Android requiere Java 21. Configurá JAVA_HOME antes de continuar.');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk || !existsSync(join(sdk, 'platform-tools'))) throw new Error('Configurá ANDROID_HOME con el SDK de Android instalado (incluyendo platform-tools).');
}

export function prepararAndroid(entorno = process.env) {
  const configuracion = validarConfiguracionAndroid(entorno);
  ejecutarNode('node_modules/@angular/cli/bin/ng.js', ['build', '--configuration', 'android']);
  // El paquete principal nunca incorpora una URL HTTP. Solo debug recibe esa configuración.
  guardar(join(raiz, 'www/configuracion.json'), JSON.stringify({ apiUrl: configuracion.httpDebug ? '/api/v1' : configuracion.apiUrl }, null, 2) + '\n');
  if (!existsSync(join(raiz, 'android'))) ejecutarNode('node_modules/@capacitor/cli/bin/capacitor', ['add', 'android']);
  ejecutarNode('node_modules/@capacitor/cli/bin/capacitor', ['sync', 'android']);
  configurarProyectoAndroid();

  const debug = join(raiz, 'android/app/src/debug');
  const configCapacitor = JSON.parse(readFileSync(join(raiz, 'android/app/src/main/assets/capacitor.config.json'), 'utf8'));
  configCapacitor.server = { ...configCapacitor.server, androidScheme: configuracion.httpDebug ? 'http' : 'https', cleartext: configuracion.httpDebug };
  guardar(join(debug, 'assets/capacitor.config.json'), JSON.stringify(configCapacitor, null, 2) + '\n');
  guardar(join(debug, 'assets/public/configuracion.json'), JSON.stringify({ apiUrl: configuracion.apiUrl }, null, 2) + '\n');
  guardar(join(debug, 'res/xml/nivi_network_security_config.xml'), politicaRed(configuracion));
  guardar(join(debug, 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:usesCleartextTraffic="${configuracion.httpDebug}" android:networkSecurityConfig="@xml/nivi_network_security_config" />
</manifest>
`);
  console.log('Android preparado. La configuración HTTP, si fue solicitada, queda limitada a debug y al dominio configurado.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const accion = process.argv[2];
    if (!['preparar', 'compilar'].includes(accion)) throw new Error('Usá android:preparar o android:build.');
    if (accion === 'compilar') comprobarEntornoNativo();
    prepararAndroid();
    if (accion === 'compilar') {
      const resultado = process.platform === 'win32'
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat assembleDebug'], { cwd: join(raiz, 'android'), stdio: 'inherit', windowsHide: true })
        : spawnSync('sh', ['gradlew', 'assembleDebug'], { cwd: join(raiz, 'android'), stdio: 'inherit' });
      if (resultado.error || resultado.status !== 0) throw new Error('Falló Gradle. Revisá JAVA_HOME, ANDROID_HOME y la instalación del SDK.');
    }
  } catch (error) { console.error(error instanceof Error ? error.message : 'No se pudo preparar Android.'); process.exitCode = 1; }
}
