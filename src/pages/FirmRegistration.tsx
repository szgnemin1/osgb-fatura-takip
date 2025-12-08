
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Save, Building2, CheckCircle2, Trash2, Edit, Plus, X } from 'lucide-react';
import { InvoiceType, Firm, PricingModel, PricingTier } from '../types';

const FirmRegistration = () => {
  const initialFormState: Omit<Firm, 'id'> = {
    name: '',
    basePersonLimit: 10,
    baseFee: 1000,
    extraPersonFee: 50,
    defaultInvoiceType: InvoiceType.E_FATURA,
    taxNumber: '',
    address: '',
    pricingModel: PricingModel.STANDARD,
    tolerancePercentage: 10,
    tiers: []
  };

  const [formData, setFormData] = useState<Firm | Omit<Firm, 'id'>>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [existingFirms, setExistingFirms] = useState<Firm[]>([]);
  
  // Tier state helpers
  const [newTier, setNewTier] = useState<PricingTier>({ min: 0, max: 0, price: 0 });

  const loadFirms = () => {
    setExistingFirms(db.getFirms());
  };

  useEffect(() => {
    loadFirms();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'name' || name === 'defaultInvoiceType' || name === 'pricingModel' || name === 'taxNumber' || name === 'address') ? value : Number(value)
    }));
  };

  const handleAddTier = () => {
    if (newTier.max <= newTier.min) return alert("Maksimum değer minimumdan büyük olmalı.");
    setFormData(prev => ({
      ...prev,
      tiers: [...(prev.tiers || []), newTier]
    }));
    setNewTier({ min: newTier.max + 1, max: newTier.max + 11, price: 0 });
  };

  const removeTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    if (window.confirm(`${name} firmasını silmek istediğinize emin misiniz?`)) {
        db.deleteFirm(id);
        loadFirms();
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialFormState);
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-500 pb-12">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-500" />
          {isEditing ? 'Firma Düzenle' : 'Firma Kayıt & Parametreler'}
        </h2>
        <p className="text-slate-400 mt-2">Yeni firma ekleyin veya mevcut kuralları düzenleyin.</p>
      </header>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-xl mb-12 relative">
        {isEditing && (
            <button 
                type="button" 
                onClick={handleCancelEdit} 
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Firma Bilgileri */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Genel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Firma Adı</label>
                <input 
                  required
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Örn: ABC İnşaat Ltd. Şti."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Fatura Tipi</label>
                <select
                  name="defaultInvoiceType"
                  value={formData.defaultInvoiceType}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={InvoiceType.E_FATURA}>E-Fatura</option>
                  <option value={InvoiceType.E_ARSIV}>E-Arşiv</option>
                </select>
              </div>
            </div>

            {/* E-ARŞİV EKSTRA ALANLAR */}
            {formData.defaultInvoiceType === InvoiceType.E_ARSIV && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg animate-in fade-in">
                     <div>
                        <label className="block text-sm font-medium text-orange-400 mb-2">Vergi Numarası (VKN/TCKN)</label>
                        <input 
                            type="text" 
                            name="taxNumber" 
                            value={formData.taxNumber || ''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder="11111111111"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-orange-400 mb-2">Adres</label>
                        <textarea 
                            name="address" 
                            value={formData.address || ''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none h-10 resize-none overflow-hidden"
                            placeholder="Açık adres..."
                        />
                    </div>
                </div>
            )}
          </div>

          <div className="col-span-2 border-t border-slate-700 my-2"></div>

          {/* Fiyatlandırma Modeli Seçimi */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Fiyatlandırma Modeli</h3>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { val: PricingModel.STANDARD, label: 'Standart (Taban + Ekstra)' },
                    { val: PricingModel.TOLERANCE, label: 'Toleranslı (Yüzde)' },
                    { val: PricingModel.TIERED, label: 'Kademeli (Aralık)' }
                ].map(opt => (
                    <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pricingModel: opt.val }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            formData.pricingModel === opt.val 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
          </div>

          {/* Dinamik Alanlar */}
          <div className="col-span-2 space-y-6">
            
            {/* STANDART & TOLERANS ORTAK ALANLARI */}
            {(formData.pricingModel === PricingModel.STANDARD || formData.pricingModel === PricingModel.TOLERANCE) && (
                <div className="grid grid-cols-2 gap-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Taban Kişi Limiti</label>
                        <input type="number" name="basePersonLimit" value={formData.basePersonLimit} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Taban Fiyat (TL)</label>
                        <input type="number" name="baseFee" value={formData.baseFee} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Ekstra Kişi Başı Ücret (TL)</label>
                        <input type="number" name="extraPersonFee" value={formData.extraPersonFee} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                        <p className="text-xs text-slate-500 mt-1">Limit dışına çıkılırsa eklenecek/düşülecek tutar.</p>
                    </div>

                    {/* TOLERANS ÖZEL */}
                    {formData.pricingModel === PricingModel.TOLERANCE && (
                         <div>
                            <label className="block text-sm font-medium text-yellow-400 mb-2">Tolerans Yüzdesi (%)</label>
                            <input type="number" name="tolerancePercentage" value={formData.tolerancePercentage} onChange={handleChange} className="w-full bg-slate-800 border border-yellow-500/50 rounded px-3 py-2 text-white" />
                            <p className="text-xs text-slate-500 mt-1">Bu % aralığında (Alt/Üst) fiyat değişmez.</p>
                        </div>
                    )}
                </div>
            )}

            {/* KADEMELİ ÖZEL */}
            {formData.pricingModel === PricingModel.TIERED && (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-4">Fiyat Aralıkları (Kademeler)</h4>
                    
                    <div className="flex gap-2 items-end mb-4">
                        <div>
                            <label className="text-xs text-slate-500">Min Kişi</label>
                            <input type="number" value={newTier.min} onChange={e => setNewTier(p => ({...p, min: Number(e.target.value)}))} className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Max Kişi</label>
                            <input type="number" value={newTier.max} onChange={e => setNewTier(p => ({...p, max: Number(e.target.value)}))} className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Fiyat (TL)</label>
                            <input type="number" value={newTier.price} onChange={e => setNewTier(p => ({...p, price: Number(e.target.value)}))} className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm" />
                        </div>
                        <button type="button" onClick={handleAddTier} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded"><Plus className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-2">
                        {formData.tiers?.map((tier, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 text-sm">
                                <span>{tier.min} - {tier.max} Kişi Arası</span>
                                <span className="font-bold text-blue-400">{tier.price} TL</span>
                                <button type="button" onClick={() => removeTier(idx)} className="text-rose-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                         {(!formData.tiers || formData.tiers.length === 0) && <p className="text-xs text-slate-500">Henüz aralık eklenmedi.</p>}
                    </div>

                    <div className="mt-4 border-t border-slate-700 pt-3">
                         <label className="block text-sm font-medium text-slate-300 mb-2">Limit Dışı Ekstra Ücret</label>
                         <input type="number" name="extraPersonFee" value={formData.extraPersonFee} onChange={handleChange} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white" />
                         <p className="text-xs text-slate-500 mt-1">En üst kademeyi aşan veya en alt kademenin altına düşen her kişi için.</p>
                    </div>
                </div>
            )}

          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button 
            type="submit" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-blue-600/30"
          >
            <Save className="w-5 h-5" />
            {isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>

      {/* Kayıtlı Firmalar Listesi */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-xl">
        <h3 className="text-xl font-bold text-slate-200 mb-6">Kayıtlı Firmalar</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                        <th className="p-4 text-slate-400">Firma Adı</th>
                        <th className="p-4 text-slate-400">Tip</th>
                        <th className="p-4 text-slate-400">Model</th>
                        <th className="p-4 text-slate-400 text-right">Taban Fiyat</th>
                        <th className="p-4 text-slate-400 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {existingFirms.map(firm => (
                        <tr key={firm.id} className="hover:bg-slate-700/50">
                            <td className="p-4 text-slate-200 font-medium">{firm.name}</td>
                            <td className="p-4 text-slate-400 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${firm.defaultInvoiceType === InvoiceType.E_ARSIV ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {firm.defaultInvoiceType}
                                </span>
                            </td>
                            <td className="p-4 text-slate-400 text-sm">{firm.pricingModel}</td>
                            <td className="p-4 text-slate-400 text-right">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(firm.baseFee)}</td>
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                     <button 
                                        onClick={() => handleEdit(firm)}
                                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(firm.id, firm.name)}
                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default FirmRegistration;
