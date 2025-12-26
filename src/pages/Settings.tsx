
import React, { useRef, useState, useEffect } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { cloudService } from '../services/cloud';
import { Save, Upload, Download, Database, FileSpreadsheet, Cloud, Percent, Landmark, Trash2, AlertOctagon, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GlobalSettings } from '../types';

const Settings = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [cloudUrl, setCloudUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
      expertPercentage: 60,
      doctorPercentage: 40,
      vatRateExpert: 20,
      vatRateDoctor: 10,
      vatRateHealth: 10,
      reportEmail: '',
      bankInfo: ''
  });

  useEffect(() => {
    setCloudUrl(db.getCloudUrl());
    setGlobalSettings(db.getGlobalSettings());
    setDbPath(db.getDbPath());
  }, []);

  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  const handleSaveUrl = () => { db.saveCloudUrl(cloudUrl); alert('Bulut adresi kaydedildi.'); };
  const handleSaveGlobalSettings = (e: React.FormEvent) => { e.preventDefault(); db.saveGlobalSettings(globalSettings); alert('Global parametreler güncellendi.'); };

  const handleCloudUpload = async () => {
    if(!cloudUrl) return alert('Lütfen önce Firebase URL giriniz.');
    if(!window.confirm('Yerel verileriniz Bulut üzerine yazılacak. Devam edilsin mi?')) return;
    setLoading(true);
    try { await cloudService.uploadData(cloudUrl, db.getFullBackup()); alert('Yükleme Başarılı!'); } catch (e) { alert('Yükleme Başarısız.'); } finally { setLoading(false); }
  };

  const handleCloudDownload = async () => {
    if(!cloudUrl) return alert('Lütfen önce Firebase URL giriniz.');
    if(!window.confirm('DİKKAT! Yerel verileriniz silinecek ve Buluttaki veriler yüklenecek. Devam edilsin mi?')) return;
    setLoading(true);
    try { const data = await cloudService.downloadData(cloudUrl); if(data && db.restoreBackup(data)) { alert('İndirme Başarılı! Sayfa yenileniyor...'); window.location.reload(); } else { alert('Veri yok.'); } } catch (e) { alert('İndirme Başarısız.'); } finally { setLoading(false); }
  };

  const handleDownloadBackup = () => {
    const data = db.getFullBackup();
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `OSGB_Yedek_${dateStr}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!window.confirm("DİKKAT! Veritabanı silinecek ve yedek yüklenecek. Devam?")) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (event) => { try { if (db.restoreBackup(JSON.parse(event.target?.result as string))) { alert("Yüklendi. Yenileniyor..."); window.location.reload(); } else { alert("Dosya bozuk."); } } catch (err) { alert("Hata."); } };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => { exporter.exportAdvancedTemplate(); };
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => { try { const result = db.bulkImportFirms(XLSX.read(evt.target?.result, { type: 'binary' })); alert(`Tamamlandı. Eklenen: ${result.newFirmsCount}`); window.location.reload(); } catch (err) { alert("Excel Hatası."); } };
    reader.readAsBinaryString(file);
  };

  // FABRİKA AYARLARI
  const handleFactoryReset = () => {
      window.focus();
      if(!window.confirm("⚠️ DİKKAT: TÜM VERİLER SİLİNECEK! \n\nFabrika ayarlarına dönmek istediğinize emin misiniz? (Adım 1/4)")) return;
      if(!window.confirm("⚠️ EMİN MİSİNİZ? \n\nFirmalar, Faturalar, Ayarlar... HEPSİ SİLİNECEK. (Adım 2/4)")) return;
      if(!window.confirm("⚠️ SON UYARI! \n\nBu işlemin geri dönüşü YOKTUR. (Adım 3/4)")) return;
      if(!window.confirm("⚠️ SİLİYORUM? \n\nVeritabanı tamamen temizleniyor. Onaylıyor musunuz? (Adım 4/4)")) return;
      
      db.factoryReset();
      alert("Tüm veriler silindi. Uygulama yeniden başlatılıyor.");
      window.location.reload();
  };

  // SADECE HAREKETLERİ SİLME
  const handleClearTransactions = () => {
      window.focus();
      if(!window.confirm("⚠️ SADECE CARİ HAREKETLER SİLİNECEK! \n\nTanımlı firmalar, çalışan sayıları ve fiyat anlaşmaları korunacak.\nAncak tüm fatura ve tahsilat kayıtları silinecek.\n\nDevam edilsin mi?")) return;
      if(!window.confirm("⚠️ EMİN MİSİNİZ? \n\nBakiyeler sıfırlanacak. Bu işlem geri alınamaz.")) return;

      db.clearAllTransactions();
      alert("Cari hareketler temizlendi. Firmalar korundu. Sayfa yenileniyor.");
      window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3"><Database className="w-8 h-8 text-blue-500" /> Ayarlar ve Veri Yönetimi</h2>
        <p className="text-slate-400 mt-2">Yedekleme, bulut senkronizasyonu ve global parametreler.</p>
      </header>

      {/* GLOBAL AYARLAR */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-purple-500" /> Global Parametreler</h3>
          <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-slate-300 mb-2">Uzman Hakediş (%)</label><input type="number" min="0" max="100" value={globalSettings.expertPercentage} onChange={e => setGlobalSettings(p => ({...p, expertPercentage: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-2">Doktor Hakediş (%)</label><input type="number" min="0" max="100" value={globalSettings.doctorPercentage} onChange={e => setGlobalSettings(p => ({...p, doctorPercentage: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"/></div>
              </div>
              <div className="border-t border-slate-700 pt-4 grid grid-cols-3 gap-6">
                <div><label className="block text-sm font-medium text-slate-400 mb-2">Uzman KDV (%)</label><input type="number" min="0" value={globalSettings.vatRateExpert} onChange={e => setGlobalSettings(p => ({...p, vatRateExpert: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"/></div>
                <div><label className="block text-sm font-medium text-slate-400 mb-2">Doktor KDV (%)</label><input type="number" min="0" value={globalSettings.vatRateDoctor} onChange={e => setGlobalSettings(p => ({...p, vatRateDoctor: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"/></div>
                <div><label className="block text-sm font-medium text-slate-400 mb-2">Sağlık KDV (%)</label><input type="number" min="0" value={globalSettings.vatRateHealth} onChange={e => setGlobalSettings(p => ({...p, vatRateHealth: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"/></div>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Landmark className="w-4 h-4 text-emerald-500" /> Banka & IBAN Bilgisi</label>
                <textarea rows={3} value={globalSettings.bankInfo} onChange={e => setGlobalSettings(p => ({...p, bankInfo: e.target.value}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 resize-none font-mono text-sm" placeholder="Banka bilgilerinizi buraya girin..."/>
              </div>
              <div className="flex justify-end"><button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">Ayarları Kaydet</button></div>
          </form>
      </section>

      {/* BULUT */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg"><h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Cloud className="w-6 h-6 text-blue-400" /> Bulut Senkronizasyon</h3><div className="flex gap-4 items-center"><input type="text" value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 font-mono text-sm"/><button onClick={handleSaveUrl} className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg text-white font-medium">Kaydet</button></div><div className="flex gap-4 mt-4"><button onClick={handleCloudUpload} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2">{loading ? 'İşleniyor...' : <><Upload className="w-5 h-5" /> Buluta Yükle</>}</button><button onClick={handleCloudDownload} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2">{loading ? 'İşleniyor...' : <><Download className="w-5 h-5" /> Buluttan İndir</>}</button></div></section>

      {/* YEDEKLEME */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Save className="w-5 h-5 text-emerald-500" /> Yedekleme ve Excel</h3>
        <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4"><div className="flex gap-2"><button onClick={handleDownloadBackup} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm">Yedeği İndir</button><div className="relative flex-1"><input type="file" ref={fileInputRef} onChange={handleRestoreBackup} accept=".json" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm border border-slate-600">Yedeği Yükle</button></div></div></div>
            <div className="space-y-4"><div className="flex gap-2"><button onClick={handleDownloadTemplate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm">Şablon İndir</button><div className="relative flex-1"><input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" /><button onClick={() => excelInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm border border-slate-600">Excel Yükle</button></div></div></div>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6" /> 
            Tehlikeli Bölge
          </h3>
          <p className="text-slate-400 mb-4 text-sm">Verileri silme ve sıfırlama işlemleri.</p>
          
          <div className="flex gap-4">
              <button onClick={handleClearTransactions} className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                  <RefreshCw className="w-5 h-5" />
                  Sadece Bakiyeleri Sil (Sıfırla)
              </button>
              <button onClick={handleFactoryReset} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                  <Trash2 className="w-5 h-5" />
                  FABRİKA AYARLARINA DÖN
              </button>
          </div>
      </section>

      {isElectron && dbPath && <div className="text-center text-xs text-slate-600 mt-4"><code className="bg-black/30 p-1 rounded">{dbPath}</code></div>}
    </div>
  );
};

export default Settings;
