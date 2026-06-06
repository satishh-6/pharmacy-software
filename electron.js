const { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow, tray, localHttpServer;
const LOCAL_PORT = 3001;

// ── LOCAL SERVER START ──
function startLocalServer() {
  const localApp = require('./local-server');
  const { startSyncMonitor } = require('./sync-manager');

  localHttpServer = http.createServer(localApp);
  localHttpServer.listen(LOCAL_PORT, '127.0.0.1', () => {
    console.log(`✅ Local server started on port ${LOCAL_PORT}`);
  });

  localHttpServer.on('error', (e) => {
    console.error('❌ Local server error:', e.message);
  });

  startSyncMonitor((online) => {
    console.log('🌐 Status:', online ? 'Online — syncing' : 'Offline — local mode');
  });
}

// ── CREATE WINDOW ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Dawa Hisaab',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false,
    backgroundColor: '#f0f4f8'
  });

  const loadApp = () => {
    mainWindow.loadURL(`http://127.0.0.1:${LOCAL_PORT}/signup.html`);
  };

  setTimeout(loadApp, 1500);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
    console.log('Load failed:', errorDesc);
    setTimeout(loadApp, 3000);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── SYSTEM TRAY ──
function createTray() {
  try {
    const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    const contextMenu = Menu.buildFromTemplate([
      { label: '💊 Dawa Hisaab', enabled: false },
      { type: 'separator' },
      { label: '🔄 Reload', click: () => mainWindow?.reload() },
      { label: '🖥️ Show Window', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: '🏠 Dashboard', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/index.html`) },
      { type: 'separator' },
      { label: '❌ Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Dawa Hisaab');
  } catch(e) {
    console.log('Tray error:', e.message);
  }
}

// ── MENU ──
const menuTemplate = [
  {
    label: '💊 Dawa Hisaab',
    submenu: [
      { label: 'About', click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({
          title: 'Dawa Hisaab',
          message: 'Smart Pharmacy Management\nVersion 1.0\nRudraX System',
          buttons: ['OK']
        });
      }},
      { type: 'separator' },
      { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
    ]
  },
  {
    label: 'Navigation',
    submenu: [
      { label: '🏠 Dashboard',  accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/index.html`) },
      { label: '📦 Stock',      accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/stock.html`) },
      { label: '🧾 Billing',    accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/billing.html`) },
      { label: '🛒 Purchase',   accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/purchase.html`) },
      { label: '📊 Reports',    accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/reports.html`) },
      { label: '👥 Customers',  accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/customers.html`) },
      { label: '⚙️ Settings',   accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/profile.html`) },
      { label: '🔑 Login',                                   click: () => mainWindow?.loadURL(`http://127.0.0.1:${LOCAL_PORT}/signup.html`) }
    ]
  },
  {
    label: 'View',
    submenu: [
      { label: 'Reload',      accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
      { label: 'Full Screen', accelerator: 'F11',          click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
      { label: 'Zoom In',     accelerator: 'CmdOrCtrl+=',  click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
      { label: 'Zoom Out',    accelerator: 'CmdOrCtrl+-',  click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
      { label: 'Reset Zoom',  accelerator: 'CmdOrCtrl+0',  click: () => mainWindow?.webContents.setZoomLevel(0) },
      { label: 'DevTools',    accelerator: 'F12',           click: () => mainWindow?.webContents.toggleDevTools() }
    ]
  }
];

// ── APP READY ──
app.whenReady().then(() => {
  startLocalServer();

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ── CLEANUP ──
app.on('window-all-closed', () => {
  try {
    const { stopSync } = require('./sync-manager');
    stopSync();
  } catch(e) {}
  if (localHttpServer) localHttpServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('browser-window-focus', () => {
  globalShortcut.unregisterAll();
});