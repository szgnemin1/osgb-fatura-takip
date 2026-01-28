
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Transaction, TransactionType, InvoiceType, Firm, ServiceType } from '../types';
import { exporter } from '../services/exporter';
import { Receipt, CheckCircle, Trash2, History, FileDown, FileSpreadsheet, Copy, ClipboardCopy, Filter, CheckSquare, Square, Check, FileCheck, DollarSign, Calendar, XCircle, AlertCircle } from 'lucide-react';

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
        <button onClick={handleCopy} title={title || "Kopyalamak için tıklayın"} className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all duration-300 transform select-none ${copied ? 'bg-emerald-600 text-white scale-105' : 'bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700'} ${className}`}>
            {copied ? <Check className="w-2.5 h-2.5 animate-in zoom-in spin-in-180 duration-300" /> : <Copy className="w-2.5 h-2.5" />}
            <span className="text-[9px] font-medium leading-none pt-0.5">{copied ? 'Ok' : (label || 'Kop.')}</span>
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
        <button onClick={handleSmartTextCopy} className={`p-1.5 rounded-lg transition-all duration-300 border flex items-center justify-center ${copied ? 'bg-emerald-600 text-white border-emerald-500 scale-105' : 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:opacity-80'}`} title="Yazı ile Kopyala (Şubeler Dahil)">
            {copied ? <Check className="w-4 h-4 animate-in zoom-in" /> : <ClipboardCopy className="w-4 h-4" />}
        </button>
    );
};

