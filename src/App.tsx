
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FirmRegistration from './pages/FirmRegistration';
import Preparation from './pages/Preparation';
import Invoices from './pages/Invoices';
import FirmDetails from './pages/FirmDetails';
import Settings from './pages/Settings';
import DebtTracking from './pages/DebtTracking';
import { db } from './services/db';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';

const App = () => {
  // Update State
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloaded'>('idle');

  // Uygulama başlarken Masaüstü Veritabanını (database.json) hafızaya yükle
  useEffect(() => {
    db.initFileSystem();

    // Electron IPC Dinleyicileri (Güncelleme için)
    if (typeof window !== 'undefined' && (window as any).require) {
        try {
            const { ipcRenderer } = (window as any).require('electron');
            
            ipcRenderer.on('update_available', () => {
                setUpdateStatus('available');
            });

            ipcRenderer.on('update_downloaded', () => {
                setUpdateStatus('downloaded');
            });
        } catch (e) {
            console.error("Electron IPC hatası:", e);
        }
    }
  }, []);

  const restartApp = () => {
      if (typeof window !== 'undefined' && (window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          ipcRenderer.send('restart_app');
      }
  };

  const closeNotification = () => {
      setUpdateStatus('idle');
  };

  return (
    <Router>
      <div className="flex h-screen bg-slate-950 text-slate-200 font-sans relative">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/firms" element={<FirmRegistration />} />
              <Route path="/prepare" element={<Preparation />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/details" element={<FirmDetails />} />
              <Route path="/debt-tracking" element={<DebtTracking />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* GÜNCELLEME BİLDİRİMİ (TOAST) */}
        {updateStatus !== 'idle' && (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
                <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-xl p-4 w-80 flex flex-col gap-3 relative overflow-hidden">
                    {/* Arka Plan Efekti */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    
                    <button onClick={closeNotification} className="absolute top-2 right-2 text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3 mt-1">
                        <div className={`p-2 rounded-lg ${updateStatus === 'available' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {updateStatus === 'available' ? <DownloadCloud className="w-6 h-6 animate-pulse" /> : <RefreshCw className="w-6 h-6" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">
                                {updateStatus === 'available' ? 'Yeni Sürüm İndiriliyor...' : 'Güncelleme Hazır!'}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                                {updateStatus === 'available' 
                                    ? 'Uygulamanın yeni sürümü bulundu ve arka planda indiriliyor. Lütfen bekleyin.' 
                                    : 'Yüklemek ve yeni özellikleri kullanmak için uygulamayı yeniden başlatın.'}
                            </p>
                        </div>
                    </div>

                    {updateStatus === 'downloaded' && (
                        <button 
                            onClick={restartApp}
                            className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Şimdi Yeniden Başlat
                        </button>
                    )}
                </div>
            </div>
        )}

      </div>
    </Router>
  );
};

export default App;
