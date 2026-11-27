package com.pixforge.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "PixForgeFiles")
public class PixForgeFilesPlugin extends Plugin {
    private static final long IMPORT_LIMIT = 100L * 1024 * 1024;
    private static final long BATCH_LIMIT = 512L * 1024 * 1024;
    private static final long CACHE_AGE_MS = 24L * 60 * 60 * 1000;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final AtomicBoolean saving = new AtomicBoolean();
    private JSArray imports = new JSArray();
    private int importErrors = 0;

    @Override
    public void load() {
        io.execute(() -> {
            cleanup(new File(getContext().getCacheDir(), "pixforge-exports"));
            cleanup(new File(getContext().getCacheDir(), "pixforge-inbox"));
        });
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || (!Intent.ACTION_SEND.equals(intent.getAction()) &&
            !Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction()))) return;
        Set<Uri> uris = new LinkedHashSet<>();
        ClipData clip = intent.getClipData();
        if (clip != null) {
            for (int i = 0; i < Math.min(300, clip.getItemCount()); i++) {
                uris.add(clip.getItemAt(i).getUri());
            }
        }
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            Object stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream instanceof Uri) uris.add((Uri) stream);
        } else {
            java.util.ArrayList<Uri> multiple = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (multiple != null) {
                for (Object uri : multiple.subList(0, Math.min(300, multiple.size()))) {
                    if (uri instanceof Uri) uris.add((Uri) uri);
                }
            }
        }
        io.execute(() -> importFiles(uris));
    }

    private void importFiles(Set<Uri> uris) {
        ContentResolver resolver = getContext().getContentResolver();
        long total = 0;
        int count = 0;
        for (Uri uri : uris) {
            if (uri == null || !ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) continue;
            if (++count > 300 || total >= BATCH_LIMIT) {
                importErrors++;
                continue;
            }
            File staged = null;
            try {
                String mime = resolver.getType(uri);
                if (mime != null && !mime.startsWith("image/") && !mime.equals("application/octet-stream")) {
                    throw new IOException("Unsupported shared type");
                }
                String name = "image";
                try (Cursor cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) name = cursor.getString(0);
                }
                name = cleanName(name);
                String id = UUID.randomUUID().toString();
                staged = new File(folder("pixforge-inbox"), id);
                try (InputStream in = resolver.openInputStream(uri); OutputStream out = new FileOutputStream(staged)) {
                    total += transfer(in, out, Math.min(IMPORT_LIMIT, BATCH_LIMIT - total));
                }
                JSObject file = new JSObject();
                file.put("id", id);
                file.put("name", name);
                file.put("path", staged.getAbsolutePath());
                file.put("mime", mime != null ? mime : "application/octet-stream");
                imports.put(file);
            } catch (Exception error) {
                if (staged != null) staged.delete();
                importErrors++;
            }
        }
        notifyListeners("importsAvailable", new JSObject(), true);
    }

    @PluginMethod
    public void takeImports(PluginCall call) {
        io.execute(() -> {
            JSObject result = new JSObject();
            result.put("files", imports);
            result.put("errors", importErrors);
            imports = new JSArray();
            importErrors = 0;
            call.resolve(result);
        });
    }

    @PluginMethod
    public void releaseImport(PluginCall call) {
        io.execute(() -> {
            String id = call.getString("id", "");
            if (validId(id)) new File(new File(getContext().getCacheDir(), "pixforge-inbox"), id).delete();
            call.resolve();
        });
    }

    @PluginMethod
    public void begin(PluginCall call) {
        io.execute(() -> {
            try {
                String id = UUID.randomUUID().toString();
                File dir = new File(folder("pixforge-exports"), id);
                if (!dir.mkdir()) throw new IOException("Could not create export folder");
                File file = new File(dir, cleanName(call.getString("name", "image")));
                if (!file.createNewFile()) throw new IOException("Could not create export");
                JSObject result = new JSObject();
                result.put("id", id);
                call.resolve(result);
            } catch (Exception error) { call.reject("无法创建导出文件", error); }
        });
    }

    @PluginMethod
    public void append(PluginCall call) {
        io.execute(() -> {
            try {
                File file = exportFile(call.getString("id", ""));
                String data = call.getString("data", "");
                if (data.length() > 400_000) throw new IOException("Invalid chunk size");
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                if (file.length() + bytes.length > BATCH_LIMIT) throw new IOException("Export exceeds cache limit");
                try (OutputStream out = new FileOutputStream(file, true)) { out.write(bytes); }
                call.resolve();
            } catch (Exception error) { call.reject("无法写入导出文件（单次最多 512 MB）", error); }
        });
    }

    @PluginMethod
    public void save(PluginCall call) {
        io.execute(() -> {
            try {
                File file = exportFile(call.getString("id", ""));
                if (!saving.compareAndSet(false, true)) {
                    call.reject("正在保存另一个文件");
                    return;
                }
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(call.getString("mime", "application/octet-stream"))
                    .putExtra(Intent.EXTRA_TITLE, file.getName());
                bridge.executeOnMainThread(() -> {
                    try { startActivityForResult(call, intent, "saveResult"); }
                    catch (Exception error) { saving.set(false); call.reject("无法打开系统文件选择器", error); }
                });
            } catch (Exception error) { call.reject("无法打开导出文件", error); }
        });
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) { saving.set(false); return; }
        io.execute(() -> {
            Uri uri = result.getData() == null ? null : result.getData().getData();
            try {
                if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
                    JSObject response = new JSObject();
                    response.put("canceled", true);
                    call.resolve(response);
                    return;
                }
                File file = exportFile(call.getString("id", ""));
                try (InputStream in = new FileInputStream(file);
                     OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    transfer(in, out, BATCH_LIMIT);
                }
                call.resolve(new JSObject().put("canceled", false));
            } catch (Exception error) {
                if (uri != null) {
                    try { DocumentsContract.deleteDocument(getContext().getContentResolver(), uri); }
                    catch (Exception ignored) { /* A provider may not support deletion. */ }
                }
                call.reject("保存失败", error);
            } finally { saving.set(false); }
        });
    }

    @PluginMethod
    public void share(PluginCall call) {
        io.execute(() -> {
            try {
                File file = exportFile(call.getString("id", ""));
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent send = new Intent(Intent.ACTION_SEND)
                    .setType(call.getString("mime", "application/octet-stream"))
                    .putExtra(Intent.EXTRA_STREAM, uri)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                send.setClipData(ClipData.newRawUri(file.getName(), uri));
                bridge.executeOnMainThread(() -> {
                    try {
                        getActivity().startActivity(Intent.createChooser(send, "分享文件"));
                        call.resolve();
                    } catch (Exception error) { call.reject("无法分享文件", error); }
                });
            } catch (Exception error) { call.reject("无法分享文件", error); }
        });
    }

    @PluginMethod
    public void discard(PluginCall call) {
        io.execute(() -> {
            try {
                File file = exportFile(call.getString("id", ""));
                file.delete();
                file.getParentFile().delete();
            } catch (IOException ignored) { /* Already removed. */ }
            call.resolve();
        });
    }

    private static boolean validId(String id) { return id.matches("[a-f0-9-]{36}"); }

    private File exportFile(String id) throws IOException {
        if (!validId(id)) throw new IOException("Invalid export ID");
        File dir = new File(new File(getContext().getCacheDir(), "pixforge-exports"), id);
        File[] files = dir.listFiles(File::isFile);
        if (files == null || files.length != 1) throw new IOException("Export not found");
        return files[0];
    }

    private File folder(String name) throws IOException {
        File dir = new File(getContext().getCacheDir(), name);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cache directory not available");
        return dir;
    }

    private static String cleanName(String name) {
        String clean = new File(name.replace('\\', '/')).getName().replaceAll("[\\p{Cntrl}]", "_").trim();
        if (clean.isEmpty() || clean.equals(".") || clean.equals("..")) return "image";
        return clean.length() <= 180 ? clean : clean.substring(0, 180);
    }

    private static long transfer(InputStream in, OutputStream out, long limit) throws IOException {
        if (in == null || out == null) throw new IOException("File stream not available");
        byte[] buffer = new byte[64 * 1024];
        long total = 0;
        int read;
        while ((read = in.read(buffer)) != -1) {
            total += read;
            if (total > limit) throw new IOException("File exceeds size limit");
            out.write(buffer, 0, read);
        }
        return total;
    }

    private static void cleanup(File dir) {
        File[] children = dir.listFiles();
        if (children == null) return;
        long oldest = System.currentTimeMillis() - CACHE_AGE_MS;
        for (File child : children) {
            if (child.isDirectory()) cleanup(child);
            if (child.lastModified() < oldest) child.delete();
        }
    }

    @Override
    protected void handleOnDestroy() {
        io.shutdown();
    }
}
