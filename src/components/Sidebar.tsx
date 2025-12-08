import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Calculator, Receipt, FileText, Settings, TrendingDown } from 'lucide-react';

const Sidebar = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center justify-center">
        <h1 className="text-lg font-bold text-slate-100 tracking-wider text-center">
          <span className="text-blue-500">OSGB</span> FATURA TAKİP
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" className={navClass}>
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/firms" className={navClass}>
          <Building2 className="w-5 h-5" />
          <span>Firma Kayıt</span>
        </NavLink>
        <NavLink to="/prepare" className={navClass}>
          <Calculator className="w-5 h-5" />
          <span>Fatura Hazırlık</span>
        </NavLink>
        <NavLink to="/invoices" className={navClass}>
          <Receipt className="w-5 h-5" />
          <span>Kesilecek Faturalar</span>
        </NavLink>
        <NavLink to="/details" className={navClass}>
          <FileText className="w-5 h-5" />
          <span>Cari Detay</span>
        </NavLink>
        <NavLink to="/debt-tracking" className={navClass}>
          <TrendingDown className="w-5 h-5" />
          <span>Borç Takip</span>
        </NavLink>
        
        <div className="pt-4 border-t border-slate-800 mt-4">
          <NavLink to="/settings" className={navClass}>
            <Settings className="w-5 h-5" />
            <span>Ayarlar & Yedek</span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.3.2 • OSGB Fatura Takip
      </div>
    </div>
  );
};

export default Sidebar;