
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Transaction, TransactionType, InvoiceType, Firm } from '../types';
import { exporter } from '../services/exporter';
import { Receipt, CheckCircle, Trash2, History, FileDown, FileSpreadsheet, Copy, ClipboardCopy, Filter, CheckSquare, Square, Check, FileCheck } from 'lucide-react';

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

// --- GÜVENLİ KOPYALAMA FONKSİYONU ---
const safeCopyToClipboard = (text: string) => {
    // Electron ortamı kontrolü
    if (typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer') {
        try {
            const { clipboard } = (window as any).require('electron');
            clipboard.writeText(text);
            return Promise.resolve();
        } catch (e) {
            console.error("Electron clipboard hatası:", e);
            // Fallback
        }
    }

    // Web ortamı
    return navigator.clipboard.writeText(text);
};

// --- ANIMASYONLU KOPYALAMA BİLEŞENİ ---
const CopyBadge = ({ text, label, title, className, valueToCopy }: { text?: string | number, label?: string, title?: string, className?: string, valueToCopy?: string | number }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Satır seçimini engelle
        window.focus(); // Odaklanmayı zorla
        
        const content = valueToCopy !== undefined ? valueToCopy : text;
        
        let val = "";
        if (typeof content === 'number') {
            val = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(content);
        } else {
            val = String(content || "");
        }

        if (!val) return;

        safeCopyToClipboard(val).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); 
        }).catch(err => console.error("Kopyalama hatası:", err));
    };

    return (
        <button
            onClick={handleCopy}
            title={title || "Kopyalamak için tıklayın"}
            className={`
                flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-300 transform select-none
                ${copied 
                    ? 'bg-emerald-600 text-white scale-105 shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400' 
                    : 'bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-700'
                }
                ${className}
            `}
        >
            {copied ? <Check className="w-3 h-3 animate-in zoom-in spin-in-180 duration-300" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px] font-medium leading-none pt-0.5">
                {copied ? 'Kopyalandı' : (label || 'Kopyala')}
            </span>
        </button>
    );
};

// --- SMART TEXT COPY BUTTON ---
// firmId'si aynı olan VEYA parentFirmId'si bu fatura sahibi olanları toplar.
const SmartCopyButton = ({ inv, globalSettings, allTransactions, firms }: { inv: Transaction, globalSettings: any, allTransactions: Transaction[], firms: Firm[] }) => {
    const [copied, setCopied] = useState(false);

    const handleSmartTextCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.focus();
        try {
            const textAmount = numberToTurkishText(inv.debt);

            // --- GELİŞMİŞ BAKİYE HESAPLAMA (ŞUBELER DAHİL) ---
            
            // 1. Hedef Firmaları Bul (Kendisi + Şubeleri)
            const targetIds = [inv.firmId];
            const branches = firms.filter(f => f.parentFirmId === inv.firmId);
            branches.forEach(b => targetIds.push(b.id));

            // 2. Bu ID'lere ait tüm ONAYLI işlemleri bul
            const firmTrans = allTransactions.filter(t => 
                targetIds.includes(t.firmId) && 
                (t.status === 'APPROVED' || !t.status)
            );

            const totalDebited = firmTrans.reduce((sum, t) => sum + t.debt, 0);
            const totalPaid = firmTrans.reduce((sum, t) => sum + t.credit, 0);
            const priorBalance = totalDebited - totalPaid;

            let finalStr = textAmount;
            // Geçmiş bakiye varsa ekle (Şubeler dahil)
            if (priorBalance > 0.1) {
                // Not: inv.debt (şu anki fatura) henüz 'PENDING' ise firmTrans içinde yoktur.
                // Bu yüzden toplam borcu hesaplarken üzerine ekliyoruz.
                const totalDebt = priorBalance + inv.debt;
                
                const dateStr = new Date().toLocaleDateString('tr-TR');
                const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalDebt);
                const bankText = globalSettings.bankInfo || '';
                
                // Eğer şube varsa bilgi notu ekle
                const branchNote = branches.length > 0 ? ` (Şubeler Dahil)` : '';

                finalStr += ` "${dateStr} Tarihi itibariyle${branchNote} Borç Bakiyesi: ${formattedTotal}'dir. ${bankText}`;
            }
            
            safeCopyToClipboard(finalStr).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <button 
            onClick={handleSmartTextCopy} 
            className={`
                p-2 rounded-lg transition-all duration-300 border flex items-center justify-center
                ${copied 
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105' 
                    : 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:opacity-80'
                }
            `}
            title="Yazı ile Kopyala (Şubeler Dahil)"
        >
            {copied ? <Check className="w-4 h-4 animate-in zoom-in" /> : <ClipboardCopy className="w-4 h-4" />}
        </button>
    );
};

type InvoiceWithDetails = Transaction & { 
    firmName: string;
    taxNumber?: string;
    address?: string;
};

