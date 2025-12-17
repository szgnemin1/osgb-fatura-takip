
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Loglama (Opsiyonel ama hata ayıklama için iyidir)
// autoUpdater.logger = require("electron-log");
// autoUpdater.logger.transports.file.level = "info";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 400,
    minHeight: 300,
    resizable: true,
    title: "OSGB Fatura Takip",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false // Prodüksiyonda false
    },
    autoHideMenuBar: true,
    frame: true
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`;
  
  win.loadURL(startUrl);

  // Dış bağlantıları varsayılan tarayıcıda aç
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // --- GÜNCELLEME KONTROLÜ ---
  
  // Uygulama tamamen yüklendikten ve pencere açıldıktan sonra kontrol et
  win.once('ready-to-show', () => {
    // Sadece paketlenmiş (prodüksiyon) uygulamada çalışır
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // Güncelleme mevcut
  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available');
  });

  // Güncelleme indirildi
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded');
  });
}

// React tarafından gelen "Yeniden Başlat" emri
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
