import { Firm, Transaction, TransactionType, PreparationItem, InvoiceType, GlobalSettings, PricingModel, LogEntry, PricingTier, ServiceType } from '../types';
import * as XLSX from 'xlsx';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const STORAGE_KEYS = {
  FIRMS: 'osgb_firms',
  TRANSACTIONS: 'osgb_transactions',
  PREPARATION: 'osgb_preparation',
  CLOUD_CONFIG: 'osgb_cloud_config',
  GLOBAL_SETTINGS: 'osgb_global_settings',
  LOGS: 'osgb_logs'
};

let fs: any;
let path: any;
let dbFilePath: string = '';
const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';

if (isElectron) {
  try {
    const requireFunc = (window as any).require;
    fs = requireFunc('fs');
    path = requireFunc('path');
    const proc = (window as any).process;
    const appData = proc.env.APPDATA || (proc.platform === 'darwin' ? proc.env.HOME + '/Library/Preferences' : proc.env.HOME + "/.local/share");
    const dir = path.join(appData, 'OSGB Fatura Takip');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    dbFilePath = path.join(dir, 'database.json');
  } catch (e) {
    console.error("Electron fs modülü yüklenemedi:", e);
  }
}

// Donmayı önlemek için Debounce mekanizması
let saveTimeout: any = null;
const debounceSaveToDisk = () => {
    if (!isElectron || !fs || !dbFilePath) return;
    
    if (saveTimeout) clearTimeout(saveTimeout);
    
    // 500ms bekle, başka işlem gelmezse diske yaz (UI'yı kilitletmez)
    saveTimeout = setTimeout(() => {
        try {
            const fullData: any = {};
            Object.values(STORAGE_KEYS).forEach(k => {
                const item = localStorage.getItem(k);
                if(item) fullData[k] = item;
            });
            
            // Asenkron yazma: UI kilitlenmesini %100 önler
            fs.writeFile(dbFilePath, JSON.stringify(fullData, null, 2), (err: any) => {
                if (err) console.error("Disk yazma hatası:", err);
            });
        } catch (e) {
            console.error("Veri hazırlama hatası:", e);
        }
    }, 500);
};

const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    debounceSaveToDisk();
  } catch (e) {
    console.error('Storage write error', e);
  }
};

