import { jsPDF } from 'jspdf';
import { SurveyRecord, VillageResearchData } from '../types';

function verificationLabel(status?: string): string {
  if (status === 'verified') return 'TERVERIFIKASI RESMI';
  if (status === 'needs_review') return 'PERLU TINJAUAN DATA';
  return 'OBSERVASI LAPANGAN (BELUM DIVERIFIKASI RESMI)';
}

/**
 * Exports a single survey record to a structured, formal KKN Pringgasela Selatan PDF report.
 */
export function exportSurveyReportToPdf(survey: SurveyRecord): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Header Banner
  doc.setFillColor(40, 66, 48); // #284230
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DOKUMEN OBSERVASI & SURVEI LAPANGAN KKN', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur, NTB — KKN SPACE',
    margin,
    18
  );
  doc.text(
    `Kode Survei: ${survey.id.toUpperCase()} | Status: ${verificationLabel(survey.verificationStatus)}`,
    margin,
    23
  );

  y = 38;

  // Title
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(survey.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  // Metadata Box
  doc.setFillColor(246, 245, 240);
  doc.setDrawColor(213, 210, 200);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 107, 83);
  doc.text('INFORMASI PELAKSANAAN SURVEI', margin + 4, y + 6);

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kategori: ${survey.category}`, margin + 4, y + 13);
  doc.text(`Tanggal Survei: ${survey.date}`, margin + 95, y + 13);

  doc.text(`Dusun / Wilayah: ${survey.dusun || '-'}`, margin + 4, y + 19);
  doc.text(`Surveyor: ${survey.surveyor}`, margin + 95, y + 19);

  doc.text(`Objek Observasi: ${survey.objectObserved || survey.location}`, margin + 4, y + 25);
  doc.text(
    `Lokasi / Alamat: ${survey.addressDetail || survey.location}`,
    margin + 4,
    y + 31
  );
  doc.text(
    `Visibilitas: ${survey.isPubliclyApproved ? 'Disetujui Publik' : 'Internal Posko (Privat)'}`,
    margin + 115,
    y + 31
  );

  y += 42;

  const addSection = (heading: string, body: string) => {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 66, 48);
    doc.text(heading.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(204, 220, 208);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(45, 55, 72);
    const lines = doc.splitTextToSize(body || '-', contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  };

  addSection('1. Temuan & Hasil Observasi Lapangan', survey.findings);
  addSection(
    '2. Permasalahan Eksisting di Lokasi',
    survey.existingProblems || 'Belum ada rincian permasalahan spesifik yang dicatat.'
  );
  addSection(
    '3. Potensi & Peluang Pengembangan',
    survey.potentialOpportunities || 'Belum ada rincian peluang pengembangan yang dicatat.'
  );
  addSection(
    '4. Rekomendasi Tindak Lanjut & Tautan Program Kerja',
    `${survey.recommendations}\n\nProgram Kerja Terkait: ${
      survey.linkedProgramTitle || survey.linkedProgramId || 'Belum ditautkan ke Program Kerja'
    }`
  );

  if (survey.documents && survey.documents.length > 0) {
    const docList = survey.documents.map((d, i) => `${i + 1}. ${d.name} (${d.url})`).join('\n');
    addSection('5. Lampiran Dokumen & Referensi', docList);
  }

  // Disclaimer Footer
  const footerY = 280;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'Catatan Integritas Data: Dokumen ini dihasilkan dari basis data KKN SPACE Desa Pringgasela Selatan. Data berstatus Observasi Lapangan membutuhkan verifikasi resmi pemerintah desa sebelum dipublikasikan.',
    margin,
    footerY
  );

  const safeFilename = survey.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`laporan-survei-${safeFilename || survey.id}.pdf`);
}

/**
 * Exports a comprehensive summary PDF of all filtered survey records and village profile status.
 */
export function exportAllSurveysToPdf(
  surveys: SurveyRecord[],
  villageData: VillageResearchData
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Header
  doc.setFillColor(40, 66, 48);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REKAPITULASI RISET DESA & BASIS DATA SURVEI KKN', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${villageData.villageName}, Kec. ${villageData.kecamatan}, ${villageData.kabupaten}, ${villageData.province}`,
    margin,
    18
  );
  doc.text(
    `Total Rekaman Survei: ${surveys.length} Dokumen | Dicetak: ${new Date().toISOString().slice(0, 10)}`,
    margin,
    23
  );

  y = 36;

  // Village Summary Box
  doc.setFillColor(246, 245, 240);
  doc.setDrawColor(213, 210, 200);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 66, 48);
  doc.text('RINGKASAN PROFIL DESA PRINGGASELA SELATAN', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 55, 55);
  doc.text(
    `Jumlah Dusun Terpetakan: ${villageData.dusuns.length} Dusun | Status Profil: ${verificationLabel(
      villageData.verificationStatus
    )}`,
    margin + 4,
    y + 12
  );
  doc.text(
    `Populasi Resmi: ${
      villageData.totalPopulation !== null
        ? `${villageData.totalPopulation} Jiwa`
        : 'Menunggu Verifikasi Buku Induk Desa'
    } | KK Resmi: ${
      villageData.totalHouseholds !== null
        ? `${villageData.totalHouseholds} KK`
        : 'Menunggu Verifikasi'
    }`,
    margin + 4,
    y + 18
  );
  doc.text(`Elevasi & Geografi: ${villageData.elevation}`, margin + 4, y + 23);

  y += 34;

  // List each survey
  surveys.forEach((s, index) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 25, 23);
    const titleLines = doc.splitTextToSize(`${index + 1}. ${s.title}`, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5 + 1;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(74, 107, 83);
    doc.text(
      `[${s.category}] • Dusun: ${s.dusun || '-'} • Tanggal: ${s.date} • Surveyor: ${s.surveyor} • Status: ${verificationLabel(
        s.verificationStatus
      )}`,
      margin,
      y
    );
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(45, 55, 72);

    const findingLines = doc.splitTextToSize(`Temuan: ${s.findings}`, contentWidth);
    doc.text(findingLines, margin, y);
    y += findingLines.length * 4.2 + 1.5;

    if (s.existingProblems) {
      const probLines = doc.splitTextToSize(`Masalah: ${s.existingProblems}`, contentWidth);
      doc.text(probLines, margin, y);
      y += probLines.length * 4.2 + 1.5;
    }

    if (s.potentialOpportunities) {
      const oppLines = doc.splitTextToSize(`Potensi: ${s.potentialOpportunities}`, contentWidth);
      doc.text(oppLines, margin, y);
      y += oppLines.length * 4.2 + 1.5;
    }

    const recLines = doc.splitTextToSize(
      `Rekomendasi: ${s.recommendations} (Proker: ${
        s.linkedProgramTitle || s.linkedProgramId || 'Belum ditautkan'
      })`,
      contentWidth
    );
    doc.text(recLines, margin, y);
    y += recLines.length * 4.2 + 3;

    doc.setDrawColor(232, 230, 223);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
  });

  doc.save('rekapitulasi-riset-survei-pringgasela-selatan.pdf');
}
