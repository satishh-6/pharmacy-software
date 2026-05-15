const { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let tray;

// ✅ Render.com URL — git push ke baad update hoga
const SERVER_URL = 'https://dawahisaab.onrender.com';

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

  mainWindow.loadURL(SERVER_URL + '/signup.html');

  // Zoom fix
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0);
  });

  // Loading failed → retry
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
    console.log('Load failed:', errorDesc);
    setTimeout(() => mainWindow?.loadURL(SERVER_URL + '/signup.html'), 3000);
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
    const trayIcon = nativeImage.createEmpty();
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: '💊 Dawa Hisaab', enabled: false },
      { type: 'separator' },
      { label: '🔄 Reload', click: () => mainWindow?.reload() },
      { label: '🖥️ Show Window', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: '🏠 Dashboard', click: () => mainWindow?.loadURL(SERVER_URL + '/index.html') },
      { type: 'separator' },
      { label: '❌ Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Dawa Hisaab');
  } catch(e) {
    console.log('Tray error:', e.message);
  }
}

// ── APP MENU ──
const menuTemplate = [
  {
    label: '💊 Dawa Hisaab',
    submenu: [
      { label: 'About', click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({ title: 'Dawa Hisaab', message: 'Smart Pharmacy Management\nVersion 1.0', buttons: ['OK'] });
      }},
      { type: 'separator' },
      { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
    ]
  },
  {
    label: 'Navigation',
    submenu: [
      { label: '🏠 Dashboard',      accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.loadURL(SERVER_URL + '/index.html') },
      { label: '📦 Stock',          accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.loadURL(SERVER_URL + '/stock.html') },
      { label: '🧾 Billing',        accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.loadURL(SERVER_URL + '/billing.html') },
      { label: '🛒 Purchase',       accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.loadURL(SERVER_URL + '/purchase.html') },
      { label: '📊 Reports',        accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.loadURL(SERVER_URL + '/reports.html') },
      { label: '👥 Customers',      accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.loadURL(SERVER_URL + '/customers.html') },
      { label: '⚙️ Settings',       accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.loadURL(SERVER_URL + '/profile.html') },
      { label: '🔑 Login',                                       click: () => mainWindow?.loadURL(SERVER_URL + '/signup.html') }
    ]
  },
  {
    label: 'View',
    submenu: [
      { label: 'Reload',       accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
      { label: 'Full Screen',  accelerator: 'F11',          click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
      { label: 'Zoom In',      accelerator: 'CmdOrCtrl+=',  click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
      { label: 'Zoom Out',     accelerator: 'CmdOrCtrl+-',  click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
      { label: 'Reset Zoom',   accelerator: 'CmdOrCtrl+0',  click: () => mainWindow?.webContents.setZoomLevel(0) },
      { label: 'DevTools',     accelerator: 'F12',           click: () => mainWindow?.webContents.toggleDevTools() }
    ]
  }
];

// ── APP READY ──
app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('browser-window-focus', () => {
  globalShortcut.unregisterAll();
});
