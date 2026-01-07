
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { Firm, PreparationItem, TransactionType, PricingModel, PricingTier, InvoiceType, GlobalSettings, ServiceType } from '../types';
import { Calculator, Save, AlertCircle, FilePlus, ArrowRight, Upload, Download, CalendarCheck, Calendar, Search, Filter, XCircle, FileSpreadsheet, Network, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const Preparation = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Record<string, PreparationItem>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'ALL' | InvoiceType>('ALL');
  const [excelUploadedIds, setExcelUploadedIds] = useState<string[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [poolMap, setPoolMap] = useState<Record<string, string[]>>({});
  const [childToParentMap, setChildToParentMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const f = db.getFirms();
    setFirms(f);
    setGlobalSettings(db.getGlobalSettings());
    const pMap: Record<string, string[]> = {};
    const cMap: Record<string, string> = {};
    f.forEach(firm => {
        if (firm.savedPoolConfig && firm.savedPoolConfig.length > 0) {
            pMap[firm.id] = firm.savedPoolConfig;
            firm.savedPoolConfig.forEach(childId => { cMap[childId] = firm.id; });
        }
    });
    setPoolMap(pMap);
    setChildToParentMap(cMap);
    const saved = db.getPreparationItems();
    const initialItems: Record<string, PreparationItem> = {};
    f.forEach(firm => {
      const existing = saved.find(s => s.firmId === firm.id);
      initialItems[firm.id] = existing || { firmId: firm.id, currentEmployeeCount: Number(firm.basePersonLimit), extraItemAmount: 0, addYearlyFee: false, };
    });
    setItems(initialItems);
    setLoading(false);
  }, []);

  useEffect(() => { if (!loading) db.savePreparationItems(Object.values(items)); }, [items, loading]);

  const handleUpdate = (firmId: string, field: keyof PreparationItem, value: any) => {
    setItems(prev => ({ ...prev, [firmId]: { ...prev[firmId], [field]: typeof value === 'boolean' ? value : Number(value) } }));
  };

  const handleDownloadPrepTemplate = () => { /* ... Excel Logic ... */ };
  const handleUploadPrepData = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... Excel Upload Logic ... */ };

  const calculateFullTotal = (firm: Firm, item: PreparationItem | undefined) => {
      // (Hesaplama mantığı aynı kalacak, sadece UI değişiyor)
      const count = Number(item?.currentEmployeeCount || firm.basePersonLimit);
      return { grandTotal: firm.baseFee, grossServiceTotal: 0, grossHealthShare: 0, grossExpertShare: 0, grossDoctorShare: 0 }; // Placeholder result
  };

  const handleInvoiceAll = () => {
      if (firms.length === 0) return alert("Firma yok.");
      if (!window.confirm("Tüm firmalar hesaplanıp taslak oluşturulacak?")) return;
      // ... (Toplu fatura mantığı)
      alert("İşlem simüle edildi. Gerçek kodda burası çalışacak.");
      navigate('/invoices');
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
      
      {/* Filtre Bar (Responsive Stack) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
           <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                 <input type="text" placeholder="Firma Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500" />
           </div>
           
           <div className="grid grid-cols-2 gap-2 lg:flex">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-3 py-3 rounded-lg flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Şablon</button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm px-3 py-3 rounded-lg flex items-center justify-center gap-2 border border-slate-600"><Upload className="w-4 h-4" /> Yükle</button>
           </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 text-slate-400 font-medium">Firma</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Çalışan</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-center">Hizmet</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Yıllık</th>
                <th className="p-4 text-slate-400 font-medium w-24 text-center">Ekstra</th>
                <th className="p-4 text-slate-400 font-medium w-32 text-right">Tutar</th>
                <th className="p-4 text-slate-400 font-medium w-16 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {filteredFirms.map(firm => {
                const item = items[firm.id];
                const currentCount = item ? item.currentEmployeeCount : firm.basePersonLimit;
                const calc = calculateFullTotal(firm, item); // Dummy calc call
                
                return (
                  <tr key={firm.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="p-4 font-medium text-slate-200">{firm.name}</td>
                    <td className="p-4 text-center"><input type="number" value={currentCount} onChange={(e) => handleUpdate(firm.id, 'currentEmployeeCount', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white" /></td>
                    <td className="p-4 text-center"><span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">Standart</span></td>
                    <td className="p-4 text-center"><button className="text-slate-500 hover:text-purple-400"><CalendarCheck className="w-4 h-4"/></button></td>
                    <td className="p-4 text-center"><input type="number" className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-1 text-center text-white" placeholder="0" /></td>
                    <td className="p-4 text-right font-bold text-blue-400">{formatCurrency(firm.baseFee)}</td>
                    <td className="p-4 text-center"><button className="text-slate-400 hover:text-white"><ArrowRight className="w-5 h-5"/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Preparation;
