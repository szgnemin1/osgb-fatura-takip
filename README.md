
# 🏥 OSGB Fatura & Finans Takip Sistemi (ProFinans)

Modern, güvenli ve kullanıcı dostu arayüzü ile OSGB (Ortak Sağlık Güvenlik Birimi) ve hizmet sektöründeki firmaların ön muhasebe, faturalandırma ve cari takip süreçlerini yöneten profesyonel React uygulaması.

Bu proje hem **Web Uygulaması** hem de **Windows Masaüstü Uygulaması (.exe)** olarak çalışabilmektedir.

![OSGB Dashboard Önizleme](https://via.placeholder.com/1200x600?text=OSGB+Fatura+Takip+Dashboard)

### 🔔 v1.4.6 Sürüm Notları (YENİ)

Bu sürümde uygulama dağıtımı ve raporlama altyapısında önemli geliştirmeler yapılmıştır:

1.  **🚀 Otomatik Güncelleme Sistemi (Auto-Update):**
    *   Uygulama artık GitHub üzerinden yeni sürümleri otomatik olarak denetler.
    *   Yeni bir güncelleme bulunduğunda arka planda indirilir ve kullanıcıya sağ alt köşede şık bir bildirim gösterilir.
    *   Tek tıkla yeniden başlatılarak güncelleme kurulur.

2.  **📅 Gelişmiş Tarih Filtreleme & Devreden Bakiye:**
    *   **Cari Detay (Ekstre)** sayfasına "Başlangıç" ve "Bitiş" tarih filtreleri eklendi.
    *   Seçilen başlangıç tarihinden önceki hareketler hesaplanarak listenin en başına **"DEVREDEN BAKİYE"** satırı olarak eklenir.
    *   Alt kısımdaki toplamlar ve "Genel Bakiye" artık seçili tarih aralığını ve devreden bakiyeyi dikkate alarak dinamik hesaplanır.

3.  **📊 Excel Raporlama İyileştirmeleri:**
    *   Firma ekstreleri Excel'e aktarılırken artık tarih aralığı başlıkta belirtilir.
    *   Devreden bakiye satırı Excel raporuna dahil edilerek muhasebe standartlarına uygun çıktı üretilir.

---

### ⭐ Genel Özellikler

*   **Dinamik Hakediş Hesaplama:** Çalışan sayısı, taban limit, ekstra kişi ücreti ve farklı fiyatlandırma modellerine (Standart, Toleranslı, Kademeli) göre otomatik fatura tutarı hesaplama.
*   **Çoklu Fiyatlandırma Modeli:** Her firma için farklı kurallar (Örn: 0-10 kişi sabit fiyat, 10-50 kişi kademeli fiyat vb.) tanımlayabilme.
*   **Fatura & Tahsilat Yönetimi:** Taslak fatura oluşturma, onaylama, manuel borç/alacak ekleme ve tahsilat takibi.
*   **Akıllı Kopyalama:** Fatura tutarlarını ve metinlerini "Yazı ile (Yalnız...TL'dir)" formatında tek tıkla kopyalama.
*   **Borç Yaşlandırma Analizi:** Hangi firmanın ne kadar süredir (1-12+ Ay) ödeme yapmadığını grafiksel olarak gösteren analiz ekranı.
*   **Masaüstü Veritabanı (EXE):** Windows uygulamasında veriler yerel diskte (`database.json`) güvenle saklanır, veri kaybı yaşanmaz.
*   **Bulut Yedekleme (Opsiyonel):** Google Firebase entegrasyonu ile verileri şifreli olarak buluta yedekleme ve farklı cihazlara aktarma imkanı.
*   **Excel Entegrasyonu:** Firmaları toplu içeri aktarma (Import) ve raporları dışarı aktarma (Export) özellikleri.

---

## 🛠️ Kullanılan Teknolojiler

*   **Core:** React 18, TypeScript, Hooks
*   **Styling:** Tailwind CSS (Dark Mode Optimized)
*   **Desktop Engine:** Electron.js, Electron Updater
*   **Charts:** Recharts
*   **Data Handling:** XLSX (Excel), jsPDF (PDF Generation)
*   **Icons:** Lucide React
*   **Deployment:** GitHub Releases (Auto Update)

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
Projeyi masaüstü uygulamasına çevirmek ve GitHub'a yayınlamak için:
```bash
npm run electron:build
```
*Bu işlem `dist/` klasöründe kurulum dosyasını oluşturur ve `electron-updater` yapılandırmasına göre GitHub Releases sayfasına taslak sürüm çıkarır.*

## 👤 Geliştirici

**Emin Sezgin**
*   [GitHub](https://github.com/szgnemin1)
*   [LinkedIn](https://www.linkedin.com/in/szgnemin)

---
*Bu proje açık kaynak lisansı ile paylaşılmıştır.*
