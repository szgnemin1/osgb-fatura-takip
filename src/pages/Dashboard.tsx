
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { DollarSign, FileCheck, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Scale, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalBilled: 0, totalCollected: 0, balance: 0, thisMonthBilled: 0, thisMonthCollected: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    const s = db.getStats();
    
    const transactions = db.getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const approved = transactions.filter(t => (t.status || 'APPROVED') === 'APPROVED');

    const thisMonthTrans = approved.filter(t => t.month === currentMonth && t.year === currentYear);
    const thisMonthBilled = thisMonthTrans.filter(t => t.type === 'FATURA').reduce((sum, t) => sum + t.debt, 0);
    const thisMonthCollected = thisMonthTrans.filter(t => t.type === 'TAHSİLAT').reduce((sum, t) => sum + t.credit, 0);

    setStats({ ...s, thisMonthBilled, thisMonthCollected });

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.getMonth() + 1, year: d.getFullYear(), name: d.toLocaleString('tr-TR', { month: 'long' }) };
    }).reverse();

    const data = last6Months.map(m => {
      const monthTrans = approved.filter(t => t.month === m.month && t.year === m.year);
      return {
        name: m.name,
        Faturalanan: monthTrans.reduce((sum, t) => sum + t.debt, 0),
        Tahsilat: monthTrans.reduce((sum, t) => sum + t.credit, 0)
      };
    });
    setChartData(data);
  };

  useEffect(() => {
    loadData(); 
    const unsubscribe = db.subscribe(() => {
        loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
      setRefreshing(true);
      await db.initData(true); // Zorla diskten oku
      loadData();
      setTimeout(() => setRefreshing(false), 500);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-12">
      <header className="flex justify-between items-start">
        <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                Ana Sayfa
            </h2>
            <p className="text-slate-400 mt-2 text-sm md:text-base">Firmanızın anlık nakit akışı ve genel bakiye durumu.</p>
        </div>
        
        {/* Manuel Yenileme Butonu */}
        <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg border border-slate-700 transition-all"
        >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Verileri Yenile</span>
        </button>
      </header>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <TrendingUp className="w-24 h-24 text-blue-400" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                    <span className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-5 h-5" /></span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Toplam Ciro</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white mt-4">{formatCurrency(stats.totalBilled)}</p>
                <p className="text-xs text-slate-500 mt-2 border-t border-slate-700/50 pt-2 hidden md:block">
                    Onaylanmış tüm faturaların toplam tutarı.
                </p>
            </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <FileCheck className="w-24 h-24 text-purple-400" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-purple-400">
                    <span className="p-2 bg-purple-500/10 rounded-lg"><ArrowUpRight className="w-5 h-5" /></span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Bu Ay Onaylanan</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white mt-4">{formatCurrency(stats.thisMonthBilled)}</p>
                <p className="text-xs text-slate-500 mt-2 border-t border-slate-700/50 pt-2 hidden md:block">
                    Bu ay içinde resmileşmiş faturalar.
                </p>
            </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Wallet className="w-24 h-24 text-emerald-400" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                    <span className="p-2 bg-emerald-500/10 rounded-lg"><ArrowDownLeft className="w-5 h-5" /></span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Bu Ay Tahsilat</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white mt-4">{formatCurrency(stats.thisMonthCollected)}</p>
                <p className="text-xs text-slate-500 mt-2 border-t border-slate-700/50 pt-2 hidden md:block">
                    Bu ay bankaya/kasaya giren toplam nakit.
                </p>
            </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/30 p-5 rounded-2xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                <Scale className="w-24 h-24 text-orange-400" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-orange-400">
                    <span className="p-2 bg-orange-500/10 rounded-lg"><DollarSign className="w-5 h-5" /></span>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Genel Bakiye</h3>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white mt-4">{formatCurrency(stats.balance)}</p>
                <p className="text-xs text-slate-400 mt-2 border-t border-orange-500/20 pt-2 hidden md:block">
                    Piyasadan toplanması gereken toplam alacak.
                </p>
            </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-4 md:p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-200">Son 6 Ay</h3>
                <div className="flex gap-2 md:gap-4 text-[10px] md:text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-blue-500"></span> Fatura</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500"></span> Tahsilat</span>
                </div>
            </div>
            <div className="w-full h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 10}} interval={0} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="Faturalanan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Tahsilat" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col justify-center">
              <h3 className="text-lg font-bold text-slate-200 mb-6">Finansal Sağlık</h3>
              <div className="space-y-6">
                  <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                          <span className="text-xs font-semibold inline-block text-blue-400 uppercase">Toplam Ciro</span>
                          <span className="text-xs font-semibold inline-block text-blue-400">{formatCurrency(stats.totalBilled)}</span>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                          <div style={{ width: '100%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                      </div>
                  </div>
                  <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                          <span className="text-xs font-semibold inline-block text-emerald-400 uppercase">Toplam Tahsilat</span>
                          <span className="text-xs font-semibold inline-block text-emerald-400">{formatCurrency(stats.totalCollected)}</span>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                          <div style={{ width: `${stats.totalBilled > 0 ? (stats.totalCollected / stats.totalBilled) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div>
                      </div>
                  </div>
                  <div className="mt-4 md:mt-8 p-4 bg-slate-900 rounded-xl border border-slate-700 text-center">
                      <div className="text-xs text-slate-500 mb-1">Tahsilat Başarı Oranı</div>
                      <div className="text-2xl font-bold text-white">
                          %{stats.totalBilled > 0 ? ((stats.totalCollected / stats.totalBilled) * 100).toFixed(1) : '0'}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
