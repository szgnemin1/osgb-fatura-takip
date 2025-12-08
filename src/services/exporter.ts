
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exporter = {
  exportToExcel: (fileName: string, data: any[]) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Excel oluşturulurken bir hata oluştu.");
    }
  },

  exportAdvancedTemplate: () => {
    try {
      const workbook = XLSX.utils.book_new();

      // SAYFA 1: FİRMALAR
      const firmsData = [
        {
          "Firma Adı": "Örnek Standart A.Ş.",
          "Fatura Tipi": "E-Fatura",
          "Vergi No": "",
          "Adres": "",
          "Fiyatlandırma Modeli": "STANDART",
          "Taban Kişi": 10,
          "Taban Ücret": 1000,
          "Ekstra Kişi Ücreti": 50,
          "Tolerans Yüzdesi": 0,
          "Fiyatlar KDV Hariç mi?": "Hayır",
          "Başlangıç Borcu": 5000
        },
        {
          "Firma Adı": "Örnek Kademeli Ltd.",
          "Fatura Tipi": "E-Arşiv",
          "Vergi No": "1234567890",
          "Adres": "İstanbul...",
          "Fiyatlandırma Modeli": "KADEMELI",
          "Taban Kişi": 0,
          "Taban Ücret": 0,
          "Ekstra Kişi Ücreti": 100,
          "Tolerans Yüzdesi": 0,
          "Fiyatlar KDV Hariç mi?": "Evet",
          "Başlangıç Borcu": 0
        },
        {
            "Firma Adı": "Örnek Toleranslı A.Ş.",
            "Fatura Tipi": "E-Fatura",
            "Vergi No": "",
            "Adres": "",
            "Fiyatlandırma Modeli": "TOLERANSLI",
            "Taban Kişi": 50,
            "Taban Ücret": 10000,
            "Ekstra Kişi Ücreti": 200,
            "Tolerans Yüzdesi": 10,
            "Fiyatlar KDV Hariç mi?": "Hayır",
            "Başlangıç Borcu": 12000
          }
      ];
      const firmsSheet = XLSX.utils.json_to_sheet(firmsData);
      XLSX.utils.book_append_sheet(workbook, firmsSheet, "Firmalar");

      // SAYFA 2: KADEMELER (Aralıklar)
      const tiersData = [
        {
          "Firma Adı": "Örnek Kademeli Ltd.",
          "Min Kişi": 0,
          "Max Kişi": 10,
          "Fiyat": 5000,
          "Fiyat KDV Hariç mi?": "Evet"
        },
        {
          "Firma Adı": "Örnek Kademeli Ltd.",
          "Min Kişi": 11,
          "Max Kişi": 20,
          "Fiyat": 8000,
          "Fiyat KDV Hariç mi?": "Evet"
        }
      ];
      const tiersSheet = XLSX.utils.json_to_sheet(tiersData);
      XLSX.utils.book_append_sheet(workbook, tiersSheet, "Kademeler");

      XLSX.writeFile(workbook, "Gelismiş_Firma_Sablonu.xlsx");
    } catch (error) {
      console.error("Template export error", error);
      alert("Şablon oluşturulamadı.");
    }
  },

  exportToPDF: (title: string, columns: string[], data: any[], fileName: string) => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

      // Table
      (doc as any).autoTable({
        startY: 35,
        head: [columns],
        body: data,
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }, // Blue header
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: 'grid'
      });

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDF oluşturulurken bir hata oluştu.");
    }
  }
};
