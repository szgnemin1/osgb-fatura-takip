# AI DEVELOPER CONTEXT & GUIDE

Bu dosya, bu proje üzerinde çalışacak diğer Yapay Zeka modelleri (ChatGPT, Claude, Copilot vb.) için sistemin mimarisini, kurallarını ve iş mantığını anlatır.

## 1. Proje Özeti
Bu proje, OSGB (Ortak Sağlık Güvenlik Birimi) firmaları için geliştirilmiş, React + TypeScript tabanlı, yerel veri saklama (LocalStorage) prensibiyle çalışan bir ön muhasebe ve fatura takip sistemidir. Sistem Electron.js ile masaüstü uygulamasına dönüştürülebilir.

## 2. Teknoloji Yığını
*   **Framework:** React 18
*   **Dil:** TypeScript
*   **Stil:** Tailwind CSS (Sadece Dark Theme kullanılır: slate-900, slate-800)
*   **Router:** `react-router-dom` (HashRouter kullanılır, Electron uyumluluğu için zorunludur).
*   **Veritabanı:** `src/services/db.ts` dosyası üzerinden yönetilen `localStorage` katmanı. (SQL yoktur).
*   **Bulut:** Google Firebase Realtime Database (REST API ile, SDK yok).

## 3. Kritik İş Mantığı (Business Logic)

### A. Fatura Döngüsü (Life Cycle)
Sistemde faturalar iki aşamalıdır:
1.  **Preparation (Hazırlık):** Kullanıcı "Fatura Hazırlık" sayfasında hesaplamaları yapar. "Taslak Oluştur" dediğinde `Transaction` tablosuna `status: 'PENDING'` olarak kaydedilir. Bu aşamada cari bakiyeyi ETKİLEMEZ.
2.  **Approval (Onay):** "Kesilecek Faturalar" sayfasında kullanıcı taslağı onaylar. Statü `status: 'APPROVED'` olur. Artık cari bakiyeye ve Dashboard grafiklerine yansır.

### B. Fiyatlandırma Modelleri (Pricing Models)
Her firmanın `pricingModel` alanı vardır:
1.  **STANDARD:** `Taban Ücret + ((Çalışan Sayısı - Limit) * Ekstra Ücret)`
2.  **TOLERANCE:** Belirlenen `%` tolerans aralığındaysa fiyat sabittir. Dışına çıkarsa artar veya azalır.
3.  **TIERED (Kademeli):** `PricingTier[]` dizisine bakılır. Çalışan sayısı hangi `min-max` aralığındaysa o fiyat uygulanır.

### C. Hakediş Hesaplama
Fatura tutarı üzerinden Uzman ve Doktor payları hesaplanır.
*   **Global Ayarlar:** Bu yüzdeler `GlobalSettings` altından gelir. Firma bazlı değildir.
*   **Net Tutar Gösterimi:** Raporlarda ve listede Uzman payı 1.2'ye, Doktor ve Sağlık payı 1.1'e bölünerek (KDV hariç gibi) gösterilir. Veritabanında ise BRÜT saklanır.

## 4. Dosya Yapısı ve Kurallar
*   `src/services/db.ts`: Tüm veri okuma/yazma işlemleri buradadır. `uuid` veya `crypto` kütüphanesi KULLANILMAZ. Yerel ID üreteci (`Date.now() + Math.random`) kullanılır.
*   `src/types.ts`: Tüm veri tipleri buradadır.
*   `src/services/cloud.ts`: Firebase işlemleri buradadır.
*   **Router:** Asla `BrowserRouter` kullanma. Electron.js dosya protokolü (`file://`) ile çalıştığı için `HashRouter` zorunludur.

## 5. Dikkat Edilmesi Gerekenler
1.  **Null Check:** Veriler localStorage'dan geldiği için her zaman `undefined` veya `null` kontrolü yap.
2.  **Empty States:** Listeler boşken kullanıcıya "Kayıt yok" mesajı göster.
3.  **Responsive:** Tablolar mobilde taşmamalı (`overflow-x-auto`).
4.  **Renk Paleti:** Arka plan `bg-slate-950`, Kartlar `bg-slate-800`, Metinler `text-slate-200`.

## 6. Gelecek Geliştirmeler İçin Notlar
Eğer sisteme yeni bir özellik eklenecekse (Örn: Stok Takibi), mutlaka `STORAGE_KEYS` içine yeni bir key eklenmeli ve `getFullBackup` fonksiyonuna dahil edilmelidir. Aksi takdirde yedekleme çalışmaz.
