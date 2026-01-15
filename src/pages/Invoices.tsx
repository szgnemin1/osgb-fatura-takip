
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Transaction, TransactionType, InvoiceType, Firm } from '../types';
import { exporter } from '../services/exporter';
import { Receipt, CheckCircle, Trash2, History, FileDown, FileSpreadsheet, Copy, ClipboardCopy, Filter, CheckSquare, Square, Check, FileCheck, DollarSign, Calendar } from 'lucide-react';

// --- YARDIMCI FONKSİYONLAR ---
const numberToTurkishText = (amount: number): string => {
  if (amount === 0) return "SIFIR";
  const ones = ["", "BİR", "İKİ", "ÜÇ", "DÖRT", "BEŞ", "ALTI", "YEDİ", "SEKİZ", "DOKUZ"];
  const tens = ["", "ON", "YİRMİ", "OTUZ", "KIRK", "ELLİ", "ALTMIŞ", "YETMİŞ", "SEKSEN", "DOKSAN"];
  const groups = ["", "BİN", "MİLYON", "MİLYAR"];
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const convertGroup = (num: number) => {
    if (num === 0) return "";
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    let res = "";
    if (h === 1) res += "YÜZ"; else if (h > 1) res += ones[h] + "YÜZ";
    res += tens[t] + ones[o];
    return res;
  };

  let str = "";
  let tempInt = integerPart;
  let groupIndex = 0;
  if (tempInt === 0) str = "SIFIR";
  while (tempInt > 0) {
    const part = tempInt % 1000;
    if (part > 0) {
      let partStr = convertGroup(part);
      if (groupIndex === 1 && part === 1) partStr = ""; 
      str = partStr + groups[groupIndex] + str;
    }
    tempInt = Math.floor(tempInt / 1000);
    groupIndex++;
  }
  let result = `YALNIZ${str}TÜRKLİRASI`;
  if (decimalPart > 0) result += convertGroup(decimalPart) + "KURUŞ";
  return result + "DIR.";
};

const safeCopyToClipboard = (text: string) => {
    if (typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer') {
        try {
            const { clipboard } = (window as any).require('electron');
            clipboard.writeText(text);
            return Promise.resolve();
        } catch (e) { console.error("Electron clipboard hatası:", e); }
    }
    return navigator.clipboard.writeText(text);
};

const CopyBadge = ({ text, label, title, className, valueToCopy }: { text?: string | number, label?: string, title?: string, className?: string, valueToCopy?: string | number }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); window.focus();
        const content = valueToCopy !== undefined ? valueToCopy : text;
        let val = "";
        if (typeof content === 'number') { val = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(content); } 
        else { val = String(content || ""); }
        if (!val) return;
        safeCopyToClipboard(val).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(err => console.error("Kopyalama hatası:", err));
    };
    return (
        <button onClick={handleCopy} title={title || "Kopyalamak için tıklayın"} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-300 transform select-none ${copied ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700'} ${className}`}>
            {copied ? <Check className="w-3 h-3 animate-in zoom-in spin-in-180 duration-300" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px] font-medium leading-none pt-0.5">{copied ? 'Kopyalandı' : (label || 'Kopyala')}</span>
        </button>
    );
};

