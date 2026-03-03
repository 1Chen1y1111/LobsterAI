"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const APP_NAME = "LobsterAI";
electron.app.name = APP_NAME;
electron.app.setName(APP_NAME);
const isDev = process.env.NODE_ENV === "development";
process.platform === "linux";
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || "http://localhost:5176";
const PRELOAD_PATH = electron.app.isPackaged ? path.join(__dirname, "preload.js") : path.join(__dirname, "../dist-electron/preload.js");
const getAppIconPath = () => {
  if (process.platform !== "win32" && process.platform !== "linux")
    return void 0;
  const basePath = electron.app.isPackaged ? path.join(process.resourcesPath, "tray") : path.join(__dirname, "..", "resources", "tray");
  return process.platform === "win32" ? path.join(basePath, "tray-icon.ico") : path.join(basePath, "tray-icon.png");
};
let mainWindow = null;
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  console.log(666);
  electron.app.on("second-instance", (_event, commandLine, workingDirectory) => {
    console.log("[Main] second-instance event", {
      commandLine,
      workingDirectory
    });
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      if (!mainWindow.isFocused()) mainWindow.focus();
    }
  });
  const setContentSecurityPolicy = () => {
    electron.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      var _a, _b;
      const devPort = ((_b = (_a = process.env.ELECTRON_START_URL) == null ? void 0 : _a.match(/:(\d+)/)) == null ? void 0 : _b[1]) || "5176";
      const cspDirectives = [
        "default-src 'self'",
        isDev ? `script-src 'self' 'unsafe-inline' http://localhost:${devPort} ws://localhost:${devPort}` : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http:",
        // 允许连接到所有域名，不做限制
        "connect-src *",
        "font-src 'self' data:",
        "media-src 'self'",
        "worker-src 'self' blob:",
        "frame-src 'self'"
      ];
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": cspDirectives.join("; ")
        }
      });
    });
  };
  const createWindow = () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      if (!mainWindow.isFocused()) mainWindow.focus();
      return;
    }
    mainWindow = new electron.BrowserWindow({
      width: 1200,
      height: 800,
      title: APP_NAME,
      icon: getAppIconPath(),
      ...isMac ? {
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 12, y: 20 }
      } : isWindows ? {
        frame: false,
        titleBarStyle: "hidden"
      } : {
        titleBarStyle: "hidden"
        // titleBarOverlay: getTitleBarOverlayOptions(),
      },
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: PRELOAD_PATH,
        backgroundThrottling: false,
        devTools: isDev,
        spellcheck: false,
        enableWebSQL: false,
        autoplayPolicy: "document-user-activation-required",
        disableDialogs: true,
        navigateOnDragDrop: false
      },
      backgroundColor: "#F8F9FB",
      show: false,
      autoHideMenuBar: true,
      enableLargerThanScreen: false
    });
    if (isMac && isDev) {
      const iconPath = path.join(__dirname, "../build/icons/png/512x512.png");
      if (fs.existsSync(iconPath)) {
        electron.app.dock.setIcon(electron.nativeImage.createFromPath(iconPath));
      }
    }
    mainWindow.setMenu(null);
    mainWindow.setMinimumSize(800, 600);
    if (isDev) {
      const maxRetries = 3;
      let retryCount = 0;
      const tryLoadURL = () => {
        mainWindow == null ? void 0 : mainWindow.loadURL(DEV_SERVER_URL).catch((err) => {
          console.error("Failed to load URL:", err);
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(
              `Retrying to load URL (${retryCount}/${maxRetries})...`
            );
            setTimeout(tryLoadURL, 3e3);
          } else {
            console.error("Failed to load URL after maximum retries");
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadFile(
                path.join(__dirname, "../resources/error.html")
              );
            }
          }
        });
      };
      tryLoadURL();
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
    mainWindow.once("ready-to-show", () => {
      mainWindow == null ? void 0 : mainWindow.show();
    });
    electron.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  };
  const initApp = async () => {
    console.log("[Main] initApp: waiting for app.whenReady()");
    await electron.app.whenReady();
    console.log("[Main] initApp: app is ready");
    const defaultProjectDir = path.join(os.homedir(), "lobsterai", "project");
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true });
      console.log("Created default project directory:", defaultProjectDir);
    }
    console.log("[Main] initApp: default project dir ensured");
    console.log("[Main] initApp: store initialized");
    setContentSecurityPolicy();
    console.log("[Main] initApp: creating window");
    createWindow();
    console.log("[Main] initApp: window created");
    electron.app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (!mainWindow.isFocused()) mainWindow.focus();
        return;
      }
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  };
  initApp().catch(console.error);
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
}
//# sourceMappingURL=main.js.map
