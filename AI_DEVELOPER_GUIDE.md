
# AI DEVELOPER CONTEXT & GUIDE (v2.1.0)

Bu dosya, bu proje üzerinde çalışacak diğer Yapay Zeka modelleri (ChatGPT, Claude, Copilot vb.) için sistemin mimarisini, kurallarını ve iş mantığını anlatır.

## 1. Proje Özeti
Bu proje, OSGB (Ortak Sağlık Güvenlik Birimi) firmaları için geliştirilmiş, **React + TypeScript** tabanlı, **Electron.js** ile masaüstü uygulaması olarak çalışan, yerel veri saklama (LocalStorage/File System) prensibiyle kurgulanmış bir finans yönetim sistemidir.

## 2. Mimari (Hybrid Architecture)
Sistem **İstemci-Sunucu (Client-Server)** mantığını simüle eder ama tek bir uygulama içindedir.
*   **Main Process (`public/electron.js`):** 
    *   Node.js üzerinde çalışır.
    *   `Express.js` sunucusu barındırır (Port 5000).
    *   Dosya sistemine (`database.json`) doğrudan erişimi vardır.
    *   Mobilden gelen istekleri karşılar.
*   **Renderer Process (React):**
    *   Kullanıcı arayüzüdür.
    *   Masaüstünde çalışırken `window.require('fs')` ile dosyayı doğrudan okur.
    *   Tarayıcıda (Mobilde) çalışırken `fetch('http://IP:5000/api/db')` ile veriyi çeker.

## 3. Kritik İş Mantığı (Business Logic)

### A. Fatura Döngüsü
1.  **Preparation (Hazırlık):** Kullanıcı "Fatura Hazırlık" sayfasında kişi sayılarını girer.
2.  **Calculation (Hesaplama):** Sistem firmanın `pricingModel` (Standart, Toleranslı, Kademeli) ayarına göre tutarı hesaplar.
3.  **Draft (Taslak):** `Transaction` tablosuna `status: 'PENDING'` olarak kaydedilir.
4.  **Approval (Onay):** Kullanıcı onayladığında `status: 'APPROVED'` olur ve cari bakiyeye işler.

### B. Fiyatlandırma Modelleri
*   **STANDARD:** `Taban Ücret + ((Çalışan - Limit) * Ekstra Ücret)`
*   **TOLERANCE:** Standart hesaba ek olarak, eğer artış `%X` oranının altındaysa ekstra ücret yansıtmaz.
*   **TIERED (Kademeli):** `PricingTier[]` dizisindeki aralıklara bakar (Örn: 0-50 kişi -> 5000 TL).

### C. Hakediş
OSGB sektörüne özel olarak, her faturanın içinde "Uzman Payı", "Hekim Payı" ve "Sağlık Payı" arka planda hesaplanır ve raporlanır.

## 4. Dosya Yapısı ve Kurallar
*   `src/services/db.ts`: Veri katmanıdır. Hem Electron (fs) hem Web (fetch) mantığını soyutlar.
*   **Router:** `HashRouter` zorunludur. `BrowserRouter` Electron'da dosya yolu hatası verir.
*   **Stil:** Tailwind CSS. `slate-900` (Background), `slate-800` (Cards).

## 5. Gelecek Geliştirmeler İçin Notlar
*   Yeni bir özellik eklerken `types.ts` içerisindeki `Transaction` veya `Firm` interface'lerini güncelleyin.
*   Veritabanı şeması değişirse `db.ts` içinde `initData` fonksiyonuna migrasyon (migration) mantığı ekleyin.
