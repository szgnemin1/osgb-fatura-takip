import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Firm, Transaction, TransactionType, GlobalSettings, PricingModel, PricingTier, ServiceType } from '../types';
import { exporter } from '../services/exporter';
import { FileText, Search, PlusCircle, ArrowDownLeft, ArrowUpRight, Building2, Download, Table, FilePlus, Calendar, Trash2, Filter, RefreshCw, Layers, Plus, X, CheckCircle, ArrowRightCircle, AlertCircle, Save, Calculator } from 'lucide-react';

const FirmDetails = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  
  // İşlem Verileri
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Yılın ilk günü
      end: new Date().toISOString().split('T')[0] // Bugün
  });
  
  // Global Settings (KDV oranları için)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtDate, setDebtDate] = useState(new Date().toISOString().split('T')[0]);

  const [invoicePayModal, setInvoicePayModal] = useState<{ open: boolean; invoice: Transaction | null; date: string }>({
    open: false, invoice: null, date: new Date().toISOString().split('T')[0]
  });

  // --- HAVUZ MODAL STATE ---
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  // employeeCount eklendi: Artık içeride hesaplama yapabiliriz
  const [poolItems, setPoolItems] = useState<{firmId?: string, firmName: string, amount: string, hasDraft?: boolean, employeeCount?: number, isKdvExcluded?: boolean}>([{firmId: '', firmName: '', amount: '', hasDraft: false, employeeCount: 0, isKdvExcluded: false}]);
  const [poolRatios, setPoolRatios] = useState({ expert: 60, doctor: 40 });

  useEffect(() => { 
      setFirms(db.getFirms());
      const settings = db.getGlobalSettings();
      setGlobalSettings(settings);
      setPoolRatios({ expert: settings.expertPercentage, doctor: settings.doctorPercentage });
  }, []);

  // VERİ YÜKLEME VE FİLTRELEME MANTIĞI
  useEffect(() => {
    if (selectedFirmId) {
      const all = db.getTransactions();
      const childIds = firms.filter(f => f.parentFirmId === selectedFirmId).map(f => f.id);
      const targetIds = [selectedFirmId, ...childIds];

      const firmAllTrans = all.filter(t => 
          targetIds.includes(t.firmId) && (t.status === 'APPROVED' || t.status === undefined)
      );

      const startDateTimestamp = new Date(dateRange.start).setHours(0,0,0,0);
      const endDateTimestamp = new Date(dateRange.end).setHours(23,59,59,999);

      const previousTrans = firmAllTrans.filter(t => new Date(t.date).getTime() < startDateTimestamp);
      const prevDebt = previousTrans.reduce((sum, t) => sum + t.debt, 0);
      const prevCredit = previousTrans.reduce((sum, t) => sum + t.credit, 0);
      const calculatedOpening = prevDebt - prevCredit;
      
      setOpeningBalance(calculatedOpening);

      const rangeTrans = firmAllTrans
        .filter(t => {
            const d = new Date(t.date).getTime();
            return d >= startDateTimestamp && d <= endDateTimestamp;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      setTransactions(rangeTrans);
    } else { 
        setTransactions([]); 
        setOpeningBalance(0);
    }
  }, [selectedFirmId, isPaymentModalOpen, isDebtModalOpen, invoicePayModal.open, isPoolModalOpen, firms, dateRange]); 

  const filteredFirms = firms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDeleteTransaction = (id: string, type: string) => {
      window.focus();
      if(window.confirm(`Bu ${type} kaydını silmek istediğinize emin misiniz? Bakiye değişecektir.`)) {
          db.deleteTransaction(id);
          const current = selectedFirmId;
          setSelectedFirmId('');
          setTimeout(() => setSelectedFirmId(current), 50);
          window.focus();
      }
  };

  const exportSingleFirm = () => {
    const firm = firms.find(f => f.id === selectedFirmId);
    if (!firm) return;
    const exportData: any[] = [];
    if (openingBalance !== 0) {
        exportData.push({ 'Ay/Yıl': '-', 'Tarih': `${new Date(dateRange.start).toLocaleDateString('tr-TR')} Öncesi`, 'Firma': '-', 'Açıklama': 'DEVREDEN BAKİYE', 'Borç': openingBalance > 0 ? openingBalance : 0, 'Alacak': openingBalance < 0 ? Math.abs(openingBalance) : 0 });
    }
    transactions.forEach(t => {
        exportData.push({ 'Ay/Yıl': `${new Date(0, t.month - 1).toLocaleString('tr-TR', { month: 'long' })} ${t.year}`, 'Tarih': new Date(t.date).toLocaleDateString('tr-TR'), 'Firma': firms.find(f => f.id === t.firmId)?.name, 'Açıklama': t.description, 'Borç': t.debt, 'Alacak': t.credit });
    });
    exporter.exportToExcel(`${firm.name}_Ekstre`, exportData);
  };

  const exportBulkBalances = () => {
    const allTrans = db.getTransactions();
    const data = firms.map(firm => {
      const firmTrans = allTrans.filter(t => t.firmId === firm.id && (t.status === 'APPROVED' || !t.status));
      const billed = firmTrans.reduce((sum, t) => sum + t.debt, 0);
      const paid = firmTrans.reduce((sum, t) => sum + t.credit, 0);
      const bal = billed - paid;
      return { 'Firma Adı': firm.name, 'Toplam Faturalanan': billed, 'Toplam Tahsilat': paid, 'Kalan Bakiye': bal, 'Durum': bal > 0 ? 'Borçlu' : 'Alacaklı/Kapalı' };
    });
    exporter.exportToExcel('Tum_Firmalar_Bakiye_Raporu', data);
  };

  const rangeBilled = transactions.reduce((sum, t) => sum + t.debt, 0);
  const rangePaid = transactions.reduce((sum, t) => sum + t.credit, 0);
  const finalBalance = openingBalance + (rangeBilled - rangePaid);
  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

  const handleAddPayment = (e: React.FormEvent) => {
      e.preventDefault(); window.focus(); if (!selectedFirmId || !paymentAmount) return;
      const selectedDateObj = new Date(paymentDate);
      db.addTransaction({ firmId: selectedFirmId, date: paymentDate, type: TransactionType.PAYMENT, description: paymentDescription || 'Tahsilat', debt: 0, credit: Number(paymentAmount), month: selectedDateObj.getMonth() + 1, year: selectedDateObj.getFullYear(), status: 'APPROVED' });
      setIsPaymentModalOpen(false); setPaymentAmount(''); setPaymentDescription('');
  };
   const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault(); window.focus(); if (!selectedFirmId || !debtAmount) return;
    const firm = firms.find(f => f.id === selectedFirmId); const selectedDateObj = new Date(debtDate);
    db.addTransaction({ firmId: selectedFirmId, date: debtDate, type: TransactionType.INVOICE, description: debtDescription || 'Manuel Borç Ekleme', debt: Number(debtAmount), credit: 0, month: selectedDateObj.getMonth() + 1, year: selectedDateObj.getFullYear(), status: 'APPROVED', invoiceType: firm?.defaultInvoiceType });
    setIsDebtModalOpen(false); setDebtAmount(''); setDebtDescription('');
  };
  const handlePayInvoice = (e: React.FormEvent) => {
    e.preventDefault(); window.focus(); if (!selectedFirmId || !invoicePayModal.invoice) return;
    const selectedDateObj = new Date(invoicePayModal.date);
    db.addTransaction({ firmId: selectedFirmId, date: invoicePayModal.date, type: TransactionType.PAYMENT, description: `Fatura Ödemesi (${new Date(invoicePayModal.invoice.date).toLocaleDateString('tr-TR')})`, debt: 0, credit: invoicePayModal.invoice.debt, month: selectedDateObj.getMonth() + 1, year: selectedDateObj.getFullYear(), status: 'APPROVED' });
    setInvoicePayModal({ open: false, invoice: null, date: '' });
  };
  const openInvoicePayModal = (invoice: Transaction) => { setInvoicePayModal({ open: true, invoice, date: new Date().toISOString().split('T')[0] }); };

  // --- HAVUZ FONKSİYONLARI ---

  // HESAPLAMA MOTORU (Preparation.tsx ile BİREBİR AYNI MANTIK)
  const calculateSingleFirmPrice = (firm: Firm, count: number) => {
      if(!globalSettings) return 0;

      // 1. Ana Model Ham Fiyatı
      const calculateModel = (c: number, m: PricingModel, base: number, limit: number, extra: number, tol: number = 0, tiers: PricingTier[] = []) => {
          let price = 0;
          if (m === PricingModel.STANDARD) {
              price = base;
              if (c > limit) price += (c - limit) * extra;
          } else if (m === PricingModel.TOLERANCE) {
              const lower = limit * (1 - tol/100);
              const upper = limit * (1 + tol/100);
              price = base;
              if (c > upper) price += (c - upper) * extra;
              else if (c < lower) price -= (lower - c) * extra;
          } else if (m === PricingModel.TIERED) {
              const match = tiers.find(t => c >= t.min && c <= t.max);
              if (match) price = match.price;
              else {
                  // Fallback
                  const maxTier = tiers.reduce((prev, curr) => (prev.max > curr.max) ? prev : curr, {max:0, price:0} as any);
                  if (c > maxTier.max) price = maxTier.price + (c - maxTier.max) * extra;
                  else price = base;
              }
          } else {
              price = base;
          }
          return Math.max(0, price);
      };

      let rawTotal = calculateModel(count, firm.pricingModel, firm.baseFee, firm.basePersonLimit, firm.extraPersonFee, firm.tolerancePercentage, firm.tiers);
      
      // 2. İkincil Model
      if(firm.hasSecondaryModel) {
          rawTotal += calculateModel(count, firm.secondaryPricingModel || PricingModel.STANDARD, firm.secondaryBaseFee || 0, firm.secondaryBasePersonLimit || 0, firm.secondaryExtraPersonFee || 0, 0, firm.secondaryTiers || []);
      }

      // KDV Dahil/Hariç Mantığı (Fatura Hazırlık ile Aynı)
      let finalTotal = 0;
      if (firm.isKdvExcluded) {
          // rawTotal NET tutardır. Üzerine KDV eklenir.
          let vatRateExpert = globalSettings.vatRateExpert;
          let vatRateDoctor = globalSettings.vatRateDoctor;
          
          if (firm.serviceType === ServiceType.EXPERT_ONLY) {
              finalTotal = rawTotal * (1 + vatRateExpert/100);
          } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
              finalTotal = rawTotal * (1 + vatRateDoctor/100);
          } else {
              // Karma: Global Yüzdelere Göre Dağıtıp KDV Ekle
              const netExpert = rawTotal * (globalSettings.expertPercentage / 100);
              const netDoctor = rawTotal * (globalSettings.doctorPercentage / 100);
              
              const grossExpert = netExpert * (1 + vatRateExpert/100);
              const grossDoctor = netDoctor * (1 + vatRateDoctor/100);
              
              finalTotal = grossExpert + grossDoctor;
          }
      } else {
          // rawTotal zaten BRÜT (KDV DAHİL) tutardır.
          finalTotal = rawTotal;
      }

      return finalTotal;
  };
  
  // Havuz Modalını Aç ve Şubeleri Otomatik Doldur
  const openPoolModal = () => {
    if (!selectedFirmId) return;
    const mainFirm = firms.find(f => f.id === selectedFirmId);
    if (!mainFirm) return;

    // A) Kayıtlı Konfigürasyon Var mı?
    let targetFirms: Firm[] = [];
    
    if (mainFirm.savedPoolConfig && mainFirm.savedPoolConfig.length > 0) {
        // Kayıtlı ID'leri kullanarak firmaları bul
        targetFirms = firms.filter(f => mainFirm.savedPoolConfig?.includes(f.id));
    } else {
        // B) Yoksa Standart Mantık: Kendisinin Şubelerini Bul
        targetFirms = firms.filter(f => f.parentFirmId === selectedFirmId);
    }
    
    // 2. Bekleyen Faturaları Tara ve Listeyi Oluştur
    const allTrans = db.getTransactions();
    
    const initialPoolItems = targetFirms.map(f => {
        const pending = allTrans
            .filter(t => t.firmId === f.id && t.status === 'PENDING' && t.type === TransactionType.INVOICE)
            .reduce((sum, t) => sum + t.debt, 0);
            
        return {
            firmId: f.id,
            firmName: f.name,
            amount: pending > 0 ? pending.toString() : '', 
            hasDraft: pending > 0,
            employeeCount: f.basePersonLimit, // Varsayılan olarak taban limiti getir
            isKdvExcluded: f.isKdvExcluded
        };
    });

    if (initialPoolItems.length === 0) {
        initialPoolItems.push({ firmId: '', firmName: '', amount: '', hasDraft: false, employeeCount: 0, isKdvExcluded: false });
    }

    setPoolItems(initialPoolItems);
    setIsPoolModalOpen(true);
  };

  const handleAddPoolItem = () => {
      setPoolItems([...poolItems, { firmId: '', firmName: '', amount: '', hasDraft: false, employeeCount: 0, isKdvExcluded: false }]);
  };
  const handleRemovePoolItem = (index: number) => {
      setPoolItems(poolItems.filter((_, i) => i !== index));
  };
  const handleSelectPoolFirm = (index: number, selectedId: string) => {
      const firm = firms.find(f => f.id === selectedId);
      if (!firm) return;
      
      const pendingTotal = db.getTransactions()
          .filter(t => t.firmId === selectedId && t.status === 'PENDING' && t.type === TransactionType.INVOICE)
          .reduce((sum, t) => sum + t.debt, 0);

      const newItems = [...poolItems];
      newItems[index] = { 
          firmId: firm.id,
          firmName: firm.name,
          amount: pendingTotal > 0 ? pendingTotal.toString() : '',
          hasDraft: pendingTotal > 0,
          employeeCount: firm.basePersonLimit, // Firma değişince varsayılan limiti getir
          isKdvExcluded: firm.isKdvExcluded
      };
      setPoolItems(newItems);
  };
  const handleUpdatePoolAmount = (index: number, value: string) => {
      const newItems = [...poolItems];
      newItems[index] = { ...newItems[index], amount: value, hasDraft: false }; // Manuel müdahale edilirse draft bayrağını kaldır
      setPoolItems(newItems);
  };
  
  // ÇALIŞAN SAYISINA GÖRE HESAPLAMA
  const handleUpdatePoolEmployeeCount = (index: number, count: number) => {
      const item = poolItems[index];
      const newItems = [...poolItems];
      newItems[index].employeeCount = count;

      if (item.firmId) {
          const firm = firms.find(f => f.id === item.firmId);
          if (firm) {
              const calculatedPrice = calculateSingleFirmPrice(firm, count);
              newItems[index].amount = calculatedPrice.toFixed(2);
              newItems[index].hasDraft = false; // Hesaplama yapıldı, draft değil artık canlı veri
          }
      }
      setPoolItems(newItems);
  };

  const calculatePoolTotals = () => {
      const totalPool = poolItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const expertGross = totalPool * (poolRatios.expert / 100);
      const doctorGross = totalPool * (poolRatios.doctor / 100);
      const vatExpert = globalSettings?.vatRateExpert || 20;
      const vatDoctor = globalSettings?.vatRateDoctor || 10;
      const expertNet = expertGross / (1 + vatExpert / 100);
      const doctorNet = doctorGross / (1 + vatDoctor / 100);
      return { totalPool, expertGross, doctorGross, expertNet, doctorNet };
  };

  // --- HAVUZ YAPISINI KAYDETME (PERSISTENCE) ---
  const handleSavePoolConfig = () => {
      if (!selectedFirmId) return;
      const firm = firms.find(f => f.id === selectedFirmId);
      if (!firm) return;

      const configIds = poolItems
          .filter(item => item.firmId && item.firmId.trim() !== '')
          .map(item => item.firmId!);
      
      const updatedFirm = { ...firm, savedPoolConfig: configIds };
      db.updateFirm(updatedFirm);
      setFirms(prev => prev.map(f => f.id === firm.id ? updatedFirm : f));
      
      alert("Havuz yapısı kaydedildi. Bir dahaki sefere bu firmalar otomatik yüklenecek.");
  };

  const handleSavePoolTransaction = () => {
      window.focus();
      const { totalPool, expertNet, doctorNet } = calculatePoolTotals();
      
      if (totalPool <= 0) {
          alert("Toplam havuz tutarı 0 olamaz. Lütfen en az bir firmaya tutar giriniz.");
          return;
      }
      if (!selectedFirmId) return;

      const firm = firms.find(f => f.id === selectedFirmId);
      const today = new Date();

      const firmNames = poolItems.filter(i => i.firmName.trim() !== '' && Number(i.amount) > 0).map(i => i.firmName).join(' + ');
      const desc = `Havuz Hakediş (${firmNames || 'Çeşitli'})`;

      const allTrans = db.getTransactions();
      const idsToDelete: string[] = [];

      poolItems.forEach(item => {
          if (item.firmId && item.hasDraft) { // Sadece 'hasDraft' true ise sil, manuel/hesaplananlara dokunma
              const pendingDrafts = allTrans.filter(t => 
                  t.firmId === item.firmId && 
                  t.status === 'PENDING' && 
                  t.type === TransactionType.INVOICE
              );
              pendingDrafts.forEach(draft => idsToDelete.push(draft.id));
          }
      });

      if (idsToDelete.length > 0) {
          db.deleteTransactionsBulk(idsToDelete);
      }

      db.addTransaction({
          firmId: selectedFirmId,
          date: today.toISOString(),
          type: TransactionType.INVOICE,
          invoiceType: firm?.defaultInvoiceType,
          description: desc,
          debt: totalPool,
          credit: 0,
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          status: 'APPROVED',
          calculatedDetails: {
              employeeCount: 0, extraItemAmount: 0, serviceAmount: totalPool,
              expertShare: calculatePoolTotals().expertGross,
              doctorShare: calculatePoolTotals().doctorGross
          }
      });

      const deletedMsg = idsToDelete.length > 0 ? `\n\n${idsToDelete.length} adet bekleyen alt taslak silindi ve birleştirildi.` : '\n\nManuel tutarlar havuza eklendi.';
      alert(`Havuz faturası başarıyla oluşturuldu.${deletedMsg}\n\nToplam: ${formatCurrency(totalPool)}`);
      
      setIsPoolModalOpen(false);
      setPoolItems([{firmId: '', firmName: '', amount: '', hasDraft: false, employeeCount: 0, isKdvExcluded: false}]);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3"><FileText className="w-8 h-8 text-purple-500" /> Cari Detay (Ekstre)</h2>
          <p className="text-slate-400 mt-2">Firma bazlı kesinleşmiş hareketler ve bakiye durumu. Ana firma seçildiğinde şubeler dahil edilir.</p>
        </div>
        <button onClick={exportBulkBalances} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border border-slate-600"><Table className="w-4 h-4" /> Tüm Bakiye Raporu (Excel)</button>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Sidebar Selector */}
        <div className="col-span-3 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Firma Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredFirms.map(firm => (
              <button key={firm.id} onClick={() => setSelectedFirmId(firm.id)} className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex justify-between items-center ${selectedFirmId === firm.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                  <span>{firm.name}</span>
                  {firm.parentFirmId && <span className="text-[10px] bg-black/20 px-1 rounded ml-1">Şube</span>}
              </button>
            ))}
            {filteredFirms.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">Firma bulunamadı.</div>}
          </div>
        </div>

        {/* Detail View */}
        <div className="col-span-9 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative">
          {selectedFirmId ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-700 flex flex-col gap-4 bg-slate-800/50 backdrop-blur">
                  
                  {/* Üst Satır: Başlık ve Butonlar */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white flex flex-col">
                            <span>{firms.find(f => f.id === selectedFirmId)?.name} Hareketleri</span>
                            <span className="text-xs text-slate-400 font-normal">Bu firma ve bağlı şubeleri dahildir</span>
                        </h3>
                        <button onClick={exportSingleFirm} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" title="Ekstreyi Excel İndir"><Download className="w-5 h-5" /></button>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={openPoolModal}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-blue-600 shadow-lg shadow-blue-900/30"
                         >
                             <Layers className="w-4 h-4" /> 
                             Havuz Hesapla
                         </button>
                        <button onClick={() => { setIsDebtModalOpen(true); setDebtDate(new Date().toISOString().split('T')[0]); }} className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"><FilePlus className="w-4 h-4" /> Borç Ekle</button>
                        <button onClick={() => { setIsPaymentModalOpen(true); setPaymentDate(new Date().toISOString().split('T')[0]); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"><PlusCircle className="w-4 h-4" /> Tahsilat Ekle</button>
                    </div>
                  </div>

                  {/* Alt Satır: Tarih Filtreleri */}
                  <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-400 font-medium">Tarih Aralığı:</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500" />
                          <span className="text-slate-500">-</span>
                          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-500" />
                      </div>
                      <button onClick={() => setDateRange({ start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] })} className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Bu Yıl</button>
                  </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-900 z-10 shadow-md">
                    <tr>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Ay/Yıl</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Tarih</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Açıklama</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider">Şube/Firma</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right">Borç</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right">Alacak</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    
                    {/* DEVREDEN BAKİYE SATIRI */}
                    {openingBalance !== 0 && (
                        <tr className="bg-slate-900/40 hover:bg-slate-900/60 transition-colors border-b border-blue-900/30">
                            <td className="p-4 text-blue-400 font-bold text-sm">-</td>
                            <td className="p-4 text-blue-400 font-bold text-sm">{formatDate(dateRange.start)} Öncesi</td>
                            <td className="p-4 text-blue-400 font-bold text-sm flex items-center gap-2"><ArrowDownLeft className="w-4 h-4" /> DEVREDEN BAKİYE</td>
                            <td className="p-4 text-blue-400 text-sm">-</td>
                            <td className="p-4 text-right font-bold text-blue-400 text-sm">{openingBalance > 0 ? formatCurrency(openingBalance) : '-'}</td>
                            <td className="p-4 text-right font-bold text-blue-400 text-sm">{openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : '-'}</td>
                            <td className="p-4 text-center"></td>
                        </tr>
                    )}

                    {transactions.map(t => {
                        const tFirm = firms.find(f => f.id === t.firmId);
                        const isChild = t.firmId !== selectedFirmId;
                        return (
                      <tr key={t.id} className="hover:bg-slate-700/30 group">
                        <td className="p-4 text-slate-400 text-sm">{new Date(0, t.month - 1).toLocaleString('tr-TR', { month: 'long' })} {t.year}</td>
                        <td className="p-4 text-slate-300 text-sm">{formatDate(t.date)}</td>
                        <td className="p-4 text-slate-300 text-sm flex items-center gap-2">
                           {t.type === TransactionType.INVOICE ? <ArrowUpRight className="w-4 h-4 text-rose-500"/> : <ArrowDownLeft className="w-4 h-4 text-emerald-500"/>}
                           {t.description}
                        </td>
                        <td className="p-4 text-sm"><span className={`px-2 py-0.5 rounded text-xs ${isChild ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'}`}>{tFirm?.name}</span></td>
                        <td className="p-4 text-right text-rose-400 font-medium text-sm">{t.debt > 0 ? formatCurrency(t.debt) : '-'}</td>
                        <td className="p-4 text-right text-emerald-400 font-medium text-sm">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                        <td className="p-4 text-center flex items-center justify-center gap-2">
                            {t.type === TransactionType.INVOICE && t.debt > 0 && (
                                <button onClick={() => openInvoicePayModal(t)} className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 transition-colors opacity-0 group-hover:opacity-100">Öde</button>
                            )}
                            <button onClick={() => handleDeleteTransaction(t.id, t.type)} className="p-1 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Sil"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    )})}
                    {transactions.length === 0 && openingBalance === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-500">Seçilen tarih aralığında kayıt bulunamadı.</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* FOOTER SUMMARY */}
              <div className="p-6 bg-slate-900 border-t border-slate-700 grid grid-cols-3 gap-8 relative">
                  <div className="absolute top-2 left-6 text-[10px] text-slate-600">* Aşağıdaki toplamlar seçili tarih aralığı ({formatDate(dateRange.start)} - {formatDate(dateRange.end)}) ve devreden bakiyeyi içerir.</div>
                <div className="mt-2"><div className="text-xs text-slate-500 uppercase">Seçili Aralıkta Kesilen</div><div className="text-xl font-bold text-rose-500">{formatCurrency(rangeBilled)}</div></div>
                <div className="mt-2"><div className="text-xs text-slate-500 uppercase">Seçili Aralıkta Tahsilat</div><div className="text-xl font-bold text-emerald-500">{formatCurrency(rangePaid)}</div></div>
                <div className="mt-2"><div className="text-xs text-slate-500 uppercase">Genel Bakiye (Devreden Dahil)</div><div className={`text-2xl font-bold ${finalBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(finalBalance)}</div></div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500"><Building2 className="w-16 h-16 mb-4 opacity-20" /><p>Firma seçiniz.</p></div>
          )}
        </div>
      </div>
      
      {/* --- HAVUZ MODALI --- */}
      {isPoolModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 w-[650px] rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-500" /> 
                        Havuz Hesaplama Motoru
                    </h3>
                    <button onClick={() => setIsPoolModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* 1. ORAN AYARLARI */}
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Hakediş Oranları (%)</h4>
                        <div className="flex gap-4">
                            <div className="flex-1"><label className="block text-xs text-blue-400 mb-1">Uzman (%)</label><input type="number" value={poolRatios.expert} onChange={(e) => setPoolRatios(p => ({...p, expert: Number(e.target.value)}))} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" /></div>
                            <div className="flex-1"><label className="block text-xs text-purple-400 mb-1">Doktor (%)</label><input type="number" value={poolRatios.doctor} onChange={(e) => setPoolRatios(p => ({...p, doctor: Number(e.target.value)}))} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" /></div>
                        </div>
                    </div>

                    {/* 2. FİRMA LİSTESİ */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Havuzdaki Firmalar</h4>
                            <button onClick={handleSavePoolConfig} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold underline"><Save className="w-3 h-3"/> Bu Yapıyı Varsayılan Olarak Kaydet</button>
                        </div>
                        
                        {poolItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                {/* Otomatik Firma Seçimi */}
                                <select 
                                    value={item.firmId || ''} 
                                    onChange={(e) => handleSelectPoolFirm(idx, e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm"
                                >
                                    <option value="">Firma Seçiniz...</option>
                                    {firms.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                                </select>
                                
                                <div className="relative">
                                     <input 
                                        type="number" 
                                        placeholder="Çalışan" 
                                        value={item.employeeCount} 
                                        onChange={(e) => handleUpdatePoolEmployeeCount(idx, Number(e.target.value))} 
                                        className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white outline-none focus:border-blue-500 text-sm text-center"
                                        title="Çalışan Sayısı (Hesapla)"
                                    />
                                     <div className="absolute -top-3 left-0 w-full text-center"><span className="text-[9px] text-slate-500 bg-slate-900 px-1">Kişi</span></div>
                                </div>

                                <div className="relative">
                                    <input 
                                        type="number" 
                                        placeholder="Tutar (TL)" 
                                        value={item.amount} 
                                        onChange={(e) => handleUpdatePoolAmount(idx, e.target.value)} 
                                        className={`w-32 bg-slate-900 border ${item.hasDraft ? 'border-blue-500 text-blue-400' : 'border-slate-600 text-white'} rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono text-sm`}
                                        title={item.hasDraft ? "Taslaktan Çekildi" : "Manuel Giriş"}
                                    />
                                    {item.hasDraft && <div className="absolute -top-2 -right-2 bg-blue-600 text-[9px] text-white px-1 rounded-full shadow">OTOMATİK</div>}
                                    {item.isKdvExcluded && <div className="absolute -bottom-3 right-0 text-[8px] text-yellow-500 font-bold">+KDV</div>}
                                </div>

                                {idx > 0 && (
                                    <button onClick={() => handleRemovePoolItem(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                                )}
                            </div>
                        ))}
                        <button onClick={handleAddPoolItem} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"><Plus className="w-4 h-4"/> Başka Firma Ekle</button>
                    </div>

                    {/* 3. CANLI HESAPLAMA ÖZETİ */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                        <div className="flex justify-between items-center text-lg font-bold border-b border-slate-700 pb-2">
                            <span className="text-white">Toplam Havuz (Brüt)</span>
                            <span className="text-white">{formatCurrency(calculatePoolTotals().totalPool)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                             <div className="space-y-1"><div className="flex justify-between text-slate-400"><span>Uzman Payı (Brüt)</span><span>{formatCurrency(calculatePoolTotals().expertGross)}</span></div><div className="flex justify-between font-bold text-blue-400"><span>Uzman Net (KDV'siz)</span><span>{formatCurrency(calculatePoolTotals().expertNet)}</span></div></div>
                             <div className="space-y-1"><div className="flex justify-between text-slate-400"><span>Doktor Payı (Brüt)</span><span>{formatCurrency(calculatePoolTotals().doctorGross)}</span></div><div className="flex justify-between font-bold text-purple-400"><span>Doktor Net (KDV'siz)</span><span>{formatCurrency(calculatePoolTotals().doctorNet)}</span></div></div>
                        </div>
                        <div className="text-[10px] text-slate-600 italic text-center pt-2">* Net tutarlar, Brüt tutarın (1 + KDV Oranı)'na bölünmesiyle hesaplanmıştır.</div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl">
                    <button onClick={() => setIsPoolModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Vazgeç</button>
                    <button onClick={handleSavePoolTransaction} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Kaydet ve İşle
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Standard Modals */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Tahsilat Ekle</h3>
            <form onSubmit={handleAddPayment}>
              <div className="mb-4 space-y-3">
                <div><label className="block text-sm text-slate-400 mb-1">Tarih</label><input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
                <div><label className="block text-sm text-slate-400 mb-1">Tutar (TL)</label><input autoFocus type="number" min="0" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
                <div><label className="block text-sm text-slate-400 mb-1">Açıklama</label><input type="text" value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">İptal</button><button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Kaydet</button></div>
            </form>
          </div>
        </div>
      )}

       {isDebtModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Borç Ekle</h3>
            <form onSubmit={handleAddDebt}>
              <div className="mb-4 space-y-3">
                <div><label className="block text-sm text-slate-400 mb-1">Tarih</label><input type="date" required value={debtDate} onChange={e => setDebtDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
                <div><label className="block text-sm text-slate-400 mb-1">Tutar (TL)</label><input autoFocus type="number" min="0" step="0.01" required value={debtAmount} onChange={e => setDebtAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
                 <div><label className="block text-sm text-slate-400 mb-1">Açıklama</label><input type="text" required value={debtDescription} onChange={e => setDebtDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsDebtModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">İptal</button><button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium">Kaydet</button></div>
            </form>
          </div>
        </div>
      )}
       {invoicePayModal.open && invoicePayModal.invoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Fatura Öde</h3>
            <p className="text-sm text-slate-400 mb-4">{new Date(invoicePayModal.invoice.date).toLocaleDateString('tr-TR')} tarihli <span className="text-white font-bold">{formatCurrency(invoicePayModal.invoice.debt)}</span> tutarındaki fatura.</p>
            <form onSubmit={handlePayInvoice}>
              <div className="mb-6"><label className="block text-sm text-slate-400 mb-2">Ödeme Tarihi</label><input type="date" required value={invoicePayModal.date} onChange={e => setInvoicePayModal(prev => ({...prev, date: e.target.value}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setInvoicePayModal({ open: false, invoice: null, date: '' })} className="px-4 py-2 text-slate-300 hover:text-white">İptal</button><button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Onayla</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirmDetails;