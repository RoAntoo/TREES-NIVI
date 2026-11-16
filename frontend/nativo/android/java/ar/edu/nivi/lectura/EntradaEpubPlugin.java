package ar.edu.nivi.lectura;

import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.AtomicFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.UUID;

/** Copia solo los URI entregados por el usuario; no solicita acceso general al almacenamiento. */
@CapacitorPlugin(name = "EntradaEpub")
public class EntradaEpubPlugin extends Plugin {
    private static final long LIMITE = 20L * 1024 * 1024;
    private static final int MAX_PENDIENTES = 5;

    private File directorio() throws IOException {
        File dir = new File(getContext().getFilesDir(), "epub-recibidos");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("No hay espacio para recibir el archivo.");
        return dir;
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || !(Intent.ACTION_VIEW.equals(intent.getAction()) ||
            Intent.ACTION_SEND.equals(intent.getAction()) || Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) return;
        final Intent recibido = new Intent(intent);
        // Evita volver a importar el último Intent cuando Android recrea la actividad.
        getActivity().setIntent(new Intent(getContext(), MainActivity.class).setAction(Intent.ACTION_MAIN));
        execute(() -> recibir(recibido));
    }

    @SuppressWarnings("deprecation")
    private void recibir(Intent intent) {
        try {
            File[] actuales = directorio().listFiles((d, n) -> n.endsWith(".json"));
            if (actuales != null && actuales.length >= MAX_PENDIENTES) {
                notifyListeners("errorRecepcion", new JSObject().put("mensaje", "Hay varios EPUB pendientes. Abrí NIVI para terminar de importarlos."), true); return;
            }
            LinkedHashSet<Uri> uris = new LinkedHashSet<>();
            if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) uris.add(intent.getData());
            if (Intent.ACTION_SEND.equals(intent.getAction())) {
                Object extra = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (extra instanceof Uri) uris.add((Uri) extra);
            }
            if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
                ArrayList<?> extras = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (extras != null) for (Object extra : extras) { if (extra instanceof Uri) uris.add((Uri) extra); if (uris.size() >= MAX_PENDIENTES) break; }
            }
            ClipData clips = intent.getClipData();
            if (clips != null) for (int i = 0; i < clips.getItemCount() && uris.size() < MAX_PENDIENTES; i++) {
                Uri uri = clips.getItemAt(i).getUri(); if (uri != null) uris.add(uri);
            }
            if (uris.isEmpty()) guardarError("No recibimos un archivo EPUB. Compartí el archivo descargado, no un enlace.");
            else for (Uri uri : uris) {
                File[] cola = directorio().listFiles((d, n) -> n.endsWith(".json"));
                if (cola != null && cola.length >= MAX_PENDIENTES) {
                    notifyListeners("errorRecepcion", new JSObject().put("mensaje", "Hay varios archivos pendientes. Abrí NIVI para terminar de importarlos."), true); break;
                }
                copiar(uri, intent.getType());
            }
            notifyListeners("epubRecibido", new JSObject(), true);
        } catch (Exception error) {
            notifyListeners("errorRecepcion", new JSObject().put("mensaje", "No pudimos recibir el archivo. Revisá el espacio disponible y volvé a compartirlo."), true);
        }
    }

    private void copiar(Uri uri, String tipoIntent) throws IOException {
        String id = UUID.randomUUID().toString();
        File archivo = new File(directorio(), id + ".epub");
        JSObject registro = new JSObject().put("id", id);
        try {
            if (!"content".equals(uri.getScheme())) throw new IOException("El archivo debe compartirse con permiso de lectura desde la app de origen.");
            String nombre = null, tipo = getContext().getContentResolver().getType(uri);
            long tamano = -1;
            try (Cursor cursor = getContext().getContentResolver().query(uri,
                new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE }, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int ni = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME), ti = cursor.getColumnIndex(OpenableColumns.SIZE);
                    if (ni >= 0) nombre = cursor.getString(ni);
                    if (ti >= 0 && !cursor.isNull(ti)) tamano = cursor.getLong(ti);
                }
            }
            if (nombre == null) nombre = uri.getLastPathSegment();
            boolean mimeEpub = "application/epub+zip".equals(tipo) || "application/epub+zip".equals(tipoIntent) || "application/x-epub+zip".equals(tipo) || "application/x-epub+zip".equals(tipoIntent);
            if (!mimeEpub && (nombre == null || !nombre.toLowerCase(Locale.ROOT).endsWith(".epub"))) throw new IOException("NIVI solo puede recibir archivos EPUB.");
            if (tamano > LIMITE) throw new IOException("El EPUB supera el límite de 20 MiB.");
            nombre = nombre == null ? "Libro compartido.epub" : nombre.replace('\\', '/');
            nombre = nombre.substring(nombre.lastIndexOf('/') + 1);
            if (nombre.length() > 200) nombre = nombre.substring(nombre.length() - 200);
            long total = 0;
            try (InputStream entrada = getContext().getContentResolver().openInputStream(uri);
                 FileOutputStream salida = new FileOutputStream(archivo)) {
                if (entrada == null) throw new IOException("No pudimos acceder al archivo compartido.");
                byte[] bloque = new byte[65536]; int leidos;
                while ((leidos = entrada.read(bloque)) != -1) {
                    total += leidos; if (total > LIMITE) throw new IOException("El EPUB supera el límite de 20 MiB.");
                    salida.write(bloque, 0, leidos);
                }
                if (total == 0) throw new IOException("El archivo recibido está vacío.");
                salida.getFD().sync();
            }
            registro.put("nombre", nombre).put("tamano", total).put("ruta", Uri.fromFile(archivo).toString());
        } catch (Exception error) {
            if (archivo.exists()) archivo.delete();
            registro.put("error", error instanceof IOException ? error.getMessage() : "No pudimos leer el archivo. Volvé a compartirlo desde la app de origen.");
        }
        try { guardarRegistro(id, registro); }
        catch (IOException error) { if (archivo.exists()) archivo.delete(); throw error; }
    }

    private void guardarRegistro(String id, JSObject registro) throws IOException {
        AtomicFile atomico = new AtomicFile(new File(directorio(), id + ".json"));
        FileOutputStream salida = null;
        try { salida = atomico.startWrite(); salida.write(registro.toString().getBytes(StandardCharsets.UTF_8)); atomico.finishWrite(salida); }
        catch (IOException error) { if (salida != null) atomico.failWrite(salida); throw error; }
    }

    private void guardarError(String mensaje) throws IOException {
        String id = UUID.randomUUID().toString(); guardarRegistro(id, new JSObject().put("id", id).put("error", mensaje));
    }

    @PluginMethod
    public void pendientes(PluginCall call) {
        try {
            File dir = directorio(); File[] archivos = dir.listFiles((d, n) -> n.endsWith(".json"));
            JSArray salida = new JSArray();
            if (archivos != null) {
                Arrays.sort(archivos, Comparator.comparingLong(File::lastModified));
                for (File archivo : archivos) salida.put(new JSObject(new String(Files.readAllBytes(archivo.toPath()), StandardCharsets.UTF_8)));
            }
            call.resolve(new JSObject().put("archivos", salida));
        } catch (Exception error) { call.reject("No pudimos recuperar los EPUB recibidos."); }
    }

    @PluginMethod
    public void confirmar(PluginCall call) {
        String id = call.getString("id", "");
        if (!id.matches("[a-f0-9-]{36}")) { call.reject("Identificador inválido."); return; }
        try {
            File dir = directorio(), archivo = new File(dir, id + ".epub");
            if (archivo.exists() && !archivo.delete()) throw new IOException();
            new AtomicFile(new File(dir, id + ".json")).delete(); call.resolve();
        } catch (Exception error) { call.reject("No pudimos limpiar el archivo de recepción."); }
    }
}
