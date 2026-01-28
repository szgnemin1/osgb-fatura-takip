
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { Firm, PreparationItem, TransactionType, GlobalSettings, InvoiceType, PricingModel, ServiceType } from '../types';
import { Calculator, Save, ArrowRight, Upload, Search, CalendarCheck, Filter, FileSpreadsheet, XCircle, ListFilter, AlertCircle, Network } from 'lucide-react';
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
  
  // Filtre State'leri
  const [filterType, setFilterType] = useState<'ALL' | InvoiceType>('ALL');
  const [uploadedFirmIds, setUploadedFirmIds] = useState<string[]>([]); // Excel'den gelen ID'leri tutar

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

  // --- YARDIMCI: TEKİL FİRMA FİYAT HESAPLAMA ---
  // Bu fonksiyon, verilen firmanın KENDİ ayarlarını kullanarak o firmanın tutarını hesaplar.
  const calculateIndividualFirmPrice = (targetFirm: Firm, employeeCount: number) => {
      let price = Number(targetFirm.baseFee);
      const limit = Number(targetFirm.basePersonLimit);
      const extraFee = Number(targetFirm.extraPersonFee);
      const count = Number(employeeCount);

      // 1. KADEMELİ MODEL (TIERED)
      if (targetFirm.pricingModel === PricingModel.TIERED && targetFirm.tiers && targetFirm.tiers.length > 0) {
           const tier = targetFirm.tiers.find(t => count >= t.min && count <= t.max);
           if (tier) {
               price = Number(tier.price);
           } else {
               // Limit dışıysa en son tier + ekstra
               const maxTier = targetFirm.tiers.reduce((prev, curr) => (prev.max > curr.max) ? prev : curr);
               if (count > maxTier.max) {
                   const diff = count - maxTier.max;
                   price = Number(maxTier.price) + (diff * extraFee);
               }
           }
      } 
      // 2. TOLERANSLI MODEL (TOLERANCE)
      else if (targetFirm.pricingModel === PricingModel.TOLERANCE) {
          const tolerancePct = Number(targetFirm.tolerancePercentage) || 0;
          const toleranceCount = Math.floor(limit * (tolerancePct / 100));
          const lowerBound = limit - toleranceCount;
          const upperBound = limit + toleranceCount;

          if (count > upperBound) {
              const diff = count - limit;
              price += diff * extraFee;
          } else if (count < lowerBound) {
              const diff = limit - count;
              price -= diff * extraFee;
          }
      } 
      // 3. STANDART MODEL (DEFAULT)
      else {
          if (count > limit) {
              const diff = count - limit;
              price += diff * extraFee;
          }
      }

      return Math.max(0, price);
  };

  // --- ANA HESAPLAMA MOTORU ---
  const calculateFinancials = (firm: Firm, item: PreparationItem | undefined) => {
      // 1. Eğer bu firma bir ŞUBE ise (Parent ID varsa), hesaplama yapma (0 döndür).
      if (firm.parentFirmId) {
          return { grandTotal: 0, netExpertShare: 0, netDoctorShare: 0, netHealthShare: 0, contractPrice: 0, isBranch: true };
      }

      // 2. Eğer bu firma ANA FİRMA ise:
      // a) Kendi fiyatını hesapla
      const parentCount = Number(item?.currentEmployeeCount ?? firm.basePersonLimit);
      let totalContractPrice = calculateIndividualFirmPrice(firm, parentCount);
      let totalExtraAmount = Number(item?.extraItemAmount ?? 0);
      let totalPoolEmployeeCount = parentCount;

      // b) Kendine bağlı çocukları bul, onların fiyatını hesapla ve toplama ekle
      const children = firms.filter(f => f.parentFirmId === firm.id);
      
      children.forEach(child => {
          const childItem = items[child.id];
          const childCount = Number(childItem?.currentEmployeeCount ?? child.basePersonLimit);
          const childExtra = Number(childItem?.extraItemAmount ?? 0);

          // Şubenin kendi parametrelerine göre hesaplanmış fiyatı
          const childPrice = calculateIndividualFirmPrice(child, childCount);

          totalContractPrice += childPrice;
          totalExtraAmount += childExtra;
          totalPoolEmployeeCount += childCount;
      });

      // --- HAKEDİŞ VE KDV HESABI (Toplam Tutar Üzerinden) ---
      // Fatura ana firmaya kesildiği için KDV ve Oran ayarları Ana Firma'dan alınır.
      const vatExpert = globalSettings?.vatRateExpert ?? 20;
      const vatDoctor = globalSettings?.vatRateDoctor ?? 20;
      const vatHealth = globalSettings?.vatRateHealth ?? 20;

      // HİZMET TÜRÜNE GÖRE ORANLARI AYARLA
      let finalExpertRate = 0;
      let finalDoctorRate = 0;

      if (firm.serviceType === ServiceType.EXPERT_ONLY) {
          finalExpertRate = 100;
          finalDoctorRate = 0;
      } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
          finalExpertRate = 0;
          finalDoctorRate = 100;
      } else {
          finalExpertRate = globalSettings?.expertPercentage ?? firm.expertPercentage;
          finalDoctorRate = globalSettings?.doctorPercentage ?? firm.doctorPercentage;
      }

      let grandTotal = 0;
      let netExpertShare = 0;
      let netDoctorShare = 0;
      let netHealthShare = 0;

      // Ham Paylar (Toplam Sözleşme Fiyatı Üzerinden)
      const rawExpertPart = totalContractPrice * (finalExpertRate / 100);
      const rawDoctorPart = totalContractPrice * (finalDoctorRate / 100);
      const rawHealthPart = totalExtraAmount; 

      if (firm.isKdvExcluded) {
          // SENARYO 1: Firma "KDV HARİÇ" (Girdiler NET)
          netExpertShare = rawExpertPart;
          netDoctorShare = rawDoctorPart;
          netHealthShare = rawHealthPart;

          grandTotal = (rawExpertPart * (1 + vatExpert / 100)) +
                       (rawDoctorPart * (1 + vatDoctor / 100)) +
                       (rawHealthPart * (1 + vatHealth / 100));
      } else {
          // SENARYO 2: Firma "KDV DAHİL/STANDART" (Girdiler BRÜT)
          grandTotal = totalContractPrice + totalExtraAmount;

          netExpertShare = rawExpertPart > 0 ? rawExpertPart / (1 + vatExpert / 100) : 0;
          netDoctorShare = rawDoctorPart > 0 ? rawDoctorPart / (1 + vatDoctor / 100) : 0;
          netHealthShare = rawHealthPart > 0 ? rawHealthPart / (1 + vatHealth / 100) : 0;
      }

      return { 
          grandTotal, 
          netExpertShare, 
          netDoctorShare, 
          netHealthShare, 
          contractPrice: totalContractPrice, 
          isBranch: false,
          poolDetails: {
              totalCount: totalPoolEmployeeCount,
              childCount: children.length
          }
      };
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredFirms = firms.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || f.defaultInvoiceType === filterType;
    const matchesUpload = uploadedFirmIds.length > 0 ? uploadedFirmIds.includes(f.id) : true;
    return matchesSearch && matchesType && matchesUpload;
  });

  // --- EXCEL ŞABLON İNDİR ---
  const handleDownloadPrepTemplate = (targetType: InvoiceType) => {
    const firmsToExport = firms.filter(f => f.defaultInvoiceType === targetType);
    if (firmsToExport.length === 0) {
        alert(`Bu tipte (${targetType}) kayıtlı firma bulunamadı.`);
        return;
    }
    const data = firmsToExport.map(f => ({
        "Firma ID (DOKUNMAYIN)": f.id,
        "Firma Adı": f.name,
        "Fatura Tipi": f.defaultInvoiceType,
        "Mevcut Limit": f.basePersonLimit,
        "Çalışan Sayısı (GİRİNİZ)": items[f.id]?.currentEmployeeCount || f.basePersonLimit,
        "Ekstra Tutar (GİRİNİZ)": items[f.id]?.extraItemAmount || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const fileName = targetType === InvoiceType.E_FATURA ? 'E-Fatura_Hazirlik_Sablonu' : 'E-Arsiv_Hazirlik_Sablonu';
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hazirlik_Listesi");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
  };

  // --- EXCEL YÜKLE VE FİLTRELE ---
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
            const updates: Record<string, any> = {};
            const newUploadedIds: string[] = [];

            data.forEach(row => {
                const id = row["Firma ID (DOKUNMAYIN)"];
                const count = row["Çalışan Sayısı (GİRİNİZ)"];
                const extra = row["Ekstra Tutar (GİRİNİZ)"];

                if (id) {
                    updates[id] = { count: count, extra: extra };
                    newUploadedIds.push(id);
                    updatedCount++;
                }
            });

            if (updatedCount === 0) {
                alert("Excel dosyasında geçerli veri bulunamadı.");
                return;
            }
            
            setItems(prev => {
                const newItems = { ...prev };
                Object.keys(updates).forEach(id => {
                    const updateData = updates[id];
                    newItems[id] = {
                        ...(newItems[id] || { firmId: id, currentEmployeeCount: 0, extraItemAmount: 0 }),
                        currentEmployeeCount: updateData.count !== undefined ? Number(updateData.count) : (newItems[id]?.currentEmployeeCount || 0),
                        extraItemAmount: updateData.extra !== undefined ? Number(updateData.extra) : (newItems[id]?.extraItemAmount || 0)
                    };
                });
                return newItems;
            });

            setUploadedFirmIds(newUploadedIds);
            alert(`${updatedCount} firmanın verileri güncellendi ve liste filtrelendi.`);
        } catch (err) {
            console.error(err);
            alert("Excel dosyası okunamadı.");
        }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleClearUploadFilter = () => {
      setUploadedFirmIds([]);
      setSearchTerm('');
  };

  // --- FATURA OLUŞTURMA YARDIMCISI ---
  const createTransactionRecord = (firm: Firm, item: PreparationItem, financials: any) => {
    const date = new Date();
    
    let description = `Hizmet Bedeli - ${date.toLocaleString('tr-TR', { month: 'long' })} ${date.getFullYear()}`;
    if (firm.serviceType === ServiceType.EXPERT_ONLY) {
        description = `İş Güvenliği Uzmanlığı Hizmeti - ${date.toLocaleString('tr-TR', { month: 'long' })} ${date.getFullYear()}`;
    } else if (firm.serviceType === ServiceType.DOCTOR_ONLY) {
        description = `İşyeri Hekimliği Hizmeti - ${date.toLocaleString('tr-TR', { month: 'long' })} ${date.getFullYear()}`;
    }

    // Eğer havuz ise açıklamaya not düş
    if (financials.poolDetails && financials.poolDetails.childCount > 0) {
        description += ` (Havuz Toplam: ${financials.poolDetails.totalCount} Kişi)`;
    }

    db.addTransaction({
        firmId: firm.id,
        date: date.toISOString(),
        type: TransactionType.INVOICE,
        invoiceType: firm.defaultInvoiceType,
        description: description,
        debt: financials.grandTotal,
        credit: 0,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        status: 'PENDING',
        calculatedDetails: {
            employeeCount: financials.poolDetails ? financials.poolDetails.totalCount : item.currentEmployeeCount,
            extraItemAmount: financials.netHealthShare, 
            expertShare: financials.netExpertShare, 
            doctorShare: financials.netDoctorShare   
        }
    });
  };

  const handleInvoiceSingle = (firmId: string) => {
      const firm = firms.find(f => f.id === firmId);
      if (!firm) return;
      
      const item = items[firmId] || { firmId, currentEmployeeCount: firm.basePersonLimit, extraItemAmount: 0 };
      const financials = calculateFinancials(firm, item);

      if (financials.isBranch) return alert("Bu bir şube firmasıdır. Fatura Ana Firma üzerinden kesilmelidir.");
      if (financials.grandTotal <= 0) return alert("Tutar 0 olduğu için fatura oluşturulamaz.");
      if (!window.confirm(`${firm.name} için ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(financials.grandTotal)} tutarında taslak fatura oluşturulsun mu?`)) return;

      createTransactionRecord(firm, item, financials);
      alert("Fatura taslağı oluşturuldu.");
  };

  const handleInvoiceAll = () => {
      const targetFirms = filteredFirms;
      if (targetFirms.length === 0) return alert("Listede (veya filtrede) firma yok.");
      
      const filterMsg = uploadedFirmIds.length > 0 ? "EXCEL İLE GÜNCELLENEN" : (filterType === 'ALL' ? 'TÜM' : filterType);
      
      if (!window.confirm(`${targetFirms.length} adet ${filterMsg} firma için taslak fatura oluşturulacak. Devam edilsin mi?`)) return;

      let count = 0;
      targetFirms.forEach(firm => {
          const item = items[firm.id] || { firmId: firm.id, currentEmployeeCount: firm.basePersonLimit, extraItemAmount: 0 };
          const financials = calculateFinancials(firm, item);
          if (!financials.isBranch && financials.grandTotal > 0) {
              createTransactionRecord(firm, item, financials);
              count++;
          }
      });

      if (count > 0) {
        alert(`${count} adet fatura taslağı oluşturuldu.`);
        navigate('/invoices');
      } else {
        alert("Oluşturulacak (tutarı 0'dan büyük ve ana firma olan) fatura bulunamadı.");
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3"><Calculator className="w-8 h-8 text-yellow-500" /> Fatura Hazırlık</h2>
          <p className="text-slate-400 mt-2 text-sm">Çalışan sayılarını girin. <span className="text-blue-400 font-bold">Havuz (Şube)</span> firmaları <span className="text-yellow-400 font-bold">ayrı ayrı hesaplanıp</span> ana firmada toplanır.</p>
        </div>
        <button onClick={handleInvoiceAll} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"><Save className="w-5 h-5" /> Görünenleri Faturalaştır</button>
      </header>
      
      {/* ARAÇ ÇUBUĞU */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
           <div className="flex flex-col gap-4 flex-[2]">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input type="text" placeholder="Firma Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500" />
                    </div>
                    <div className="relative w-full md:w-48">
                        <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 cursor-pointer appearance-none"
                        >
                            <option value="ALL">Tümü</option>
                            <option value={InvoiceType.E_FATURA}>E-Faturalar</option>
                            <option value={InvoiceType.E_ARSIV}>E-Arşivler</option>
                        </select>
                    </div>
                </div>

                {uploadedFirmIds.length > 0 && (
                    <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 p-2 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                            <ListFilter className="w-4 h-4" />
                            <span>Excel'den yüklenen <b>{uploadedFirmIds.length}</b> firma görüntüleniyor.</span>
                        </div>
                        <button onClick={handleClearUploadFilter} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 flex items-center gap-1 transition-colors">
                            <XCircle className="w-3 h-3" /> Filtreyi Temizle
                        </button>
                    </div>
                )}
           </div>
           
           <div className="flex flex-col md:flex-row gap-2 xl:justify-end flex-1">
                <button onClick={() => handleDownloadPrepTemplate(InvoiceType.E_FATURA)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-indigo-500"><FileSpreadsheet className="w-4 h-4" /> E-Fatura Şablon</button>
                <button onClick={() => handleDownloadPrepTemplate(InvoiceType.E_ARSIV)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-orange-500"><FileSpreadsheet className="w-4 h-4" /> E-Arşiv Şablon</button>
                <div className="relative flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleUploadPrepData} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full h-full bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 border border-slate-600 transition-colors"><Upload className="w-4 h-4" /> Veri Yükle</button>
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
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Fatura Tipi</th>
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
                  <tr key={firm.id} className={`hover:bg-slate-700/50 transition-colors group ${financials.isBranch ? 'bg-slate-900/30' : ''}`}>
                    <td className="p-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                            {financials.isBranch && <Network className="w-4 h-4 text-slate-500 rotate-90" />}
                            {firm.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 ml-6">
                            {financials.isBranch ? 'Şube (Ana Firmaya Bağlı)' : (
                                <>Limit: {firm.basePersonLimit} • Taban: {formatCurrency(firm.baseFee)}</>
                            )}
                            {firm.isKdvExcluded && <span className="ml-1 text-[9px] bg-yellow-500/20 text-yellow-500 px-1 rounded">+KDV</span>}
                            {firm.serviceType === ServiceType.EXPERT_ONLY && <span className="ml-1 text-[9px] bg-blue-500/20 text-blue-500 px-1 rounded">UZMAN</span>}
                            {firm.serviceType === ServiceType.DOCTOR_ONLY && <span className="ml-1 text-[9px] bg-purple-500/20 text-purple-500 px-1 rounded">HEKİM</span>}
                        </div>
                        {financials.poolDetails && financials.poolDetails.childCount > 0 && (
                            <div className="text-[10px] text-emerald-400 ml-6 mt-0.5 font-bold">
                                {financials.poolDetails.childCount} Şube + Ana Firma Toplamı
                            </div>
                        )}
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
                    <td className="p-4 text-center">
                        {firm.defaultInvoiceType === InvoiceType.E_FATURA ? (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30">E-FATURA</span>
                        ) : (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30">E-ARŞİV</span>
                        )}
                    </td>
                    <td className="p-4 text-center"><button className="text-slate-500 hover:text-purple-400 transition-colors"><CalendarCheck className="w-4 h-4"/></button></td>
                    <td className="p-4 text-center"><input type="number" min="0" value={extraAmount} onChange={(e) => handleUpdate(firm.id, 'extraItemAmount', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white outline-none focus:border-blue-500" placeholder="0" /></td>
                    <td className="p-4 text-right font-bold text-blue-400 text-lg">
                        {financials.isBranch ? (
                            <span className="text-xs text-slate-500 font-normal italic">Ana Firmada</span>
                        ) : (
                            formatCurrency(financials.grandTotal)
                        )}
                        {!financials.isBranch && firm.isKdvExcluded && <div className="text-[9px] text-slate-500">KDV Dahil</div>}
                    </td>
                    <td className="p-4 text-center">
                        {!financials.isBranch && (
                            <button 
                                onClick={() => handleInvoiceSingle(firm.id)} 
                                className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-colors shadow-sm"
                                title="Bu firmayı faturalaştır"
                            >
                                <ArrowRight className="w-5 h-5"/>
                            </button>
                        )}
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