const InvoiceTypeBadge = ({ type }: { type?: InvoiceType }) => {
    if (type === InvoiceType.E_FATURA) {
        return <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 whitespace-nowrap">E-FAT</span>;
    }
    return <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 whitespace-nowrap">E-ARŞ</span>;
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
  
  // GEÇMİŞ FİLTRELEME STATE'LERİ
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

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
      const unsubscribe = db.subscribe(() => { loadData(); });
      return () => unsubscribe();
  }, []);

  const applyFilter = (list: InvoiceWithDetails[]) => {
    if (filterType === 'ALL') return list;
    return list.filter(t => t.invoiceType === filterType);
  };

  const getFilteredHistory = () => {
    return approvedInvoices.filter(inv => {
        const invTime = new Date(inv.date).getTime();
        const startTime = historyStartDate ? new Date(historyStartDate).setHours(0,0,0,0) : 0;
        const endTime = historyEndDate ? new Date(historyEndDate).setHours(23,59,59,999) : Infinity;
        return invTime >= startTime && invTime <= endTime;
    });
  };

  const filteredPending = applyFilter(pendingInvoices);
  const filteredApproved = getFilteredHistory();

  const handleApprove = (id: string) => { window.focus(); if (window.confirm('Bu faturayı onaylıyor musunuz?')) { db.updateTransactionStatus(id, 'APPROVED'); } };
  const toggleSelectAll = () => { if (selectedIds.length === filteredPending.length) setSelectedIds([]); else setSelectedIds(filteredPending.map(inv => inv.id)); };
  const toggleSelect = (id: string) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(s => s !== id)); else setSelectedIds([...selectedIds, id]); };
  const handleBulkDelete = () => { window.focus(); if (selectedIds.length === 0) return; if (window.confirm(`${selectedIds.length} adet faturayı silmek istediğinize emin misiniz?`)) { db.deleteTransactionsBulk(selectedIds); } };
  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(val);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] space-y-4 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-500" />
            Kesilecek Faturalar
          </h2>
          <p className="text-slate-400 text-xs mt-1">Onay bekleyen taslak faturaları yönetin.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Filter className="absolute left-2 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg pl-7 pr-2 py-2 outline-none cursor-pointer hover:border-blue-500 transition-colors">
              <option value="ALL">Tümü</option>
              <option value={InvoiceType.E_FATURA}>E-Fatura</option>
              <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
            </select>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'} border border-slate-700`}>
              <History className="w-3 h-3" /> {showHistory ? 'Gizle' : 'Geçmiş'}
          </button>
        </div>
      </header>

      {/* Bekleyen Faturalar (PENDING) */}
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl flex flex-col min-h-0">
        
        {/* Table Toolbar */}
        <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
                    Bekleyenler <span className="bg-yellow-500/20 text-yellow-500 text-[10px] py-0.5 px-2 rounded-full">{filteredPending.length}</span>
                </h3>
                {selectedIds.length > 0 && (
                    <button onClick={handleBulkDelete} className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded flex items-center gap-1 animate-in zoom-in">
                        <Trash2 className="w-3 h-3" /> Sil ({selectedIds.length})
                    </button>
                )}
            </div>
             <button onClick={toggleSelectAll} className="md:hidden text-[10px] text-slate-400 border border-slate-600 px-2 py-1 rounded">
                 {selectedIds.length === filteredPending.length && filteredPending.length > 0 ? "Kaldır" : "Tümünü Seç"}
             </button>
        </div>

        {/* --- DESKTOP TABLE VIEW --- */}
        <div className="hidden md:block flex-1 overflow-auto bg-slate-900/30">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 z-10 shadow-sm">
              <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="p-3 w-10 text-center"><button onClick={toggleSelectAll} className="hover:text-white">{selectedIds.length === filteredPending.length && filteredPending.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button></th>
                <th className="p-3 font-medium min-w-[180px]">Firma Bilgisi</th>
                <th className="p-3 font-medium text-center w-32">Uzman</th>
                <th className="p-3 font-medium text-center w-32">Hekim</th>
                <th className="p-3 font-medium text-center w-32">Sağlık</th>
                <th className="p-3 font-medium text-right w-32">Toplam</th>
                <th className="p-3 font-medium text-center w-20">Tip</th>
                <th className="p-3 font-medium text-right w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredPending.map(inv => {
                // --- ONARILAN HESAPLAMA MANTIĞI ---
                const firm = firms.find(f => f.id === inv.firmId);
                let expertVal = inv.calculatedDetails?.expertShare || 0;
                let doctorVal = inv.calculatedDetails?.doctorShare || 0;
                let healthVal = inv.calculatedDetails?.extraItemAmount || 0;

                // Eğer eski bir kayıt ise ve detaylar saklanmamışsa, anlık hesapla
                // Bu durumda NET değeri bulmak için KDV'yi düşmemiz gerekir.
                if (expertVal === 0 && doctorVal === 0 && firm) {
                    let eRate = firm.expertPercentage;
                    let dRate = firm.doctorPercentage;
                    
                    // Hizmet Türü Kontrolü (ORANLARI %100 YAPARAK TAMAMLAMA)
                    if (firm.serviceType === ServiceType.EXPERT_ONLY) { dRate = 0; eRate = 100; }
                    if (firm.serviceType === ServiceType.DOCTOR_ONLY) { eRate = 0; dRate = 100; }

                    // KDV ORANLARI
                    const vatExpert = globalSettings?.vatRateExpert ?? 20;
                    const vatDoctor = globalSettings?.vatRateDoctor ?? 20;

                    // NET HESAPLAMA (Tutar İçinden KDV Düşülür)
                    // Örn: Toplam Borç (Gross) 1200 TL ise, Net Hakediş 1000 TL olmalıdır.
                    if (firm.serviceType === ServiceType.EXPERT_ONLY) {
                        expertVal = inv.debt / (1 + vatExpert / 100);
                    } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
                        doctorVal = inv.debt / (1 + vatDoctor / 100);
                    } else {
                        // Karışık ise önce dağıt, sonra KDV düş (Yaklaşık)
                        const grossExpert = inv.debt * (eRate / 100);
                        const grossDoctor = inv.debt * (dRate / 100);
                        expertVal = grossExpert / (1 + vatExpert / 100);
                        doctorVal = grossDoctor / (1 + vatDoctor / 100);
                    }
                }

                const hasHealth = healthVal > 0;
                
                return (
                <tr key={inv.id} className={`hover:bg-slate-700/40 transition-colors ${selectedIds.includes(inv.id) ? 'bg-blue-900/10' : ''}`}>
                  <td className="p-3 text-center">
                      <button onClick={() => toggleSelect(inv.id)} className="text-slate-500 hover:text-blue-400">{selectedIds.includes(inv.id) ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-200 text-sm truncate max-w-[250px]" title={inv.firmName}>{inv.firmName}</div>
                    <div className="flex flex-col gap-0.5 mt-1">
                        {inv.taxNumber && (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-mono">VKN:</span>
                                <span className="text-[10px] text-slate-400 font-mono">{inv.taxNumber}</span>
                                <CopyBadge text={inv.taxNumber} label="" className="scale-75 origin-left opacity-50 hover:opacity-100" />
                            </div>
                        )}
                        {/* ADRES KOPYALAMA ALANI */}
                        {inv.address && (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-mono">ADR:</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={inv.address}>{inv.address}</span>
                                <CopyBadge text={inv.address} label="" className="scale-75 origin-left opacity-50 hover:opacity-100" />
                            </div>
                        )}
                        <div className="text-[10px] text-slate-500 truncate max-w-[250px]">{inv.description}</div>
                    </div>
                  </td>
                  
                  {/* UZMAN */}
                  <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1 bg-slate-800/30 p-1 rounded border border-slate-700/50">
                          <span className="font-mono text-sm text-slate-300">{formatCurrency(expertVal)}</span>
                          <div className="flex gap-1">
                              <CopyBadge text={expertVal} label="" />
                              <CopyBadge valueToCopy="İŞ GÜVENLİĞİ UZMANI HİZMET BEDELİ" label="Metin" className="bg-blue-500/10 text-blue-400 border-blue-500/20" />
                          </div>
                      </div>
                  </td>

                  {/* HEKİM */}
                  <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1 bg-slate-800/30 p-1 rounded border border-slate-700/50">
                          <span className="font-mono text-sm text-slate-300">{formatCurrency(doctorVal)}</span>
                          <div className="flex gap-1">
                              <CopyBadge text={doctorVal} label="" />
                              <CopyBadge valueToCopy="İŞYERİ HEKİMLİĞİ HİZMET BEDELİ" label="Metin" className="bg-purple-500/10 text-purple-400 border-purple-500/20" />
                          </div>
                      </div>
                  </td>

                  {/* SAĞLIK (YANIP SÖNME EFEKTİ) */}
                  <td className="p-3 text-center">
                       <div className={`flex flex-col items-center gap-1 p-1 rounded border transition-all duration-500 ${hasHealth ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse' : 'bg-slate-800/30 border-slate-700/50'}`}>
                          <span className={`font-mono text-sm ${hasHealth ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>{formatCurrency(healthVal)}</span>
                          <div className="flex gap-1">
                              <CopyBadge text={healthVal} label="" />
                              <CopyBadge valueToCopy="SAĞLIK HİZMETİ" label="Metin" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
                          </div>
                      </div>
                  </td>

                  <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-slate-100 text-base">{formatCurrency(inv.debt)}</span>
                          <CopyBadge text={inv.debt} label="Kop." />
                      </div>
                  </td>
                  <td className="p-3 text-center">
                     <InvoiceTypeBadge type={inv.invoiceType} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                        <SmartCopyButton inv={inv} globalSettings={globalSettings} allTransactions={allTransactions} firms={firms} />
                        <button onClick={() => handleApprove(inv.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-lg shadow-emerald-900/20 transition-transform active:scale-95" title="Onayla">
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )})}
               {filteredPending.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500 text-sm">Onay bekleyen kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* --- MOBILE CARD VIEW (KART GÖRÜNÜMÜ) --- */}
        <div className="md:hidden flex-1 overflow-y-auto p-2 space-y-2 bg-slate-900/50">
            {filteredPending.map(inv => {
                // --- ONARILAN HESAPLAMA MANTIĞI (MOBİL İÇİN) ---
                const firm = firms.find(f => f.id === inv.firmId);
                let expertVal = inv.calculatedDetails?.expertShare || 0;
                let doctorVal = inv.calculatedDetails?.doctorShare || 0;
                let healthVal = inv.calculatedDetails?.extraItemAmount || 0;

                // Anlık hesaplama (Veri yoksa)
                if (expertVal === 0 && doctorVal === 0 && firm) {
                    let eRate = firm.expertPercentage;
                    let dRate = firm.doctorPercentage;
                    const vatExpert = globalSettings?.vatRateExpert ?? 20;
                    const vatDoctor = globalSettings?.vatRateDoctor ?? 20;
                    
                    if (firm.serviceType === ServiceType.EXPERT_ONLY) { 
                        expertVal = inv.debt / (1 + vatExpert / 100); 
                    } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) { 
                        doctorVal = inv.debt / (1 + vatDoctor / 100); 
                    } else {
                        const grossExpert = inv.debt * (eRate / 100);
                        const grossDoctor = inv.debt * (dRate / 100);
                        expertVal = grossExpert / (1 + vatExpert / 100);
                        doctorVal = grossDoctor / (1 + vatDoctor / 100);
                    }
                }
                const hasHealth = healthVal > 0;
                
                return (
                <div key={inv.id} className={`bg-slate-800 rounded-lg p-3 border ${selectedIds.includes(inv.id) ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-700 shadow-sm'}`}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3 w-2/3">
                            <button onClick={() => toggleSelect(inv.id)} className="text-slate-400">
                                {selectedIds.includes(inv.id) ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5"/>}
                            </button>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-200 text-sm truncate">{inv.firmName}</h4>
                                <div className="flex flex-col mt-0.5 gap-1">
                                    <div className="flex items-center gap-2">
                                        <InvoiceTypeBadge type={inv.invoiceType} />
                                        {inv.taxNumber && <span className="text-[10px] text-slate-500 font-mono">{inv.taxNumber}</span>}
                                    </div>
                                    {inv.address && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{inv.address}</span>
                                            <CopyBadge text={inv.address} label="" className="scale-75" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-base font-bold text-white">{formatCurrency(inv.debt)}</div>
                        </div>
                    </div>

                    {/* Detay Grid */}
                    <div className="grid grid-cols-3 gap-1 mb-3">
                        <div className="flex flex-col items-center bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                            <span className="text-[9px] text-slate-500 uppercase">Uzman</span>
                            <span className="text-xs font-medium text-slate-300">{formatCurrency(expertVal)}</span>
                            <div className="flex gap-1 mt-1">
                                <CopyBadge text={expertVal} label="" className="scale-75" />
                                <CopyBadge valueToCopy="İŞ GÜVENLİĞİ UZMANI HİZMET BEDELİ" label="M" className="scale-75 bg-blue-500/20 text-blue-400" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center bg-slate-900/50 p-1.5 rounded border border-slate-700/30">
                            <span className="text-[9px] text-slate-500 uppercase">Hekim</span>
                            <span className="text-xs font-medium text-slate-300">{formatCurrency(doctorVal)}</span>
                            <div className="flex gap-1 mt-1">
                                <CopyBadge text={doctorVal} label="" className="scale-75" />
                                <CopyBadge valueToCopy="İŞYERİ HEKİMLİĞİ HİZMET BEDELİ" label="M" className="scale-75 bg-purple-500/20 text-purple-400" />
                            </div>
                        </div>
                        <div className={`flex flex-col items-center p-1.5 rounded border transition-all duration-500 ${hasHealth ? 'bg-emerald-500/10 border-emerald-500/50 animate-pulse' : 'bg-slate-900/50 border-slate-700/30'}`}>
                            <span className="text-[9px] text-slate-500 uppercase">Sağlık</span>
                            <span className={`text-xs font-medium ${hasHealth ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{formatCurrency(healthVal)}</span>
                            <div className="flex gap-1 mt-1">
                                <CopyBadge text={healthVal} label="" className="scale-75" />
                                <CopyBadge valueToCopy="SAĞLIK HİZMETİ" label="M" className="scale-75 bg-emerald-500/20 text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <SmartCopyButton inv={inv} globalSettings={globalSettings} allTransactions={allTransactions} firms={firms} />
                         </div>
                         <button onClick={() => handleApprove(inv.id)} className="flex-[4] bg-emerald-600 active:bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg">
                             <CheckCircle className="w-4 h-4" /> ONAYLA
                         </button>
                    </div>
                </div>
            )})}
            {filteredPending.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">Onay bekleyen kayıt yok.</div>}
        </div>

      </div>

      {/* Geçmiş Faturalar */}
      {showHistory && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden opacity-90 shrink-0 mb-4 shadow-2xl">
            <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2"><History className="w-4 h-4"/> Geçmiş Arşivi</h3>
                
                {/* TARİH FİLTRESİ */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                        type="date" 
                        value={historyStartDate} 
                        onChange={(e) => setHistoryStartDate(e.target.value)} 
                        className="flex-1 bg-slate-950 border border-slate-600 text-slate-300 text-xs rounded pl-2 pr-1 py-1.5 outline-none focus:border-blue-500"
                    />
                    <span className="text-slate-600">-</span>
                    <input 
                        type="date" 
                        value={historyEndDate} 
                        onChange={(e) => setHistoryEndDate(e.target.value)} 
                        className="flex-1 bg-slate-950 border border-slate-600 text-slate-300 text-xs rounded pl-2 pr-1 py-1.5 outline-none focus:border-blue-500"
                    />
                    {(historyStartDate || historyEndDate) && (
                        <button onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }} className="text-slate-500 hover:text-white" title="Temizle">
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-[10px] uppercase text-slate-500 sticky top-0">
                  <tr><th className="p-3">Firma</th><th className="p-3">Tarih</th><th className="p-3 text-right">Tutar</th><th className="p-3 text-center">Durum</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredApproved.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-700/30">
                      <td className="p-3 text-slate-400 text-xs font-medium">
                          {inv.firmName}
                          <div className="mt-0.5"><InvoiceTypeBadge type={inv.invoiceType} /></div>
                      </td>
                      <td className="p-3 text-slate-500 text-xs">{new Date(inv.date).toLocaleDateString('tr-TR')}</td>
                      <td className="p-3 text-right text-slate-400 text-xs font-mono">{formatCurrency(inv.debt)}</td>
                      <td className="p-3 text-center"><span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Onaylı</span></td>
                    </tr>
                  ))}
                  {filteredApproved.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-xs">Kayıt bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
      )}
    </div>
  );
};

export default Invoices;
