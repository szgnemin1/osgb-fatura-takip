
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Transaction, TransactionType, InvoiceType, Firm } from '../types';
import { exporter } from '../services/exporter';
import { Receipt, CheckCircle, Trash2, History, FileDown, FileSpreadsheet, Copy, ClipboardCopy, Filter } from 'lucide-react';

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
    if (h === 1) res += "YÜZ";
    else if (h > 1) res += ones[h] + "YÜZ";

    res += tens[t];
    res += ones[o];
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
      if (groupIndex === 1 && part === 1) partStr = ""; // "Bir Bin" olmaz "Bin" olur
      str = partStr + groups[groupIndex] + str;
    }
    tempInt = Math.floor(tempInt / 1000);
    groupIndex++;
  }

  let result = `YALNIZ${str}TÜRKLİRASI`;

  if (decimalPart > 0) {
    result += convertGroup(decimalPart) + "KURUŞ";
  }

  return result + "DIR.";
};

type InvoiceWithDetails = Transaction & { 
    firmName: string;
    taxNumber?: string;
    address?: string;
};

const Invoices = () => {
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceWithDetails[]>([]);
  const [approvedInvoices, setApprovedInvoices] = useState<InvoiceWithDetails[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // FİLTRE STATE
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');

  const loadData = () => {
    const allTransactions = db.getTransactions();
    const allFirms = db.getFirms();
    // Firma detaylarını haritala
    const firmMap = new Map<string, Firm>();
    allFirms.forEach(f => firmMap.set(f.id, f));

    const allInvoices = allTransactions
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

    setPendingInvoices(
      allInvoices
        .filter(t => t.status === 'PENDING')
        .sort((a, b) => a.firmName.localeCompare(b.firmName))
    );

    setApprovedInvoices(
      allInvoices
        .filter(t => t.status === 'APPROVED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FİLTRELEME MANTIĞI ---
  const applyFilter = (list: InvoiceWithDetails[]) => {
    if (filterType === 'ALL') return list;
    return list.filter(t => t.invoiceType === filterType);
  };

  const filteredPending = applyFilter(pendingInvoices);
  const filteredApproved = applyFilter(approvedInvoices);

  const handleApprove = (id: string) => {
    if (window.confirm('Bu faturayı onaylıyor musunuz? Onaylandıktan sonra cari hesaplara işlenecektir.')) {
      db.updateTransactionStatus(id, 'APPROVED');
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu taslak faturayı silmek istediğinize emin misiniz?')) {
      db.deleteTransaction(id);
      loadData();
    }
  };

  // --- KOPYALAMA FONKSİYONLARI ---

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // Sessiz kopya
    });
  };

  const copyNumber = (num: number) => {
    const formatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    copyToClipboard(formatted);
  };

  const handleSmartTextCopy = (inv: Transaction) => {
    const textAmount = numberToTurkishText(inv.debt);
    const allTrans = db.getTransactions();
    const firmTrans = allTrans.filter(t => t.firmId === inv.firmId && (t.status === 'APPROVED' || !t.status));
    
    const totalDebited = firmTrans.reduce((sum, t) => sum + t.debt, 0);
    const totalPaid = firmTrans.reduce((sum, t) => sum + t.credit, 0);
    const priorBalance = totalDebited - totalPaid;

    let finalStr = textAmount;

    if (priorBalance > 0.1) {
        const totalDebt = priorBalance + inv.debt;
        const dateStr = new Date().toLocaleDateString('tr-TR');
        const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalDebt);

        finalStr += ` "${dateStr} Tarihi itibariyle Borç Bakiyesi: ${formattedTotal}'dir. Yeni Banka Hesap Bilgilerimiz; CANKAYA ORTAK SAĞLIK GÜV.BİR.SAN.TİC.LTD.ŞTİ. TR12 0015 7000 0000 0157 3026 68`;
    }

    copyToClipboard(finalStr);
    alert("Metin kopyalandı!");
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR');

  const handleExportExcel = () => {
    const dataToExport = [...filteredPending, ...(showHistory ? filteredApproved : [])].map(inv => {
        const netExpert = (inv.calculatedDetails?.expertShare || 0) / 1.2;
        const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / 1.1;
        const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / 1.1;
        
        return {
            'Firma Adı': inv.firmName,
            'Uzman Hakediş (Net)': netExpert,
            'Doktor Hakediş (Net)': netDoctor,
            'Sağlık Ücreti (Net)': netHealth,
            'Fatura Tutarı (Brüt)': inv.debt,
            'Fatura Tipi': inv.invoiceType,
            'Durum': inv.status === 'PENDING' ? 'Bekliyor' : 'Onaylandı',
            'Tarih': new Date(inv.date).toLocaleDateString('tr-TR'),
            'Açıklama': inv.description
        };
    });
    exporter.exportToExcel('Detayli_Fatura_Listesi', dataToExport);
  };

  const handleExportPDF = () => {
    const dataToExport = [...filteredPending, ...(showHistory ? filteredApproved : [])].map(inv => {
        const netExpert = (inv.calculatedDetails?.expertShare || 0) / 1.2;
        const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / 1.1;
        const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / 1.1;
        return [
            inv.firmName,
            formatCurrency(netExpert),
            formatCurrency(netDoctor),
            formatCurrency(netHealth),
            formatCurrency(inv.debt),
            inv.invoiceType || '-',
            inv.status === 'PENDING' ? 'Bekliyor' : 'Onaylandı'
        ];
    });
    exporter.exportToPDF(
      'Detaylı Fatura Listesi',
      ['Firma Adı', 'Uzman (Net)', 'Dr. (Net)', 'Sağlık (Net)', 'Toplam (Brüt)', 'Tip', 'Durum'],
      dataToExport,
      'Detayli_Fatura_Listesi'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-slate-500" />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 outline-none appearance-none cursor-pointer"
            >
              <option value="ALL">Tümü</option>
              <option value={InvoiceType.E_FATURA}>E-Fatura</option>
              <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
            </select>
          </div>

          <div className="h-8 w-px bg-slate-700 mx-2"></div>

          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 bg-rose-700 hover:bg-rose-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            <History className="w-4 h-4" />
            {showHistory ? 'Geçmişi Gizle' : 'Geçmişi Göster'}
          </button>
        </div>
      </header>

      {/* Bekleyen Faturalar (PENDING) */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-yellow-500 flex items-center gap-2">
                Bekleyen Onaylar
                <span className="bg-yellow-500/20 text-yellow-500 text-xs py-0.5 px-2 rounded-full">{filteredPending.length}</span>
            </h3>
            {filterType !== 'ALL' && (
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    Filtre: <span className="text-white font-bold">{filterType}</span>
                </span>
            )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 text-slate-400 font-medium w-12 text-center">Sil</th>
                <th className="p-4 text-slate-400 font-medium">Firma Adı</th>
                
                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span>Uzman (Net)</span>
                        <button onClick={() => copyToClipboard("İŞ GÜVENLİĞİ UZMANI HİZMET BEDELİ")} className="text-[10px] bg-slate-700 hover:bg-blue-600 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                            <Copy className="w-3 h-3" /> Metni Al
                        </button>
                    </div>
                </th>

                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span>Doktor (Net)</span>
                        <button onClick={() => copyToClipboard("İŞYERİ HEKİMİ HİZMETİ BEDELİ")} className="text-[10px] bg-slate-700 hover:bg-blue-600 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                            <Copy className="w-3 h-3" /> Metni Al
                        </button>
                    </div>
                </th>

                <th className="p-4 text-slate-400 font-medium text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span>Sağlık (Net)</span>
                        <button onClick={() => copyToClipboard("SAĞLIK HİZMETİ")} className="text-[10px] bg-slate-700 hover:bg-blue-600 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                            <Copy className="w-3 h-3" /> Metni Al
                        </button>
                    </div>
                </th>

                <th className="p-4 text-slate-400 font-medium text-right">Fatura Tutarı</th>
                <th className="p-4 text-slate-400 font-medium text-center">Fatura Tipi</th>
                <th className="p-4 text-slate-400 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredPending.map(inv => {
                const netExpert = (inv.calculatedDetails?.expertShare || 0) / 1.2;
                const netDoctor = (inv.calculatedDetails?.doctorShare || 0) / 1.1;
                const netHealth = (inv.calculatedDetails?.extraItemAmount || 0) / 1.1;

                return (
                <tr key={inv.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 text-center">
                    <button 
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Sil">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="p-4 font-medium text-slate-200">
                    {inv.firmName}
                    <div className="text-xs text-slate-500">{inv.description}</div>
                    
                    {/* E-ARŞİV ÖZEL BUTONLARI */}
                    {inv.invoiceType === InvoiceType.E_ARSIV && (
                        <div className="flex gap-2 mt-2">
                             <button 
                                onClick={() => copyToClipboard(inv.taxNumber || '')}
                                className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded hover:bg-orange-500/20"
                                title="Vergi No Kopyala"
                             >
                                VKN: {inv.taxNumber || 'Yok'}
                             </button>
                             <button 
                                onClick={() => copyToClipboard(inv.address || '')}
                                className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded hover:bg-orange-500/20"
                                title="Adres Kopyala"
                             >
                                Adres Kopyala
                             </button>
                        </div>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-slate-400 text-sm">{formatCurrency(netExpert)}</span>
                        <button onClick={() => copyNumber(netExpert)} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-slate-700/50" title="Sayıyı Kopyala">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-slate-400 text-sm">{formatCurrency(netDoctor)}</span>
                        <button onClick={() => copyNumber(netDoctor)} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-slate-700/50" title="Sayıyı Kopyala">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-slate-400 text-sm">{formatCurrency(netHealth)}</span>
                        <button onClick={() => copyNumber(netHealth)} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-slate-700/50" title="Sayıyı Kopyala">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                  </td>

                  <td className="p-4 text-right font-bold text-slate-200">
                     <div className="flex flex-col items-end gap-1">
                        <span>{formatCurrency(inv.debt)}</span>
                        <button onClick={() => copyNumber(inv.debt)} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-slate-700/50" title="Sayıyı Kopyala">
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <select 
                      disabled={true}
                      value={inv.invoiceType || InvoiceType.E_FATURA}
                      className="bg-slate-900 border border-slate-600 text-xs text-slate-500 rounded px-2 py-1 outline-none cursor-not-allowed opacity-70"
                    >
                      <option value={InvoiceType.E_FATURA}>E-Fatura</option>
                      <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleSmartTextCopy(inv)}
                            className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-600/30" 
                            title="Yazı ile Tutar ve İban Bilgisini Kopyala"
                        >
                            <ClipboardCopy className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => handleApprove(inv.id)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20" title="Onayla ve Resmileştir">
                            <CheckCircle className="w-4 h-4" />
                            Onayla
                        </button>
                    </div>
                  </td>
                </tr>
              )})}
               {filteredPending.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {filterType === 'ALL' ? 'Onay bekleyen fatura yok.' : 'Bu kriterde fatura yok.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onaylanmış Geçmiş */}
      {showHistory && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden opacity-75">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-400">Geçmiş Faturalar</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-xs">
                    <th className="p-4 text-slate-500">Firma</th>
                    <th className="p-4 text-slate-500">Tarih</th>
                    <th className="p-4 text-slate-500 text-right">Tutar (Brüt)</th>
                    <th className="p-4 text-slate-500 text-center">Tip</th>
                    <th className="p-4 text-slate-500 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredApproved.map(inv => (
                    <tr key={inv.id}>
                      <td className="p-4 text-slate-400 text-sm">{inv.firmName}</td>
                      <td className="p-4 text-slate-500 text-sm">{formatDate(inv.date)}</td>
                      <td className="p-4 text-right text-slate-400 text-sm">{formatCurrency(inv.debt)}</td>
                      <td className="p-4 text-center text-slate-500 text-sm">{inv.invoiceType || '-'}</td>
                      <td className="p-4 text-center">
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">Onaylandı</span>
                      </td>
                    </tr>
                  ))}
                  {filteredApproved.length === 0 && (
                     <tr><td colSpan={5} className="p-4 text-center text-slate-500 text-sm">Geçmiş kayıt yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      )}

    </div>
  );
};

export default Invoices;
