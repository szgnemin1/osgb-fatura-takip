
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { autoUpdater } = require('electron-updater');

// Pencere referansını global tutuyoruz ki API içinden erişebilelim
let mainWindow;

// --- SERVER AYARLARI (Telefondan Erişim İçin) ---
const SERVER_PORT = 5000;
const serverApp = express();

// --- TEK GERÇEK KAYNAK: Veritabanı Yolu ---
const getDbPath = () => {
    const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    const dir = path.join(APPDATA, 'OSGB Fatura Takip');
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    return path.join(dir, 'database.json');
};

const dbPath = getDbPath();

const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
};

// Middleware
serverApp.use(cors());
serverApp.use(bodyParser.json({ limit: '50mb' }));

// 1. Statik Dosyaları Sun
const buildPath = app.isPackaged 
    ? path.join(__dirname) 
    : path.join(__dirname, '../build');

if (fs.existsSync(buildPath)) {
    serverApp.use(express.static(buildPath));
}

// 2. API: Veritabanını Oku (GET)
serverApp.get('/api/db', (req, res) => {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      res.json(data ? JSON.parse(data) : {});
    } catch (e) {
      res.json({}); 
    }
  } else {
    res.json({}); 
  }
});

// 3. API: Veritabanını Güncelle (POST) - KRİTİK GÜNCELLEME
serverApp.post('/api/db', (req, res) => {
  try {
    const data = req.body;
    // 1. Dosyaya Yaz
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    
    // 2. Masaüstü Uygulamasına Haber Ver (Canlı Senkronizasyon)
    if (mainWindow) {
        mainWindow.webContents.send('external-data-update');
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Veritabanı yazılamadı' });
  }
});

// React Router Yönlendirmesi
serverApp.get('*', (req, res) => {
  if (fs.existsSync(path.join(buildPath, 'index.html'))) {
      res.sendFile(path.join(buildPath, 'index.html'));
  } else {
      res.send(`<h1>Sistem Başlatılıyor...</h1>`);
  }
});

// Sunucuyu Başlat
let server;
const startServer = () => {
    server = serverApp.listen(SERVER_PORT, '0.0.0.0', () => {
        console.log(`\n✅ SUNUCU AKTİF: http://localhost:${SERVER_PORT}`);
        console.log(`📂 VERİTABANI: ${dbPath}\n`);
    });
}

// --------------------------------------------------
// ELECTRON PENCERE YÖNETİMİ
// --------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: "OSGB Fatura Takip",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true // Geliştirme modunda konsolu açabilmek için
    },
    autoHideMenuBar: true,
    frame: true,
    resizable: true, // Kullanıcı boyutlandırabilir
    maximizable: true, // Tam ekran yapılabilir
    fullscreenable: true
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.once('ready-to-show', () => {
    if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on('closed', () => {
      mainWindow = null;
  });

  autoUpdater.on('update-available', () => mainWindow.webContents.send('update_available'));
  autoUpdater.on('update-downloaded', () => mainWindow.webContents.send('update_downloaded'));
}

ipcMain.on('get-db-path', (event) => {
    event.returnValue = dbPath; 
});

ipcMain.on('restart_app', () => autoUpdater.quitAndInstall());

app.whenReady().then(() => {
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) server.close(); 
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
