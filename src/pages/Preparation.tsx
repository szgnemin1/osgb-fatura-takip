
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { Firm, PreparationItem, TransactionType, PricingModel, PricingTier } from '../types';
import { Calculator, Save, AlertCircle, FilePlus, ArrowRight, Upload, Download, CalendarCheck, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Preparation = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Record<string, PreparationItem>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const f = db.getFirms();
    setFirms(f);

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
                  // Alt limit altında ise (Fallback: Taban fiyat veya en alt kademeden düşüş)
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
      addYearlyFee: false
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
            0, // İkincil tolerans yok varsayıyoruz
            firm.secondaryTiers || []
        );
    }

    const calculatedMonthlyService = primaryTotal + secondaryTotal;
    
    let finalServiceBase = 0;

    // --- KRİTİK DEĞİŞİKLİK ---
    // Eğer Yıllık Ücret seçiliyse: Aylık hesaplamayı UNUT. Sadece Yıllık Ücreti al.
    // Eğer Yıllık Ücret seçili DEĞİLSE: Standart hesaplamayı al.
    if (safeItem.addYearlyFee) {
        finalServiceBase = (firm.yearlyFee || 0); 
    } else {
        finalServiceBase = calculatedMonthlyService;
    }

    const healthFee = Number(safeItem.extraItemAmount);
    
    return {
        serviceTotal: finalServiceBase, // Hakedişe konu olan (Yıllık seçiliyse Yıllık Tutar, değilse Aylık Tutar)
        healthFee,
        grandTotal: finalServiceBase + healthFee
    };
  };

  const createInvoiceTransaction = (firm: Firm, item: PreparationItem | undefined, totals: any) => {
    window.focus(); // Fix focus
    const date = new Date();
    const globalSettings = db.getGlobalSettings();

    const safeItem = item || {
      firmId: firm.id,
      currentEmployeeCount: Number(firm.basePersonLimit),
      extraItemAmount: 0,
      addYearlyFee: false
    };

    // Açıklama Dinamiği
    let desc = "";
    if (safeItem.addYearlyFee) {
         desc = `Yıllık Anlaşma Bedeli - ${date.getFullYear()}`;
    } else {
         desc = `Hizmet Bedeli - ${date.toLocaleString('tr-TR', { month: 'long' })}`;
    }
    
    if (totals.healthFee > 0) desc += ' + Sağlık Hizmeti';

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
        serviceAmount: totals.serviceTotal, // Saf hizmet bedeli (Yıllık veya Aylık)
        extraItemAmount: totals.healthFee, // Sağlık
        yearlyFeeAmount: safeItem.addYearlyFee ? totals.serviceTotal : 0, // Raporlama için işaret
        // Hakedişler serviceTotal üzerinden hesaplanır
        expertShare: totals.serviceTotal * (globalSettings.expertPercentage / 100), 
        doctorShare: totals.serviceTotal * (globalSettings.doctorPercentage / 100)
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
      
      // Yıllık Ücret eklendiyse, işlemden sonra seçimi kaldır.
      if (item?.addYearlyFee) {
          handleUpdate(firm.id, 'addYearlyFee', false);
      }

      console.log("Taslak oluşturuldu");
    } catch (error) {
      console.error(error);
    }
  };

  const handleInvoiceAll = () => {
    window.focus();
    if (firms.length === 0) return alert("Firma yok.");
    if (!window.confirm("Tüm firmalar için taslak oluşturulacak. Devam?")) {
        window.focus();
        return;
    }

    let count = 0;
    const updates: Record<string, PreparationItem> = {};

    firms.forEach(firm => {
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

  // EXCEL IMPORT
  const handleDownloadTemplate = () => {
    const template = [
      {
        "Firma Adı": "Örnek İnşaat A.Ş.",
        "Mevcut Çalışan Sayısı": 45,
        "Tetkik Sayısı": 5,
        "Sağlık Ücreti Birim Fiyatı": 250
      },
      {
        "Firma Adı": "Örnek Tekstil Ltd.",
        "Mevcut Çalışan Sayısı": 10,
        "Tetkik Sayısı": 0,
        "Sağlık Ücreti Birim Fiyatı": 0
      }
    ];
    exporter.exportToExcel("Hazirlik_Veri_Sablonu", template);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      window.focus();
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws);
              
              let updatedCount = 0;
              const newItems = { ...items };

              data.forEach((row: any) => {
                  const firmName = row['Firma Adı'];
                  if (!firmName) return;

                  const firm = firms.find(f => f.name.toLowerCase() === firmName.toString().toLowerCase());
                  if (firm) {
                      const empCount = Number(row['Mevcut Çalışan Sayısı'] || row['Çalışan Sayısı'] || firm.basePersonLimit);
                      const tetkik = Number(row['Tetkik Sayısı'] || 0);
                      const birim = Number(row['Sağlık Ücreti Birim Fiyatı'] || row['Birim Fiyat'] || 0);
                      const healthFee = tetkik * birim;

                      newItems[firm.id] = {
                          firmId: firm.id,
                          currentEmployeeCount: empCount,
                          extraItemAmount: healthFee,
                          addYearlyFee: items[firm.id]?.addYearlyFee || false // Mevcut seçimi koru
                      };
                      updatedCount++;
                  }
              });
              
              setItems(newItems);
              alert(`${updatedCount} firmanın verileri Excel'den güncellendi.`);
              window.focus();
          } catch (err) {
              console.error(err);
              alert("Excel okunurken hata oluştu.");
              window.focus();
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-yellow-500" />
            Fatura Hazırlık
          </h2>
          <p className="text-slate-400 mt-2">Çalışan sayılarını girin, yıllık ücret ekleyin ve hesaplayın.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={handleDownloadTemplate}
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg shadow flex items-center gap-2 transition-all border border-slate-600"
             >
                <Download className="w-5 h-5" />
                Şablon
             </button>
             <div className="relative">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleExcelUpload}
                    accept=".xlsx, .xls"
                    className="hidden"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all"
                >
                    <Upload className="w-5 h-5" />
                    Excel Yükle
                </button>
            </div>
            <button 
            onClick={handleInvoiceAll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
            <Save className="w-5 h-5" />
            Tümünü Faturalaştır
            </button>
        </div>
      </header>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 text-slate-400 font-medium">Firma</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Çalışan</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Yıllık İşlem</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Sağlık (TL)</th>
                <th className="p-4 text-slate-400 font-medium w-40 text-right">Toplam</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Oluştur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {firms.map(firm => {
                const item = items[firm.id];
                const currentCount = item ? item.currentEmployeeCount : firm.basePersonLimit;
                const extraAmount = item ? item.extraItemAmount : 0;
                const addYearly = item ? item.addYearlyFee : false;
                
                const calc = calculateFullTotal(firm, item);
                
                // Alert mantığı
                const isAlert = firm.pricingModel === PricingModel.STANDARD && currentCount > firm.basePersonLimit;

                return (
                  <tr key={firm.id} className={`hover:bg-slate-700/50 transition-colors ${addYearly ? 'bg-purple-900/10' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{firm.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                         <span>{firm.pricingModel}</span>
                         {firm.hasSecondaryModel && <span className="text-emerald-500">+ Ek Model</span>}
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
                          <span className="text-[10px] text-slate-500">
                             {addYearly ? 'Yıllık Bedel' : 'Hizmet Bedeli'}
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
              {firms.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Henüz kayıtlı firma yok.
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
