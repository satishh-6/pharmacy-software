const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;
let tray;
let serverProcess;

// Server URL — production mein Render URL use hoga
const SERVER_URL = 'https://medxpert-pharmacy.onrender.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'MedXpert Pharmacy',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    backgroundColor: '#f0f4f8'
  });

  // Render.com URL load karo
  mainWindow.loadURL(SERVER_URL);

  // Loading screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Loading failed toh retry
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(SERVER_URL);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // System tray icon
  const trayIcon = nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '💊 MedXpert Pharmacy', enabled: false },
    { type: 'separator' },
    { label: '🔄 Reload', click: () => mainWindow?.reload() },
    { label: '🖥️ Show Window', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '❌ Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('MedXpert Pharmacy');
}

// App Menu
const menuTemplate = [
  {
    label: '💊 MedXpert',
    submenu: [
      { label: 'About', click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({ title: 'MedXpert Pharmacy', message: 'Version 1.0\nPowered by MedXpert', buttons: ['OK'] });
      }},
      { type: 'separator' },
      { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
    ]
  },
  {
    label: 'Navigation',
    submenu: [
      { label: '🏠 Dashboard', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.loadURL(SERVER_URL+'/index.html') },
      { label: '📦 Stock', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.loadURL(SERVER_URL+'/stock.html') },
      { label: '🧾 Billing', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.loadURL(SERVER_URL+'/billing.html') },
      { label: '🛒 Purchase', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.loadURL(SERVER_URL+'/purchase.html') },
      { label: '📊 Reports', accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.loadURL(SERVER_URL+'/reports.html') }
    ]
  },
  {
    label: 'View',
    submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
      { label: 'Full Screen', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel()+0.5) },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel()-0.5) },
      { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomLevel(0) }
    ]
  }
];

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