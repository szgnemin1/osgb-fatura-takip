
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Firm, Transaction, TransactionType, InvoiceType } from '../types';
import { exporter } from '../services/exporter';
import { FileText, Search, PlusCircle, ArrowDownLeft, ArrowUpRight, Building2, Download, Table, ArrowLeft, Wallet, ChevronRight, MinusCircle } from 'lucide-react';

const FirmDetails = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'PAYMENT' | 'DEBT' | null>(null);
  const [amount, setAmount] = useState('');
  const [transDate, setTransDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setFirms(db.getFirms());
  }, []);

  useEffect(() => {
    if (selectedFirmId) {
      const all = db.getTransactions();
      const filtered = all
        .filter(t => t.firmId === selectedFirmId && (t.status === 'APPROVED' || t.status === undefined)) // Sadece onaylıları göster
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setTransactions(filtered);
    } else {
      setTransactions([]);
    }
  }, [selectedFirmId, activeModal]);

  const filteredFirms = firms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const openModal = (type: 'PAYMENT' | 'DEBT') => {
    setActiveModal(type);
    setAmount('');
    setTransDate(new Date().toISOString().split('T')[0]); // Bugünün tarihi YYYY-MM-DD
    setDescription(type === 'PAYMENT' ? 'Tahsilat' : 'Borç Dekontu / Manuel İşlem');
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !amount || !transDate) return;

    const dateObj = new Date(transDate);

    db.addTransaction({
      firmId: selectedFirmId,
      date: dateObj.toISOString(),
      type: activeModal === 'PAYMENT' ? TransactionType.PAYMENT : TransactionType.INVOICE,
      description: description,
      debt: activeModal === 'DEBT' ? Number(amount) : 0,
      credit: activeModal === 'PAYMENT' ? Number(amount) : 0,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      status: 'APPROVED'
    });

    setActiveModal(null);
    setAmount('');
    setDescription('');
  };

  const exportSingleFirm = () => {
    const firm = firms.find(f => f.id === selectedFirmId);
    if (!firm) return;

    const data = transactions.map(t => ({
      'Ay/Yıl': `${new Date(0, t.month - 1).toLocaleString('tr-TR', { month: 'long' })} ${t.year}`,
      'Tarih': new Date(t.date).toLocaleDateString('tr-TR'),
      'Açıklama': t.description,
      'Borç': t.debt,
      'Alacak': t.credit
    }));

    exporter.exportToExcel(`${firm.name}_Ekstre`, data);
  };

  const exportBulkBalances = () => {
    const allTrans = db.getTransactions();
    const data = firms.map(firm => {
      const firmTrans = allTrans.filter(t => t.firmId === firm.id && (t.status === 'APPROVED' || !t.status));
      const billed = firmTrans.reduce((sum, t) => sum + t.debt, 0);
      const paid = firmTrans.reduce((sum, t) => sum + t.credit, 0);
      const bal = billed - paid;

      return {
        'Firma Adı': firm.name,
        'Toplam Faturalanan': billed,
        'Toplam Tahsilat': paid,
        'Kalan Bakiye': bal,
        'Durum': bal > 0 ? 'Borçlu' : 'Alacaklı/Kapalı'
      };
    });

    exporter.exportToExcel('Tum_Firmalar_Bakiye_Raporu', data);
  };

  const totalBilled = transactions.reduce((sum, t) => sum + t.debt, 0);
  const totalPaid = transactions.reduce((sum, t) => sum + t.credit, 0);
  const balance = totalBilled - totalPaid;

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      
      {/* HEADER (Mobilde Gizlenir, Detayda Geri Tuşu Gelir) */}
      <header className={`flex justify-between items-start ${selectedFirmId ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            Cari Detay (Ekstre)
          </h2>
          <p className="text-slate-400 mt-2 text-sm">Firma bazlı kesinleşmiş hareketler ve bakiye durumu.</p>
        </div>
        <button 
          onClick={exportBulkBalances}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border border-slate-600"
        >
          <Table className="w-4 h-4" />
          <span className="hidden md:inline">Tüm Bakiye Raporu</span>
        </button>
      </header>

      <div className="flex flex-col md:grid md:grid-cols-12 gap-6 flex-1 min-h-0 relative">
        
        {/* SOL LİSTE (SIDEBAR) */}
        <div className={`md:col-span-3 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden ${selectedFirmId ? 'hidden md:flex' : 'flex h-full'}`}>
          <div className="p-4 border-b border-slate-700 bg-slate-800 sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Firma Ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredFirms.map(firm => (
              <button
                key={firm.id}
                onClick={() => setSelectedFirmId(firm.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex justify-between items-center ${
                  selectedFirmId === firm.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="truncate">{firm.name}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
            {filteredFirms.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">Firma bulunamadı.</div>}
          </div>
        </div>

        {/* SAĞ DETAY (TABLE VIEW) */}
        <div className={`md:col-span-9 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative h-full ${selectedFirmId ? 'flex' : 'hidden md:flex'}`}>
          {selectedFirmId ? (
            <>
              {/* Toolbar */}
              <div className="p-3 md:p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/95 backdrop-blur z-20 sticky top-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Mobil Geri Tuşu */}
                  <button onClick={() => setSelectedFirmId('')} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="flex flex-col">
                      <h3 className="text-base md:text-lg font-bold text-white truncate max-w-[200px] md:max-w-none">
                        {firms.find(f => f.id === selectedFirmId)?.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 md:hidden">Hesap Hareketleri</span>
                  </div>
                  
                  <button 
                    onClick={exportSingleFirm}
                    className="hidden md:block p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                    title="Excel Olarak İndir"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                    <button 
                      onClick={() => openModal('DEBT')}
                      className="bg-rose-700 hover:bg-rose-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <MinusCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Borç Ekle</span>
                    </button>

                    <button 
                      onClick={() => openModal('PAYMENT')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Tahsilat Ekle</span>
                    </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto bg-slate-900/30">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 md:p-4 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Tarih</th>
                      <th className="p-3 md:p-4 text-slate-400 font-medium text-xs uppercase tracking-wider w-1/2">Açıklama</th>
                      <th className="p-3 md:p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right whitespace-nowrap">Borç</th>
                      <th className="p-3 md:p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right whitespace-nowrap">Alacak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-700/30 transition-colors group">
                        <td className="p-3 md:p-4 text-slate-300 text-xs md:text-sm whitespace-nowrap font-mono">
                          {formatDate(t.date)}
                        </td>
                        <td className="p-3 md:p-4 text-slate-300 text-xs md:text-sm">
                           <div className="flex items-center gap-2">
                               {t.type === TransactionType.INVOICE ? <ArrowUpRight className="w-3 h-3 text-rose-500 shrink-0"/> : <ArrowDownLeft className="w-3 h-3 text-emerald-500 shrink-0"/>}
                               <span className="line-clamp-2">{t.description}</span>
                               {t.type === TransactionType.INVOICE && t.invoiceType && (
                                   <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${t.invoiceType === InvoiceType.E_FATURA ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                       {t.invoiceType === InvoiceType.E_FATURA ? 'E-FAT' : 'E-ARŞ'}
                                   </span>
                               )}
                           </div>
                        </td>
                        <td className="p-3 md:p-4 text-right text-rose-400 font-medium text-xs md:text-sm whitespace-nowrap bg-rose-500/0 group-hover:bg-rose-500/5 transition-colors">
                          {t.debt > 0 ? formatCurrency(t.debt) : '-'}
                        </td>
                        <td className="p-3 md:p-4 text-right text-emerald-400 font-medium text-xs md:text-sm whitespace-nowrap bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors">
                          {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                          <Wallet className="w-12 h-12 mb-2 opacity-20" />
                          Bu firmaya ait kayıtlı hareket bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="p-4 bg-slate-900 border-t border-slate-700 grid grid-cols-2 md:grid-cols-3 gap-4 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
                <div className="hidden md:block">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Toplam Kesilen</div>
                  <div className="text-lg font-bold text-rose-500">{formatCurrency(totalBilled)}</div>
                </div>
                <div className="hidden md:block">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Toplam Tahsilat</div>
                  <div className="text-lg font-bold text-emerald-500">{formatCurrency(totalPaid)}</div>
                </div>
                <div className="col-span-2 md:col-span-1 bg-slate-800 md:bg-transparent p-2 md:p-0 rounded-lg border border-slate-700 md:border-0 flex justify-between md:block items-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold md:mb-0">Güncel Bakiye</div>
                  <div className={`text-xl md:text-2xl font-bold ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {formatCurrency(balance)}
                  </div>
                </div>
              </div>

            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <div className="bg-slate-700/30 p-6 rounded-full mb-4 animate-pulse">
                  <Building2 className="w-16 h-16 opacity-50 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-300">Firma Seçimi Yapın</h3>
              <p className="text-sm max-w-xs mt-2">Detaylarını ve hesap hareketlerini görmek istediğiniz firmayı soldaki listeden seçiniz.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generic Modal (Debt or Payment) */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><ArrowLeft className="w-5 h-5 rotate-180" /></button>
            
            <h3 className={`text-xl font-bold mb-1 ${activeModal === 'PAYMENT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeModal === 'PAYMENT' ? 'Tahsilat Ekle' : 'Borç Ekle'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
                {activeModal === 'PAYMENT' ? 'Kasaya/Bankaya giren tutarı işleyin.' : 'Manuel borç veya açılış bakiyesi ekleyin.'}
            </p>
            
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              
              {/* Tarih */}
              <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Tarih</label>
                 <input 
                    type="date" 
                    required 
                    value={transDate} 
                    onChange={e => setTransDate(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                 />
              </div>

              {/* Açıklama */}
              <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Açıklama</label>
                 <input 
                    type="text" 
                    required 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder={activeModal === 'PAYMENT' ? 'EFT / Nakit Tahsilat' : 'Devir Bakiyesi / Fatura Harici Borç'}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                 />
              </div>

              {/* Tutar */}
              <div className="relative">
                <label className="block text-xs font-bold text-blue-400 mb-2 uppercase">Tutar (TL)</label>
                <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-lg">₺</span>
                    <input 
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-2xl font-bold text-white outline-none focus:border-blue-500 transition-colors text-right"
                    placeholder="0,00"
                    />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 px-4 py-3 text-slate-300 hover:text-white bg-slate-700 rounded-lg font-medium"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className={`flex-[2] text-white px-4 py-3 rounded-lg font-bold shadow-lg ${activeModal === 'PAYMENT' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'}`}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirmDetails;
