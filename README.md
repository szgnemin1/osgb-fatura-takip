

<div align="center">
  
  <img src="public/logo.svg" alt="OSGB Pro Logo" width="120" height="120" />

  # 🏥 OSGB ProFinans v2.1.0

  **OSGB ve Hizmet Sektörü İçin Akıllı Finans & Hakediş Yönetimi**
  
  <p>
    Otomatik hakediş hesaplama, akıllı havuz yönetimi ve hibrit (offline/online) veri mimarisi ile<br>
    OSGB'lerin finansal süreçlerini dijitalleştiren profesyonel masaüstü uygulaması.
  </p>

  <p>
    <img src="https://img.shields.io/badge/v2.1.0-Stable-emerald?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/React-v18-blue?style=flat-square&logo=react" alt="React">
    <img src="https://img.shields.io/badge/Electron-Desktop-purple?style=flat-square&logo=electron" alt="Electron">
    <img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square" alt="License">
  </p>

</div>

---

## 🚀 Yeni Özellikler (v2.1.0)
*   **Otomatik Firewall Ayarı:** Kurulum sırasında Windows Güvenlik Duvarı'nda 5000. port otomatik olarak açılır. Artık manuel ayar yapmanıza gerek yok.
*   **Mobil Bağlantı:** Aynı Wi-Fi ağındaki telefonlarınızdan, ana bilgisayarın IP adresini girerek sisteme erişebilirsiniz.
*   **Gelişmiş Yedekleme:** Veri yapısı ve yedekleme sistemi optimize edildi.

---

## 👁️ Önizleme ve Galeri

Proje, kullanıcı dostu **Dark Mode** arayüzü ile tasarlanmıştır.

### 📸 Ekran Görüntüleri

| **Ana Kontrol Paneli (Dashboard)** | **Fatura Hazırlık Motoru** |
|:---:|:---:|
| <img src="https://via.placeholder.com/600x350/0f172a/FFFFFF?text=Dashboard+Görseli" alt="Dashboard" width="100%"> | <img src="https://via.placeholder.com/600x350/0f172a/FFFFFF?text=Fatura+Hesaplama" alt="Fatura Hazırlık" width="100%"> |
| *Anlık finansal durum, grafikler ve özetler* | *Sözleşme kurallarına göre otomatik hesaplama* |

| **Firma ve Sözleşme Yönetimi** | **Borç Takip ve Analiz** |
|:---:|:---:|
| <img src="https://via.placeholder.com/600x350/0f172a/FFFFFF?text=Firma+Yönetimi" alt="Firma Yönetimi" width="100%"> | <img src="https://via.placeholder.com/600x350/0f172a/FFFFFF?text=Borç+Yaşlandırma" alt="Borç Takip" width="100%"> |
| *Detaylı fiyatlandırma ve model ayarları* | *Gecikmiş ödemelerin risk analizi* |

---

## ✨ Temel Özellikler

*   **⚡ Akıllı Hesaplama Motoru:** Standart, Toleranslı veya Kademeli fiyatlandırma modellerini firmalara özel tanımlayın. Her ay çalışan sayısını girin, gerisini sisteme bırakın.
*   **🔗 Havuz (Şube) Sistemi:** Ana firma ve şubelerini birbirine bağlayın. Sistem tüm şubeleri hesaplayıp tek bir "Çatı Fatura" taslağı oluşturur.
*   **📊 Finansal Analiz:** Ciro, tahsilat ve açık hesap takibi. Borç yaşlandırma raporu ile riskli müşterileri (30, 60, 90+ gün) tespit edin.
*   **💾 Hibrit Veri Güvenliği:** 
    *   **Offline-First:** İnternet olmadan tam fonksiyonlu çalışır. Veriler yerel diskinizde şifreli saklanır.
    *   **Cloud Sync:** İsteğe bağlı Google Firebase entegrasyonu ile verilerinizi buluta yedekleyin.
*   **📄 Raporlama:** Tüm listeleri Excel veya PDF olarak dışa aktarın.

---

## 🚀 Kurulum ve Çalıştırma

Bu projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  **Projeyi İndirin:**
    ```bash
    git clone https://github.com/szgnemin1/osgb-fatura-takip.git
    cd osgb-fatura-takip
    ```

2.  **Gerekli Paketleri Yükleyin:**
    ```bash
    npm install
    ```

3.  **Geliştirici Modunda Başlatın:**
    Hem React arayüzünü hem de Electron penceresini aynı anda açar.
    ```bash
    npm run electron:dev
    ```

4.  **Kurulum Dosyası (.exe) Oluşturun:**
    ```bash
    npm run electron:build
    ```
    *Çıktı dosyası `dist/` klasöründe oluşturulacaktır.*

---

## 📞 Destek ve İletişim

Sorularınız, önerileriniz veya hata bildirimleri için uygulama içerisindeki **Destek** sayfasını kullanabilir veya doğrudan iletişime geçebilirsiniz.

**Geliştirici:** Emin Sezgin  
📧 [m.e.sezgin04@gmail.com](mailto:m.e.sezgin04@gmail.com)

---

<div align="center">
  <small>© 2024 OSGB ProFinans. Tüm hakları saklıdır.</small>
</div>