const SmartCopyButton = ({ inv, globalSettings, allTransactions, firms }: { inv: Transaction, globalSettings: any, allTransactions: Transaction[], firms: Firm[] }) => {
    const [copied, setCopied] = useState(false);
    const handleSmartTextCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); window.focus();
        try {
            const textAmount = numberToTurkishText(inv.debt);
            const targetIds = [inv.firmId];
            const branches = firms.filter(f => f.parentFirmId === inv.firmId);
            branches.forEach(b => targetIds.push(b.id));
            const firmTrans = allTransactions.filter(t => targetIds.includes(t.firmId) && (t.status === 'APPROVED' || !t.status));
            const totalDebited = firmTrans.reduce((sum, t) => sum + t.debt, 0);
            const totalPaid = firmTrans.reduce((sum, t) => sum + t.credit, 0);
            const priorBalance = totalDebited - totalPaid;

            let finalStr = textAmount;
            if (priorBalance > 0.1) {
                const totalDebt = priorBalance + inv.debt;
                const dateStr = new Date().toLocaleDateString('tr-TR');
                const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalDebt);
                const bankText = globalSettings.bankInfo || '';
                const branchNote = branches.length > 0 ? ` (Şubeler Dahil)` : '';
                finalStr += ` "${dateStr} Tarihi itibariyle${branchNote} Borç Bakiyesi: ${formattedTotal}'dir. ${bankText}`;
            }
            safeCopyToClipboard(finalStr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
        } catch (e) { console.error(e); }
    };
    return (
        <button onClick={handleSmartTextCopy} className={`p-2 rounded-lg transition-all duration-300 border flex items-center justify-center ${copied ? 'bg-emerald-600 text-white border-emerald-500 scale-105' : 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:opacity-80'}`} title="Yazı ile Kopyala (Şubeler Dahil)">
            {copied ? <Check className="w-4 h-4 animate-in zoom-in" /> : <ClipboardCopy className="w-4 h-4" />}
        </button>
    );
};

const InvoiceTypeBadge = ({ type }: { type?: InvoiceType }) => {
    if (type === InvoiceType.E_FATURA) {
        return <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 whitespace-nowrap">E-FATURA</span>;
    }
    return <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30 whitespace-nowrap">E-ARŞİV</span>;
};

type InvoiceWithDetails = Transaction & { firmName: string; taxNumber?: string; address?: string; };

