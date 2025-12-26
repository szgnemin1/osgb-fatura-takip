<div align="center">
  
  <!-- LOGO VEYA BANNER ALANI -->
  <!-- Buraya ileride projenin logosunu veya banner görselini ekleyebilirsin: -->
  <!-- <img src="docs/banner.png" alt="OSGB ProFinans Banner" width="100%" /> -->
  
  <img src="public/logo.svg" alt="Logo" width="100" height="100" />

  # 🏢 OSGB ProFinans
  
  **Yeni Nesil Ön Muhasebe, Hakediş ve Finans Yönetim Otomasyonu**
  
  <p>
    OSGB'ler ve çalışan sayısına dayalı hizmet veren firmalar için geliştirilmiş;<br>
    React ve Electron tabanlı, çevrimdışı çalışabilen masaüstü uygulaması.
  </p>

  <!-- ROZETLER -->
  <p>
    <img src="https://img.shields.io/badge/versiyon-1.5.0-blue.svg?style=flat-square" alt="Versiyon">
    <img src="https://img.shields.io/badge/lisans-MIT-green.svg?style=flat-square" alt="Lisans">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Mac-lightgrey.svg?style=flat-square" alt="Platform">
    <br>
    <img src="https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Electron-47848F.svg?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/Tailwind-38B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
  </p>
</div>

---

## 📸 Ekran Görüntüleri ve Önizleme

<!-- 
    NOT: Burası resim ve GIF'ler için ayrılmış alandır. 
    Projenin ekran görüntülerini aldığında 'docs' klasörüne atıp aşağıdaki linkleri güncelleyebilirsin.
-->

| **Genel Bakış (Dashboard)** | **Fatura Hazırlık & Havuz** |
|:---------------------------:|:---------------------------:|
| <img src="https://placehold.co/600x400/1e293b/FFF?text=Dashboard+Gorseli+Buraya" alt="Dashboard" width="100%"> | <img src="https://placehold.co/600x400/1e293b/FFF?text=Fatura+Hesaplama+Gorseli" alt="Fatura Modülü" width="100%"> |
| *Finansal durum, anlık ciro ve grafikler* | *Otomatik hakediş hesaplama ve havuz yönetimi* |

| **Borç Yaşlandırma Analizi** | **Ayarlar & Veri Yönetimi** |
|:----------------------------:|:---------------------------:|
| <img src="https://placehold.co/600x400/1e293b/FFF?text=Borc+Yaslandirma+Gorseli" alt="Borç Takip" width="100%"> | <img src="https://placehold.co/600x400/1e293b/FFF?text=Ayarlar+ve+Yedekleme" alt="Ayarlar" width="100%"> |
| *Riskli bakiyelerin zaman bazlı analizi* | *Excel import/export ve Bulut yedekleme* |

---

## 🚀 Temel Özellikler

### ⚡ Akıllı Hakediş Motoru
Excel tablolarıyla uğraşmaya son. Sözleşme kurallarını bir kez girin, sistem her ay çalışan sayısına göre faturayı otomatik hesaplasın.
*   **Standart Model:** Limit aşımına göre ek ücret.
*   **Toleranslı Model:** Belirli % sapmalara kadar sabit fiyat.
*   **Kademeli (Tiered) Model:** (0-50 kişi arası X TL, 51-100 arası Y TL).

### 🔗 Gelişmiş Havuz (Şube) Yönetimi
Dağınık şubeleri olan müşterilerinizi tek çatı altında toplayın.
*   Şubelerin çalışan sayılarını ayrı ayrı girin.
*   Sistem, tüm şubeleri **Ana Firma** altında otomatik birleştirir.
*   Tek tıkla konsolide fatura oluşturur.

### 📉 Borç Yaşlandırma (Debt Aging)
Tahsilat riskini minimize edin.
*   Hangi firma ne kadar süredir ödeme yapmıyor? (1-12 Ay Analizi)
*   Riskli firmaları renk kodlarıyla (Kırmızı/Turuncu) görselleştirin.

### ☁️ Hibrit Veri Mimarisi (Offline-First)
*   **Tamamen Yerel:** İnternet olmasa bile çalışır. Veriler `localStorage` ve dosya sisteminde şifreli tutulur.
*   **Bulut Senkronizasyon:** İsterseniz **Google Firebase** entegrasyonu ile verilerinizi ofis ve ev arasında eşitleyebilirsiniz.

---

## 🛠️ Kurulum ve Geliştirme

Projeyi bilgisayarınıza klonlayıp geliştirmeye başlamak için:

```bash
# 1. Repoyu klonlayın
git clone https://github.com/kullaniciadi/osgb-profinans.git

# 2. Proje dizinine girin
cd osgb-profinans

# 3. Bağımlılıkları yükleyin
npm install

# 4. Geliştirme modunda başlatın (Web + Electron)
npm run electron:dev
```

### 📦 Exe Olarak Derleme (Build)

Windows için kurulabilir `.exe` dosyası oluşturmak için:

```bash
npm run electron:build
```
*Çıktı dosyası `dist/` klasöründe oluşacaktır.*

---

## 🤝 Katkıda Bulunma

1.  Bu repoyu Forklayın.
2.  Yeni bir özellik dalı (feature branch) oluşturun (`git checkout -b feature/YeniOzellik`).
3.  Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalı Pushlayın (`git push origin feature/YeniOzellik`).
5.  Bir Pull Request oluşturun.

---

## 📞 İletişim & Destek

Uygulama içerisindeki **Destek** menüsünden sistem bilgilerinizi otomatik analiz ederek hata raporu gönderebilirsiniz.

**Geliştirici:** Emin Sezgin
