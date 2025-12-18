
# 🏥 OSGB Fatura & Finans Takip Sistemi (ProFinans)

Modern, güvenli ve kullanıcı dostu arayüzü ile OSGB (Ortak Sağlık Güvenlik Birimi) ve hizmet sektöründeki firmaların ön muhasebe, faturalandırma ve cari takip süreçlerini yöneten profesyonel React uygulaması.

Bu proje hem **Web Uygulaması** hem de **Windows Masaüstü Uygulaması (.exe)** olarak çalışabilmektedir.

### 🚀 v1.4.7 Sürüm Notları (GÜNCEL)

Bu sürümde uygulamanın performansı, stabilitesi ve teknik altyapısı köklü bir şekilde iyileştirilmiştir:

1.  **⚡ Donma Sorunu Giderildi (Performance Patch):**
    *   EXE versiyonunda tahsilat veya borç ekleme gibi işlemler sırasında yaşanan geçici donmalar tamamen engellendi.
    *   **Teknik Detay:** Veritabanı yazma işlemleri artık asenkron (`async`) ve gecikmeli (`debounced`) olarak çalışır. UI işlemi anında tamamlanırken, dosya yazma arka planda ana thread'i yormadan gerçekleşir.

2.  **📧 Gelişmiş Destek & Raporlama:**
    *   Destek sayfası üzerinden gönderilen raporlar artık doğrudan `m.e.sezgin04@gmail.com` adresine ulaşmaktadır.
    *   Rapor gönderilirken cihazın teknik bilgileri (CPU, GPU, RAM, İşletim Sistemi) otomatik olarak toplanır; bu sayede hataların çözümü %70 daha hızlı hale getirilmiştir.

3.  **📅 Tarih ve Bakiye Kontrolü:**
    *   Cari Detay sayfasında tarih aralığı filtreleme altyapısı optimize edildi.
    *   Devreden bakiye hesaplamaları artık asenkron veri akışıyla %100 uyumlu hale getirildi.

4.  **🎨 UI & UX İyileştirmeleri:**
    *   Modal pencerelerin açılış ve kapanış hızları artırıldı.
    *   Veri giriş formlarındaki animasyonlar daha akıcı hale getirildi.

---

### ⭐ Genel Özellikler

*   **Dinamik Hakediş Hesaplama:** Çalışan sayısı, taban limit, ekstra kişi ücreti ve farklı fiyatlandırma modellerine (Standart, Toleranslı, Kademeli) göre otomatik fatura tutarı hesaplama.
*   **Akıllı Kopyalama:** Fatura tutarlarını ve metinlerini "Yazı ile (Yalnız...TL'dir)" formatında tek tıkla kopyalama.
*   **Borç Yaşlandırma Analizi:** Hangi firmanın ne kadar süredir (1-12+ Ay) ödeme yapmadığını grafiksel olarak gösteren analiz ekranı.
*   **Masaüstü Veritabanı (EXE):** Windows uygulamasında veriler yerel diskte (`database.json`) güvenle saklanır, veri kaybı yaşanmaz.
*   **Otomatik Güncelleme:** Uygulama yeni sürümleri otomatik olarak denetler ve indirir.
*   **Excel Entegrasyonu:** Firmaları toplu içeri aktarma (Import) ve raporları dışarı aktarma (Export) özellikleri.

---

## 🛠️ Kullanılan Teknolojiler

*   **Core:** React 18, TypeScript, Hooks
*   **Desktop Engine:** Electron.js, Electron Updater, FS Async
*   **Styling:** Tailwind CSS (Dark Mode)
*   **Charts:** Recharts
*   **Data Handling:** XLSX (Excel), jsPDF (PDF Generation)

## 📦 Kurulum ve Çalıştırma

### 1. Gerekli Paketleri Yükleyin
```bash
npm install
```

### 2. Web Modunda Çalıştırma
```bash
npm start
```

### 3. Windows Uygulaması (.exe) Oluşturma
```bash
npm run electron:build
```

## 👤 Geliştirici

**Emin Sezgin**
*   [LinkedIn](https://www.linkedin.com/in/szgnemin)
*   [Instagram](https://www.instagram.com/szgn_emin/)
*   [GitHub](https://github.com/szgnemin1)

---
*Projede bazı sorunlar olabilir bunları düzeltmem için lütfen geri bildirim yapın eğer konu hakkında bilginiz varsa destek olun bu sayede sorunları daha hızlı düzeltebilirim*
*Bu proje profesyonel OSGB finans yönetimi için geliştirilmiştir.*
