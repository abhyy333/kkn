import React, { useState } from 'react';
import { ReportRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
  MessageSquare,
  Check,
} from 'lucide-react';

interface ReportsViewProps {
  reports: ReportRecord[];
  onAddReport: (report: ReportRecord) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ reports, onAddReport }) => {
  const { canWrite, isDpl } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewReportId, setReviewReportId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReportRecord['type']>('Laporan Mingguan');
  const [author, setAuthor] = useState('Mulia Oktaviani (Sekretaris)');
  const [period, setPeriod] = useState('29 Juli - 04 Agustus 2026');

  const handleDplReview = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      setReviewReportId(reportId);
      setReviewNote(report.dplNotes || '');
    }
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewReportId) return;
    const target = reports.find((r) => r.id === reviewReportId);
    if (target) {
      target.dplNotes = reviewNote;
      target.status = 'approved_by_dpl';
    }
    setReviewReportId(null);
  };


  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newReport: ReportRecord = {
      id: `rep-${Date.now()}`,
      title,
      type,
      author,
      period,
      submissionDate: new Date().toISOString().slice(0, 10),
      status: 'submitted',
      dplNotes: 'Menunggu peninjauan DPL.',
      fileSize: '4.2 MB',
    };

    onAddReport(newReport);
    setIsModalOpen(false);
    setTitle('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Report">
              📝
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Reports & Laporan Kemajuan DPL
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Kompilasi Laporan Mingguan, draf Laporan Pertanggungjawaban (LPJ) Akhir, catatan evaluasi DPL, dan logbook kegiatan.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Laporan Baru</span>
          </button>
        )}
      </div>

      {/* Logbook Quick Stat */}
      <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <span className="font-semibold text-stone-900 block">
            Status Logbook Harian Mahasiswa: 100% Terverifikasi
          </span>
          <p className="text-stone-600 text-[11px]">
            Seluruh 10 mahasiswa tim KKN telah mengisi aktivitas harian posko hingga Hari ke-18. Telah siap ditandatangani saat Monev luring.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-stone-600 font-medium">Supervisi Akademik: Dr. Lalu Syamsuddin, M.Si. (DPL)</span>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4A6B53]" />
                <span className="text-xs font-semibold text-stone-700">{report.type}</span>
                <span className="text-stone-300">·</span>
                <span className="text-xs text-stone-500">{report.period}</span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {report.status === 'approved_by_dpl' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#284230] bg-[#EBF1ED] px-2 py-0.5 rounded border border-[#CCDCD0]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Disetujui DPL</span>
                  </span>
                )}
                {report.status === 'submitted' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Menunggu Review</span>
                  </span>
                )}
                {report.status === 'draft' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    <span>Draf Pengerjaan</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif text-base font-semibold text-stone-900 leading-snug">
                  {report.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-stone-500 pt-1">
                  <span>Penyusun: {report.author}</span>
                  <span>·</span>
                  <span>Diserahkan: {report.submissionDate}</span>
                  <span>·</span>
                  <span>Ukuran: {report.fileSize}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDpl && (
                  <button
                    onClick={() => handleDplReview(report.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                    title="Beri Masukan / Evaluasi Catatan DPL"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Evaluasi DPL</span>
                  </button>
                )}
                <button
                  onClick={() => alert(`Mengunduh file: ${report.title}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C8] hover:bg-[#FAF9F5] text-stone-700 text-xs font-medium self-start shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5 text-stone-500" />
                  <span>Unduh PDF</span>
                </button>
              </div>
            </div>

            {/* DPL Notes feedback */}
            {report.dplNotes && (
              <div className="p-3 rounded-md bg-[#FAF9F5] border border-[#EBE8E1] text-xs text-stone-700 flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-stone-800 block text-[11px]">
                    Catatan Evaluasi DPL (Dr. Lalu Syamsuddin, M.Si.):
                  </span>
                  <p className="leading-relaxed text-stone-600">{report.dplNotes}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Submit Laporan Progres
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Dokumen Laporan</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Laporan Kemajuan Mingguan Minggu ke-5"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Jenis Laporan</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ReportRecord['type'])}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                >
                  <option value="Laporan Mingguan">Laporan Mingguan</option>
                  <option value="Logbook Harian">Logbook Harian</option>
                  <option value="Laporan Antara">Laporan Antara</option>
                  <option value="Draft Akhir LPJ">Draft Akhir LPJ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Periode</label>
                  <input
                    type="text"
                    required
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="29 Juli - 04 Ags 2026"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Penyusun</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Kirim ke DPL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DPL Review & Evaluation Modal */}
      {reviewReportId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Evaluasi & Catatan Supervisi DPL
                </h3>
                <span className="text-[11px] text-stone-500">
                  Dr. Lalu Syamsuddin, M.Si.
                </span>
              </div>
              <button
                onClick={() => setReviewReportId(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Catatan Evaluasi / Rekomendasi Lapangan
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Berikan masukan terkait luaran program kerja, akurasi data survei, atau kelengkapan dokumentasi posko..."
                  className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReviewReportId(null)}
                  className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Catatan & Setujui</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
