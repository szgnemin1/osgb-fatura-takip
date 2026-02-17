
export enum PricingModel {
  STANDARD = 'STANDART',
  TOLERANCE = 'TOLERANSLI',
  TIERED = 'KADEMELI'
}

export interface PricingTier {
  min: number;
  max: number;
  price: number;
}

export enum ServiceType {
  BOTH = 'BOTH',
  EXPERT_ONLY = 'EXPERT_ONLY',
  DOCTOR_ONLY = 'DOCTOR_ONLY'
}

export interface Firm {
  id: string;
  name: string;
  basePersonLimit: number;
  baseFee: number;
  extraPersonFee: number;
  expertPercentage: number;
  doctorPercentage: number;
  defaultInvoiceType: InvoiceType;
  
  // Extended properties for Advanced Pricing & Features
  parentFirmId?: string;
  taxNumber?: string;
  address?: string;
  yearlyFee?: number;
  pricingModel: PricingModel;
  tolerancePercentage?: number;
  tiers?: PricingTier[];
  serviceType?: ServiceType;
  isKdvExcluded?: boolean;
  savedPoolConfig?: string[];

  // Secondary Model Configuration
  hasSecondaryModel?: boolean;
  secondaryPricingModel?: PricingModel;
  secondaryBaseFee?: number;
  secondaryBasePersonLimit?: number;
  secondaryExtraPersonFee?: number;
  secondaryTiers?: PricingTier[];
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
  invoiceType?: InvoiceType;
  description: string;
  debt: number;
  credit: number;
  month: number;
  year: number;
  status: TransactionStatus;
  calculatedDetails?: {
    employeeCount: number;
    extraItemAmount: number;
    expertShare: number;
    doctorShare: number;
    serviceAmount?: number;
    yearlyFeeAmount?: number;
  };
}

export interface PreparationItem {
  firmId: string;
  currentEmployeeCount: number;
  extraItemAmount: number;
  addYearlyFee?: boolean;
}

export interface GlobalSettings {
  expertPercentage: number;
  doctorPercentage: number;
  vatRateExpert: number;
  vatRateDoctor: number;
  vatRateHealth: number;
  reportEmail?: string;
  bankInfo: string;
  simpleDebtMode?: boolean; // YENİ: Sadeleştirilmiş Borç Modu
}

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  deviceInfo: string;
}

// --- GİDER YÖNETİMİ TİPLERİ ---
export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  date: string;
  amount: number;
  description: string;
  month: number;
  year: number;
}
