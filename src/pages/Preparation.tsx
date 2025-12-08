
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { Firm, PreparationItem, TransactionType, PricingModel } from '../types';
import { Calculator, Save, AlertCircle, FilePlus, ArrowRight, Upload, Download } from 'lucide-react';
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
        extraItemAmount: 0
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

  const handleUpdate = (firmId: string, field: keyof PreparationItem, value: number) => {
    setItems(prev => ({
      ...prev,
      [firmId]: {
        ...prev[firmId],
        [field]: Number(value)
      }
    }));
  };

  const calculateTotal = (firm: Firm, item: PreparationItem) => {
    const safeItem = item || {
      currentEmployeeCount: Number(firm.basePersonLimit),
      extraItemAmount: 0
    };
    
    const count = Number(safeItem.currentEmployeeCount);
    const extraItem = Number(safeItem.extraItemAmount);
    const extraFee = Number(firm.extraPersonFee);
    const baseFee = Number(firm.baseFee);

    let price = 0;

    // --- FİYATLANDIRMA MODELLERİ ---
    
    if (firm.pricingModel === PricingModel.STANDARD) {
        // Eski Mantık: Limit üstü her kişi için ekle
        price = baseFee;
        if (count > firm.basePersonLimit) {
            price += (count - firm.basePersonLimit) * extraFee;
        }
    } 
    else if (firm.pricingModel === PricingModel.TOLERANCE) {
        // Tolerans Mantığı: %X alt ve üst aralığındaysa sabit, değilse fark kadar ekle/çıkar
        const tolerance = firm.tolerancePercentage || 10;
        const lowerLimit = firm.basePersonLimit * (1 - tolerance / 100);
        const upperLimit = firm.basePersonLimit * (1 + tolerance / 100);

        price = baseFee;

        if (count > upperLimit) {
            price += (count - upperLimit) * extraFee;
        } else if (count < lowerLimit) {
            // İsteğe göre: Alt limitin altına düşünce ücret düşürülür
            // "Kişi başı ücret ekle veya eksilt" dendiği için
            price -= (lowerLimit - count) * extraFee;
        }
    }
    else if (firm.pricingModel === PricingModel.TIERED) {
        // Kademeli Mantık
        const tiers = firm.tiers || [];
        // Count hangi aralıkta?
        const matchTier = tiers.find(t => count >= t.min && count <= t.max);
        
        if (matchTier) {
            price = matchTier.price;
        } else {
            // Aralık dışı (Muhtemelen en üstü aştı veya en altın altında)
            // En yakın mantık: En yüksek tier'in max'ını aşıyorsa
            const maxTier = tiers.reduce((prev, current) => (prev.max > current.max) ? prev : current, {max: 0, price: 0} as any);
            
            if (count > maxTier.max) {
                 price = maxTier.price + (count - maxTier.max) * extraFee;
            } else {
                // En altın altındaysa? (Basitlik için baseFee veya 0'a düşmemesi için kontrol)
                // Kullanıcı "En alt kişi sayısı altı ise kişi başı fiyatı eksilt" dedi.
                // En düşük tier fiyatından eksiltelim
                const minTier = tiers.reduce((prev, current) => (prev.min < current.min) ? prev : current, {min: 999999, price: baseFee} as any);
                if (count < minTier.min) {
                     price = minTier.price - (minTier.min - count) * extraFee;
                } else {
                    price = baseFee; // Fallback
                }
            }
        }
    } else {
        price = baseFee; // Default
    }

    // Negatif koruması
    return Math.max(0, price) + extraItem;
  };

  const createInvoiceTransaction = (firm: Firm, item: PreparationItem, total: number) => {
    const date = new Date();
    const globalSettings = db.getGlobalSettings();

    const safeItem = item || {
      currentEmployeeCount: Number(firm.basePersonLimit),
      extraItemAmount: 0
    };

    db.addTransaction({
      firmId: firm.id,
      date: date.toISOString(),
      type: TransactionType.INVOICE,
      invoiceType: firm.defaultInvoiceType,
      description: `Hizmet Bedeli - ${date.toLocaleString('tr-TR', { month: 'long' })}`,
      debt: total,
      credit: 0,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      status: 'PENDING',
      calculatedDetails: {
        employeeCount: safeItem.currentEmployeeCount,
        extraItemAmount: safeItem.extraItemAmount,
        expertShare: total * (globalSettings.expertPercentage / 100), // GLOBAL AYAR
        doctorShare: total * (globalSettings.doctorPercentage / 100)  // GLOBAL AYAR
      }
    });
  };

  const handleInvoiceSingle = (firmId: string) => {
    try {
      const firm = firms.find(f => f.id === firmId);
      const item = items[firmId];
      if (!firm) return;
      const total = calculateTotal(firm, item);

      if (total <= 0) {
        alert("Toplam tutar 0 TL.");
        return;
      }

      if (!window.confirm(`${firm.name} için ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(total)} tutarında TASLAK oluşturulsun mu?`)) return;

      createInvoiceTransaction(firm, item, total);
      alert("Taslak oluşturuldu.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleInvoiceAll = () => {
    if (firms.length === 0) return alert("Firma yok.");
    if (!window.confirm("Tüm firmalar için taslak oluşturulacak. Devam?")) return;

    let count = 0;
    firms.forEach(firm => {
      try {
        const item = items[firm.id] || { firmId: firm.id, currentEmployeeCount: Number(firm.basePersonLimit), extraItemAmount: 0 };
        const total = calculateTotal(firm, item);
        if (total > 0) {
          createInvoiceTransaction(firm, item, total);
          count++;
        }
      } catch (e) { console.error(e); }
    });

    if (count > 0) {
      alert(`${count} adet taslak oluşturuldu.`);
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
                          extraItemAmount: healthFee
                      };
                      updatedCount++;
                  }
              });
              
              setItems(newItems);
              alert(`${updatedCount} firmanın verileri Excel'den güncellendi.`);
          } catch (err) {
              console.error(err);
              alert("Excel okunurken hata oluştu.");
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-yellow-500" />
            Fatura Hazırlık
          </h2>
          <p className="text-slate-400 mt-2">Çalışan sayılarını girin veya Excel'den yükleyin.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={handleDownloadTemplate}
                className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg shadow flex items-center gap-2 transition-all border border-slate-600"
                title="Excel Yükleme Formatını İndir"
             >
                <Download className="w-5 h-5" />
                Şablon İndir
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
                    Excel'den Veri Yükle
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
              <tr className="bg-slate-900 border-b border-slate-700">
                <th className="p-4 text-slate-400 font-medium">Firma Adı & Model</th>
                <th className="p-4 text-slate-400 font-medium w-40">Mevcut Çalışan</th>
                <th className="p-4 text-slate-400 font-medium w-40">Sağlık Ücreti (TL)</th>
                <th className="p-4 text-slate-400 font-medium w-40 text-right">Hesaplanan</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {firms.map(firm => {
                const item = items[firm.id];
                const currentCount = item ? item.currentEmployeeCount : firm.basePersonLimit;
                const extraAmount = item ? item.extraItemAmount : 0;
                
                const total = calculateTotal(firm, item);
                
                // Uyarı mantığı
                let isAlert = false;
                if(firm.pricingModel === PricingModel.STANDARD && currentCount > firm.basePersonLimit) isAlert = true;
                // Tolerans ve Kademeli için detaylı alert mantığı eklenebilir ama basit tutuyoruz.

                return (
                  <tr key={firm.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-200">{firm.name}</div>
                      <div className="text-xs text-slate-500">
                         {firm.pricingModel} • Taban: {formatCurrency(firm.baseFee)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0"
                          value={currentCount}
                          onChange={(e) => handleUpdate(firm.id, 'currentEmployeeCount', Number(e.target.value))}
                          className={`w-full bg-slate-900 border ${isAlert ? 'border-yellow-500/50 text-yellow-500' : 'border-slate-600'} rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        min="0"
                        value={extraAmount}
                        onChange={(e) => handleUpdate(firm.id, 'extraItemAmount', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-bold text-blue-400">
                        {formatCurrency(total)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleInvoiceSingle(firm.id)}
                        title="Taslak Oluştur"
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
                  <td colSpan={5} className="p-8 text-center text-slate-500">
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
