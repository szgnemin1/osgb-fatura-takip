
import { Firm, Transaction, TransactionType, PreparationItem, InvoiceType, GlobalSettings, PricingModel, LogEntry, PricingTier } from '../types';
import * as XLSX from 'xlsx';

// Basit ID oluşturucu
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

// --- ELECTRON FILE SYSTEM ENTEGRASYONU ---
let fs: any;
let path: any;
let dbFilePath: string = '';
const isElectron = navigator.userAgent.toLowerCase().includes('electron');

if (isElectron) {
  try {
    // Electron ortamında node modüllerini yükle
    fs = (window as any).require('fs');
    path = (window as any).require('path');
    
    // Windows: %APPDATA%/OSGB Fatura Takip/database.json
    // Fix: process type casting to avoid "Property 'platform' does not exist on type 'Process'"
    const appData = process.env.APPDATA || ((process as any).platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    const dir = path.join(appData, 'OSGB Fatura Takip');
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    dbFilePath = path.join(dir, 'database.json');
  } catch (e) {
    console.error("Electron fs modülü yüklenemedi:", e);
  }
}

// Helper for localStorage + FileSystem
const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) {
    console.error('Storage read error', e);
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T) => {
  try {
    // 1. Tarayıcı hafızasına yaz (Hızlı Erişim)
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);

    // 2. Eğer Masaüstü Uygulamasıysa (EXE), fiziksel dosyaya yaz
    if (isElectron && fs && dbFilePath) {
       saveToDisk();
    }
  } catch (e) {
    console.error('Storage write error', e);
  }
};

// Tüm veriyi diske yazan fonksiyon
const saveToDisk = () => {
    try {
        const fullData: any = {};
        // Tüm anahtarları topla
        Object.values(STORAGE_KEYS).forEach(k => {
            fullData[k] = localStorage.getItem(k); // Raw string olarak al
        });
        
        fs.writeFileSync(dbFilePath, JSON.stringify(fullData, null, 2));
    } catch (e) {
        console.error("Diske yazma hatası:", e);
    }
};

