
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ip = require('ip');

// Pencere referansını global tutuyoruz
let mainWindow;
const PORT = 5000;

// --- VERİTABANI YOLU ---
const getDbPath = () => {
    const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    const dir = path.join(APPDATA, 'OSGB Fatura Takip');
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    return path.join(dir, 'database.json');
};

const dbPath = getDbPath();

// --------------------------------------------------
// EXPRESS SERVER (YEREL AĞ PAYLAŞIMI İÇİN)
// --------------------------------------------------
const server = express();
server.use(cors());
server.use(bodyParser.json({ limit: '50mb' }));

// 1. Statik Dosyaları Sun (React Build Dosyaları)
// Eğer build klasörü varsa oradan sunar, yoksa public'ten (Dev modunda API çalışır, UI React server'dan gelir)
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
    server.use(express.static(buildPath));
}

// 2. API: Veritabanını Oku (GET)
server.get('/api/data', (req, res) => {
    if (fs.existsSync(dbPath)) {
        try {
            const data = fs.readFileSync(dbPath, 'utf-8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: 'Veritabanı okunamadı' });
        }
    } else {
        res.json({}); // Boş DB
    }
});

// 3. API: Veritabanını Yaz (POST)
server.post('/api/save', (req, res) => {
    try {
        const newData = req.body;
        // Mevcut veriyi oku (Güvenlik için yedekleme yapılabilir)
        fs.writeFileSync(dbPath, JSON.stringify(newData, null, 2));
        
        // Ana pencereye haber ver (UI güncellensin)
        if (mainWindow) {
            mainWindow.webContents.send('external-update');
        }
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Kayıt başarısız' });
    }
});

// 4. React App Fallback (SPA için her isteği index.html'e yönlendir)
server.get('*', (req, res) => {
    if (fs.existsSync(path.join(buildPath, 'index.html'))) {
        res.sendFile(path.join(buildPath, 'index.html'));
    } else {
        res.send('OSGB Pro Server Çalışıyor. UI için uygulamayı build ediniz.');
    }
});

// Sunucuyu Başlat
server.listen(PORT, '0.0.0.0', () => {
    console.log(`OSGB Sunucusu Başlatıldı: http://${ip.address()}:${PORT}`);
});

// --------------------------------------------------
// ELECTRON PENCERE YÖNETİMİ
// --------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    title: "OSGB Fatura Takip",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
      webSecurity: false // Yerel fetch istekleri için
    },
    autoHideMenuBar: true,
    frame: true,
    show: false // Hazır olunca göster (Beyaz ekranı engeller)
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Pencere tamamen yüklendiğinde göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
      mainWindow = null;
  });

  autoUpdater.on('update-available', () => mainWindow.webContents.send('update_available'));
  autoUpdater.on('update-downloaded', () => mainWindow.webContents.send('update_downloaded'));
}

// IPC: Renderer process IP adresini istediginde
ipcMain.on('get-local-ip', (event) => {
    event.returnValue = ip.address();
});

ipcMain.on('get-db-path', (event) => {
    event.returnValue = dbPath; 
});

ipcMain.on('restart_app', () => autoUpdater.quitAndInstall());

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
