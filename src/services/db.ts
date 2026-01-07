
import { Firm, Transaction, TransactionType, PreparationItem, InvoiceType, GlobalSettings } from '../types';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const STORAGE_KEYS = {
  FIRMS: 'osgb_firms',
  TRANSACTIONS: 'osgb_transactions',
  PREPARATION: 'osgb_preparation',
  GLOBAL_SETTINGS: 'osgb_global_settings',
  LOGS: 'osgb_logs'
};

let fs: any;
let dbFilePath: string = '';
const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';
const isBrowserClient = !isElectron; 

// --- EVENT EMITTER SİSTEMİ (Canlı Güncelleme İçin) ---
type Listener = () => void;
let listeners: Listener[] = [];

const notifyListeners = () => {
    listeners.forEach(l => l());
};

// API URL
const getApiUrl = () => {
    const port = window.location.port;
    if (port === '3000') return `${window.location.protocol}//${window.location.hostname}:5000/api/db`;
    return `/api/db`;
};

// --- MASAÜSTÜ ENTEGRASYONU ---
if (isElectron) {
  try {
    const requireFunc = (window as any).require;
    fs = requireFunc('fs');
    const { ipcRenderer } = requireFunc('electron');
    
    dbFilePath = ipcRenderer.sendSync('get-db-path');
    console.log("Veritabanı Yolu:", dbFilePath);

    // DOSYA İZLEME (PC'de dosya değişirse -örn: telefondan veri gelirse- tetiklenir)
    if (fs && dbFilePath) {
        fs.watchFile(dbFilePath, { interval: 1000 }, () => {
            console.log("⚠️ Dosya dışarıdan değişti, veriler yenileniyor...");
            db.initData(true).then(() => {
                notifyListeners(); // Sayfalara haber ver
            });
        });
    }

  } catch (e) {
    console.error("Electron modülleri yüklenemedi:", e);
  }
}

// --- MOBİL İÇİN POLLING (Periyodik Kontrol) ---
if (isBrowserClient) {
    setInterval(async () => {
        // Her 5 saniyede bir sunucudan veriyi kontrol et
        const oldDataStr = JSON.stringify({
            firms: localStorage.getItem(STORAGE_KEYS.FIRMS),
            trans: localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
        });
        
        await db.initData();
        
        const newDataStr = JSON.stringify({
            firms: localStorage.getItem(STORAGE_KEYS.FIRMS),
            trans: localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
        });

        if (oldDataStr !== newDataStr) {
            console.log("🔄 Sunucudan yeni veri geldi, ekran güncelleniyor.");
            notifyListeners();
        }
    }, 5000);
}

// Diske Yazma
let saveTimeout: any = null;
const persistData = (sync: boolean = false) => {
    const fullData: any = {};
    Object.values(STORAGE_KEYS).forEach(k => {
        const item = localStorage.getItem(k);
        if(item) fullData[k] = item;
    });

    if (isElectron && fs && dbFilePath) {
        try {
            if (sync) {
                fs.writeFileSync(dbFilePath, JSON.stringify(fullData, null, 2));
            } else {
                fs.writeFile(dbFilePath, JSON.stringify(fullData, null, 2), (err: any) => {
                    if (err) console.error("Yazma hatası:", err);
                });
            }
        } catch(e) { console.error("Yazma hatası:", e); }
    } else if (isBrowserClient) {
        // Mobilde yazarken
        fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullData),
            keepalive: true 
        }).catch(e => console.error("Sunucuya yazma hatası:", e));
    }
};

const debounceSaveToDisk = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        persistData(false);
    }, 500); // Daha hızlı tepki
};

const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) { return defaultValue; }
};

const setStorage = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
  debounceSaveToDisk();
  notifyListeners(); // Arayüzü anlık güncelle
};