export const db = {
  // BAŞLATICI: Uygulama açılınca dosyadan veriyi okur
  initFileSystem: () => {
    if (isElectron && fs && fs.existsSync(dbFilePath)) {
        try {
            const rawData = fs.readFileSync(dbFilePath, 'utf-8');
            const parsedData = JSON.parse(rawData);
            
            // LocalStorage'ı dosyadaki veriyle güncelle
            Object.keys(parsedData).forEach(key => {
                if(parsedData[key]) {
                    localStorage.setItem(key, parsedData[key]);
                }
            });
            console.log("Veritabanı diskten yüklendi:", dbFilePath);
        } catch (e) {
            console.error("Diskten okuma hatası:", e);
        }
    }
    return dbFilePath;
  },

  getDbPath: () => dbFilePath,

  // LOGGING SYSTEM
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
      const updatedLogs = [newLog, ...logs].slice(0, 2000);
      setStorage(STORAGE_KEYS.LOGS, updatedLogs);
    } catch (e) {
      console.error("Log error", e);
    }
  },

  getLogs: (): LogEntry[] => {
    return getStorage<LogEntry[]>(STORAGE_KEYS.LOGS, []);
  },

  // Global Settings
  getGlobalSettings: (): GlobalSettings => {
    return getStorage<GlobalSettings>(STORAGE_KEYS.GLOBAL_SETTINGS, {
      expertPercentage: 60,
      doctorPercentage: 40,
      vatRateExpert: 20,
      vatRateDoctor: 10,
      vatRateHealth: 10,
      reportEmail: ''
    });
  },

  saveGlobalSettings: (settings: GlobalSettings) => {
    setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, settings);
    db.addLog('Ayarlar Güncellendi', 'Global hakediş oranları değiştirildi.');
  },

  // Firms
  getFirms: (): Firm[] => {
    return getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
  },
  
  addFirm: (firm: Omit<Firm, 'id'>) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const newFirm = { ...firm, id: generateId() };
    setStorage(STORAGE_KEYS.FIRMS, [...firms, newFirm]);
    db.addLog('Firma Eklendi', `Firma: ${newFirm.name}`);
    return newFirm;
  },

  updateFirm: (firm: Firm) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const updated = firms.map(f => f.id === firm.id ? firm : f);
    setStorage(STORAGE_KEYS.FIRMS, updated);
    db.addLog('Firma Güncellendi', `Firma: ${firm.name}`);
  },

  deleteFirm: (id: string) => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const firmToDelete = firms.find(f => f.id === id);
    const updated = firms.filter(f => f.id !== id);
    setStorage(STORAGE_KEYS.FIRMS, updated);
    db.addLog('Firma Silindi', `Firma: ${firmToDelete?.name || id}`);
  },

  getFirmById: (id: string): Firm | undefined => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    return firms.find(f => f.id === id);
  },

  // Transactions
  getTransactions: (): Transaction[] => {
    const trans = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    return trans.map(t => ({
      ...t,
      status: t.status || 'APPROVED'
    }));
  },

  addTransaction: (transaction: Omit<Transaction, 'id'>) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTransaction = { ...transaction, id: generateId() };
    setStorage(STORAGE_KEYS.TRANSACTIONS, [...transactions, newTransaction]);
    
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const firmName = firms.find(f => f.id === transaction.firmId)?.name || 'Bilinmeyen';
    const logAction = transaction.type === TransactionType.INVOICE ? 'Fatura Oluşturuldu' : 'Tahsilat Eklendi';
    db.addLog(logAction, `${firmName} - Tutar: ${transaction.debt || transaction.credit} TL - Durum: ${transaction.status}`);
    
    return newTransaction;
  },

  updateTransactionStatus: (id: string, status: 'APPROVED' | 'PENDING') => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const updated = transactions.map(t => t.id === id ? { ...t, status } : t);
    setStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    db.addLog('Fatura Durumu Değişti', `ID: ${id} - Yeni Durum: ${status}`);
  },

  deleteTransaction: (id: string) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const updated = transactions.filter(t => t.id !== id);
    setStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    db.addLog('Fatura/İşlem Silindi', `ID: ${id}`);
  },

  // Preparation
  getPreparationItems: (): PreparationItem[] => {
    return getStorage<PreparationItem[]>(STORAGE_KEYS.PREPARATION, []);
  },

  savePreparationItems: (items: PreparationItem[]) => {
    setStorage(STORAGE_KEYS.PREPARATION, items);
  },

  // Dashboard Aggregates
  getStats: () => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const approvedTransactions = transactions.filter(t => (t.status || 'APPROVED') === 'APPROVED');

    const totalBilled = approvedTransactions
      .filter(t => t.type === TransactionType.INVOICE)
      .reduce((sum, t) => sum + t.debt, 0);

    const totalCollected = approvedTransactions
      .filter(t => t.type === TransactionType.PAYMENT)
      .reduce((sum, t) => sum + t.credit, 0);

    return {
      totalBilled,
      totalCollected,
      balance: totalCollected 
    };
  },

  // DATA MANAGEMENT
  getFullBackup: () => {
    db.addLog('Yedekleme', 'Sistem yedeği indirildi.');
    return {
      firms: getStorage(STORAGE_KEYS.FIRMS, []),
      transactions: getStorage(STORAGE_KEYS.TRANSACTIONS, []),
      preparation: getStorage(STORAGE_KEYS.PREPARATION, []),
      globalSettings: getStorage(STORAGE_KEYS.GLOBAL_SETTINGS, {}),
      logs: getStorage(STORAGE_KEYS.LOGS, []),
      backupDate: new Date().toISOString(),
      version: '1.3.2'
    };
  },

  restoreBackup: (data: any) => {
    try {
      if (data.firms) setStorage(STORAGE_KEYS.FIRMS, data.firms);
      if (data.transactions) setStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.preparation) setStorage(STORAGE_KEYS.PREPARATION, data.preparation);
      if (data.globalSettings) setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, data.globalSettings);
      if (data.logs) setStorage(STORAGE_KEYS.LOGS, data.logs);
      
      db.addLog('Geri Yükleme', 'Sistem yedeği geri yüklendi.');
      return true;
    } catch (e) {
      console.error("Restore failed", e);
      return false;
    }
  },

  bulkImportFirms: (workbook: any) => {
    // Toplu import mantığı (Önceki kodların aynısı)
    const currentFirms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const currentTrans = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    
    let newFirmsCount = 0;
    let newTransCount = 0;

    const firmSheetName = workbook.SheetNames[0];
    const firmsData = XLSX.utils.sheet_to_json(workbook.Sheets[firmSheetName]);

    let tiersData: any[] = [];
    if (workbook.SheetNames.length > 1) {
        const tiersSheetName = workbook.SheetNames[1];
        tiersData = XLSX.utils.sheet_to_json(workbook.Sheets[tiersSheetName]);
    }

    firmsData.forEach((row: any) => {
      const name = row['Firma Adı'] || row['name'];
      if (!name) return; 

      if (currentFirms.some(f => f.name.toLowerCase() === name.toLowerCase())) return;

      const newId = generateId();

      const isExclVAT = (row['Fiyatlar KDV Hariç mi?'] || '').toString().toLowerCase() === 'evet';
      const vatMultiplier = isExclVAT ? 1.2 : 1;

      let pModel = PricingModel.STANDARD;
      const modelInput = (row['Fiyatlandırma Modeli'] || '').toString().toUpperCase();
      if(modelInput.includes('TOLERAN')) pModel = PricingModel.TOLERANCE;
      if(modelInput.includes('KADEM')) pModel = PricingModel.TIERED;
      
      const firmTiers: PricingTier[] = [];
      if (pModel === PricingModel.TIERED) {
          const tiers = tiersData.filter((t: any) => t['Firma Adı'] === name);
          tiers.forEach(t => {
              const tIsExcl = (t['Fiyat KDV Hariç mi?'] || '').toString().toLowerCase() === 'evet';
              const tMult = tIsExcl ? 1.2 : 1;
              firmTiers.push({
                  min: Number(t['Min Kişi'] || 0),
                  max: Number(t['Max Kişi'] || 0),
                  price: Number(t['Fiyat'] || 0) * tMult
              });
          });
      }

      const newFirm: Firm = {
        id: newId,
        name: name,
        basePersonLimit: Number(row['Taban Kişi']) || 0,
        baseFee: (Number(row['Taban Ücret']) || 0) * vatMultiplier,
        extraPersonFee: (Number(row['Ekstra Kişi Ücreti']) || 0) * vatMultiplier,
        defaultInvoiceType: row['Fatura Tipi'] === 'E-Arşiv' ? InvoiceType.E_ARSIV : InvoiceType.E_FATURA,
        taxNumber: row['Vergi No']?.toString() || '',
        address: row['Adres']?.toString() || '',
        pricingModel: pModel,
        tolerancePercentage: Number(row['Tolerans Yüzdesi']) || 0,
        tiers: firmTiers
      };

      currentFirms.push(newFirm);
      newFirmsCount++;

      const openingBalance = Number(row['Başlangıç Borcu']) || 0;
      if (openingBalance > 0) {
        currentTrans.push({
          id: generateId(),
          firmId: newId,
          date: new Date().toISOString(),
          type: TransactionType.INVOICE,
          description: 'Açılış Devir Bakiyesi',
          debt: openingBalance,
          credit: 0,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          status: 'APPROVED',
          invoiceType: newFirm.defaultInvoiceType
        });
        newTransCount++;
      }
    });

    setStorage(STORAGE_KEYS.FIRMS, currentFirms);
    setStorage(STORAGE_KEYS.TRANSACTIONS, currentTrans);
    return { newFirmsCount, newTransCount };
  },

  getCloudUrl: () => getStorage<string>(STORAGE_KEYS.CLOUD_CONFIG, ''),
  saveCloudUrl: (url: string) => setStorage(STORAGE_KEYS.CLOUD_CONFIG, url)
};