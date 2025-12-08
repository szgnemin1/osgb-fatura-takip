# 🏥 OSGB Fatura & Finans Takip Sistemi (ProFinans)

Modern, güvenli ve kullanıcı dostu arayüzü ile OSGB (Ortak Sağlık Güvenlik Birimi) ve hizmet sektöründeki firmaların ön muhasebe, faturalandırma ve cari takip süreçlerini yöneten profesyonel React uygulaması.

Bu proje hem **Web Uygulaması** hem de **Windows Masaüstü Uygulaması (.exe)** olarak çalışabilmektedir.

![OSGB Dashboard Önizleme](https://via.placeholder.com/1200x600?text=OSGB+Fatura+Takip+Dashboard)

## 🚀 Özellikler

### 1. 💼 Gelişmiş Firma Yönetimi
*   Firmalara özel fiyatlandırma modelleri tanımlama:
    *   **Standart:** Taban ücret + Limit aşım ücreti.
    *   **Toleranslı:** Belirli % tolerans aralığında sabit fiyat.
    *   **Kademeli:** Kişi sayısı aralıklarına göre (Örn: 10-20 kişi arası 5000 TL) otomatik fiyat.
*   E-Fatura ve E-Arşiv mükellefiyetine göre özelleştirilmiş kayıt.

### 2. 🧮 Dinamik Fatura Hazırlık (Oyun Alanı)
*   Mevcut çalışan sayısı, tetkik sayısı gibi parametreleri girerek anlık fatura hesaplama.
*   **Excel Entegrasyonu:** Müşteri listesini Excel'den yükleyerek saniyeler içinde 300+ firmayı hesaplama.
*   Hesaplanan tutarları "Taslak" olarak onaya gönderme.

### 3. ✅ Onaylı Fatura Sistemi
*   Faturalar önce **Taslak (Pending)** olarak oluşur.
*   Kontrol edildikten sonra onaylanarak **Resmi Cari (Approved)** kayıtlara işlenir.
*   E-Arşiv faturaları için Vergi No ve Adres bilgilerini tek tıkla kopyalama.
*   Akıllı Metin Kopyalama: Fatura tutarını ve IBAN bilgisini yazı ile (Yalnız...TL'dir) kopyalama.

### 4. 📈 Finansal Raporlama & Cari Takip
*   Firma bazlı detaylı ekstre (Borç/Alacak/Bakiye).
*   **Borç Yaşlandırma Analizi:** 1 aydan 12 aya kadar ödeme yapmayan firmaların grafiksel analizi.
*   Tüm verileri Excel ve PDF formatında dışa aktarma.

### 5. ☁️ Hibrit Veri Yönetimi
*   **Yerel Çalışma:** Veriler varsayılan olarak tarayıcıda/cihazda saklanır (LocalStorage).
*   **Bulut Senkronizasyon:** Google Firebase Realtime Database ile verileri ofis ve ev arasında taşıma imkanı (Ücretsiz).
*   **Tam Yedekleme:** Veritabanını `.json` olarak indirip geri yükleme özelliği.

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

## 🔒 Güvenlik ve Loglama
Sistem üzerinde yapılan tüm kritik işlemler (Fatura silme, Firma güncelleme vb.) cihaz bilgisi ve zaman damgası ile kayıt altına alınır. Bu kayıtlar "Ayarlar" sayfasından Excel olarak indirilebilir.

## 👤 Geliştirici

**Emin Sezgin**
*   [GitHub](https://github.com/szgnemin1)
*   [LinkedIn](https://www.linkedin.com/in/szgnemin)
*   [Instagram](https://www.instagram.com/szgn_emin/)
*   [X (Twitter)](https://x.com/szgn_emin)

---
*Bu proje açık kaynak lisansı ile paylaşılmıştır.*