export const db = {
  // ABONELİK (React Componentleri buraya abone olacak)
  subscribe: (listener: Listener) => {
      listeners.push(listener);
      return () => {
          listeners = listeners.filter(l => l !== listener);
      };
  },

  initData: async (forceReadDisk = false) => {
    // 1. MASAÜSTÜ
    if (isElectron && fs && dbFilePath) {
        if (fs.existsSync(dbFilePath)) {
            try {
                const rawData = fs.readFileSync(dbFilePath, 'utf-8');
                const parsedData = JSON.parse(rawData);
                if (Object.keys(parsedData).length > 0) {
                    Object.keys(parsedData).forEach(key => {
                        if(parsedData[key]) localStorage.setItem(key, parsedData[key]);
                    });
                } else if (!forceReadDisk) {
                    persistData(true);
                }
            } catch (e) { console.error("Veritabanı okuma hatası:", e); }
        } else {
            persistData(true);
        }
    } 
    // 2. MOBİL / WEB
    else if (isBrowserClient) {
        try {
            const url = getApiUrl();
            const res = await fetch(url);
            if (res.ok) {
                const remoteData = await res.json();
                if (Object.keys(remoteData).length > 0) {
                    Object.keys(remoteData).forEach(key => {
                        if(remoteData[key]) localStorage.setItem(key, remoteData[key]);
                    });
                }
            }
        } catch (e) { console.error("Sunucu bağlantı hatası:", e); }
    }
  },

  forceSync: () => { persistData(true); notifyListeners(); },

  // --- GETTERS & SETTERS (Aynı Kalıyor) ---
  getFirms: (): Firm[] => getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []).sort((a, b) => a.name.localeCompare(b.name)),
  
  addFirm: (firm: Omit<Firm, 'id'>) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const newFirm = { ...firm, id: generateId() };
    setStorage(STORAGE_KEYS.FIRMS, [...firms, newFirm]);
    return newFirm;
  },

  updateFirm: (firm: Firm) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    setStorage(STORAGE_KEYS.FIRMS, firms.map(f => f.id === firm.id ? firm : f));
  },

  deleteFirm: (id: string) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    setStorage(STORAGE_KEYS.FIRMS, firms.filter(f => f.id !== id));
  },

  deleteFirmsBulk: (ids: string[]) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    setStorage(STORAGE_KEYS.FIRMS, firms.filter(f => !ids.includes(f.id)));
  },

  getTransactions: (): Transaction[] => getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).map(t => ({...t, status: t.status || 'APPROVED'})),

  addTransaction: (transaction: Omit<Transaction, 'id'>) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTransaction = { ...transaction, id: generateId() };
    setStorage(STORAGE_KEYS.TRANSACTIONS, [...transactions, newTransaction]);
    return newTransaction;
  },

  updateTransactionStatus: (id: string, status: 'APPROVED' | 'PENDING') => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setStorage(STORAGE_KEYS.TRANSACTIONS, transactions.map(t => t.id === id ? { ...t, status } : t));
  },

  deleteTransaction: (id: string) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setStorage(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
  },

  deleteTransactionsBulk: (ids: string[]) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setStorage(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => !ids.includes(t.id)));
  },

  getPreparationItems: (): PreparationItem[] => getStorage<PreparationItem[]>(STORAGE_KEYS.PREPARATION, []),
  
  savePreparationItems: (items: PreparationItem[]) => {
    setStorage(STORAGE_KEYS.PREPARATION, items);
  },

  getStats: () => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).filter(t => (t.status || 'APPROVED') === 'APPROVED');
    const billed = transactions.filter(t => t.type === TransactionType.INVOICE).reduce((sum, t) => sum + t.debt, 0);
    const collected = transactions.filter(t => t.type === TransactionType.PAYMENT).reduce((sum, t) => sum + t.credit, 0);
    return { totalBilled: billed, totalCollected: collected, balance: collected };
  },

  getGlobalSettings: (): GlobalSettings => getStorage<GlobalSettings>(STORAGE_KEYS.GLOBAL_SETTINGS, {
      expertPercentage: 60, doctorPercentage: 40, vatRateExpert: 20, vatRateDoctor: 10, vatRateHealth: 10, reportEmail: '', bankInfo: ''
  }),

  saveGlobalSettings: (settings: GlobalSettings) => { setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, settings); },

  getFullBackup: () => ({
      firms: getStorage(STORAGE_KEYS.FIRMS, []),
      transactions: getStorage(STORAGE_KEYS.TRANSACTIONS, []),
      preparation: getStorage(STORAGE_KEYS.PREPARATION, []),
      globalSettings: getStorage(STORAGE_KEYS.GLOBAL_SETTINGS, {}),
      backupDate: new Date().toISOString(),
      version: '2.0.0'
  }),

  restoreBackup: (data: any) => {
    try {
      if (data.firms) setStorage(STORAGE_KEYS.FIRMS, data.firms);
      if (data.transactions) setStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.preparation) setStorage(STORAGE_KEYS.PREPARATION, data.preparation);
      if (data.globalSettings) setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, data.globalSettings);
      persistData(true); 
      return true;
    } catch (e) { return false; }
  },

  getDbPath: () => isElectron ? dbFilePath : `Uzak Sunucu: ${window.location.hostname}`,
  
  getLocalIpAddress: () => {
      if (!isElectron) return "Tarayıcı";
      try {
          const os = (window as any).require('os');
          const interfaces = os.networkInterfaces();
          for (const name of Object.keys(interfaces)) {
              for (const iface of interfaces[name]) {
                  if (iface.family === 'IPv4' && !iface.internal) return iface.address;
              }
          }
          return "IP Yok";
      } catch (e) { return "Hata"; }
  },

  bulkImportFirms: (data: any) => { return { newFirmsCount: 0, newTransCount: 0 } },
  
  factoryReset: () => {
      localStorage.clear();
      if (isElectron && fs && dbFilePath) {
          try { fs.writeFileSync(dbFilePath, JSON.stringify({}, null, 2)); } catch (e) {}
      }
      notifyListeners();
  },

  clearAllTransactions: () => { setStorage(STORAGE_KEYS.TRANSACTIONS, []); }
};
