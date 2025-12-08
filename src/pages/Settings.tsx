
import React, { useRef, useState, useEffect } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { cloudService } from '../services/cloud';
import { Save, Upload, Download, Database, AlertTriangle, FileSpreadsheet, Cloud, Percent } from 'lucide-react';
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
      reportEmail: ''
  });

  useEffect(() => {
    setCloudUrl(db.getCloudUrl());
    setGlobalSettings(db.getGlobalSettings());
    setDbPath(db.getDbPath()); // Veritabanı yolunu al
  }, []);

  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  const handleSaveUrl = () => {
    db.saveCloudUrl(cloudUrl);
    alert('Bulut adresi kaydedildi.');
  };

  const handleSaveGlobalSettings = (e: React.FormEvent) => {
      e.preventDefault();
      db.saveGlobalSettings(globalSettings);
      alert('Global parametreler güncellendi.');
  };

  const handleCloudUpload = async () => {
    if(!cloudUrl) return alert('Lütfen önce Firebase URL giriniz.');
    if(!window.confirm('Yerel verileriniz Bulut üzerine yazılacak. Devam edilsin mi?')) return;
    
    setLoading(true);
    try {
        const data = db.getFullBackup();
        await cloudService.uploadData(cloudUrl, data);
        alert('Yükleme Başarılı! Verileriniz buluta yedeklendi.');
    } catch (e) {
        alert('Yükleme Başarısız. URL adresinizi ve internet bağlantınızı kontrol edin.');
    } finally {
        setLoading(false);
    }
  };

  const handleCloudDownload = async () => {
    if(!cloudUrl) return alert('Lütfen önce Firebase URL giriniz.');
    if(!window.confirm('DİKKAT! Yerel verileriniz silinecek ve Buluttaki veriler yüklenecek. Devam edilsin mi?')) return;

    setLoading(true);
    try {
        const data = await cloudService.downloadData(cloudUrl);
        if(data && db.restoreBackup(data)) {
            alert('İndirme Başarılı! Sayfa yenileniyor...');
            window.location.reload();
        } else {
            alert('Veri formatı hatalı veya veri yok.');
        }
    } catch (e) {
        alert('İndirme Başarısız. URL adresinizi kontrol edin.');
    } finally {
        setLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    const data = db.getFullBackup();
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
    const fileName = `OSGB_Yedek_${dateStr}.json`;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("DİKKAT! Bu işlem mevcut veritabanını tamamen silecek ve yedekteki verileri yükleyecektir. Devam etmek istiyor musunuz?")) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = db.restoreBackup(json);
        if (success) {
          alert("Yedek başarıyla geri yüklendi. Sayfa yenileniyor...");
          window.location.reload();
        } else {
          alert("Yedek dosyası bozuk veya uyumsuz.");
        }
      } catch (err) {
        alert("Dosya okuma hatası.");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    exporter.exportAdvancedTemplate();
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const result = db.bulkImportFirms(wb);
            alert(`İşlem Tamamlandı!\n\nEklenen Firma: ${result.newFirmsCount}\nOluşturulan Borç Kaydı: ${result.newTransCount}`);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Excel dosyası okunamadı. Lütfen indirdiğiniz Gelişmiş Şablonu kullanın.");
        }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          Ayarlar ve Veri Yönetimi
        </h2>
        <p className="text-slate-400 mt-2">Yedekleme, bulut senkronizasyonu, global parametreler ve veri aktarımı.</p>
      </header>

      {/* GLOBAL AYARLAR */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-500" />
            Global Parametreler (KDV ve Hakediş)
          </h3>
          <p className="text-slate-400 mb-4 text-sm">
            Tüm firmalar için varsayılan hakediş ve KDV oranlarını belirleyin.
          </p>
          <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Uzman Hakediş (%)</label>
                    <input 
                        type="number" min="0" max="100" 
                        value={globalSettings.expertPercentage}
                        onChange={e => setGlobalSettings(p => ({...p, expertPercentage: Number(e.target.value)}))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Doktor Hakediş (%)</label>
                    <input 
                        type="number" min="0" max="100" 
                        value={globalSettings.doctorPercentage}
                        onChange={e => setGlobalSettings(p => ({...p, doctorPercentage: Number(e.target.value)}))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    />
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Uzman KDV (%)</label>
                    <input type="number" min="0" value={globalSettings.vatRateExpert} onChange={e => setGlobalSettings(p => ({...p, vatRateExpert: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Doktor KDV (%)</label>
                    <input type="number" min="0" value={globalSettings.vatRateDoctor} onChange={e => setGlobalSettings(p => ({...p, vatRateDoctor: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Sağlık KDV (%)</label>
                    <input type="number" min="0" value={globalSettings.vatRateHealth} onChange={e => setGlobalSettings(p => ({...p, vatRateHealth: Number(e.target.value)}))} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white" />
                </div>
              </div>

              <div className="flex justify-end">
                  <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                      Ayarları Kaydet
                  </button>
              </div>
          </form>
      </section>

      {/* BULUT SENKRONİZASYON */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Cloud className="w-48 h-48 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 relative z-10">
            <Cloud className="w-6 h-6 text-blue-400" />
            Google Firebase Bulut Senkronizasyon (Ücretsiz)
        </h3>
        <div className="space-y-4 relative z-10">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                <p>Verilerinizi farklı cihazlar arasında taşımak için Google Firebase Realtime Database kullanabilirsiniz.</p>
            </div>
            <div className="flex gap-4 items-center">
                <input 
                    type="text" 
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    placeholder="https://projeniz-default-rtdb.europe-west1.firebasedatabase.app/"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 font-mono text-sm"
                />
                <button onClick={handleSaveUrl} className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg text-white font-medium">Kaydet</button>
            </div>
            <div className="flex gap-4 mt-4">
                <button onClick={handleCloudUpload} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20">{loading ? 'İşleniyor...' : <><Upload className="w-5 h-5" /> Buluta Yükle (Gönder)</>}</button>
                <button onClick={handleCloudDownload} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20">{loading ? 'İşleniyor...' : <><Download className="w-5 h-5" /> Buluttan İndir (Çek)</>}</button>
            </div>
        </div>
      </section>

      {/* YEDEKLEME & IMPORT */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-emerald-500" />
            Yerel Yedekleme ve Excel Aktarımı
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h4 className="font-semibold text-slate-300">Yedekleme</h4>
                <div className="flex gap-2">
                    <button onClick={handleDownloadBackup} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> Yedeği İndir (.json)</button>
                    <div className="relative flex-1">
                        <input type="file" ref={fileInputRef} onChange={handleRestoreBackup} accept=".json" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm border border-slate-600"><Upload className="w-4 h-4" /> Yedeği Yükle</button>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <h4 className="font-semibold text-slate-300">Excel Aktarımı</h4>
                <div className="flex gap-2">
                     <button onClick={handleDownloadTemplate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> Şablon İndir</button>
                     <div className="relative flex-1">
                        <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                        <button onClick={() => excelInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 text-sm border border-slate-600"><Upload className="w-4 h-4" /> Excel Yükle</button>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Geliştirici & İletişim */}
      <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-400" />
            Geliştirici İletişim
          </h3>
          <div className="flex flex-wrap gap-4">
              <a href="https://www.instagram.com/szgn_emin/" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-pink-600/20 text-pink-500 hover:bg-pink-600 hover:text-white px-4 py-2 rounded-lg transition-colors border border-pink-600/30">Instagram</a>
              <a href="https://x.com/szgn_emin" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-400/20 text-blue-400 hover:bg-blue-400 hover:text-white px-4 py-2 rounded-lg transition-colors border border-blue-400/30">Twitter (X)</a>
              <a href="https://www.linkedin.com/in/szgnemin" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-700/20 text-blue-600 hover:bg-blue-700 hover:text-white px-4 py-2 rounded-lg transition-colors border border-blue-700/30">LinkedIn</a>
              <a href="https://github.com/szgnemin1" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white px-4 py-2 rounded-lg transition-colors border border-slate-600">GitHub</a>
          </div>
      </section>

      {/* FOOTER STORAGE INFO */}
      <div className="text-center text-xs text-slate-600 mt-12 pb-8">
        <p>Bu sistemdeki tüm veriler tarayıcınızın yerel hafızasında (localStorage) saklanmaktadır.</p>
        {isElectron && dbPath && (
            <div className="mt-4 p-4 inline-block bg-slate-900 border border-slate-800 rounded-lg text-left max-w-2xl">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                    <Database className="w-4 h-4" />
                    Masaüstü Veritabanı Konumu (Fiziksel Dosya)
                </div>
                <code className="block font-mono text-slate-400 select-all break-all bg-black/30 p-2 rounded border border-slate-800">
                  {dbPath}
                </code>
                <p className="mt-2 text-slate-500 italic">
                    * Verileriniz bu dosyaya anlık olarak kaydedilmektedir.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