export const db = {
  initFileSystem: () => {
    if (isElectron && fs && fs.existsSync(dbFilePath)) {
        try {
            const rawData = fs.readFileSync(dbFilePath, 'utf-8');
            const parsedData = JSON.parse(rawData);
            Object.keys(parsedData).forEach(key => {
                if(parsedData[key]) localStorage.setItem(key, parsedData[key]);
            });
            console.log("Veritabanı yüklendi.");
        } catch (e) {
            console.error("Diskten okuma hatası:", e);
        }
    }
    return dbFilePath;
  },

  getDbPath: () => dbFilePath,

  addLog: (action: string, details: string) => {
    try {
      const logs = getStorage<LogEntry[]>(STORAGE_KEYS.LOGS, []);
      const newLog: LogEntry = {
        id: generateId(),
        action,
        details,
        timestamp: new Date().toISOString(),
        deviceInfo: navigator.userAgent
      };
      setStorage(STORAGE_KEYS.LOGS, [newLog, ...logs].slice(0, 2000));
    } catch (e) {}
  },

  getLogs: (): LogEntry[] => getStorage<LogEntry[]>(STORAGE_KEYS.LOGS, []),

  getGlobalSettings: (): GlobalSettings => getStorage<GlobalSettings>(STORAGE_KEYS.GLOBAL_SETTINGS, {
      expertPercentage: 25,
      doctorPercentage: 75,
      vatRateExpert: 20,
      vatRateDoctor: 10,
      vatRateHealth: 10,
      reportEmail: '',
      bankInfo: 'Yeni Banka Hesap Bilgilerimiz; CANKAYA ORTAK SAĞLIK GÜV.BİR.SAN.TİC.LTD.ŞTİ. TR12 0015 7000 0000 0157 3026 68'
  }),

  saveGlobalSettings: (settings: GlobalSettings) => {
    setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, settings);
    db.addLog('Ayarlar Güncellendi', 'Parametreler değiştirildi.');
  },

  getFirms: (): Firm[] => getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []).sort((a, b) => a.name.localeCompare(b.name)),
  
  addFirm: (firm: Omit<Firm, 'id'>) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const newFirm = { ...firm, id: generateId() };
    setStorage(STORAGE_KEYS.FIRMS, [...firms, newFirm]);
    db.addLog('Firma Eklendi', `Firma: ${newFirm.name}`);
    return newFirm;
  },

  updateFirm: (firm: Firm) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    setStorage(STORAGE_KEYS.FIRMS, firms.map(f => f.id === firm.id ? firm : f));
    db.addLog('Firma Güncellendi', `Firma: ${firm.name}`);
  },

  deleteFirm: (id: string) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    setStorage(STORAGE_KEYS.FIRMS, firms.filter(f => f.id !== id));
    db.addLog('Firma Silindi', `ID: ${id}`);
  },

  deleteFirmsBulk: (ids: string[]) => {
      const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
      setStorage(STORAGE_KEYS.FIRMS, firms.filter(f => !ids.includes(f.id)));
      db.addLog('Toplu Firma Silme', `${ids.length} firma silindi.`);
  },

  getTransactions: (): Transaction[] => getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).map(t => ({...t, status: t.status || 'APPROVED'})),

  addTransaction: (transaction: Omit<Transaction, 'id'>) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTransaction = { ...transaction, id: generateId() };
    setStorage(STORAGE_KEYS.TRANSACTIONS, [...transactions, newTransaction]);
    db.addLog(transaction.type === TransactionType.INVOICE ? 'Fatura' : 'Tahsilat', `${transaction.debt || transaction.credit} TL`);
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
    db.addLog('Toplu Fatura Silme', `${ids.length} fatura silindi.`);
  },

  // SADECE HAREKETLERİ SİLME (YENİ)
  clearAllTransactions: () => {
      setStorage(STORAGE_KEYS.TRANSACTIONS, []);
      db.addLog('Veri Temizliği', 'Tüm cari hareketler silindi.');
  },

  getPreparationItems: (): PreparationItem[] => getStorage<PreparationItem[]>(STORAGE_KEYS.PREPARATION, []),
  savePreparationItems: (items: PreparationItem[]) => setStorage(STORAGE_KEYS.PREPARATION, items),

  getStats: () => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).filter(t => (t.status || 'APPROVED') === 'APPROVED');
    const billed = transactions.filter(t => t.type === TransactionType.INVOICE).reduce((sum, t) => sum + t.debt, 0);
    const collected = transactions.filter(t => t.type === TransactionType.PAYMENT).reduce((sum, t) => sum + t.credit, 0);
    return { totalBilled: billed, totalCollected: collected, balance: collected };
  },

  getFullBackup: () => ({
      firms: getStorage(STORAGE_KEYS.FIRMS, []),
      transactions: getStorage(STORAGE_KEYS.TRANSACTIONS, []),
      preparation: getStorage(STORAGE_KEYS.PREPARATION, []),
      globalSettings: getStorage(STORAGE_KEYS.GLOBAL_SETTINGS, {}),
      logs: getStorage(STORAGE_KEYS.LOGS, []),
      backupDate: new Date().toISOString(),
      version: '1.4.9'
  }),

  restoreBackup: (data: any) => {
    try {
      if (data.firms) setStorage(STORAGE_KEYS.FIRMS, data.firms);
      if (data.transactions) setStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.preparation) setStorage(STORAGE_KEYS.PREPARATION, data.preparation);
      if (data.globalSettings) setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, data.globalSettings);
      if (data.logs) setStorage(STORAGE_KEYS.LOGS, data.logs);
      return true;
    } catch (e) { return false; }
  },

  factoryReset: () => {
      localStorage.clear();
      if (isElectron && fs && dbFilePath) {
          try { fs.writeFileSync(dbFilePath, JSON.stringify({})); } catch(e) {}
      }
  },

  bulkImportFirms: (workbook: any) => {
    const currentFirms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const currentTrans = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    let newFirmsCount = 0;
    let newTransCount = 0;
    const firmsData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    firmsData.forEach((row: any) => {
      const name = row['Firma Adı'] || row['name'];
      if (!name || currentFirms.some(f => f.name.toLowerCase() === name.toLowerCase())) return;
      
      const newId = generateId();
      const isExclVAT = (row['Fiyatlar KDV Hariç mi?'] || '').toString().toLowerCase() === 'evet';
      
      const newFirm: Firm = {
        id: newId,
        name: name,
        basePersonLimit: Number(row['Taban Kişi']) || 0,
        baseFee: (Number(row['Taban Ücret']) || 0), // Artık çarpan yok, KDV Hariç bayrağı var
        extraPersonFee: (Number(row['Ekstra Kişi Ücreti']) || 0),
        defaultInvoiceType: row['Fatura Tipi'] === 'E-Arşiv' ? InvoiceType.E_ARSIV : InvoiceType.E_FATURA,
        taxNumber: row['Vergi No']?.toString() || '',
        address: row['Adres']?.toString() || '',
        pricingModel: PricingModel.STANDARD,
        serviceType: ServiceType.BOTH,
        isKdvExcluded: isExclVAT // Yeni Alan
      };
      currentFirms.push(newFirm);
      newFirmsCount++;

      const openingBalance = Number(row['Başlangıç Borcu']) || 0;
      if (openingBalance !== 0) {
        const isDebt = openingBalance > 0;
        currentTrans.push({
          id: generateId(), firmId: newId, date: new Date().toISOString(),
          type: isDebt ? TransactionType.INVOICE : TransactionType.PAYMENT,
          description: 'Açılış Devir Bakiyesi',
          debt: isDebt ? openingBalance : 0, credit: isDebt ? 0 : Math.abs(openingBalance),
          month: new Date().getMonth() + 1, year: new Date().getFullYear(),
          status: 'APPROVED'
        });
        newTransCount++;
      }
    });
    setStorage(STORAGE_KEYS.FIRMS, currentFirms);
    setStorage(STORAGE_KEYS.TRANSACTIONS, currentTrans);
    return { newFirmsCount, newTransCount };
  },

  getCloudUrl: () => localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG) || '',
  saveCloudUrl: (url: string) => localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, url)
};