
import { Firm, Transaction, TransactionType, PreparationItem, InvoiceType, GlobalSettings, PricingTier, ExpenseCategory, Expense } from '../types';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const STORAGE_KEYS = {
  FIRMS: 'osgb_firms',
  TRANSACTIONS: 'osgb_transactions',
  PREPARATION: 'osgb_preparation',
  GLOBAL_SETTINGS: 'osgb_global_settings',
  LOGS: 'osgb_logs',
  CLOUD_CONFIG: 'osgb_cloud_config',
  EXPENSE_CATEGORIES: 'osgb_expense_categories',
  EXPENSES: 'osgb_expenses'
};

let fs: any;
let dbFilePath: string = '';
let ipcRenderer: any;

// ORTAM KONTROLÜ: Electron mu yoksa Tarayıcı mı?
const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';

// --- VERİ ÇAKIŞMA KİLİDİ ---
let isWritingToDisk = false;
type Listener = () => void;
let listeners: Listener[] = [];

const notifyListeners = () => { listeners.forEach(l => l()); };

// --- MASAÜSTÜ ENTEGRASYONU ---
if (isElectron) {
  try {
    const requireFunc = (window as any).require;
    fs = requireFunc('fs');
    ipcRenderer = requireFunc('electron').ipcRenderer;
    dbFilePath = ipcRenderer.sendSync('get-db-path');
    
    // Dışarıdan (Mobil vb.) güncelleme gelirse UI'ı yenile
    ipcRenderer.on('external-update', () => {
        db.initData(true).then(() => notifyListeners());
    });
  } catch (e) { console.error("Electron modülleri yüklenemedi:", e); }
}

// SERVER API URL (Tarayıcı modu için)
// Tarayıcıda çalışırken, sayfanın sunulduğu adresi (örn: 192.168.1.20:5000) baz alır.
const API_URL = isElectron ? 'http://localhost:5000' : ''; 

// Diske Yazma / Sunucuya Gönderme (Debounced)
let saveTimeout: any = null;

const persistData = async () => {
    isWritingToDisk = true;
    const fullData: any = {};
    Object.values(STORAGE_KEYS).forEach(k => {
        const item = localStorage.getItem(k);
        if(item) fullData[k] = item;
    });

    if (isElectron && fs && dbFilePath) {
        // ELECTRON: Direkt dosyaya yaz
        try {
            fs.writeFile(dbFilePath, JSON.stringify(fullData, null, 2), (err: any) => {
                setTimeout(() => { isWritingToDisk = false; }, 200);
            });
        } catch(e) { isWritingToDisk = false; }
    } else {
        // BROWSER: API'ye gönder
        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullData)
            });
            isWritingToDisk = false;
        } catch (e) {
            console.error("Sunucuya kayıt hatası:", e);
            isWritingToDisk = false;
        }
    }
};

const debounceSaveToDisk = () => {
    isWritingToDisk = true;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => { persistData(); }, 500);
};

const getStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (e) { return defaultValue; }
};

const setStorage = <T>(key: string, value: T) => {
  isWritingToDisk = true; 
  localStorage.setItem(key, JSON.stringify(value));
  debounceSaveToDisk();
  notifyListeners(); 
};

