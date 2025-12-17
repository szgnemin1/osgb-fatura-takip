
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { Firm, PreparationItem, TransactionType, PricingModel, PricingTier, InvoiceType, GlobalSettings, ServiceType } from '../types';
import { Calculator, Save, AlertCircle, FilePlus, ArrowRight, Upload, Download, CalendarCheck, Calendar, Search, Filter, XCircle, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Preparation = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Record<string, PreparationItem>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtre State
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'ALL' | InvoiceType>('ALL');
  
  // Excel Filtre State (Yeni)
  const [excelUploadedIds, setExcelUploadedIds] = useState<string[]>([]);
  
  // Global Settings for Partial Calculation
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    // Firmalar DB servisinde alfabetik geliyor
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
        addYearlyFee: false,
      };
    });
    setItems(initialItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      db.savePreparationItems(Object.values(items));
    }
  }, [items, loading]);

  const handleUpdate = (firmId: string, field: keyof PreparationItem, value: any) => {
    setItems(prev => ({
      ...prev,
      [firmId]: {
        ...prev[firmId],
        [field]: typeof value === 'boolean' ? value : Number(value)
      }
    }));
  };

  // --- EXCEL ŞABLON İŞLEMLERİ ---
  const handleDownloadPrepTemplate = () => {
      if (firms.length === 0) return alert("Firma bulunamadı.");
      
      const data = firms.map(f => {
          const item = items[f.id];
          return {
              "Firma ID (Dokunmayın)": f.id,
              "Firma Adı": f.name,
              "Mevcut Çalışan Sayısı": item ? item.currentEmployeeCount : f.basePersonLimit,
              "Ekstra Kalem (TL)": item ? item.extraItemAmount : 0
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fatura_Hazirlik");
      XLSX.writeFile(workbook, "OSGB_Fatura_Hazirlik_Sablonu.xlsx");
  };

  const handleUploadPrepData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws);
              
              const newItems = { ...items };
              let updatedCount = 0;
              const uploadedIds: string[] = []; // Yüklenen firmaların ID'lerini tut

              data.forEach((row: any) => {
                  // ID ile eşleşmeyi dene, olmazsa isimle
                  const id = row["Firma ID (Dokunmayın)"];
                  const name = row["Firma Adı"];
                  
                  const firm = firms.find(f => f.id === id) || firms.find(f => f.name === name);
                  
                  if (firm) {
                      newItems[firm.id] = {
                          ...newItems[firm.id],
                          firmId: firm.id,
                          currentEmployeeCount: Number(row["Mevcut Çalışan Sayısı"] || firm.basePersonLimit),
                          extraItemAmount: Number(row["Ekstra Kalem (TL)"] || 0)
                      };
                      updatedCount++;
                      uploadedIds.push(firm.id);
                  }
              });

              setItems(newItems);
              setExcelUploadedIds(uploadedIds); // Filtreyi aktif et
              
              alert(`${updatedCount} firmanın verisi güncellendi ve ekranda listelendi.`);
              if(fileInputRef.current) fileInputRef.current.value = '';

          } catch (err) {
              console.error(err);
              alert("Dosya okunamadı. Lütfen doğru şablonu kullandığınızdan emin olun.");
          }
      };
      reader.readAsBinaryString(file);
  };


  // --- HESAPLAMA MOTORU ---
  const calculateModelPrice = (
      count: number, 
      model: PricingModel, 
      baseFee: number, 
      limit: number, 
      extraFee: number, 
      tolerance: number = 0, 
      tiers: PricingTier[] = []
    ) => {
      
      let price = 0;

      if (model === PricingModel.STANDARD) {
          price = baseFee;
          if (count > limit) {
              price += (count - limit) * extraFee;
          }
      } 
      else if (model === PricingModel.TOLERANCE) {
          const lowerLimit = limit * (1 - tolerance / 100);
          const upperLimit = limit * (1 + tolerance / 100);
          price = baseFee;
          if (count > upperLimit) {
              price += (count - upperLimit) * extraFee;
          } else if (count < lowerLimit) {
              price -= (lowerLimit - count) * extraFee;
          }
      }
      else if (model === PricingModel.TIERED) {
          const matchTier = tiers.find(t => count >= t.min && count <= t.max);
          if (matchTier) {
              price = matchTier.price;
          } else {
              const maxTier = tiers.reduce((prev, current) => (prev.max > current.max) ? prev : current, {max: 0, price: 0} as any);
              if (count > maxTier.max) {
                   price = maxTier.price + (count - maxTier.max) * extraFee;
              } else {
                  // Alt limit altında ise fallback
                  const minTier = tiers.reduce((prev, current) => (prev.min < current.min) ? prev : current, {min: 999999, price: baseFee} as any);
                  if (count < minTier.min) {
                       price = minTier.price - (minTier.min - count) * extraFee;
                  } else {
                      price = baseFee;
                  }
              }
          }
      } else {
          price = baseFee;
      }
      return Math.max(0, price);
  };


  const calculateFullTotal = (firm: Firm, item: PreparationItem | undefined) => {
    const safeItem = item || {
      firmId: firm.id,
      currentEmployeeCount: Number(firm.basePersonLimit),
      extraItemAmount: 0,
      addYearlyFee: false,
    };
    
    const count = Number(safeItem.currentEmployeeCount);
    
    // 1. Ana Model Aylık Hesaplaması
    const primaryTotal = calculateModelPrice(
        count, 
        firm.pricingModel, 
        firm.baseFee, 
        firm.basePersonLimit, 
        firm.extraPersonFee, 
        firm.tolerancePercentage, 
        firm.tiers
    );

    // 2. İkincil Model Aylık Hesaplaması
    let secondaryTotal = 0;
    if (firm.hasSecondaryModel) {
        secondaryTotal = calculateModelPrice(
            count,
            firm.secondaryPricingModel || PricingModel.STANDARD,
            firm.secondaryBaseFee || 0,
            firm.secondaryBasePersonLimit || 0,
            firm.secondaryExtraPersonFee || 0,
            0,
            firm.secondaryTiers || []
        );
    }

    const calculatedMonthlyService = primaryTotal + secondaryTotal;
    
    let finalServiceBase = 0;

    // Yıllık Ücret Kontrolü
    if (safeItem.addYearlyFee) {
        finalServiceBase = (firm.yearlyFee || 0); 
    } else {
        finalServiceBase = calculatedMonthlyService;
    }

    // GÜNCELLEME: "Sana bölünmüş tutar veriliyor zaten" mantığı.
    // Hesaplanan tutar ne ise (finalServiceBase), o tutar faturaya yansır.
    // Yüzde ile çarpıp küçültmüyoruz.
    
    let appliedServiceTotal = finalServiceBase;
    
    const healthFee = Number(safeItem.extraItemAmount);
    
    return {
        serviceTotal: appliedServiceTotal, 
        healthFee,
        grandTotal: appliedServiceTotal + healthFee
    };
  };

  const createInvoiceTransaction = (firm: Firm, item: PreparationItem | undefined, totals: any) => {
    window.focus();
    const date = new Date();
    const settings = globalSettings || db.getGlobalSettings(); // Fallback

    const safeItem = item || {
      firmId: firm.id,
      currentEmployeeCount: Number(firm.basePersonLimit),
      extraItemAmount: 0,
      addYearlyFee: false,
    };

    // Açıklama Dinamiği
    let desc = "";
    if (safeItem.addYearlyFee) {
         desc = `Yıllık Anlaşma Bedeli - ${date.getFullYear()}`;
    } else {
         // Firma tipine göre açıklama
         if (firm.serviceType === ServiceType.EXPERT_ONLY) {
             desc = `İş Güvenliği Uzmanlığı Hizmeti - ${date.toLocaleString('tr-TR', { month: 'long' })}`;
         } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
             desc = `İşyeri Hekimliği Hizmeti - ${date.toLocaleString('tr-TR', { month: 'long' })}`;
         } else {
             desc = `Hizmet Bedeli - ${date.toLocaleString('tr-TR', { month: 'long' })}`;
         }
    }
    
    if (totals.healthFee > 0) desc += ' + Sağlık Hizmeti';

    // Hakediş Hesaplaması
    // GÜNCELLEME: Sadece Uzman seçiliyse, hesaplanan tüm tutar (totals.serviceTotal) uzmana yazılır.
    let expertShare = 0;
    let doctorShare = 0;

    if (firm.serviceType === ServiceType.EXPERT_ONLY) {
        expertShare = totals.serviceTotal;
        doctorShare = 0;
    } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
        doctorShare = totals.serviceTotal;
        expertShare = 0;
    } else {
        // BOTH: Toplam tutarı ayarlardaki oranlara göre bölüştür
        expertShare = totals.serviceTotal * (settings.expertPercentage / 100);
        doctorShare = totals.serviceTotal * (settings.doctorPercentage / 100);
    }


    db.addTransaction({
      firmId: firm.id,
      date: date.toISOString(),
      type: TransactionType.INVOICE,
      invoiceType: firm.defaultInvoiceType,
      description: desc,
      debt: totals.grandTotal,
      credit: 0,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      status: 'PENDING',
      calculatedDetails: {
        employeeCount: safeItem.currentEmployeeCount,
        serviceAmount: totals.serviceTotal, 
        extraItemAmount: totals.healthFee, 
        yearlyFeeAmount: safeItem.addYearlyFee ? totals.serviceTotal : 0, 
        expertShare,
        doctorShare
      }
    });
  };

  const handleInvoiceSingle = (firmId: string) => {
    window.focus();
    try {
      const firm = firms.find(f => f.id === firmId);
      const item = items[firmId];
      if (!firm) return;
      
      const calc = calculateFullTotal(firm, item);

      if (calc.grandTotal <= 0) {
        alert("Toplam tutar 0 TL.");
        window.focus();
        return;
      }

      if (!window.confirm(`${firm.name} için ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calc.grandTotal)} tutarında TASLAK oluşturulsun mu?`)) {
          window.focus();
          return;
      }

      createInvoiceTransaction(firm, item, calc);
      
      if (item?.addYearlyFee) handleUpdate(firm.id, 'addYearlyFee', false);
      
      console.log("Taslak oluşturuldu");
    } catch (error) {
      console.error(error);
    }
  };

  const handleInvoiceAll = () => {
    window.focus();
    if (firms.length === 0) return alert("Firma yok.");
    if (!window.confirm("Tüm filtrelenen firmalar için taslak oluşturulacak. Devam?")) {
        window.focus();
        return;
    }

    let count = 0;
    const updates: Record<string, PreparationItem> = {};

    // Sadece filtrelenmiş firmalar için işlem yap
    filteredFirms.forEach(firm => {
      try {
        const item = items[firm.id] || { firmId: firm.id, currentEmployeeCount: Number(firm.basePersonLimit), extraItemAmount: 0, addYearlyFee: false };
        const calc = calculateFullTotal(firm, item);
        if (calc.grandTotal > 0) {
          createInvoiceTransaction(firm, item, calc);
          count++;
          
          if (item.addYearlyFee) {
              updates[firm.id] = { ...item, addYearlyFee: false };
          }
        }
      } catch (e) { console.error(e); }
    });

    if (Object.keys(updates).length > 0) {
        setItems(prev => ({ ...prev, ...updates }));
    }

    if (count > 0) {
      alert(`${count} adet taslak oluşturuldu.`);
      window.focus();
      navigate('/invoices');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  // FİLTRELEME
  const filteredFirms = firms.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = invoiceTypeFilter === 'ALL' || f.defaultInvoiceType === invoiceTypeFilter;
      // Excel Filtresi
      const matchesExcel = excelUploadedIds.length === 0 || excelUploadedIds.includes(f.id);
      
      return matchesSearch && matchesType && matchesExcel;
  });

  const clearExcelFilter = () => {
      setExcelUploadedIds([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-yellow-500" />
            Fatura Hazırlık
          </h2>
          <p className="text-slate-400 mt-2">Çalışan sayılarını girin ve hesaplayın. İsterseniz Excel ile toplu giriş yapabilirsiniz.</p>
        </div>
        <div className="flex gap-3">
            <button 
            onClick={handleInvoiceAll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
            <Save className="w-5 h-5" />
            Tümünü Faturalaştır
            </button>
        </div>
      </header>
      
      {/* EXCEL UYARISI */}
      {excelUploadedIds.length > 0 && (
          <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-blue-200">
                  <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                  <div>
                      <p className="font-bold">Excel Filtresi Aktif</p>
                      <p className="text-sm opacity-80">Şu anda sadece Excel dosyasından yüklenen <b>{excelUploadedIds.length}</b> adet firma görüntüleniyor.</p>
                  </div>
              </div>
              <button onClick={clearExcelFilter} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                  <XCircle className="w-4 h-4" />
                  Filtreyi Temizle (Tümünü Göster)
              </button>
          </div>
      )}

      {/* FİLTRE VE EXCEL ÇUBUĞU */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
           <div className="relative flex-1 w-full">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                 <input 
                    type="text" 
                    placeholder="Firma Ara..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                 />
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={handleDownloadPrepTemplate} 
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
                    title="Mevcut firma listesini Excel olarak indir"
                >
                    <Download className="w-4 h-4" /> Şablon İndir
                </button>
                <div className="relative flex-1 md:flex-none">
                    <input type="file" ref={fileInputRef} onChange={handleUploadPrepData} accept=".xlsx, .xls" className="hidden" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap border border-slate-600"
                        title="Doldurulmuş şablonu yükle"
                    >
                        <Upload className="w-4 h-4" /> Excel Yükle
                    </button>
                </div>
           </div>

           <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                <select 
                    value={invoiceTypeFilter} 
                    onChange={(e) => setInvoiceTypeFilter(e.target.value as any)} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
                >
                    <option value="ALL">Tümü</option>
                    <option value={InvoiceType.E_FATURA}>E-Fatura</option>
                    <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
                </select>
           </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 text-slate-400 font-medium">Firma</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Çalışan</th>
                <th className="p-4 text-slate-400 font-medium w-40 text-center">Hizmet Türü</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Yıllık İşlem</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Sağlık (TL)</th>
                <th className="p-4 text-slate-400 font-medium w-40 text-right">Toplam</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Oluştur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {filteredFirms.map(firm => {
                const item = items[firm.id];
                const currentCount = item ? item.currentEmployeeCount : firm.basePersonLimit;
                const extraAmount = item ? item.extraItemAmount : 0;
                const addYearly = item ? item.addYearlyFee : false;
                
                const calc = calculateFullTotal(firm, item);
                const isAlert = firm.pricingModel === PricingModel.STANDARD && currentCount > firm.basePersonLimit;

                return (
                  <tr key={firm.id} className={`hover:bg-slate-700/50 transition-colors ${addYearly ? 'bg-purple-900/10' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{firm.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                         <span className="bg-slate-900 px-1 rounded">{firm.defaultInvoiceType}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {addYearly ? (
                         <div className="text-center text-xs text-purple-400 font-medium bg-purple-500/10 py-1 rounded border border-purple-500/20">
                            Aylık Yok
                         </div>
                      ) : (
                        <div className="flex items-center justify-center">
                            <input 
                            type="number" 
                            min="0"
                            value={currentCount}
                            onChange={(e) => handleUpdate(firm.id, 'currentEmployeeCount', e.target.value)}
                            className={`w-20 bg-slate-900 border ${isAlert ? 'border-yellow-500 text-yellow-500' : 'border-slate-600'} rounded px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 outline-none`}
                            />
                        </div>
                      )}
                    </td>
                    
                    {/* HİZMET TÜRÜ BADGE */}
                    <td className="p-4 text-center">
                        {firm.serviceType === ServiceType.EXPERT_ONLY ? (
                            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Sadece Uzman</span>
                        ) : firm.serviceType === ServiceType.DOCTOR_ONLY ? (
                            <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">Sadece Hekim</span>
                        ) : (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Uzman + Hekim</span>
                        )}
                    </td>

                    <td className="p-4 text-center">
                        {firm.yearlyFee && firm.yearlyFee > 0 ? (
                            <button 
                                onClick={() => handleUpdate(firm.id, 'addYearlyFee', !addYearly)}
                                className={`flex items-center justify-center gap-1 w-full p-1.5 rounded border transition-all ${addYearly ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-slate-900 border-slate-600 text-slate-500 hover:border-purple-500 hover:text-purple-400'}`}
                                title={`Yıllık Ücret: ${formatCurrency(firm.yearlyFee)} (Seçilirse aylık ücret alınmaz)`}
                            >
                                <CalendarCheck className="w-4 h-4" />
                                <span className="text-xs font-bold">{addYearly ? 'Seçildi' : 'Seç'}</span>
                            </button>
                        ) : (
                            <span className="text-slate-600">-</span>
                        )}
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="number" 
                        min="0"
                        value={extraAmount}
                        onChange={(e) => handleUpdate(firm.id, 'extraItemAmount', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                          <span className={`text-lg font-bold ${addYearly ? 'text-purple-400' : 'text-blue-400'}`}>
                            {formatCurrency(calc.grandTotal)}
                          </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleInvoiceSingle(firm.id)}
                        className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredFirms.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Kriterlere uygun firma bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Preparation;
