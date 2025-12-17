
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Save, Building2, CheckCircle2, Trash2, Edit, Plus, X, Layers, CheckSquare, Square, Search, Network, Stethoscope } from 'lucide-react';
import { InvoiceType, Firm, PricingModel, PricingTier, ServiceType } from '../types';

const FirmRegistration = () => {
  const initialFormState: Omit<Firm, 'id'> = {
    name: '',
    parentFirmId: '',
    basePersonLimit: 10,
    baseFee: 1000,
    extraPersonFee: 50,
    defaultInvoiceType: InvoiceType.E_FATURA,
    taxNumber: '',
    address: '',
    yearlyFee: 0,
    pricingModel: PricingModel.STANDARD,
    tolerancePercentage: 10,
    tiers: [],
    serviceType: ServiceType.BOTH, // Varsayılan: Tümü
    // İkincil Model Varsayılanları
    hasSecondaryModel: false,
    secondaryPricingModel: PricingModel.STANDARD,
    secondaryBaseFee: 0,
    secondaryBasePersonLimit: 0,
    secondaryExtraPersonFee: 0,
    secondaryTiers: []
  };

  const [formData, setFormData] = useState<Firm | Omit<Firm, 'id'>>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [existingFirms, setExistingFirms] = useState<Firm[]>([]);
  const [selectedFirms, setSelectedFirms] = useState<string[]>([]);
  
  // Arama State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tier state helpers
  const [newTier, setNewTier] = useState<PricingTier>({ min: 0, max: 0, price: 0 });
  const [newSecTier, setNewSecTier] = useState<PricingTier>({ min: 0, max: 0, price: 0 });

  const loadFirms = () => {
    // db.getFirms() zaten alfabetik sıralıyor
    setExistingFirms(db.getFirms());
    setSelectedFirms([]);
  };

  useEffect(() => {
    loadFirms();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Checkbox kontrolü
    if (type === 'checkbox') {
        setFormData(prev => ({
            ...prev,
            [name]: (e.target as HTMLInputElement).checked
        }));
        return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: (name === 'name' || name === 'defaultInvoiceType' || name === 'pricingModel' || name === 'secondaryPricingModel' || name === 'taxNumber' || name === 'address' || name === 'parentFirmId' || name === 'serviceType') ? value : Number(value)
    }));
  };

  // --- Tier Yönetimi (Ana Model) ---
  const handleAddTier = () => {
    if (newTier.max <= newTier.min) return alert("Maksimum değer minimumdan büyük olmalı.");
    setFormData(prev => ({
      ...prev,
      tiers: [...(prev.tiers || []), newTier]
    }));
    setNewTier({ min: newTier.max + 1, max: newTier.max + 11, price: 0 });
  };
  const removeTier = (index: number) => {
    setFormData(prev => ({ ...prev, tiers: prev.tiers?.filter((_, i) => i !== index) }));
  };

  // --- Tier Yönetimi (İkincil Model) ---
  const handleAddSecTier = () => {
    if (newSecTier.max <= newSecTier.min) return alert("Maksimum değer minimumdan büyük olmalı.");
    setFormData(prev => ({
      ...prev,
      secondaryTiers: [...(prev.secondaryTiers || []), newSecTier]
    }));
    setNewSecTier({ min: newSecTier.max + 1, max: newSecTier.max + 11, price: 0 });
  };
  const removeSecTier = (index: number) => {
    setFormData(prev => ({ ...prev, secondaryTiers: prev.secondaryTiers?.filter((_, i) => i !== index) }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.focus();
    
    if (isEditing && 'id' in formData) {
      db.updateFirm(formData as Firm);
      setSuccessMessage(`${formData.name} güncellendi.`);
    } else {
      db.addFirm(formData);
      setSuccessMessage(`${formData.name} kaydedildi.`);
    }
    
    setFormData(initialFormState);
    setIsEditing(false);
    loadFirms();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEdit = (firm: Firm) => {
    setFormData(firm);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, name: string) => {
    window.focus();
    if (window.confirm(`${name} firmasını silmek istediğinize emin misiniz?`)) {
        db.deleteFirm(id);
        loadFirms();
        window.focus();
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialFormState);
    setIsEditing(false);
  };

  // --- TOPLU SİLME ---
  const toggleSelectAll = () => {
      if (selectedFirms.length === filteredFirms.length) setSelectedFirms([]);
      else setSelectedFirms(filteredFirms.map(f => f.id));
  };
  const toggleSelect = (id: string) => {
      if (selectedFirms.includes(id)) setSelectedFirms(selectedFirms.filter(s => s !== id));
      else setSelectedFirms([...selectedFirms, id]);
  };
  const handleBulkDelete = () => {
      window.focus();
      if (selectedFirms.length === 0) return;
      if (window.confirm(`${selectedFirms.length} adet firmayı silmek istediğinize emin misiniz?`)) {
          db.deleteFirmsBulk(selectedFirms);
          loadFirms();
          window.focus();
      }
  };

  const filteredFirms = existingFirms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- RENDER HELPERS ---
  const renderPricingFields = (prefix: '' | 'secondary', model: PricingModel, tiers: PricingTier[], tierSetter: any, tierRemover: any, newTierState: any, newTierStateSetter: any) => {
      const getField = (f: string) => prefix ? `secondary${f.charAt(0).toUpperCase() + f.slice(1)}` : f;
      
      return (
        <div className="space-y-4">
             {(model === PricingModel.STANDARD || model === PricingModel.TOLERANCE) && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Taban Kişi</label>
                        <input type="number" name={getField('basePersonLimit')} value={(formData as any)[getField('basePersonLimit')] || 0} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Taban Ücret</label>
                        <input type="number" name={getField('baseFee')} value={(formData as any)[getField('baseFee')] || 0} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Ekstra Kişi Başı</label>
                        <input type="number" name={getField('extraPersonFee')} value={(formData as any)[getField('extraPersonFee')] || 0} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                    </div>
                     {model === PricingModel.TOLERANCE && !prefix && (
                         <div>
                            <label className="block text-xs font-medium text-yellow-400 mb-1">Tolerans (%)</label>
                            <input type="number" name="tolerancePercentage" value={formData.tolerancePercentage} onChange={handleChange} className="w-full bg-slate-900 border border-yellow-500/50 rounded px-3 py-2 text-white text-sm" />
                        </div>
                    )}
                </div>
            )}

            {model === PricingModel.TIERED && (
                <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                    <div className="flex gap-2 items-end mb-2">
                        <input type="number" placeholder="Min" value={newTierState.min} onChange={e => newTierStateSetter((p:any) => ({...p, min: Number(e.target.value)}))} className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                        <input type="number" placeholder="Max" value={newTierState.max} onChange={e => newTierStateSetter((p:any) => ({...p, max: Number(e.target.value)}))} className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                        <input type="number" placeholder="Fiyat" value={newTierState.price} onChange={e => newTierStateSetter((p:any) => ({...p, price: Number(e.target.value)}))} className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                        <button type="button" onClick={tierSetter} className="bg-blue-600 text-white p-1 rounded"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {tiers?.map((tier, idx) => (
                            <div key={idx} className="flex justify-between bg-slate-800 p-1.5 rounded text-xs">
                                <span>{tier.min}-{tier.max} Kişi</span>
                                <span className="text-blue-400">{tier.price} TL</span>
                                <button type="button" onClick={() => tierRemover(idx)} className="text-rose-500"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                     <div className="mt-2 pt-2 border-t border-slate-700">
                        <label className="block text-xs font-medium text-slate-400">Limit Dışı Ekstra</label>
                        <input type="number" name={getField('extraPersonFee')} value={(formData as any)[getField('extraPersonFee')] || 0} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm mt-1" />
                    </div>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-500 pb-12">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-500" />
          {isEditing ? 'Firma Düzenle' : 'Firma Kayıt & Parametreler'}
        </h2>
        <p className="text-slate-400 mt-2">Çoklu fiyatlandırma modelleri ve yıllık ücret tanımlamaları.</p>
      </header>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl mb-12 relative">
        {isEditing && (
            <button type="button" onClick={handleCancelEdit} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SOL: TEMEL BİLGİLER */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Genel Bilgiler</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Firma Adı</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Örn: ABC İnşaat Ltd. Şti." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      Bağlı Olduğu Ana Firma (Şube ise Seçiniz)
                  </label>
                  <select name="parentFirmId" value={formData.parentFirmId || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">-- Yok (Ana Firma) --</option>
                      {existingFirms
                          .filter(f => isEditing ? f.id !== (formData as Firm).id : true) // Kendini seçemesin
                          .map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                          ))
                      }
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Fatura Tipi</label>
                    <select name="defaultInvoiceType" value={formData.defaultInvoiceType} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value={InvoiceType.E_FATURA}>E-Fatura</option>
                    <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-purple-400 mb-1">Yıllık İşlem Ücreti</label>
                    <input type="number" name="yearlyFee" value={formData.yearlyFee} onChange={handleChange} className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-400 mb-1 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> Hizmet Kapsamı
                </label>
                <select name="serviceType" value={formData.serviceType || ServiceType.BOTH} onChange={handleChange} className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value={ServiceType.BOTH}>Tümü (Uzman + Hekim)</option>
                    <option value={ServiceType.EXPERT_ONLY}>Sadece İş Güvenliği Uzmanı</option>
                    <option value={ServiceType.DOCTOR_ONLY}>Sadece İşyeri Hekimi</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Fatura açıklaması ve hesaplama bu seçime göre yapılır.</p>
              </div>

               {/* E-ARŞİV EKSTRA ALANLAR */}
                {formData.defaultInvoiceType === InvoiceType.E_ARSIV && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <div>
                            <label className="block text-xs font-medium text-orange-400 mb-1">Vergi No</label>
                            <input type="text" name="taxNumber" value={formData.taxNumber || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-orange-400 mb-1">Adres</label>
                            <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm h-8 resize-none overflow-hidden" />
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* SAĞ: FİYATLANDIRMA MODELLERİ */}
          <div className="space-y-6">
             <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Fiyatlandırma Kurgusu</h3>
             
             {/* MODEL 1 */}
             <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-400 text-sm">Ana Model (Zorunlu)</span>
                    <select name="pricingModel" value={formData.pricingModel} onChange={handleChange} className="bg-slate-900 border border-slate-600 rounded text-xs px-2 py-1 text-white outline-none">
                        <option value={PricingModel.STANDARD}>Standart</option>
                        <option value={PricingModel.TOLERANCE}>Toleranslı</option>
                        <option value={PricingModel.TIERED}>Kademeli</option>
                    </select>
                </div>
                {renderPricingFields('', formData.pricingModel, formData.tiers || [], handleAddTier, removeTier, newTier, setNewTier)}
             </div>

             {/* MODEL 2 */}
             <div className={`p-4 rounded-lg border transition-all ${formData.hasSecondaryModel ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="hasSecondaryModel" id="secModelCheck" checked={formData.hasSecondaryModel} onChange={handleChange} className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="secModelCheck" className="font-bold text-emerald-400 text-sm cursor-pointer select-none">İkincil Model (Ek Hizmet vb.)</label>
                    </div>
                    {formData.hasSecondaryModel && (
                        <select name="secondaryPricingModel" value={formData.secondaryPricingModel} onChange={handleChange} className="bg-slate-900 border border-slate-600 rounded text-xs px-2 py-1 text-white outline-none">
                            <option value={PricingModel.STANDARD}>Standart</option>
                            <option value={PricingModel.TIERED}>Kademeli</option>
                        </select>
                    )}
                </div>
                {formData.hasSecondaryModel && renderPricingFields('secondary', formData.secondaryPricingModel || PricingModel.STANDARD, formData.secondaryTiers || [], handleAddSecTier, removeSecTier, newSecTier, setNewSecTier)}
             </div>

          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-blue-600/30">
            <Save className="w-5 h-5" />
            {isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>

      {/* Kayıtlı Firmalar Listesi */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-slate-200">Kayıtlı Firmalar</h3>
             
             {/* Arama Kutusu */}
             <div className="relative">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                 <input 
                    type="text" 
                    placeholder="Firma Ara..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                 />
             </div>

             {selectedFirms.length > 0 && (
                 <button onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors animate-in zoom-in">
                     <Trash2 className="w-4 h-4" />
                     Seçilenleri Sil ({selectedFirms.length})
                 </button>
             )}
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                        <th className="p-4 w-10">
                            <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                                {selectedFirms.length === filteredFirms.length && filteredFirms.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                        </th>
                        <th className="p-4 text-slate-400">Firma Adı</th>
                        <th className="p-4 text-slate-400">Model</th>
                        <th className="p-4 text-slate-400 text-right">Taban Fiyat</th>
                         <th className="p-4 text-slate-400 text-center">Hizmet Türü</th>
                        <th className="p-4 text-slate-400 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {filteredFirms.map(firm => (
                        <tr key={firm.id} className={`hover:bg-slate-700/50 ${selectedFirms.includes(firm.id) ? 'bg-blue-900/20' : ''}`}>
                             <td className="p-4 text-center">
                                <button onClick={() => toggleSelect(firm.id)} className="text-slate-500 hover:text-blue-400">
                                    {selectedFirms.includes(firm.id) ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                                </button>
                            </td>
                            <td className="p-4 text-slate-200 font-medium">
                                {firm.name}
                                {firm.parentFirmId && <span className="ml-2 text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Şube</span>}
                            </td>
                            <td className="p-4 text-slate-400 text-sm">
                                <div className="flex flex-col">
                                    <span>{firm.pricingModel}</span>
                                    <span className="text-xs text-slate-500">{firm.defaultInvoiceType}</span>
                                </div>
                            </td>
                            <td className="p-4 text-slate-400 text-right">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(firm.baseFee)}</td>
                            <td className="p-4 text-center">
                                {firm.serviceType === ServiceType.EXPERT_ONLY ? (
                                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Sadece Uzman</span>
                                ) : firm.serviceType === ServiceType.DOCTOR_ONLY ? (
                                    <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Sadece Hekim</span>
                                ) : (
                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Tümü</span>
                                )}
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                     <button 
                                        onClick={() => handleEdit(firm)}
                                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredFirms.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Kayıtlı firma bulunamadı.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default FirmRegistration;
