
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { Firm, Transaction, TransactionType } from '../types';
import { Search, PlusCircle, ArrowDownLeft, ArrowUpRight, ArrowLeft, Filter, Phone, Share2, Wallet, FileText, ChevronRight } from 'lucide-react';

// --- YARDIMCI KOMPONENTLER ---

// Para Formatı
const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(val);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Firma Kartı (Liste Görünümü)
interface FirmCardProps {
  firm: Firm;
  balance: number;
  onClick: () => void;
}

const FirmCard: React.FC<FirmCardProps> = ({ firm, balance, onClick }) => (
  <div onClick={onClick} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm active:scale-[0.98] transition-all mb-3 flex justify-between items-center cursor-pointer group">
    <div>
      <h3 className="font-bold text-slate-100 text-base">{firm.name}</h3>
      {firm.parentFirmId && <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Şube</span>}
    </div>
    <div className="text-right">
      <div className={`text-lg font-bold ${balance > 0 ? 'text-rose-500' : (balance < 0 ? 'text-emerald-500' : 'text-slate-500')}`}>
        {formatCurrency(balance)}
      </div>
      <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 group-hover:text-blue-400">
        Detay <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  </div>
);

// İşlem Kartı (Detay Görünümü)
interface TransactionCardProps {
  transaction: Transaction;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
  const isInvoice = transaction.type === TransactionType.INVOICE;
  return (
    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isInvoice ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
          {isInvoice ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-200">{transaction.description}</div>
          <div className="text-xs text-slate-500">{formatDate(transaction.date)}</div>
        </div>
      </div>
      <div className={`font-bold ${isInvoice ? 'text-rose-400' : 'text-emerald-400'}`}>
        {isInvoice ? formatCurrency(transaction.debt) : formatCurrency(transaction.credit)}
      </div>
    </div>
  );
};

const FirmDetails = () => {
  // --- STATE ---
  const [firms, setFirms] = useState<Firm[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Seçili Firma (Mobil için sayfa geçişi gibi çalışır)
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);

  // Modal State (Tahsilat)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Veri Yükleme
  const loadData = () => {
    setFirms(db.getFirms());
    setTransactions(db.getTransactions());
  };

  useEffect(() => {
    loadData();
    // Veritabanı dinleyicisi
    const unsubscribe = db.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  // --- HESAPLAMALAR ---
  
  // Her firmanın bakiyesini önceden hesapla (Liste performansı için)
  const firmBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    firms.forEach(f => {
       // Ana firma + şubeleri bul
       const relatedIds = [f.id, ...firms.filter(sub => sub.parentFirmId === f.id).map(sub => sub.id)];
       
       const firmTrans = transactions.filter(t => relatedIds.includes(t.firmId) && (t.status === 'APPROVED' || !t.status));
       const debt = firmTrans.reduce((sum, t) => sum + t.debt, 0);
       const credit = firmTrans.reduce((sum, t) => sum + t.credit, 0);
       balances[f.id] = debt - credit;
    });
    return balances;
  }, [firms, transactions]);

  // Filtrelenmiş ve Sıralanmış Firmalar (Borçlular en üstte)
  const sortedFirms = useMemo(() => {
    let list = firms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Sadece ana firmaları veya şubesi olmayanları ana listede göster (Opsiyonel, şimdilik hepsini gösterelim ama sıralayalım)
    return list.sort((a, b) => (firmBalances[b.id] || 0) - (firmBalances[a.id] || 0));
  }, [firms, searchTerm, firmBalances]);

  // Seçili Firmanın Detayları
  const activeFirmData = useMemo(() => {
    if (!selectedFirmId) return null;
    const firm = firms.find(f => f.id === selectedFirmId);
    if (!firm) return null;

    // İşlemler (Tarihe göre yeni -> eski)
    const history = transactions
        .filter(t => t.firmId === selectedFirmId && (t.status === 'APPROVED' || !t.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { firm, history, balance: firmBalances[selectedFirmId] };
  }, [selectedFirmId, firms, transactions, firmBalances]);


  // --- İŞLEMLER ---

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !paymentAmount) return;

    db.addTransaction({
      firmId: selectedFirmId,
      date: new Date().toISOString(),
      type: TransactionType.PAYMENT,
      description: 'Mobil Tahsilat',
      debt: 0,
      credit: Number(paymentAmount),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'APPROVED'
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
  };

  const handleShareWhatsapp = () => {
    if (!activeFirmData) return;
    const { firm, balance } = activeFirmData;
    const text = `Sayın ${firm.name} yetkilisi,\n\n${new Date().toLocaleDateString('tr-TR')} tarihi itibariyle güncel bakiyeniz: ${formatCurrency(balance)}'dir.\n\nİyi çalışmalar dileriz.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // --- RENDER ---

  // GÖRÜNÜM 1: LİSTE (Ana Ekran)
  if (!selectedFirmId) {
    return (
      <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/80 backdrop-blur-md z-20 pb-4 pt-2">
            <h2 className="text-2xl font-bold text-white mb-4 px-1">Cari Hesaplar</h2>
            <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Firma ara..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 outline-none text-lg shadow-lg"
                />
            </div>
        </div>

        {/* Liste */}
        <div className="space-y-1">
            {sortedFirms.length > 0 ? (
                sortedFirms.map(firm => (
                    <FirmCard 
                        key={firm.id} 
                        firm={firm} 
                        balance={firmBalances[firm.id] || 0} 
                        onClick={() => setSelectedFirmId(firm.id)} 
                    />
                ))
            ) : (
                <div className="text-center py-10 text-slate-500">
                    <p>Firma bulunamadı.</p>
                </div>
            )}
        </div>
      </div>
    );
  }

  // GÖRÜNÜM 2: DETAY (Seçili Firma)
  if (activeFirmData) {
    const { firm, history, balance } = activeFirmData;
    
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Top Bar */}
        <div className="bg-slate-900 p-4 flex items-center gap-4 border-b border-slate-800 shadow-md shrink-0">
            <button onClick={() => setSelectedFirmId(null)} className="p-2 -ml-2 text-slate-300 hover:text-white active:bg-slate-800 rounded-full">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 overflow-hidden">
                <h2 className="text-lg font-bold text-white truncate">{firm.name}</h2>
                <p className="text-xs text-slate-400">Hesap Detayı</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
            
            {/* Büyük Bakiye Kartı */}
            <div className={`p-6 rounded-2xl mb-6 text-center shadow-lg border border-white/5 ${balance > 0 ? 'bg-gradient-to-br from-rose-900 to-slate-900' : 'bg-gradient-to-br from-emerald-900 to-slate-900'}`}>
                <div className="text-slate-300 text-sm font-medium mb-1 uppercase tracking-widest">Güncel Bakiye</div>
                <div className="text-4xl font-bold text-white tracking-tight">{formatCurrency(balance)}</div>
                <div className="mt-2 text-xs text-white/50">{balance > 0 ? 'Tahsil edilecek tutar' : 'Alacaklı / Ödendi'}</div>
            </div>

            {/* Hızlı İşlemler */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setIsPaymentModalOpen(true)} className="bg-emerald-600 active:bg-emerald-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg transition-transform active:scale-95">
                    <PlusCircle className="w-5 h-5" /> Tahsilat Ekle
                </button>
                <button onClick={handleShareWhatsapp} className="bg-slate-800 active:bg-slate-700 border border-slate-700 text-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg transition-transform active:scale-95">
                    <Share2 className="w-5 h-5 text-green-500" /> Paylaş
                </button>
            </div>

            {/* Geçmiş Listesi */}
            <div>
                <h3 className="text-slate-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> İşlem Geçmişi
                </h3>
                {history.length > 0 ? (
                    history.map(t => <TransactionCard key={t.id} transaction={t} />)
                ) : (
                    <div className="text-center py-8 text-slate-600 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                        Henüz işlem yok.
                    </div>
                )}
            </div>
        </div>

        {/* Modal: Tahsilat Ekle */}
        {isPaymentModalOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-800 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                        <h3 className="font-bold text-white">Hızlı Tahsilat</h3>
                        <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">Kapat</button>
                    </div>
                    <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                        <div className="text-center mb-2">
                            <span className="text-sm text-slate-400 block mb-1">Firma</span>
                            <span className="font-bold text-white">{firm.name}</span>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-2 uppercase font-bold">Tutar Giriniz</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-xl">₺</span>
                                <input 
                                    autoFocus
                                    type="number" 
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-2xl font-bold text-white focus:border-emerald-500 outline-none text-right"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg mt-2">
                            Onayla
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    );
  }

  return null;
};

export default FirmDetails;
