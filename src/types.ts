
export interface Firm {
  id: string;
  name: string;
  basePersonLimit: number; // Taban Kişi Limiti (Standart ve Tolerans için merkez)
  baseFee: number; // Taban Ücret
  extraPersonFee: number; // Ekstra Kişi Ücreti (Limit aşımı veya düşümü için)
  defaultInvoiceType: InvoiceType;
  
  // E-Arşiv Özel Bilgileri
  taxNumber?: string;
  address?: string;
  
  // Yeni Fiyatlandırma Özellikleri
  pricingModel: PricingModel;
  tolerancePercentage?: number; // Toleranslı model için % (Örn: 10)
  tiers?: PricingTier[]; // Kademeli model için aralıklar
}

export enum PricingModel {
  STANDARD = 'STANDART',
  TOLERANCE = 'TOLERANSLI', // % Alt ve Üst tolerans
  TIERED = 'KADEMELI' // Aralık bazlı (0-10, 11-20 vs)
}

export interface PricingTier {
  min: number;
  max: number;
  price: number;
}

export interface GlobalSettings {
  expertPercentage: number;
  doctorPercentage: number;
  reportEmail?: string;
  vatRateExpert: number;
  vatRateDoctor: number;
  vatRateHealth: number;
  bankInfo: string; // Banka ve IBAN Bilgisi Metni
}

export enum TransactionType {
  INVOICE = 'FATURA',
  PAYMENT = 'TAHSİLAT'
}

export enum InvoiceType {
  E_FATURA = 'E-Fatura',
  E_ARSIV = 'E-Arşiv'
}

export type TransactionStatus = 'PENDING' | 'APPROVED';

export interface Transaction {
  id: string;
  firmId: string;
  date: string;
  type: TransactionType;
  invoiceType?: InvoiceType; // Sadece fatura ise
  description: string;
  debt: number; // Borç (Kesilen Fatura)
  credit: number; // Alacak (Ödenen Para)
  month: number;
  year: number;
  status: TransactionStatus; // Onay durumu
  // Hesaplama detaylarını saklamak için (Historical data)
  calculatedDetails?: {
    employeeCount: number;
    extraItemAmount: number;
    expertShare: number;
    doctorShare: number;
  };
}

export interface PreparationItem {
  firmId: string;
  currentEmployeeCount: number;
  extraItemAmount: number;
}

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  deviceInfo: string;
}
