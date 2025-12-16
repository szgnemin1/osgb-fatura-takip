
# 🏥 OSGB Fatura & Finans Takip Sistemi (ProFinans)

Modern, güvenli ve kullanıcı dostu arayüzü ile OSGB (Ortak Sağlık Güvenlik Birimi) ve hizmet sektöründeki firmaların ön muhasebe, faturalandırma ve cari takip süreçlerini yöneten profesyonel React uygulaması.

Bu proje hem **Web Uygulaması** hem de **Windows Masaüstü Uygulaması (.exe)** olarak çalışabilmektedir.

![OSGB Dashboard Önizleme](https://via.placeholder.com/1200x600?text=OSGB+Fatura+Takip+Dashboard)

### 🔔 v1.4.5 Sürüm Notları (YENİ)
Bu sürümde uygulama stabilitesi ve kullanıcı deneyimi odaklı kritik geliştirmeler yapılmıştır:

1.  **🛡️ Akıllı Pano ve Veri Güvenliği (Crash Guard):** 
    *   Masaüstü (EXE) versiyonunda kopyalama işlemlerinde yaşanan donmalar giderildi.
    *   `Electron.clipboard` modülü entegre edilerek %100 kararlı veri kopyalama sağlandı.
    *   Veritabanı yazma işlemlerine (Disk I/O) hata koruması eklendi; disk hatası olsa bile uygulama çökmüyor.
    
2.  **✨ Görsel İyileştirmeler:**
    *   Fatura listesindeki kopyalama butonlarına "Başarılı" animasyonları eklendi (Yeşil tik ve büyüme efekti).
    *   "Kesilecek Faturalar" sayfasında yanlışlıkla silmeyi önlemek için 'Çöp Kutusu' butonu kaldırıldı, sadece 'Onayla' butonu bırakıldı.
    
3.  **🏢 Kurumsal Kimlik:**
    *   Uygulama logosu yenilendi ve arayüze entegre edildi.

---

### 🚀 v1.4.0 Özellikleri
1.  **Masaüstü Veritabanı Motoru (EXE):** Veriler Windows'un `AppData` klasöründe fiziksel bir dosyada (`database.json`) saklanır.
2.  **Gelişmiş Excel Entegrasyonu:** Firmalar ve Kademeli Fiyatlar tek seferde yüklenebiliyor.
3.  **Dinamik KDV Yönetimi:** Uzman, Doktor ve Sağlık hizmetleri için KDV oranları ayarlanabilir.
4.  **Akıllı Kopyalama Sistemi:** Fatura tutarını ve IBAN bilgisini yazı ile (Yalnız...TL'dir) kopyalama.

---

## 🛠️ Kullanılan Teknolojiler

*   **Core:** React 18, TypeScript, Hooks
*   **Styling:** Tailwind CSS (Dark Mode Optimized)
*   **Desktop Engine:** Electron.js
*   **Charts:** Recharts
*   **Data Handling:** XLSX (Excel), jsPDF (PDF Generation)
*   **Icons:** Lucide React
*   **Deployment:** Vercel / Netlify / Electron Builder

## 📦 Kurulum ve Çalıştırma

Projeyi bilgisayarınıza klonlayın ve aşağıdaki adımları izleyin.

### 1. Gerekli Paketleri Yükleyin
```bash
npm install
```

### 2. Web Modunda Çalıştırma (Geliştirme)
Tarayıcı üzerinde çalıştırmak için:
```bash
npm start
```

### 3. Windows Uygulaması (.exe) Oluşturma
Projeyi masaüstü uygulamasına çevirmek için:
```bash
npm run electron:build
```
*Bu işlem tamamlandığında `dist/` klasörü içinde kurulum dosyanız (`.exe`) hazır olacaktır.*

## 👤 Geliştirici

**Emin Sezgin**
*   [GitHub](https://github.com/szgnemin1)
*   [LinkedIn](https://www.linkedin.com/in/szgnemin)
*   [Instagram](https://www.instagram.com/szgn_emin/)
*   [X (Twitter)](https://x.com/szgn_emin)

---
*Bu proje açık kaynak lisansı ile paylaşılmıştır.*
