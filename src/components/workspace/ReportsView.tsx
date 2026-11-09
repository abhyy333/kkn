import React, { useState } from 'react';
import { ReportRecord, UploadedFileMetadata, ReportDocumentVersion, ReportRevisionEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { FileUploader } from '../common/FileUploader';
import { triggerFileDownload } from '../../utils/storageService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  FileDown,
  MessageSquare,
  AlertCircle,
  Eye,
  History,
  Send,
  Upload,
  Layers,
  X,
  FileCode,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ReportsViewProps {
  reports: ReportRecord[];
  onAddReport: (report: ReportRecord) => void;
  onUpdateReport?: (report: ReportRecord) => void;
}

export type ReportsTab = 'dashboard' | 'my-reports' | 'create' | 'revisions';

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  onAddReport,
  onUpdateReport,
}) => {
  const { canWrite, isDpl, user, profile } = useAuth();
  const { confirm, notify } = useConfirm();

  const [activeTab, setActiveTab] = useState<ReportsTab>('dashboard');

  // Detail Modal
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReportRecord['type']>('Laporan Mingguan');
  const [period, setPeriod] = useState('Minggu ke-5 (29 Juli - 04 Ags 2026)');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileMetadata | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revision Re-upload Modal State
  const [revisingReport, setRevisingReport] = useState<ReportRecord | null>(null);
  const [revisionFile, setRevisionFile] = useState<UploadedFileMetadata | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionError, setRevisionError] = useState('');

  // Author details
  const currentAuthorName = profile?.displayName || user?.email || 'Mahasiswa KKN';

  // Derived filters
  const myReports = reports.filter(
    (r) =>
      r.author.toLowerCase().includes(currentAuthorName.toLowerCase()) ||
      r.author.toLowerCase().includes(user?.email?.toLowerCase() || '')
  );

  const pendingReports = reports.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'resubmitted'
  );

  const approvedReports = reports.filter(
    (r) => r.status === 'approved' || r.status === 'approved_by_dpl'
  );

  const revisionRequestedReports = reports.filter(
    (r) => r.status === 'revision_requested' || r.status === 'revision_required' || r.status === 'rejected'
  );

  const draftReports = reports.filter((r) => r.status === 'draft');

  // Create & Submit / Save Draft
  const handleSaveOrSubmit = async (isDraftMode: boolean) => {
    setFormError('');

    if (!title.trim()) {
      setFormError('Judul dokumen laporan wajib diisi.');
      return;
    }

    if (!uploadedFile && !isDraftMode) {
      setFormError('Silakan unggah berkas dokumen laporan (PDF / DOCX) dari perangkat terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    const reportId = `rep-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const submissionDate = nowIso.slice(0, 10);

    const initialVersion: ReportDocumentVersion = {
      version: 1,
      url: uploadedFile?.url || '',
      name: uploadedFile?.name || `${title}.pdf`,
      storagePath: uploadedFile?.storagePath || '',
      uploadedAt: nowIso,
      uploadedBy: currentAuthorName,
    };

    const initialRevision: ReportRevisionEntry = {
      version: 1,
      status: isDraftMode ? 'draft' : 'submitted',
      comments: isDraftMode ? 'Disimpan sebagai draf laporan' : 'Diserahkan ke DPL untuk evaluasi pertama',
      timestamp: nowIso,
    };

    const newReport: ReportRecord = {
      id: reportId,
      title: title.trim(),
      type,
      author: currentAuthorName,
      period: period.trim(),
      submissionDate,
      status: isDraftMode ? 'draft' : 'submitted',
      dplNotes: isDraftMode ? undefined : 'Menunggu peninjauan DPL.',
      fileSize: uploadedFile?.sizeFormatted || '1.8 MB',
      fileUrl: uploadedFile?.url || '',
      fileName: uploadedFile?.name || `${title}.pdf`,
      storagePath: uploadedFile?.storagePath || '',
      revisionHistory: [initialRevision],
      documentVersions: [initialVersion],
    };

    try {
      // Sync with Supabase table if available
      if (isSupabaseConfigured) {
        try {
          await supabase.from('report_submissions').insert({
            id: reportId,
            title: title.trim(),
            type,
            submitter_name: currentAuthorName,
            period: period.trim(),
            status: isDraftMode ? 'draft' : 'submitted',
            file_name: uploadedFile?.name || null,
            file_url: uploadedFile?.url || null,
            file_size: uploadedFile?.sizeFormatted || null,
            storage_path: uploadedFile?.storagePath || null,
          });

          if (uploadedFile) {
            await supabase.from('report_versions').insert({
              report_id: reportId,
              version_number: 1,
              file_name: uploadedFile.name,
              file_url: uploadedFile.url,
              file_size: uploadedFile.sizeFormatted,
              storage_path: uploadedFile.storagePath,
              uploaded_by: currentAuthorName,
            });
          }
        } catch (dbErr) {
          console.warn('Supabase DB insert warning (continuing local sync):', dbErr);
        }
      }

      onAddReport(newReport);

      notify({
        type: 'success',
        title: isDraftMode ? 'Draf Laporan Disimpan' : 'Laporan Berhasil Diserahkan',
        message: isDraftMode
          ? `Dokumen "${title}" berhasil disimpan sebagai draf.`
          : `Dokumen "${title}" telah diserahkan ke DPL untuk evaluasi supervisi.`,
      });

      // Reset form
      setTitle('');
      setUploadedFile(null);
      setActiveTab('my-reports');
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan laporan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revising & Re-uploading document
  const handleOpenRevisionModal = (report: ReportRecord) => {
    setRevisingReport(report);
    setRevisionFile(null);
    setRevisionNotes('');
    setRevisionError('');
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingReport) return;

    if (!revisionFile) {
      setRevisionError('Silakan unggah berkas revisi dokumen baru terlebih dahulu.');
      return;
    }

    const currentVersions = revisingReport.documentVersions || [];
    const newVersionNumber = currentVersions.length + 1;
    const nowIso = new Date().toISOString();

    const newVersionItem: ReportDocumentVersion = {
      version: newVersionNumber,
      url: revisionFile.url,
      name: revisionFile.name,
      storagePath: revisionFile.storagePath,
      uploadedAt: nowIso,
      uploadedBy: currentAuthorName,
    };

    const newRevisionLog: ReportRevisionEntry = {
      version: newVersionNumber,
      status: 'resubmitted',
      comments: revisionNotes.trim() || `Revisi ke-${newVersionNumber} diserahkan kembali oleh mahasiswa`,
      timestamp: nowIso,
    };

    const updatedReport: ReportRecord = {
      ...revisingReport,
      status: 'submitted',
      dplNotes: 'Laporan hasil revisi telah diserahkan kembali ke DPL.',
      fileUrl: revisionFile.url,
      fileName: revisionFile.name,
      fileSize: revisionFile.sizeFormatted || '2.0 MB',
      storagePath: revisionFile.storagePath,
      documentVersions: [...currentVersions, newVersionItem],
      revisionHistory: [...(revisingReport.revisionHistory || []), newRevisionLog],
    };

    try {
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('report_submissions')
            .update({
              status: 'submitted',
              dpl_notes: 'Laporan hasil revisi telah diserahkan kembali ke DPL.',
              file_url: revisionFile.url,
              file_name: revisionFile.name,
              file_size: revisionFile.sizeFormatted,
              storage_path: revisionFile.storagePath,
              updated_at: nowIso,
            })
            .eq('id', revisingReport.id);

          await supabase.from('report_versions').insert({
            report_id: revisingReport.id,
            version_number: newVersionNumber,
            file_name: revisionFile.name,
            file_url: revisionFile.url,
            file_size: revisionFile.sizeFormatted,
            storage_path: revisionFile.storagePath,
            notes: revisionNotes.trim() || null,
            uploaded_by: currentAuthorName,
          });
        } catch (dbErr) {
          console.warn('Supabase DB revision update warning:', dbErr);
        }
      }

      if (onUpdateReport) {
        onUpdateReport(updatedReport);
      } else {
        onAddReport(updatedReport);
      }

      notify({
        type: 'success',
        title: 'Berkas Revisi Berhasil Diunggah',
        message: `Versi v${newVersionNumber} untuk "${revisingReport.title}" telah diserahkan kembali ke DPL.`,
      });

      setRevisingReport(null);
    } catch (err: any) {
      setRevisionError(err?.message || 'Gagal mengunggah berkas revisi.');
    }
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
              Manajemen Laporan Mahasiswa & Supervisi DPL
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Pusat pengelolaan Laporan Harian, Laporan Mingguan, Laporan Kegiatan, LPJ Akhir KKN, dan Riwayat Revisi DPL.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat & Submit Laporan</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E6DF] overflow-x-auto pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
            activeTab === 'dashboard'
              ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Dashboard Laporan</span>
        </button>

        <button
          onClick={() => setActiveTab('my-reports')}
          className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
            activeTab === 'my-reports'
              ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Semua Laporan ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('revisions')}
          className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
            activeTab === 'revisions'
              ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Permintaan Revisi ({revisionRequestedReports.length})</span>
        </button>

        {canWrite && (
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'create'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Laporan Baru</span>
          </button>
        )}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
              <span className="text-stone-400 text-xs">Total Laporan</span>
              <div className="font-serif text-2xl font-bold text-stone-900">{reports.length}</div>
              <span className="text-[11px] text-stone-500 block">Termasuk draf & versi revisi</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
              <span className="text-amber-700 text-xs font-medium">Menunggu Review DPL</span>
              <div className="font-serif text-2xl font-bold text-amber-900">{pendingReports.length}</div>
              <span className="text-[11px] text-stone-500 block">Dalam antrean supervisi</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
              <span className="text-emerald-700 text-xs font-medium">Laporan Disetujui</span>
              <div className="font-serif text-2xl font-bold text-[#4A6B53]">{approvedReports.length}</div>
              <span className="text-[11px] text-stone-500 block">Tervalidasi dosen pembimbing</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
              <span className="text-red-700 text-xs font-medium">Memerlukan Revisi</span>
              <div className="font-serif text-2xl font-bold text-red-900">{revisionRequestedReports.length}</div>
              <span className="text-[11px] text-stone-500 block">Perlu unggah ulang berkas</span>
            </div>
          </div>

          {/* Quick List: Reports Pending DPL Feedback */}
          <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Ringkasan Laporan Terbaru
                </h3>
                <p className="text-xs text-stone-500">
                  Daftar laporan berkala yang dikirimkan ke DPL beserta status kelengkapan.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('my-reports')}
                className="text-xs font-semibold text-[#4A6B53] hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {reports.slice(0, 5).map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-lg border border-[#E8E6DF] bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">{rep.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-stone-200/70 text-stone-700">
                        {rep.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Penyusun: <strong className="text-stone-700">{rep.author}</strong> · Tanggal: {rep.submissionDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rep.status === 'approved_by_dpl' || rep.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Disetujui DPL</span>
                      </span>
                    ) : rep.status === 'revision_requested' || rep.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Perlu Revisi</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Review</span>
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="p-1.5 rounded border border-stone-300 hover:bg-stone-100 text-stone-600"
                      title="Lihat Detail & Riwayat Revisi"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL / MY REPORTS LIST */}
      {activeTab === 'my-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
            <span>Menampilkan total {reports.length} laporan posko KKN</span>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4A6B53]" />
                    <span className="text-xs font-semibold text-stone-700">{report.type}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-500">{report.period}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(report.status === 'approved_by_dpl' || report.status === 'approved') && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#284230] bg-[#EBF1ED] px-2.5 py-0.5 rounded-full border border-[#CCDCD0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Disetujui DPL</span>
                      </span>
                    )}
                    {report.status === 'submitted' && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Menunggu Review DPL</span>
                      </span>
                    )}
                    {(report.status === 'revision_requested' || report.status === 'rejected') && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-red-800 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Revisi Diminta</span>
                      </span>
                    )}
                    {report.status === 'draft' && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
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
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500 pt-1">
                      <span>Penyusun: {report.author}</span>
                      <span>·</span>
                      <span>Tgl Kirim: {report.submissionDate}</span>
                      <span>·</span>
                      <span>Ukuran: {report.fileSize}</span>
                      {report.fileName && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[#4A6B53]">{report.fileName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-500" />
                      <span>Detail & Versi</span>
                    </button>

                    {(report.status === 'revision_requested' || report.status === 'rejected') && canWrite && (
                      <button
                        onClick={() => handleOpenRevisionModal(report)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 text-xs font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Revisi</span>
                      </button>
                    )}

                    {report.fileUrl && (
                      <button
                        onClick={() =>
                          triggerFileDownload(report.fileUrl, report.fileName || `${report.title}.pdf`)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C8] hover:bg-[#FAF9F5] text-stone-700 text-xs font-medium"
                      >
                        <FileDown className="w-3.5 h-3.5 text-stone-500" />
                        <span>Unduh PDF</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* DPL Notes feedback */}
                {report.dplNotes && (
                  <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#EBE8E1] text-xs text-stone-700 flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-stone-800 block text-[11px]">
                        Catatan Arahan Evaluasi DPL (Lalu Muhammad Aby Dujana, M.Si.):
                      </span>
                      <p className="leading-relaxed text-stone-600">{report.dplNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REVISIONS TAB */}
      {activeTab === 'revisions' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-lg font-medium text-stone-900">
              Dokumen Memerlukan Revisi DPL ({revisionRequestedReports.length})
            </h2>
            <p className="text-xs text-stone-500">
              Unggah ulang berkas laporan yang telah diperbaiki sesuai arahan dan masukan DPL.
            </p>
          </div>

          {revisionRequestedReports.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-[#E8E6DF] text-center text-xs text-stone-500">
              Tidak ada laporan yang saat ini memerlukan revisi. Semua laporan telah disetujui atau dalam antrean review.
            </div>
          ) : (
            <div className="space-y-4">
              {revisionRequestedReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-xl bg-white border border-amber-200 bg-amber-50/10 shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                    <span className="font-semibold text-stone-900 text-sm">{rep.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      {rep.status === 'rejected' ? 'Ditolak' : 'Minta Revisi'}
                    </span>
                  </div>

                  <p className="text-stone-600">
                    Penyusun: <strong>{rep.author}</strong> · Periode: {rep.period}
                  </p>

                  {rep.dplNotes && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                      <span className="font-semibold block text-[11px]">Catatan DPL:</span>
                      <p className="italic">{rep.dplNotes}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenRevisionModal(rep)}
                      className="px-4 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Berkas Revisi Baru</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CREATE REPORT FORM */}
      {activeTab === 'create' && (
        <div className="p-6 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-6 max-w-2xl mx-auto">
          <div className="pb-3 border-b border-stone-100">
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              Buat Dokumen Laporan Baru
            </h3>
            <p className="text-xs text-stone-500">
              Unggah berkas dokumen dari perangkat (PDF/Word) lalu simpan sebagai draf atau langsung kirimkan ke DPL.
            </p>
          </div>

          {formError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <FileUploader
              folder="reports"
              accept="document"
              multiple={false}
              label="Unggah Berkas Laporan dari Perangkat (PDF / DOCX) *"
              helperText="Pilih berkas dari komputer atau smartphone (Maksimum 20MB)"
              files={uploadedFile ? [uploadedFile] : []}
              onChange={(files) => {
                const first = files[0] || null;
                setUploadedFile(first);
                setFormError('');
                if (first && !title.trim()) {
                  setTitle(first.name.replace(/\.[^/.]+$/, ''));
                }
              }}
            />

            <div className="space-y-1">
              <label className="font-medium text-stone-700">Judul Dokumen Laporan *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Laporan Kemajuan Mingguan Minggu ke-5 Posko Pringgasela"
                className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-stone-700">Jenis Laporan *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportRecord['type'])}
                className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              >
                <option value="Laporan Harian">Laporan Harian</option>
                <option value="Laporan Mingguan">Laporan Mingguan</option>
                <option value="Laporan Kegiatan / Program Kerja">Laporan Kegiatan / Program Kerja</option>
                <option value="Laporan Akhir KKN">Laporan Akhir KKN</option>
                <option value="Dokumen Pendukung">Dokumen Pendukung</option>
                <option value="Logbook Harian">Logbook Harian</option>
                <option value="Laporan Antara">Laporan Antara</option>
                <option value="Draft Akhir LPJ">Draft Akhir LPJ</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-stone-700">Periode Laporan</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Minggu ke-5 (29 Juli - 04 Ags 2026)"
                className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-stone-700">Penyusun / Mahasiswa Penanggung Jawab</label>
              <input
                type="text"
                disabled
                value={currentAuthorName}
                className="w-full px-3 py-2 rounded-md border border-stone-200 bg-stone-100 text-stone-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActiveTab('my-reports')}
                className="px-4 py-2 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmit(true)}
                className="px-4 py-2 rounded-md border border-[#4A6B53] text-[#284230] font-medium hover:bg-[#EBF1ED]"
              >
                Simpan Draf
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmit(false)}
                className="px-5 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Memproses...' : 'Kirimkan ke DPL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL REPORT & VERSION HISTORY MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4A6B53]">
                  {selectedReport.type}
                </span>
                <h3 className="font-serif text-lg font-semibold text-stone-900 leading-snug">
                  {selectedReport.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <div>
                <span className="text-stone-400 text-[10px] block">Penyusun</span>
                <span className="font-medium text-stone-800">{selectedReport.author}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Tanggal Penyerahan</span>
                <span className="font-medium text-stone-800">{selectedReport.submissionDate}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Periode</span>
                <span className="font-medium text-stone-800">{selectedReport.period}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Status Evaluasi DPL</span>
                <span className="font-semibold text-stone-900 capitalize">
                  {selectedReport.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* DPL Notes */}
            {selectedReport.dplNotes && (
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-semibold text-[#4A6B53] text-[11px] block">
                  Catatan Evaluasi DPL:
                </span>
                <p className="text-stone-700 leading-relaxed italic">{selectedReport.dplNotes}</p>
              </div>
            )}

            {/* Document Versions */}
            <div className="space-y-2 pt-2">
              <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#4A6B53]" />
                <span>Riwayat Berkas & Versi Dokumen ({selectedReport.documentVersions?.length || 1})</span>
              </h4>

              <div className="space-y-2">
                {(selectedReport.documentVersions || [
                  {
                    version: 1,
                    url: selectedReport.fileUrl || '',
                    name: selectedReport.fileName || `${selectedReport.title}.pdf`,
                    uploadedAt: selectedReport.submissionDate,
                    uploadedBy: selectedReport.author,
                  },
                ]).map((ver, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[#E8E6DF] bg-stone-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#4A6B53]">v{ver.version}</span>
                        <span className="font-medium text-stone-800">{ver.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 block">
                        Diunggah: {ver.uploadedAt} oleh {ver.uploadedBy || selectedReport.author}
                      </span>
                    </div>

                    {ver.url && (
                      <button
                        onClick={() => triggerFileDownload(ver.url, ver.name)}
                        className="px-2.5 py-1 rounded border border-stone-300 hover:bg-white text-stone-700 text-[11px] font-medium flex items-center gap-1"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Revision Log Timeline */}
            {selectedReport.revisionHistory && selectedReport.revisionHistory.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#4A6B53]" />
                  <span>Jejak Audit Revisi & Evaluasi</span>
                </h4>

                <div className="space-y-2 pl-3 border-l-2 border-[#4A6B53]">
                  {selectedReport.revisionHistory.map((rev, idx) => (
                    <div key={idx} className="space-y-0.5 text-[11px]">
                      <div className="flex items-center justify-between text-stone-500">
                        <span>
                          Versi v{rev.version} — Status: <strong className="text-stone-800 capitalize">{rev.status.replace('_', ' ')}</strong>
                        </span>
                        <span className="font-mono text-[10px]">
                          {new Date(rev.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {rev.comments && (
                        <p className="text-stone-700 italic bg-stone-50 p-2 rounded border border-stone-200/60">
                          "{rev.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISION RE-UPLOAD MODAL */}
      {revisingReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Unggah Berkas Revisi Laporan
              </h3>
              <button
                onClick={() => setRevisingReport(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="space-y-4">
              {revisionError && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{revisionError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <span className="font-semibold block text-[11px]">Dokumen: {revisingReport.title}</span>
                <p className="italic text-[11px]">Catatan DPL: {revisingReport.dplNotes || 'Silakan sesuaikan dokumen.'}</p>
              </div>

              <FileUploader
                folder="reports"
                accept="document"
                multiple={false}
                label="Unggah Berkas Revisi Baru (PDF / DOCX) *"
                helperText="Versi terbaru dokumen yang telah diperbaiki"
                files={revisionFile ? [revisionFile] : []}
                onChange={(files) => {
                  setRevisionFile(files[0] || null);
                  setRevisionError('');
                }}
              />

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Catatan Perubahan / Tanggapan Revisi</label>
                <textarea
                  rows={3}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Jelaskan ringkasan perbaikan yang telah dilakukan berdasarkan masukan DPL..."
                  className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRevisingReport(null)}
                  className="px-3.5 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirimkan Versi Revisi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
