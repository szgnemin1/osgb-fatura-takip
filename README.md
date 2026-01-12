
<div align="center">
  
  <img src="public/logo.svg" alt="OSGB Pro Logo" width="120" height="120" />

  # 🏥 OSGB ProFinans v2.1.0

  **OSGB ve Hizmet Sektörü İçin Hibrit Finans & Hakediş Yönetim Platformu**
  
  <p>
    Otomatik hakediş hesaplama, akıllı havuz yönetimi, kademeli fiyatlandırma ve <br>
    <strong>Masaüstü + Mobil</strong> hibrit çalışma mimarisi ile OSGB'lerin finansal süreçlerini dijitalleştiren profesyonel çözüm.
  </p>

  <p>
    <img src="https://img.shields.io/badge/v2.1.0-Stable-emerald?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/React-v18-blue?style=flat-square&logo=react" alt="React">
    <img src="https://img.shields.io/badge/Electron-Desktop-purple?style=flat-square&logo=electron" alt="Electron">
    <img src="https://img.shields.io/badge/Offline-First-orange?style=flat-square" alt="Architecture">
  </p>

</div>

---

## 🌟 Öne Çıkan Özellikler (v2.1.0)

### 1. 📱 Hibrit Veri Mimarisi (Masaüstü & Mobil)
*   **Ana Makine (Host):** Windows bilgisayarınızda `.exe` olarak çalışır ve veritabanını (`JSON`) yerel diskte tutar.
*   **Mobil Erişim:** Aynı Wi-Fi ağındaki telefon veya tabletlerden, ana makinenin IP adresi üzerinden sisteme bağlanabilirsiniz.
*   **Canlı Senkronizasyon:** Masaüstünde yapılan bir değişiklik anında mobilde, mobilde yapılan bir tahsilat anında masaüstünde görünür.

### 2. 💰 Gelişmiş Fiyatlandırma Motoru
Her firma için farklı sözleşme modelleri tanımlayabilirsiniz:
*   **Standart Model:** Taban Ücret + (Kişi Başı Ekstra * Aşım Miktarı).
*   **Toleranslı Model:** Belirli bir yüzdeliğe (%10, %20) kadar artışları faturaya yansıtmaz.
*   **Kademeli (Tiered) Model:** Çalışan sayısına göre otomatik fiyat bandı belirler (Örn: 0-10 kişi 5000TL, 11-20 kişi 8000TL).

### 3. 🔗 Havuz (Şube) Sistemi
*   Ana firma ve şubelerini birbirine bağlayın.
*   Sistem tüm şubelerin çalışan sayılarını analiz eder, toplam bakiyeyi ve hakedişi tek bir merkezden yönetmenizi sağlar.

### 4. 📊 Finansal Zeka
*   **Hakediş Dağılımı:** Kesilen faturanın ne kadarının Uzman, ne kadarının Hekim payı olduğunu otomatik hesaplar.
*   **Borç Yaşlandırma:** Ödeme yapmayan firmaları 30, 60, 90+ gün bazında analiz eder.
*   **Akıllı Ekstre:** WhatsApp üzerinden tek tıkla paylaşılabilir "Yazı ile Bakiye" metni oluşturur.

### 5. 🛡️ Güvenlik ve Yedekleme
*   **Offline-First:** İnternet kesilse bile çalışmaya devam eder.
*   **Otomatik Firewall:** Windows Güvenlik Duvarı ayarlarını (Port 5000) otomatik yapılandırır.
*   **Bulut Yedekleme:** İsteğe bağlı Google Firebase entegrasyonu ile verileri şifreli olarak buluta yedekler.

---

## 🛠️ Teknik Altyapı

Bu proje modern web teknolojileri ile masaüstü uygulama yeteneklerini birleştirir:

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Backend / Runtime:** Electron.js, Node.js (Express Server for Mobile Sync)
*   **Veritabanı:** LowDB mantığında çalışan, şifreli yerel JSON dosya sistemi.
*   **Raporlama:** `xlsx` (Excel Export) ve `jspdf` (PDF Export).

---

## 🚀 Kurulum ve Geliştirme

Projeyi bilgisayarınıza klonlayın ve geliştirici modunda başlatın:

```bash
# Repoyu klonla
git clone https://github.com/szgnemin1/osgb-fatura-takip.git
cd osgb-fatura-takip

# Bağımlılıkları yükle
npm install

# Geliştirici modunda başlat (React + Electron)
npm run electron:dev

# Windows için .exe oluştur
npm run electron:build
```

---

## 📁 Proje Yapısı

```
osgb-fatura-takip/
├── public/
│   ├── electron.js       # Electron Ana Süreç ve Mobil Sunucu
│   └── logo.svg          # Uygulama Logosu
├── src/
│   ├── components/       # UI Bileşenleri (Sidebar, Kartlar)
│   ├── pages/            # Ana Sayfalar (Dashboard, Fatura, Firma)
│   ├── services/         # Veritabanı ve Bulut Servisleri
│   └── types.ts          # TypeScript Veri Tanımları
├── AI_DEVELOPER_GUIDE.md # Yapay Zeka Geliştirici Rehberi
└── package.json          # Proje Konfigürasyonu
```

---

## 📞 İletişim

Sorularınız, önerileriniz veya hata bildirimleri için:

**Geliştirici:** Emin Sezgin  
📧 [m.e.sezgin04@gmail.com](mailto:m.e.sezgin04@gmail.com)

---

<div align="center">
  <small>© 2024 OSGB ProFinans. MIT Lisansı ile sunulmuştur.</small>
</div>
