
import React, { useRef, useState, useEffect } from 'react';
import { db } from '../services/db';
import { exporter } from '../services/exporter';
import { Save, Upload, Download, Database, FileSpreadsheet, Percent, Landmark, Trash2, AlertOctagon, RefreshCw, HardDrive, Smartphone, Network, Wifi } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GlobalSettings } from '../types';

const Settings = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [localIp, setLocalIp] = useState('Yükleniyor...');
  const [isClientMode, setIsClientMode] = useState(false);

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
    setGlobalSettings(db.getGlobalSettings());
    setDbPath(db.getDbPath());
    
    // Electron kontrolü ve IP alma
    if((window as any).process && (window as any).process.type === 'renderer') {
        setLocalIp(db.getLocalIpAddress());
        setIsClientMode(false);
    } else {
        setLocalIp(window.location.hostname);
        setIsClientMode(true);
    }
  }, []);

  const handleSaveGlobalSettings = (e: React.FormEvent) => { e.preventDefault(); db.saveGlobalSettings(globalSettings); alert('Global parametreler güncellendi.'); };

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

  const handleFactoryReset = () => {
      window.focus();
      if(!window.confirm("⚠️ DİKKAT: TÜM VERİLER SİLİNECEK! \n\nFabrika ayarlarına dönmek istediğinize emin misiniz?")) return;
      db.factoryReset();
      alert("Tüm veriler silindi. Uygulama yeniden başlatılıyor.");
      window.location.reload();
  };

  const handleClearTransactions = () => {
      window.focus();
      if(!window.confirm("⚠️ SADECE CARİ HAREKETLER SİLİNECEK!")) return;
      db.clearAllTransactions();
      alert("Cari hareketler temizlendi. Sayfa yenileniyor.");
      window.location.reload();
  };

  const handleForceSync = () => {
      db.forceSync();
      alert("Masaüstü verileri 'database.json' dosyasına başarıyla yazıldı.\n\nŞimdi telefondan 'Verileri Çek' diyerek güncelleyebilirsiniz.");
  };

  const handlePullFromHost = async () => {
      setLoading(true);
      try {
          await db.initData();
          alert("Veriler ana bilgisayardan başarıyla çekildi! Sayfa yenileniyor...");
          window.location.reload();
      } catch (e: any) {
          alert("Hata: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3"><Database className="w-8 h-8 text-blue-500" /> Ayarlar ve Veri Yönetimi</h2>
        <p className="text-slate-400 mt-2">Yedekleme, bağlantı ve global parametreler.</p>
      </header>
      
      {/* BAĞLANTI BİLGİSİ (MOBİL & MASAÜSTÜ İÇİN AYRI) */}
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-lg flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       <Smartphone className="w-5 h-5 text-emerald-400" /> Bağlantı ve Senkronizasyon
                   </h3>
                   <p className="text-sm text-slate-400 mt-1">
                       {isClientMode 
                        ? "Şu an mobil/tarayıcı modundasınız. Veriler ana bilgisayardan çekilir." 
                        : "Şu an ana bilgisayardasınız. Veriler buradan yayınlanır."}
                   </p>
               </div>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center gap-4 font-mono text-emerald-400 text-lg">
                  <Network className="w-6 h-6" />
                  {isClientMode ? window.location.host : `http://${localIp}:5000`}
              </div>
              
              {!isClientMode && (
                  <div className="text-xs text-slate-500 font-mono break-all border-t border-slate-800 pt-2">
                      Aktif Veritabanı: {dbPath}
                  </div>
              )}

              {/* MASAÜSTÜ İÇİN BUTON */}
              {!isClientMode && (
                <div className="flex flex-col gap-2">
                    <button onClick={handleForceSync} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-lg shadow-blue-900/20">
                        <HardDrive className="w-4 h-4" /> 
                        Verileri Yayınla (Diske Kaydet)
                    </button>
                    <p className="text-xs text-slate-500">Telefonda veri görünmüyorsa önce buna basın, sonra telefondan sayfayı yenileyin.</p>
                </div>
              )}

              {/* MOBİL İÇİN BUTON */}
              {isClientMode && (
                  <div className="flex flex-col gap-2">
                    <button onClick={handlePullFromHost} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all shadow-lg shadow-purple-900/20">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
                        {loading ? 'Bağlanıyor...' : 'Verileri Ana Bilgisayardan Çek'}
                    </button>
                    <div className="flex gap-2 text-xs text-slate-500 items-center">
                        <Wifi className="w-3 h-3" />
                        <span>Bağlı olduğunuz sunucu: {window.location.origin}</span>
                    </div>
                  </div>
              )}
          </div>
      </div>

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
    </div>
  );
};

export default Settings;
