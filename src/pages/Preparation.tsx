
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { Firm, PreparationItem, TransactionType, GlobalSettings } from '../types';
import { Calculator, Save, ArrowRight, Upload, Download, Search, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Preparation = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Record<string, PreparationItem>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    const f = db.getFirms();
    setFirms(f);
    setGlobalSettings(db.getGlobalSettings());
    
    const saved = db.getPreparationItems();
    const initialItems: Record<string, PreparationItem> = {};
    
    f.forEach(firm => {
      const existing = saved.find(s => s.firmId === firm.id);
      initialItems[firm.id] = existing || { 
        firmId: firm.id, 
        currentEmployeeCount: Number(firm.basePersonLimit), 
        extraItemAmount: 0, 
        addYearlyFee: false 
      };
    });
    setItems(initialItems);
    setLoading(false);
  }, []);

  useEffect(() => { 
    if (!loading) db.savePreparationItems(Object.values(items)); 
  }, [items, loading]);

  const handleUpdate = (firmId: string, field: keyof PreparationItem, value: any) => {
    setItems(prev => ({ 
      ...prev, 
      [firmId]: { 
        ...(prev[firmId] || { firmId, currentEmployeeCount: 0, extraItemAmount: 0 }), 
        [field]: typeof value === 'boolean' ? value : Number(value) 
      } 
    }));
  };

  // --- HESAPLAMA MOTORU ---
  const calculateFinancials = (firm: Firm, item: PreparationItem | undefined) => {
      const currentCount = Number(item?.currentEmployeeCount ?? firm.basePersonLimit);
      const extraItemAmount = Number(item?.extraItemAmount ?? 0);
      
      let grandTotal = Number(firm.baseFee);
      
      // Standart Aşım Hesabı
      if (currentCount > firm.basePersonLimit) {
          const diff = currentCount - firm.basePersonLimit;
          grandTotal += diff * firm.extraPersonFee;
      }

      // Ekstra Kalem
      grandTotal += extraItemAmount;

      // Hakediş Payları
      const expertRate = globalSettings?.expertPercentage ?? firm.expertPercentage;
      const doctorRate = globalSettings?.doctorPercentage ?? firm.doctorPercentage;

      const grossExpertShare = grandTotal * (expertRate / 100);
      const grossDoctorShare = grandTotal * (doctorRate / 100);

      return { grandTotal, grossExpertShare, grossDoctorShare };
  };

  // --- EXCEL ŞABLON İNDİR ---
  const handleDownloadPrepTemplate = () => {
    const data = firms.map(f => ({
        "Firma ID (DOKUNMAYIN)": f.id,
        "Firma Adı": f.name,
        "Mevcut Limit": f.basePersonLimit,
        "Çalışan Sayısı (GİRİNİZ)": items[f.id]?.currentEmployeeCount || f.basePersonLimit,
        "Ekstra Tutar (GİRİNİZ)": items[f.id]?.extraItemAmount || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hazirlik_Listesi");
    XLSX.writeFile(workbook, `Fatura_Hazirlik_Sablonu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
  };

  // --- EXCEL YÜKLE ---
  const handleUploadPrepData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            
            let updatedCount = 0;
            
            setItems(prev => {
                const newItems = { ...prev };
                data.forEach(row => {
                    const id = row["Firma ID (DOKUNMAYIN)"];
                    const count = row["Çalışan Sayısı (GİRİNİZ)"];
                    const extra = row["Ekstra Tutar (GİRİNİZ)"];

                    if (id) {
                        newItems[id] = {
                            firmId: id,
                            currentEmployeeCount: count !== undefined ? Number(count) : (newItems[id]?.currentEmployeeCount || 0),
                            extraItemAmount: extra !== undefined ? Number(extra) : (newItems[id]?.extraItemAmount || 0)
                        };
                        updatedCount++;
                    }
                });
                return newItems;
            });

            alert(`${updatedCount} firmanın verileri güncellendi.`);
        } catch (err) {
            console.error(err);
            alert("Excel dosyası okunamadı.");
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  // --- FATURA OLUŞTURMA YARDIMCISI ---
  const createTransactionRecord = (firm: Firm, item: PreparationItem, financials: any) => {
    const date = new Date();
    db.addTransaction({
        firmId: firm.id,
        date: date.toISOString(),
        type: TransactionType.INVOICE,
        invoiceType: firm.defaultInvoiceType,
        description: `Hizmet Bedeli - ${date.toLocaleString('tr-TR', { month: 'long' })} ${date.getFullYear()}`,
        debt: financials.grandTotal,
        credit: 0,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        status: 'PENDING',
        calculatedDetails: {
            employeeCount: item.currentEmployeeCount,
            extraItemAmount: item.extraItemAmount,
            expertShare: financials.grossExpertShare,
            doctorShare: financials.grossDoctorShare
        }
    });
  };

  // --- TEKLİ FATURALAŞTIR (DÜZELTİLDİ) ---
  const handleInvoiceSingle = (firmId: string) => {
      const firm = firms.find(f => f.id === firmId);
      if (!firm) return;
      
      // Fallback: Eğer items içinde yoksa varsayılan değerleri kullan
      const item = items[firmId] || { firmId, currentEmployeeCount: firm.basePersonLimit, extraItemAmount: 0 };
      const financials = calculateFinancials(firm, item);

      if (financials.grandTotal <= 0) return alert("Tutar 0 olduğu için fatura oluşturulamaz.");

      if (!window.confirm(`${firm.name} için ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(financials.grandTotal)} tutarında taslak fatura oluşturulsun mu?`)) return;

      createTransactionRecord(firm, item, financials);
      alert("Fatura taslağı oluşturuldu. 'Kesilecek Faturalar' ekranından onaylayabilirsiniz.");
  };

  // --- TOPLU FATURALAŞTIR (DÜZELTİLDİ) ---
  const handleInvoiceAll = () => {
      const targetFirms = filteredFirms.length > 0 ? filteredFirms : firms;
      
      if (targetFirms.length === 0) return alert("Listede firma yok.");
      
      if (!window.confirm(`${targetFirms.length} adet firma için hesaplanan tutarlar TASLAK olarak oluşturulacak. Devam edilsin mi?`)) return;

      let count = 0;
      targetFirms.forEach(firm => {
          // Fallback: Eğer items içinde yoksa varsayılan değerleri kullan
          const item = items[firm.id] || { firmId: firm.id, currentEmployeeCount: firm.basePersonLimit, extraItemAmount: 0 };
          const financials = calculateFinancials(firm, item);
          
          if (financials.grandTotal > 0) {
              createTransactionRecord(firm, item, financials);
              count++;
          }
      });

      if (count > 0) {
        alert(`${count} adet fatura taslağı oluşturuldu.`);
        navigate('/invoices');
      } else {
        alert("Oluşturulacak (tutarı 0'dan büyük) fatura bulunamadı.");
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  const filteredFirms = firms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3"><Calculator className="w-8 h-8 text-yellow-500" /> Fatura Hazırlık</h2>
          <p className="text-slate-400 mt-2 text-sm">Çalışan sayılarını girin. <span className="text-blue-400 font-bold">Havuz</span> firmaları otomatik birleşir.</p>
        </div>
        <button onClick={handleInvoiceAll} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"><Save className="w-5 h-5" /> Tümünü Faturalaştır</button>
      </header>
      
      {/* ARAÇ ÇUBUĞU (ARAMA & EXCEL) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
           <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                 <input type="text" placeholder="Firma Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500" />
           </div>
           
           <div className="grid grid-cols-2 gap-2 lg:flex">
                <button onClick={handleDownloadPrepTemplate} className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-3 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-500 shadow-lg"><Download className="w-4 h-4" /> Şablon İndir</button>
                <div className="relative">
                    <input type="file" ref={fileInputRef} onChange={handleUploadPrepData} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-full bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm px-3 py-3 rounded-lg flex items-center justify-center gap-2 border border-slate-600 transition-colors shadow-lg"><Upload className="w-4 h-4" /> Excel Yükle</button>
                </div>
           </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 text-slate-400 font-medium">Firma</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Çalışan</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Model</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Yıllık</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Ekstra</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-right">Tutar</th>
                <th className="p-4 text-slate-400 font-medium w-16 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {filteredFirms.map(firm => {
                const item = items[firm.id];
                const currentCount = item ? item.currentEmployeeCount : firm.basePersonLimit;
                const extraAmount = item ? item.extraItemAmount : 0;
                
                const financials = calculateFinancials(firm, item);
                
                return (
                  <tr key={firm.id} className="hover:bg-slate-700/50 transition-colors group">
                    <td className="p-4 font-medium text-slate-200">
                        {firm.name}
                        <div className="text-[10px] text-slate-500">Limit: {firm.basePersonLimit} • Taban: {formatCurrency(firm.baseFee)}</div>
                    </td>
                    <td className="p-4 text-center">
                        <input 
                            type="number" 
                            min="0"
                            value={currentCount} 
                            onChange={(e) => handleUpdate(firm.id, 'currentEmployeeCount', e.target.value)} 
                            className={`w-16 bg-slate-900 border ${currentCount > firm.basePersonLimit ? 'border-yellow-500 text-yellow-500' : 'border-slate-600 text-white'} rounded px-1 py-1 text-center outline-none focus:border-blue-500`} 
                        />
                    </td>
                    <td className="p-4 text-center"><span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">{firm.pricingModel}</span></td>
                    <td className="p-4 text-center"><button className="text-slate-500 hover:text-purple-400 transition-colors"><CalendarCheck className="w-4 h-4"/></button></td>
                    <td className="p-4 text-center"><input type="number" min="0" value={extraAmount} onChange={(e) => handleUpdate(firm.id, 'extraItemAmount', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white outline-none focus:border-blue-500" placeholder="0" /></td>
                    <td className="p-4 text-right font-bold text-blue-400 text-lg">{formatCurrency(financials.grandTotal)}</td>
                    <td className="p-4 text-center">
                        <button 
                            onClick={() => handleInvoiceSingle(firm.id)} 
                            className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-colors shadow-sm"
                            title="Bu firmayı faturalaştır"
                        >
                            <ArrowRight className="w-5 h-5"/>
                        </button>
                    </td>
                  </tr>
                );
              })}
              {filteredFirms.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Kayıt bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Preparation;
