
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Firm, Transaction, TransactionType } from '../types';
import { exporter } from '../services/exporter';
import { FileText, Search, PlusCircle, ArrowDownLeft, ArrowUpRight, Building2, Download, Table, FilePlus, Banknote, Calendar } from 'lucide-react';

const FirmDetails = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Debt Modal State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtDate, setDebtDate] = useState(new Date().toISOString().split('T')[0]);

  // Pay Specific Invoice Modal State
  const [invoicePayModal, setInvoicePayModal] = useState<{ open: boolean; invoice: Transaction | null; date: string }>({
    open: false,
    invoice: null,
    date: new Date().toISOString().split('T')[0]
  });

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
  }, [selectedFirmId, isPaymentModalOpen, isDebtModalOpen, invoicePayModal.open]); 

  const filteredFirms = firms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- HANDLERS ---

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !paymentAmount) return;

    const selectedDateObj = new Date(paymentDate);

    db.addTransaction({
      firmId: selectedFirmId,
      date: paymentDate, // Seçilen tarih
      type: TransactionType.PAYMENT,
      description: 'Tahsilat',
      debt: 0,
      credit: Number(paymentAmount),
      month: selectedDateObj.getMonth() + 1,
      year: selectedDateObj.getFullYear(),
      status: 'APPROVED'
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !debtAmount) return;

    const firm = firms.find(f => f.id === selectedFirmId);
    const selectedDateObj = new Date(debtDate);

    db.addTransaction({
      firmId: selectedFirmId,
      date: debtDate, // Seçilen tarih
      type: TransactionType.INVOICE,
      description: debtDescription || 'Manuel Borç Ekleme',
      debt: Number(debtAmount),
      credit: 0,
      month: selectedDateObj.getMonth() + 1,
      year: selectedDateObj.getFullYear(),
      status: 'APPROVED', 
      invoiceType: firm?.defaultInvoiceType
    });

    setIsDebtModalOpen(false);
    setDebtAmount('');
    setDebtDescription('');
    setDebtDate(new Date().toISOString().split('T')[0]);
  };

  const openInvoicePayModal = (transaction: Transaction) => {
    setInvoicePayModal({
        open: true,
        invoice: transaction,
        date: new Date().toISOString().split('T')[0]
    });
  };

  const handlePayInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirmId || !invoicePayModal.invoice) return;

    const selectedDateObj = new Date(invoicePayModal.date);

    db.addTransaction({
        firmId: selectedFirmId,
        date: invoicePayModal.date,
        type: TransactionType.PAYMENT,
        description: `Fatura Ödemesi (${new Date(invoicePayModal.invoice.date).toLocaleDateString('tr-TR')})`,
        debt: 0,
        credit: invoicePayModal.invoice.debt, // Fatura tutarı kadar ödeme
        month: selectedDateObj.getMonth() + 1,
        year: selectedDateObj.getFullYear(),
        status: 'APPROVED'
    });

    setInvoicePayModal({ open: false, invoice: null, date: '' });
  };

  // --- EXPORTS ---

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
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            Cari Detay (Ekstre)
          </h2>
          <p className="text-slate-400 mt-2">Firma bazlı kesinleşmiş hareketler ve bakiye durumu.</p>
        </div>
        <button 
          onClick={exportBulkBalances}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors border border-slate-600"
        >
          <Table className="w-4 h-4" />
          Tüm Bakiye Raporu (Excel)
        </button>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Sidebar Selector */}
        <div className="col-span-3 bg-slate-800 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
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
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                  selectedFirmId === firm.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {firm.name}
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
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    {firms.find(f => f.id === selectedFirmId)?.name} Hareketleri
                  </h3>
                  <button 
                    onClick={exportSingleFirm}
                    className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                    title="Excel Olarak İndir"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2">
                    <button 
                    onClick={() => {
                        setIsDebtModalOpen(true);
                        setDebtDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                    <FilePlus className="w-4 h-4" />
                    Borç Ekle
                    </button>
                    <button 
                    onClick={() => {
                        setIsPaymentModalOpen(true);
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                    <PlusCircle className="w-4 h-4" />
                    Tahsilat Ekle
                    </button>
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
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right">Borç</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-right">Alacak</th>
                      <th className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {transactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-700/30 group">
                        <td className="p-4 text-slate-400 text-sm">
                          {new Date(0, t.month - 1).toLocaleString('tr-TR', { month: 'long' })} {t.year}
                        </td>
                        <td className="p-4 text-slate-300 text-sm">{formatDate(t.date)}</td>
                        <td className="p-4 text-slate-300 text-sm flex items-center gap-2">
                           {t.type === TransactionType.INVOICE ? <ArrowUpRight className="w-4 h-4 text-rose-500"/> : <ArrowDownLeft className="w-4 h-4 text-emerald-500"/>}
                           {t.description}
                        </td>
                        <td className="p-4 text-right text-rose-400 font-medium text-sm">
                          {t.debt > 0 ? formatCurrency(t.debt) : '-'}
                        </td>
                        <td className="p-4 text-right text-emerald-400 font-medium text-sm">
                          {t.credit > 0 ? formatCurrency(t.credit) : '-'}
                        </td>
                        <td className="p-4 text-center">
                            {t.type === TransactionType.INVOICE && t.debt > 0 && (
                                <button 
                                    onClick={() => openInvoicePayModal(t)}
                                    className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    Öde
                                </button>
                            )}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          Bu firmaya ait kayıtlı hareket bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="p-6 bg-slate-900 border-t border-slate-700 grid grid-cols-3 gap-8">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Toplam Kesilen</div>
                  <div className="text-xl font-bold text-rose-500">{formatCurrency(totalBilled)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Toplam Tahsilat</div>
                  <div className="text-xl font-bold text-emerald-500">{formatCurrency(totalPaid)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Kalan Bakiye</div>
                  <div className={`text-2xl font-bold ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {formatCurrency(balance)}
                    <span className="text-xs font-normal text-slate-500 ml-2">
                      {balance > 0 ? '(Borçlu)' : '(Alacaklı/Sıfır)'}
                    </span>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Building2 className="w-16 h-16 mb-4 opacity-20" />
              <p>Detaylarını görmek için soldan bir firma seçiniz.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Tahsilat Ekle</h3>
            <form onSubmit={handleAddPayment}>
              <div className="mb-4 space-y-3">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Tarih</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="date"
                            required
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Tutar (TL)</label>
                    <input 
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Modal */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Manuel Borç Ekle</h3>
            <form onSubmit={handleAddDebt}>
              <div className="mb-4 space-y-3">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Tarih</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="date"
                            required
                            value={debtDate}
                            onChange={e => setDebtDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Tutar (TL)</label>
                    <input 
                        autoFocus
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={debtAmount}
                        onChange={e => setDebtAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Açıklama</label>
                    <input 
                    type="text"
                    required
                    placeholder="Örn: Açılış Bakiyesi, Ekstra Hizmet..."
                    value={debtDescription}
                    onChange={e => setDebtDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsDebtModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Borç Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Specific Invoice Modal */}
      {invoicePayModal.open && invoicePayModal.invoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Fatura Öde</h3>
            <p className="text-sm text-slate-400 mb-4">
                {new Date(invoicePayModal.invoice.date).toLocaleDateString('tr-TR')} tarihli 
                <span className="text-white font-bold mx-1">{formatCurrency(invoicePayModal.invoice.debt)}</span> 
                tutarındaki fatura için ödeme kaydı oluşturulacak.
            </p>
            <form onSubmit={handlePayInvoice}>
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Ödeme Tarihi</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                        type="date"
                        required
                        value={invoicePayModal.date}
                        onChange={e => setInvoicePayModal(prev => ({...prev, date: e.target.value}))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setInvoicePayModal({ open: false, invoice: null, date: '' })}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  Ödemeyi Onayla
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