const Invoices = () => {
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceWithDetails[]>([]);
  const [approvedInvoices, setApprovedInvoices] = useState<InvoiceWithDetails[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]); // Firmaları state'e aldık
  const [showHistory, setShowHistory] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(db.getGlobalSettings());
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadData = () => {
    const allTrans = db.getTransactions();
    setAllTransactions(allTrans); // Smart copy için ham veri
    
    const allFirms = db.getFirms();
    setFirms(allFirms); // Firmaları kaydet (Smart copy için gerekli)

    const firmMap = new Map<string, Firm>();
    allFirms.forEach(f => firmMap.set(f.id, f));

    const allInvoices = allTrans
      .filter(t => t.type === TransactionType.INVOICE)
      .map(t => {
        const firm = firmMap.get(t.firmId);
        return {
            ...t,
            firmName: firm?.name || 'Bilinmeyen Firma',
            taxNumber: firm?.taxNumber || '',
            address: firm?.address || ''
        };
      });

    // Alfabetik Sıralama
    setPendingInvoices(allInvoices.filter(t => t.status === 'PENDING').sort((a, b) => a.firmName.localeCompare(b.firmName)));
    setApprovedInvoices(allInvoices.filter(t => t.status === 'APPROVED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setGlobalSettings(db.getGlobalSettings());
    setSelectedIds([]); // Reset selection on load
  };

  useEffect(() => { loadData(); }, []);

  const applyFilter = (list: InvoiceWithDetails[]) => {
    if (filterType === 'ALL') return list;
    return list.filter(t => t.invoiceType === filterType);
  };

  const filteredPending = applyFilter(pendingInvoices);
  const filteredApproved = applyFilter(approvedInvoices);

  const handleApprove = (id: string) => {
    window.focus();
    if (window.confirm('Bu faturayı onaylıyor musunuz?')) {
      db.updateTransactionStatus(id, 'APPROVED');
      loadData();
      window.focus();
    }
  };

  // --- TOPLU İŞLEMLER ---
  const toggleSelectAll = () => {
      if (selectedIds.length === filteredPending.length) setSelectedIds([]);
      else setSelectedIds(filteredPending.map(inv => inv.id));
  };
  const toggleSelect = (id: string) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(s => s !== id));
      else setSelectedIds([...selectedIds, id]);
  };
  const handleBulkDelete = () => {
      window.focus();
      if (selectedIds.length === 0) return;
      if (window.confirm(`${selectedIds.length} adet faturayı silmek istediğinize emin misiniz?`)) {
          db.deleteTransactionsBulk(selectedIds);
          loadData();
          window.focus();
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // GÖRÜNEN LİSTEYİ (BEKLEYENLERİ) İNDİR
  const handleExportExcel = () => {
    const dataToExport = [...filteredPending, ...(showHistory ? filteredApproved : [])].map(inv => {
        const netExpert = (inv.calculatedDetails?.expertShare || 0) / (1 + globalSettings.vatRateExpert / 100);
        const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / (1 + globalSettings.vatRateDoctor / 100);
        const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / (1 + globalSettings.vatRateHealth / 100);
        const annual = inv.calculatedDetails?.yearlyFeeAmount || 0;

        return {
            'Firma Adı': inv.firmName,
            'Uzman (Net)': netExpert,
            'Doktor (Net)': netDoctor,
            'Sağlık (Net)': netHealth,
            'Yıllık (Brüt)': annual,
            'Fatura Tutarı (Brüt)': inv.debt,
            'Tip': inv.invoiceType,
            'Durum': inv.status === 'PENDING' ? 'Bekliyor' : 'Onaylandı',
            'Tarih': new Date(inv.date).toLocaleDateString('tr-TR'),
            'Açıklama': inv.description
        };
    });
    exporter.exportToExcel('Taslak_Fatura_Listesi', dataToExport);
  };

  // SADECE ONAYLANANLARI (GEÇMİŞİ) İNDİR
  const handleExportApprovedExcel = () => {
    if (approvedInvoices.length === 0) return alert("Henüz onaylanmış fatura bulunmamaktadır.");
    
    const dataToExport = approvedInvoices.map(inv => {
        // NET Hesaplama
        const netExpert = (inv.calculatedDetails?.expertShare || 0) / (1 + globalSettings.vatRateExpert / 100);
        const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / (1 + globalSettings.vatRateDoctor / 100);
        const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / (1 + globalSettings.vatRateHealth / 100);
        const annual = inv.calculatedDetails?.yearlyFeeAmount || 0;

        return {
            'Tarih': new Date(inv.date).toLocaleDateString('tr-TR'),
            'Firma Adı': inv.firmName,
            'Vergi No': inv.taxNumber || '-',
            'Fatura Tipi': inv.invoiceType,
            'Açıklama': inv.description,
            'Uzman Hakediş (Net)': Number(netExpert.toFixed(2)),
            'Doktor Hakediş (Net)': Number(netDoctor.toFixed(2)),
            'Sağlık Hizmeti (Net)': Number(netHealth.toFixed(2)),
            'Yıllık Ücret (Brüt)': annual,
            'FATURA TOPLAMI (KDV DAHİL)': inv.debt
        };
    });
    
    exporter.exportToExcel(`Kesilen_Faturalar_Raporu_${new Date().toLocaleDateString('tr-TR')}`, dataToExport);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-500" />
            Kesilecek Faturalar
          </h2>
          <p className="text-slate-400 mt-2">Onay bekleyen taslak faturaları yönetin.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg pl-10 p-2.5 outline-none cursor-pointer">
              <option value="ALL">Tümü</option>
              <option value={InvoiceType.E_FATURA}>E-Fatura</option>
              <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
            </select>
          </div>
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm transition-colors" title="Ekrandaki listeyi indir"><FileSpreadsheet className="w-4 h-4" /> Excel (Taslak)</button>
          <button onClick={handleExportApprovedExcel} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-blue-900/20" title="Tüm onaylanmış faturaları indir"><FileCheck className="w-4 h-4" /> Resmileşenleri İndir</button>
          <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><History className="w-4 h-4" /> {showHistory ? 'Gizle' : 'Geçmiş'}</button>
        </div>
      </header>

      {/* Bekleyen Faturalar (PENDING) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">Bekleyen Onaylar <span className="bg-yellow-500/20 text-yellow-500 text-xs py-0.5 px-2 rounded-full">{filteredPending.length}</span></h3>
                {selectedIds.length > 0 && (
                    <button onClick={handleBulkDelete} className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded flex items-center gap-1 animate-in zoom-in">
                        <Trash2 className="w-3 h-3" /> Seçilenleri Sil ({selectedIds.length})
                    </button>
                )}
            </div>
            {filterType !== 'ALL' && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Filtre: <span className="text-white font-bold">{filterType}</span></span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 w-10 text-center"><button onClick={toggleSelectAll} className="text-slate-500 hover:text-white">{selectedIds.length === filteredPending.length && filteredPending.length > 0 ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}</button></th>
                <th className="p-4 text-slate-400 font-medium">Firma Adı</th>
                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-2">
                        <span>Uzman (Net)</span>
                        <CopyBadge valueToCopy="İŞ GÜVENLİĞİ UZMANI HİZMET BEDELİ" label="Metin" className="opacity-75 hover:opacity-100" />
                    </div>
                </th>
                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-2">
                        <span>Doktor (Net)</span>
                        <CopyBadge valueToCopy="İŞYERİ HEKİMİ HİZMETİ BEDELİ" label="Metin" className="opacity-75 hover:opacity-100" />
                    </div>
                </th>
                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-2">
                        <span>Sağlık (Net)</span>
                        <CopyBadge valueToCopy="SAĞLIK HİZMETİ" label="Metin" className="opacity-75 hover:opacity-100" />
                    </div>
                </th>
                <th className="p-4 text-slate-400 font-medium text-right">Toplam</th>
                <th className="p-4 text-slate-400 font-medium text-center">Tip</th>
                <th className="p-4 text-slate-400 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredPending.map(inv => {
                // NET HESAPLAMALARI: Brüt / (1 + KDV Oranı)
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
                    {inv.invoiceType === InvoiceType.E_ARSIV && (
                        <div className="flex gap-2 mt-2">
                             <CopyBadge valueToCopy={inv.taxNumber || ' '} label={`VKN: ${inv.taxNumber || 'Yok'}`} className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20" />
                             <CopyBadge valueToCopy={inv.address || ' '} label="Adres" className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20" />
                        </div>
                    )}
                  </td>
                  
                  {/* UZMAN */}
                  <td className="p-4 text-center text-sm">
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-slate-300">{formatCurrency(netExpert)}</span>
                        <CopyBadge text={netExpert} />
                    </div>
                  </td>

                  {/* DOKTOR */}
                  <td className="p-4 text-center text-sm">
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-slate-300">{formatCurrency(netDoctor)}</span>
                        <CopyBadge text={netDoctor} />
                    </div>
                  </td>

                  {/* SAĞLIK (Animasyonlu) */}
                  <td className="p-4 text-center text-sm">
                    <div className="flex flex-col items-center gap-1">
                        {netHealth > 0.01 ? (
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/50 px-3 py-1 rounded-lg animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                {formatCurrency(netHealth)}
                            </span>
                        ) : (
                            <span className="font-medium text-slate-300">{formatCurrency(netHealth)}</span>
                        )}
                        <CopyBadge text={netHealth} />
                    </div>
                  </td>

                  {/* TOPLAM */}
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-slate-200 text-base">{formatCurrency(inv.debt)}</span>
                        <CopyBadge text={inv.debt} />
                    </div>
                  </td>

                  <td className="p-4 text-center text-xs text-slate-500">{inv.invoiceType}</td>
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
                      <td className="p-4 text-slate-400 text-sm">{inv.firmName}</td>
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
