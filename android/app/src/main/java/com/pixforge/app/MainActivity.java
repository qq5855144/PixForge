package com.pixforge.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle state) {
        registerPlugin(PixForgeFilesPlugin.class);
        super.onCreate(state);
    }
}
