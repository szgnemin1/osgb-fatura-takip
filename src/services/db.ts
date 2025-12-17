import { Firm, Transaction, TransactionType, PreparationItem, InvoiceType, GlobalSettings, PricingModel, LogEntry, PricingTier, ServiceType } from '../types';
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
// isElectron kontrolünü daha güvenli yap
const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';

if (isElectron) {
  try {
    // Electron ortamında node modüllerini yükle
    // window.require kullanarak webpack'in polyfill yapmasını engelliyoruz
    const requireFunc = (window as any).require;
    fs = requireFunc('fs');
    path = requireFunc('path');
    const proc = (window as any).process;
    
    // Windows: %APPDATA%/OSGB Fatura Takip/database.json
    // Mac/Linux desteği de eklenmiş durumda
    const appData = proc.env.APPDATA || (proc.platform === 'darwin' ? proc.env.HOME + '/Library/Preferences' : proc.env.HOME + "/.local/share");
    const dir = path.join(appData, 'OSGB Fatura Takip');
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    dbFilePath = path.join(dir, 'database.json');
  } catch (e) {
    console.error("Electron fs modülü yüklenemedi veya yol oluşturulamadı:", e);
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
    // 1. ÖNCE Tarayıcı hafızasına yaz (Bu her zaman çalışmalı)
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);

    // 2. SONRA Eğer Masaüstü Uygulamasıysa (EXE), fiziksel dosyaya yaz
    // Bunu try-catch içine alıyoruz ki dosya hatası olursa program durmasın
    if (isElectron && fs && dbFilePath) {
       saveToDisk();
    }
  } catch (e) {
    console.error('Storage write error', e);
    alert('Veri kaydedilirken bir hata oluştu: ' + e);
  }
};

// Tüm veriyi diske yazan fonksiyon
const saveToDisk = () => {
    try {
        const fullData: any = {};
        // Tüm anahtarları topla
        Object.values(STORAGE_KEYS).forEach(k => {
            const item = localStorage.getItem(k);
            if(item) fullData[k] = item;
        });
        
        fs.writeFileSync(dbFilePath, JSON.stringify(fullData, null, 2));
    } catch (e) {
        console.error("Diske yazma hatası:", e);
        // Kullanıcıyı rahatsız etmemek için alert vermiyoruz, console'a basıyoruz.
        // Veri zaten localStorage'da güvende.
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
      expertPercentage: 25, // Kullanıcı isteği: 25
      doctorPercentage: 75, // Kullanıcı isteği: 75
      vatRateExpert: 20,    // Kullanıcı isteği: %20 KDV
      vatRateDoctor: 10,    // Kullanıcı isteği: %10 KDV
      vatRateHealth: 10,    // Kullanıcı isteği: %10 KDV
      reportEmail: '',
      bankInfo: 'Yeni Banka Hesap Bilgilerimiz; CANKAYA ORTAK SAĞLIK GÜV.BİR.SAN.TİC.LTD.ŞTİ. TR12 0015 7000 0000 0157 3026 68'
    });
  },

  saveGlobalSettings: (settings: GlobalSettings) => {
    setStorage(STORAGE_KEYS.GLOBAL_SETTINGS, settings);
    db.addLog('Ayarlar Güncellendi', 'Global parametreler değiştirildi.');
  },

  // Firms
  getFirms: (): Firm[] => {
    const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
    return firms.sort((a, b) => a.name.localeCompare(b.name));
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

  deleteFirmsBulk: (ids: string[]) => {
      const firms = getStorage<Firm[]>(STORAGE_KEYS.FIRMS, []);
      const updated = firms.filter(f => !ids.includes(f.id));
      setStorage(STORAGE_KEYS.FIRMS, updated);
      db.addLog('Toplu Firma Silme', `${ids.length} adet firma silindi.`);
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

  deleteTransactionsBulk: (ids: string[]) => {
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const updated = transactions.filter(t => !ids.includes(t.id));
    setStorage(STORAGE_KEYS.TRANSACTIONS, updated);
    db.addLog('Toplu Fatura Silme', `${ids.length} adet işlem silindi.`);
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
      version: '1.4.5'
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

  factoryReset: () => {
      localStorage.clear();
      // Electron varsa dosyayı da temizle
      if (isElectron && fs && dbFilePath) {
          try {
              fs.writeFileSync(dbFilePath, JSON.stringify({}));
          } catch(e) { console.error("Reset hatası", e); }
      }
  },

  bulkImportFirms: (workbook: any) => {
    // Toplu import mantığı
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
      
      let sType = ServiceType.BOTH;
      const sTypeInput = (row['Hizmet Türü'] || '').toString().toUpperCase();
      if(sTypeInput.includes('SADECE UZMAN')) sType = ServiceType.EXPERT_ONLY;
      if(sTypeInput.includes('SADECE HEKIM') || sTypeInput.includes('SADECE DOKTOR')) sType = ServiceType.DOCTOR_ONLY;

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
        tiers: firmTiers,
        yearlyFee: (Number(row['Yıllık Ücret']) || 0) * vatMultiplier,
        serviceType: sType
      };

      currentFirms.push(newFirm);
      newFirmsCount++;

      const openingBalance = Number(row['Başlangıç Borcu']) || 0;
      
      if (openingBalance !== 0) {
        const isDebt = openingBalance > 0;
        
        currentTrans.push({
          id: generateId(),
          firmId: newId,
          date: new Date().toISOString(),
          type: isDebt ? TransactionType.INVOICE : TransactionType.PAYMENT,
          description: 'Açılış Devir Bakiyesi',
          debt: isDebt ? openingBalance : 0,
          credit: isDebt ? 0 : Math.abs(openingBalance),
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          status: 'APPROVED',
          invoiceType: isDebt ? newFirm.defaultInvoiceType : undefined
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