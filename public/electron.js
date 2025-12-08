const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 768,
    title: "OSGB Fatura Takip",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false // Prodüksiyonda DevTools kapalı olsun
    },
    autoHideMenuBar: true, // Üst menüyü gizle
    frame: true // Standart Windows çerçevesi
  });

  // Uygulama build edildiğinde build klasöründen çalışır
  // Geliştirme modunda ise localhost'tan
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`;
  
  win.loadURL(startUrl);

  // ÖNEMLİ: Dış bağlantıların (Instagram, Github vb.) uygulama içinde değil, 
  // kullanıcının varsayılan tarayıcısında (Chrome/Edge) açılmasını sağlar.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

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