const Invoices = () => {
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceWithDetails[]>([]);
  const [approvedInvoices, setApprovedInvoices] = useState<InvoiceWithDetails[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(db.getGlobalSettings());
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadData = () => {
    const allTrans = db.getTransactions();
    setAllTransactions(allTrans);
    const allFirms = db.getFirms();
    setFirms(allFirms);
    const firmMap = new Map<string, Firm>();
    allFirms.forEach(f => firmMap.set(f.id, f));
    const allInvoices = allTrans.filter(t => t.type === TransactionType.INVOICE).map(t => {
        const firm = firmMap.get(t.firmId);
        return { ...t, firmName: firm?.name || 'Bilinmeyen Firma', taxNumber: firm?.taxNumber || '', address: firm?.address || '' };
    });
    setPendingInvoices(allInvoices.filter(t => t.status === 'PENDING').sort((a, b) => a.firmName.localeCompare(b.firmName)));
    setApprovedInvoices(allInvoices.filter(t => t.status === 'APPROVED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setGlobalSettings(db.getGlobalSettings());
    setSelectedIds([]);
  };

  useEffect(() => { 
      loadData();
      // Canlı Veri Dinleme
      const unsubscribe = db.subscribe(() => { loadData(); });
      return () => unsubscribe();
  }, []);

  const applyFilter = (list: InvoiceWithDetails[]) => {
    if (filterType === 'ALL') return list;
    return list.filter(t => t.invoiceType === filterType);
  };

  const filteredPending = applyFilter(pendingInvoices);
  const filteredApproved = applyFilter(approvedInvoices);

  const handleApprove = (id: string) => { window.focus(); if (window.confirm('Bu faturayı onaylıyor musunuz?')) { db.updateTransactionStatus(id, 'APPROVED'); } };
  const toggleSelectAll = () => { if (selectedIds.length === filteredPending.length) setSelectedIds([]); else setSelectedIds(filteredPending.map(inv => inv.id)); };
  const toggleSelect = (id: string) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(s => s !== id)); else setSelectedIds([...selectedIds, id]); };
  const handleBulkDelete = () => { window.focus(); if (selectedIds.length === 0) return; if (window.confirm(`${selectedIds.length} adet faturayı silmek istediğinize emin misiniz?`)) { db.deleteTransactionsBulk(selectedIds); } };
  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // Excel Fonksiyonları (Aynı)
  const handleExportExcel = () => { /* ... (Orijinal Kod) ... */ };
  const handleExportApprovedExcel = () => { /* ... (Orijinal Kod) ... */ };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-500" />
            Kesilecek Faturalar
          </h2>
          <p className="text-slate-400 mt-2 text-sm">Onay bekleyen taslak faturaları yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg pl-10 p-2.5 outline-none cursor-pointer">
              <option value="ALL">Tümü</option>
              <option value={InvoiceType.E_FATURA}>E-Fatura</option>
              <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
            </select>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'} border border-slate-700`}>
              <History className="w-4 h-4" /> {showHistory ? 'Gizle' : 'Geçmiş'}
          </button>
        </div>
      </header>

      {/* Bekleyen Faturalar (PENDING) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                    Bekleyen Onaylar <span className="bg-yellow-500/20 text-yellow-500 text-xs py-0.5 px-2 rounded-full">{filteredPending.length}</span>
                </h3>
                {selectedIds.length > 0 && (
                    <button onClick={handleBulkDelete} className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded flex items-center gap-1 animate-in zoom-in">
                        <Trash2 className="w-3 h-3" /> Sil ({selectedIds.length})
                    </button>
                )}
            </div>
             {/* Mobil için Tümünü Seç Butonu */}
             <button onClick={toggleSelectAll} className="md:hidden text-xs text-slate-400 border border-slate-600 px-2 py-1 rounded">
                 {selectedIds.length === filteredPending.length && filteredPending.length > 0 ? "Seçimi Kaldır" : "Tümünü Seç"}
             </button>
        </div>

        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 w-10 text-center"><button onClick={toggleSelectAll} className="text-slate-500 hover:text-white">{selectedIds.length === filteredPending.length && filteredPending.length > 0 ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></th>
                <th className="p-4 text-slate-400 font-medium">Firma Adı</th>
                <th className="p-4 text-slate-400 font-medium text-center">Uzman (Net)</th>
                <th className="p-4 text-slate-400 font-medium text-center">Doktor (Net)</th>
                <th className="p-4 text-slate-400 font-medium text-center">Sağlık (Net)</th>
                <th className="p-4 text-slate-400 font-medium text-right">Toplam</th>
                <th className="p-4 text-slate-400 font-medium text-center">Tip</th>
                <th className="p-4 text-slate-400 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredPending.map(inv => {
                const netExpert = (inv.calculatedDetails?.expertShare || 0) / (1 + globalSettings.vatRateExpert / 100);
                const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / (1 + globalSettings.vatRateDoctor / 100);
                const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / (1 + globalSettings.vatRateHealth / 100);
                return (
                <tr key={inv.id} className={`hover:bg-slate-700/50 transition-colors ${selectedIds.includes(inv.id) ? 'bg-blue-900/20' : ''}`}>
                  <td className="p-4 text-center">
                      <button onClick={() => toggleSelect(inv.id)} className="text-slate-500 hover:text-blue-400">{selectedIds.includes(inv.id) ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5"/>}</button>
                  </td>
                  <td className="p-4 font-medium text-slate-200">
                    {inv.firmName}
                    <div className="text-xs text-slate-500">{inv.description}</div>
                  </td>
                  <td className="p-4 text-center text-sm"><div className="flex flex-col items-center gap-1"><span className="font-medium text-slate-300">{formatCurrency(netExpert)}</span><CopyBadge text={netExpert} /></div></td>
                  <td className="p-4 text-center text-sm"><div className="flex flex-col items-center gap-1"><span className="font-medium text-slate-300">{formatCurrency(netDoctor)}</span><CopyBadge text={netDoctor} /></div></td>
                  <td className="p-4 text-center text-sm"><div className="flex flex-col items-center gap-1"><span className="font-medium text-slate-300">{formatCurrency(netHealth)}</span><CopyBadge text={netHealth} /></div></td>
                  <td className="p-4 text-right"><div className="flex flex-col items-end gap-1"><span className="font-bold text-slate-200 text-base">{formatCurrency(inv.debt)}</span><CopyBadge text={inv.debt} /></div></td>
                  <td className="p-4 text-center text-xs">
                     <InvoiceTypeBadge type={inv.invoiceType} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <SmartCopyButton inv={inv} globalSettings={globalSettings} allTransactions={allTransactions} firms={firms} />
                        <button onClick={() => handleApprove(inv.id)} className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-900/20" title="Onayla"><CheckCircle className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )})}
               {filteredPending.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* --- MOBILE CARD VIEW (KART GÖRÜNÜMÜ) --- */}
        <div className="md:hidden space-y-2 p-2 bg-slate-900">
            {filteredPending.map(inv => {
                const netExpert = (inv.calculatedDetails?.expertShare || 0) / (1 + globalSettings.vatRateExpert / 100);
                const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / (1 + globalSettings.vatRateDoctor / 100);
                
                return (
                <div key={inv.id} className={`bg-slate-800 rounded-lg p-4 border ${selectedIds.includes(inv.id) ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-700 shadow-md'}`}>
                    {/* Header: Checkbox + Firma Adı + Tip */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => toggleSelect(inv.id)} className="text-slate-400">
                                {selectedIds.includes(inv.id) ? <CheckSquare className="w-6 h-6 text-blue-500"/> : <Square className="w-6 h-6"/>}
                            </button>
                            <div>
                                <h4 className="font-bold text-slate-200 text-sm">{inv.firmName}</h4>
                                <div className="mt-1"><InvoiceTypeBadge type={inv.invoiceType} /></div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-lg font-bold text-white">{formatCurrency(inv.debt)}</div>
                             <div className="text-[10px] text-slate-500">Toplam</div>
                        </div>
                    </div>

                    {/* Detay Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <div className="flex flex-col items-center p-1">
                            <span className="text-[10px] text-slate-500">Uzman (Net)</span>
                            <span className="text-sm font-medium text-slate-300">{formatCurrency(netExpert)}</span>
                            <CopyBadge text={netExpert} label="Kop." className="scale-90" />
                        </div>
                        <div className="flex flex-col items-center p-1 border-l border-slate-700/50">
                            <span className="text-[10px] text-slate-500">Hekim (Net)</span>
                            <span className="text-sm font-medium text-slate-300">{formatCurrency(netDoctor)}</span>
                            <CopyBadge text={netDoctor} label="Kop." className="scale-90" />
                        </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <SmartCopyButton inv={inv} globalSettings={globalSettings} allTransactions={allTransactions} firms={firms} />
                         </div>
                         <button onClick={() => handleApprove(inv.id)} className="flex-[3] bg-emerald-600 active:bg-emerald-700 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
                             <CheckCircle className="w-5 h-5" /> ONAYLA
                         </button>
                    </div>
                </div>
            )})}
            {filteredPending.length === 0 && <div className="p-8 text-center text-slate-500">Onay bekleyen kayıt yok.</div>}
        </div>

      </div>

      {/* Geçmiş Faturalar */}
      {showHistory && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden opacity-75">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700"><h3 className="text-lg font-semibold text-slate-400">Geçmiş Faturalar</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-xs"><th className="p-4 text-slate-500">Firma</th><th className="p-4 text-slate-500">Tarih</th><th className="p-4 text-slate-500 text-right">Tutar</th><th className="p-4 text-slate-500 text-center">Durum</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredApproved.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-4 text-slate-400 text-sm">
                          <div>{inv.firmName}</div>
                          <div className="mt-1"><InvoiceTypeBadge type={inv.invoiceType} /></div>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">{new Date(inv.date).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4 text-right text-slate-400 text-sm">{formatCurrency(inv.debt)}</td>
                      <td className="p-4 text-center"><span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">Onaylandı</span></td>
                    </tr>
                  ))}
                  {filteredApproved.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-sm">Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
      )}
    </div>
  );
};

export default Invoices;