export const db = {
  subscribe: (listener: Listener) => {
      listeners.push(listener);
      return () => { listeners = listeners.filter(l => l !== listener); };
  },

  // VERİTABANI BAŞLATMA (Hem Desktop Hem Mobile Uyumlu)
  initData: async (forceSync = false): Promise<boolean> => {
    try {
        let parsedData: any = null;

        if (isElectron && fs && dbFilePath) {
            // ELECTRON: Diskten Oku
            if (fs.existsSync(dbFilePath)) {
                const rawData = fs.readFileSync(dbFilePath, 'utf-8');
                parsedData = JSON.parse(rawData);
            } else {
                persistData(); // Dosya yoksa oluştur
                return true;
            }
        } else {
            // BROWSER: Sunucudan Çek
            const response = await fetch('/api/data');
            if (response.ok) {
                parsedData = await response.json();
            }
        }

        // LocalStorage'ı güncelle
        if (parsedData && Object.keys(parsedData).length > 0) {
            Object.keys(parsedData).forEach(key => { 
                if(parsedData[key]) localStorage.setItem(key, parsedData[key]); 
            });
            notifyListeners();
            return true;
        }
    } catch (e) { 
        console.error("DB Başlatma Hatası", e);
    }
    return false;
  },

  forceSync: () => { persistData(); notifyListeners(); },

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

  updateTransaction: (transaction: Transaction) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
        transactions[index] = transaction;
        setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    }
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

  // --- GİDER YÖNETİMİ ---
  getExpenseCategories: (): ExpenseCategory[] => getStorage<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []),
  
  addExpenseCategory: (name: string) => {
    const cats = getStorage<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
    const newCat = { id: generateId(), name };
    setStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, [...cats, newCat]);
    return newCat;
  },

  deleteExpenseCategory: (id: string) => {
    const cats = getStorage<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
    setStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, cats.filter(c => c.id !== id));
  },

  getExpenses: (): Expense[] => getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []),

  addExpense: (expense: Omit<Expense, 'id'>) => {
    const expenses = getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const newExpense = { ...expense, id: generateId() };
    setStorage(STORAGE_KEYS.EXPENSES, [...expenses, newExpense]);
    return newExpense;
  },

  deleteExpense: (id: string) => {
    const expenses = getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    setStorage(STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
  },

  getPreparationItems: (): PreparationItem[] => getStorage<PreparationItem[]>(STORAGE_KEYS.PREPARATION, []),
  
  savePreparationItems: (items: PreparationItem[]) => { setStorage(STORAGE_KEYS.PREPARATION, items); },

  getStats: () => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []).filter(t => (t.status || 'APPROVED') === 'APPROVED');
    const billed = transactions.filter(t => t.type === TransactionType.INVOICE).reduce((sum, t) => sum + t.debt, 0);
    const collected = transactions.filter(t => t.type === TransactionType.PAYMENT).reduce((sum, t) => sum + t.credit, 0);
    return { totalBilled: billed, totalCollected: collected, balance: collected };
  },

  getGlobalSettings: (): GlobalSettings => getStorage<GlobalSettings>(STORAGE_KEYS.GLOBAL_SETTINGS, {
      expertPercentage: 60, 
      doctorPercentage: 40, 
      vatRateExpert: 20, 
      vatRateDoctor: 10, 
      vatRateHealth: 10, 
      reportEmail: '', 
      bankInfo: '',
      simpleDebtMode: false // Varsayılan kapalı
  }),

  saveGlobalSettings: (settings: GlobalSettings) => { setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, settings); },

  getFullBackup: () => ({
      firms: getStorage(STORAGE_KEYS.FIRMS, []),
      transactions: getStorage(STORAGE_KEYS.TRANSACTIONS, []),
      preparation: getStorage(STORAGE_KEYS.PREPARATION, []),
      globalSettings: getStorage(STORAGE_KEYS.GLOBAL_SETTINGS, {}),
      expenseCategories: getStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, []),
      expenses: getStorage(STORAGE_KEYS.EXPENSES, []),
      backupDate: new Date().toISOString(),
      version: '2.2.0'
  }),

  restoreBackup: (data: any) => {
    try {
      if (data.firms) setStorage(STORAGE_KEYS.FIRMS, data.firms);
      if (data.transactions) setStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.preparation) setStorage(STORAGE_KEYS.PREPARATION, data.preparation);
      if (data.globalSettings) setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, data.globalSettings);
      if (data.expenseCategories) setStorage(STORAGE_KEYS.EXPENSE_CATEGORIES, data.expenseCategories);
      if (data.expenses) setStorage(STORAGE_KEYS.EXPENSES, data.expenses);
      persistData(); 
      return true;
    } catch (e) { return false; }
  },

  getDbPath: () => dbFilePath,
  
  getLocalIpAddress: () => {
      if(isElectron && ipcRenderer) {
          return ipcRenderer.sendSync('get-local-ip');
      }
      return 'localhost';
  },

  bulkImportFirms: (data: any[]) => {
    const currentFirms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    const currentTrans = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    let newFirmsCount = 0;
    let newTransCount = 0;

    data.forEach(row => {
      const name = row['Firma Adı'] || row['name'];
      if (!name) return;
      if (currentFirms.some(f => f.name.toLowerCase() === name.toLowerCase())) return;
      const newId = generateId();
      const newFirm: Firm = {
        id: newId,
        name: name,
        basePersonLimit: Number(row['Taban Kişi']) || 10,
        baseFee: Number(row['Taban Ücret']) || 1000,
        extraPersonFee: Number(row['Ekstra Kişi Ücreti']) || 50,
        expertPercentage: Number(row['Uzman %']) || 60,
        doctorPercentage: Number(row['Doktor %']) || 40,
        defaultInvoiceType: row['Fatura Tipi'] === 'E-Arşiv' ? InvoiceType.E_ARSIV : InvoiceType.E_FATURA,
        pricingModel: row['Fiyatlandırma Modeli'] || 'STANDART',
        tolerancePercentage: Number(row['Tolerans (%)']) || 0,
        isKdvExcluded: row['Fiyatlar KDV Hariç mi?'] === 'Evet'
      };
      currentFirms.push(newFirm);
      newFirmsCount++;
      const openingBalance = Number(row['Başlangıç Borcu']) || 0;
      if (openingBalance > 0) {
        currentTrans.push({
          id: generateId(), firmId: newId, date: new Date().toISOString(), type: TransactionType.INVOICE, description: 'Açılış Devir Bakiyesi', debt: openingBalance, credit: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), status: 'APPROVED', invoiceType: newFirm.defaultInvoiceType
        });
        newTransCount++;
      }
    });
    setStorage(STORAGE_KEYS.FIRMS, currentFirms);
    setStorage(STORAGE_KEYS.TRANSACTIONS, currentTrans);
    return { newFirmsCount, newTransCount };
  },

  bulkUpdatePricing: (generalData: any[], tierData: any[]) => {
      const currentFirms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
      let updatedCount = 0;

      generalData.forEach(row => {
          const id = row['ID (DOKUNMAYIN)'];
          if (!id) return;
          const firmIndex = currentFirms.findIndex(f => f.id === id);
          if (firmIndex !== -1) {
              currentFirms[firmIndex].baseFee = Number(row['Taban Ücret']) || 0;
              currentFirms[firmIndex].basePersonLimit = Number(row['Taban Kişi Limiti']) || 0;
              currentFirms[firmIndex].extraPersonFee = Number(row['Ekstra Kişi Ücreti']) || 0;
              currentFirms[firmIndex].yearlyFee = Number(row['Yıllık İşlem Ücreti']) || 0;
              currentFirms[firmIndex].pricingModel = row['Model (STANDART/KADEMELI)'] || currentFirms[firmIndex].pricingModel;
              currentFirms[firmIndex].tolerancePercentage = Number(row['Tolerans (%)']) || 0;
              currentFirms[firmIndex].tiers = [];
              updatedCount++;
          }
      });

      if (tierData && tierData.length > 0) {
          tierData.forEach(row => {
              const id = row['Firma ID (DOKUNMAYIN)'];
              if (!id) return;
              const firm = currentFirms.find(f => f.id === id);
              if (firm) {
                  const newTier: PricingTier = { min: Number(row['Min Kişi']) || 0, max: Number(row['Max Kişi']) || 0, price: Number(row['Fiyat']) || 0 };
                  if (!firm.tiers) firm.tiers = [];
                  firm.tiers.push(newTier);
              }
          });
      }
      setStorage(STORAGE_KEYS.FIRMS, currentFirms);
      return updatedCount;
  },
  
  factoryReset: () => {
      localStorage.clear();
      if (isElectron && fs && dbFilePath) { try { fs.writeFileSync(dbFilePath, JSON.stringify({}, null, 2)); } catch (e) {} }
      // Browser modunda sunucuya da temizlik isteği atılabilir ama şimdilik manuel sync yeterli
      notifyListeners();
  },

  clearAllTransactions: () => { setStorage(STORAGE_KEYS.TRANSACTIONS, []); },

  getCloudUrl: () => {
    return getStorage<string>(STORAGE_KEYS.CLOUD_CONFIG, '');
  },

  saveCloudUrl: (url: string) => {
    setStorage(STORAGE_KEYS.CLOUD_CONFIG, url);
  }
};
