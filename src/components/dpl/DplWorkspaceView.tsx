import React, { useState } from 'react';
import {
  WorkProgram,
  ReportRecord,
  MeetingItem,
  Member,
  UnitConfig,
  TaskItem,
  VillageResearchData,
  DocumentationAlbum,
  DocumentationPhoto,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { supabase } from '../../lib/supabase';
import { Transaction, calculateFinanceSummary, formatRupiah } from '../../utils/finance';
import {
  GraduationCap,
  FileText,
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Globe,
  LogOut,
  ChevronRight,
  Send,
  Eye,
  Check,
  Building,
  History,
  AlertTriangle,
  FileDown,
  Layers,
  MapPin,
  Camera,
  CheckSquare,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface DplWorkspaceViewProps {
  config: UnitConfig;
  programs: WorkProgram[];
  reports: ReportRecord[];
  meetings: MeetingItem[];
  members: Member[];
  transactions: Transaction[];
  tasks?: TaskItem[];
  villageResearch?: VillageResearchData;
  documentationAlbums?: DocumentationAlbum[];
  documentation?: DocumentationPhoto[];
  onUpdateReportNote?: (
    reportId: string,
    notes: string,
    status: ReportRecord['status']
  ) => Promise<void>;
  onSwitchToPublic: () => void;
  onRefreshData?: () => void;
}

export type DplTab =
  | 'overview'
  | 'approvals'
  | 'history'
  | 'mahasiswa'
  | 'program'
  | 'surveys'
  | 'documentation'
  | 'agenda'
  | 'risks'
  | 'keuangan'
  | 'profile';

function getInitials(name: string): string {
  if (!name) return 'KKN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const DplWorkspaceView: React.FC<DplWorkspaceViewProps> = ({
  config,
  programs,
  reports,
  meetings,
  members,
  transactions,
  tasks = [],
  villageResearch,
  documentationAlbums = [],
  documentation = [],
  onUpdateReportNote,
  onSwitchToPublic,
  onRefreshData,
}) => {
  const { signOut } = useAuth();
  const { confirm, notify } = useConfirm();

  const [activeTab, setActiveTab] = useState<DplTab>('overview');

  // Review Modal State
  const [reviewingReport, setReviewingReport] = useState<ReportRecord | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'revision_requested' | 'rejected'>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const financeSummary = calculateFinanceSummary(transactions);

  // Derived metrics for supervisory dashboard
  const pendingReports = reports.filter(
    (r) =>
      r.status === 'submitted' ||
      r.status === 'under_review' ||
      r.status === 'resubmitted'
  );
  const approvedReports = reports.filter(
    (r) => r.status === 'approved' || r.status === 'approved_by_dpl'
  );
  const revisionReports = reports.filter(
    (r) =>
      r.status === 'revision_requested' ||
      r.status === 'revision_required' ||
      r.status === 'rejected'
  );

  const urgentOrDelayedTasks = tasks.filter(
    (t) => t.priority === 'urgent' && t.status !== 'done'
  );
  const averageProgramProgress = programs.length
    ? Math.round(
        programs.reduce((acc, p) => acc + (p.progressPercent || 0), 0) /
          programs.length
      )
    : 0;

  // Open Review Dialog
  const handleOpenReview = (
    report: ReportRecord,
    initialDecision: 'approved' | 'revision_requested' | 'rejected' = 'approved'
  ) => {
    setReviewingReport(report);
    setReviewDecision(initialDecision);
    setReviewFeedback(report.dplNotes || '');
    setReviewError(null);
  };

  // Submit Report Review via Edge Function
  const handleSubmitReview = async () => {
    if (!reviewingReport) return;

    if (
      (reviewDecision === 'revision_requested' || reviewDecision === 'rejected') &&
      !reviewFeedback.trim()
    ) {
      setReviewError('Catatan arahan evaluasi wajib diisi untuk permintaan revisi atau penolakan.');
      return;
    }

    const decisionLabel =
      reviewDecision === 'approved'
        ? 'Menyetujui (Approve)'
        : reviewDecision === 'revision_requested'
        ? 'Meminta Revisi'
        : 'Menolak Laporan';

    const ok = await confirm({
      title: `Konfirmasi Keputusan: ${decisionLabel}`,
      description: `Apakah Anda yakin ingin menetapkan status "${decisionLabel}" untuk dokumen laporan "${reviewingReport.title}"?`,
      targetName: reviewingReport.title,
      level: reviewDecision === 'rejected' ? 'warning' : 'ordinary',
      confirmLabel: 'Simpan Keputusan Evaluasi',
      cancelLabel: 'Batal',
    });

    if (!ok) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    const mappedStatus: ReportRecord['status'] =
      reviewDecision === 'approved'
        ? 'approved_by_dpl'
        : reviewDecision === 'revision_requested'
        ? 'revision_requested'
        : 'rejected';

    try {
      // 1. Invoke Supabase Edge Function `dpl-report-review` as the backend RPC interface
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke(
          'dpl-report-review',
          {
            body: {
              report_id: reviewingReport.id,
              decision: reviewDecision,
              feedback: reviewFeedback.trim(),
            },
          }
        );

        if (edgeErr) {
          console.warn('Edge Function dpl-report-review invocation notice (falling back to direct sync):', edgeErr);
        } else if (edgeData) {
          console.info('Edge Function dpl-report-review response:', edgeData);
        }
      } catch (err) {
        console.warn('Edge Function invoke network notice:', err);
      }

      // 2. Update local state and synchronize report record with parent
      if (onUpdateReportNote) {
        await onUpdateReportNote(reviewingReport.id, reviewFeedback.trim(), mappedStatus);
      }

      notify({
        type: 'success',
        title: 'Evaluasi DPL Berhasil Disimpan',
        message: `Keputusan untuk "${reviewingReport.title}" telah dicatat ke riwayat supervisi.`,
      });

      setReviewingReport(null);
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error('Failed to save review:', err);
      setReviewError(err?.message || 'Gagal menyimpan evaluasi DPL. Silakan coba lagi.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col font-sans">
      {/* Top Supervisory Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E6DF] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#2D4734] text-white flex items-center justify-center font-serif font-semibold text-lg shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif font-semibold text-sm text-stone-900 tracking-tight flex items-center gap-2">
              <span>Workspace Supervisi DPL</span>
              <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
                Supervisi Akademik
              </span>
            </div>
            <div className="text-[11px] text-stone-500">
              {config.dplName} · NIP: {config.dplNip} · {config.faculty || 'S1 Ilmu Lingkungan'} · {config.villageName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onSwitchToPublic}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C8] bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#4A6B53]" />
            <span className="hidden sm:inline">Lihat</span>
            <span>Portal Publik</span>
          </button>

          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            title="Keluar (Sign Out)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Supervisory Subheader Banner */}
      <div className="bg-[#EBF1ED] border-b border-[#CCDCD0] px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#284230]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#4A6B53] shrink-0" />
            <div>
              <span className="font-semibold block text-stone-900">
                Supervisi Akademik KKN Tematik Aktif
              </span>
              <span className="text-stone-600 text-[11px]">
                Validasi laporan berkala, peninjauan logbook, audit program posko, dan pengawasan 10 mahasiswa secara objektif.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded bg-white/80 border border-[#CCDCD0] text-[11px] font-medium text-stone-700 font-mono">
              10 Mahasiswa Resmi · 7 Dusun
            </span>
            {pendingReports.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>{pendingReports.length} Laporan Menunggu Evaluasi</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E8E6DF] text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'overview'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ringkasan Supervisi</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'approvals'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Validasi Laporan ({pendingReports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'history'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Evaluasi</span>
          </button>

          <button
            onClick={() => setActiveTab('mahasiswa')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'mahasiswa'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>10 Mahasiswa KKN</span>
          </button>

          <button
            onClick={() => setActiveTab('program')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'program'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Progres Program ({programs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('surveys')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'surveys'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Survei & Riset Desa</span>
          </button>

          <button
            onClick={() => setActiveTab('documentation')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'documentation'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Dokumentasi Lapangan</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'agenda'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda & Rapat ({meetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'risks'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Risiko & Kendala ({urgentOrDelayedTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('keuangan')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'keuangan'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Audit Keuangan</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
              activeTab === 'profile'
                ? 'border-[#4A6B53] text-[#284230] font-semibold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Profil DPL</span>
          </button>
        </div>

        {/* TAB 1: SUPERVISORY OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-400 text-xs">
                  <span>Laporan Menunggu</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {pendingReports.length}
                </div>
                <div className="text-[11px] text-stone-500">
                  Dari total {reports.length} dokumen diserahkan
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-400 text-xs">
                  <span>Laporan Disetujui</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-serif text-2xl font-bold text-[#4A6B53]">
                  {approvedReports.length}
                </div>
                <div className="text-[11px] text-stone-500">
                  Tervalidasi & tersimpan ke arsip
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-400 text-xs">
                  <span>Capaian 5 Program Kerja</span>
                  <Sparkles className="w-4 h-4 text-[#4A6B53]" />
                </div>
                <div className="font-serif text-2xl font-bold text-stone-900">
                  {averageProgramProgress}%
                </div>
                <div className="text-[11px] text-stone-500">
                  Rata-rata kumulatif di 7 dusun
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-400 text-xs">
                  <span>Tugas Tertunda / Risiko</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="font-serif text-2xl font-bold text-amber-900">
                  {urgentOrDelayedTasks.length}
                </div>
                <div className="text-[11px] text-stone-500">
                  Memerlukan arahan mitigasi DPL
                </div>
              </div>
            </div>

            {/* Quick Action: Pending Reports Preview */}
            <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Laporan Mahasiswa Menunggu Validasi DPL
                  </h3>
                  <p className="text-xs text-stone-500">
                    Dokumen berkala yang telah diunggah oleh mahasiswa posko dan memerlukan keputusan supervisi.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="text-xs font-semibold text-[#4A6B53] hover:underline flex items-center gap-1"
                >
                  <span>Buka Tab Validasi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingReports.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#FAF9F5] border border-stone-200/70 text-center text-xs text-stone-500">
                  Semua laporan mahasiswa saat ini telah selesai ditinjau. Tidak ada dokumen pending.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3.5 rounded-lg border border-[#E8E6DF] bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">{rep.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200/70 text-stone-700 font-medium">
                            {rep.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Penyusun: <strong className="text-stone-700">{rep.author}</strong> · Periode: {rep.period} · Diserahkan: {rep.submissionDate}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenReview(rep, 'approved')}
                          className="px-3 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleOpenReview(rep, 'revision_requested')}
                          className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
                        >
                          Minta Revisi
                        </button>
                        <button
                          onClick={() => handleOpenReview(rep, 'rejected')}
                          className="px-3 py-1.5 rounded-md bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Overview Grid: 5 Programs & 10 Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Program Highlights */}
              <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Progres 5 Program Kerja Tematik
                  </h3>
                  <button
                    onClick={() => setActiveTab('program')}
                    className="text-xs font-semibold text-[#4A6B53] hover:underline"
                  >
                    Detail
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  {programs.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-stone-800">{p.title}</span>
                        <span className="font-mono font-semibold text-[#4A6B53]">{p.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4A6B53] rounded-full"
                          style={{ width: `${p.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Posko Context & Supervisory Information */}
              <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3.5 text-xs text-stone-600">
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  Informasi Unit & Posko KKN
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Unit / Periode:</span>
                    <span className="font-medium text-stone-800">{config.unitName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Desa & Kecamatan:</span>
                    <span className="font-medium text-stone-800">{config.villageName}, {config.district}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Kabupaten:</span>
                    <span className="font-medium text-stone-800">{config.regency}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-400">Dosen Pembimbing (DPL):</span>
                    <span className="font-medium text-stone-900">{config.dplName} (NIP: {config.dplNip})</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-400">Distribusi Wilayah:</span>
                    <span className="font-medium text-stone-800">7 Dusun Sasaran</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENDING REPORT APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h2 className="font-serif text-lg font-medium text-stone-900">
                  Antrean Validasi Laporan Mahasiswa
                </h2>
                <p className="text-xs text-stone-500">
                  Pilih keputusan: Setujui (Approve), Minta Revisi (Request Revision), atau Tolak (Reject). Seluruh evaluasi diproses melalui Edge Function.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {reports.map((rep) => {
                const isApproved =
                  rep.status === 'approved' || rep.status === 'approved_by_dpl';
                const isRevision =
                  rep.status === 'revision_requested' ||
                  rep.status === 'revision_required' ||
                  rep.status === 'rejected';

                return (
                  <div
                    key={rep.id}
                    className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-base text-stone-900">{rep.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-700">
                            {rep.type}
                          </span>
                          {rep.documentVersions && rep.documentVersions.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              v{rep.documentVersions[rep.documentVersions.length - 1].version}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">
                          Disusun oleh: <strong className="text-stone-700">{rep.author}</strong> · Periode: {rep.period} · Waktu Penyerahan: {rep.submissionDate}
                          {rep.fileName && (
                            <span> · Berkas: <span className="font-mono text-[#4A6B53]">{rep.fileName}</span></span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Telah Disetujui DPL</span>
                          </span>
                        )}
                        {isRevision && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{rep.status === 'rejected' ? 'Ditolak' : 'Permintaan Revisi'}</span>
                          </span>
                        )}
                        {!isApproved && !isRevision && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Menunggu Keputusan DPL</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DPL Notes Feedback if already given */}
                    {rep.dplNotes && (
                      <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] text-xs text-stone-700 space-y-1">
                        <span className="font-semibold text-[11px] text-[#4A6B53] block">
                          Catatan & Evaluasi DPL Sebelumnya ({rep.reviewedBy || config.dplName}):
                        </span>
                        <p className="italic leading-relaxed">{rep.dplNotes}</p>
                      </div>
                    )}

                    {/* 3 Explicit Review Actions */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        {rep.fileUrl && (
                          <a
                            href={rep.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium"
                          >
                            <FileDown className="w-3.5 h-3.5 text-stone-500" />
                            <span>Unduh Berkas Laporan</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenReview(rep, 'approved')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui (Approve)</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(rep, 'revision_requested')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Minta Revisi</span>
                        </button>
                        <button
                          onClick={() => handleOpenReview(rep, 'rejected')}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: REVIEW & REVISION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Riwayat Evaluasi & Versi Dokumen Laporan
              </h2>
              <p className="text-xs text-stone-500">
                Log audit lengkap keputusan pembimbing lapangan, catatan revisi, dan riwayat iterasi per dokumen.
              </p>
            </div>

            <div className="space-y-4">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div>
                      <span className="font-semibold text-stone-900 text-sm block">{rep.title}</span>
                      <span className="text-[11px] text-stone-500">{rep.type} · Penulis: {rep.author}</span>
                    </div>
                    <span className="capitalize px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-mono">
                      Status Saat Ini: {rep.status.replace('_', ' ')}
                    </span>
                  </div>

                  {rep.revisionHistory && rep.revisionHistory.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                        Jejak Rekam Keputusan & Arahan DPL:
                      </span>
                      <div className="space-y-2 pl-3 border-l-2 border-[#4A6B53]">
                        {rep.revisionHistory.map((rev, idx) => (
                          <div key={idx} className="space-y-0.5 text-[11px]">
                            <div className="flex items-center justify-between text-stone-500">
                              <span>
                                Iterasi v{rev.version} — <strong className="text-stone-800 capitalize">{rev.status.replace('_', ' ')}</strong>
                              </span>
                              <span className="font-mono text-[10px]">
                                {new Date(rev.timestamp).toLocaleString('id-ID')}
                              </span>
                            </div>
                            {rev.comments && (
                              <p className="text-stone-700 italic bg-[#FAF9F5] p-2 rounded border border-stone-200/60">
                                "{rev.comments}"
                              </p>
                            )}
                            <span className="text-[10px] text-stone-400 block">
                              Dievaluasi oleh: {rev.reviewedBy || config.dplName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-stone-400 text-[11px] italic">
                      Belum ada riwayat catatan revisi sebelumnya untuk dokumen ini.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: 10 MAHASISWA KKN DIRECTORY (READ-ONLY) */}
        {activeTab === 'mahasiswa' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Direktori Akademik 10 Mahasiswa KKN
              </h2>
              <p className="text-xs text-stone-500">
                Daftar resmi mahasiswa bimbingan lapangan, NIM, program studi, divisi, dan penugasan tanggung jawab.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => {
                const initials = getInitials(m.name);
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white ring-1 ring-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#2D4734] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0 shadow-xs">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs text-stone-900 truncate">{m.name}</h4>
                        <p className="text-[11px] text-[#4A6B53] font-medium truncate">{m.role}</p>
                        <span className="text-[10px] text-stone-400 font-mono block truncate">NIM: {m.nim}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-[11px] space-y-1 text-stone-600">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Program Studi:</span>
                        <span className="font-medium text-stone-800 truncate">{m.major}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Divisi Penugasan:</span>
                        <span className="text-stone-700 truncate">{m.division}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Kontak WhatsApp:</span>
                        <span className="font-mono text-stone-800 truncate">{m.phone}</span>
                      </div>
                    </div>

                    {m.responsibilities && m.responsibilities.length > 0 && (
                      <div className="pt-2 border-t border-stone-100 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
                          Tanggung Jawab Lapangan:
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-stone-600 space-y-0.5">
                          {m.responsibilities.map((r, idx) => (
                            <li key={idx} className="truncate">{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: WORK PROGRAM PROGRESS */}
        {activeTab === 'program' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Monitoring Progres 5 Program Kerja ({programs.length} Program)
              </h2>
              <p className="text-xs text-stone-500">
                Pencapaian fisik program tematik, indikator capaian, dan penyerapan anggaran posko.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programs.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-stone-600 font-semibold">{p.code}</span>
                    <span className="text-xs font-medium text-[#4A6B53]">{p.division}</span>
                  </div>

                  <h3 className="font-serif font-semibold text-stone-900 text-sm leading-snug">
                    {p.title}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {p.objective}
                  </p>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">PIC: {p.pic}</span>
                      <span className="font-semibold text-stone-900">{p.progressPercent}% Selesai</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#4A6B53] rounded-full"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Anggaran: {formatRupiah(p.budgetUsed)} / {formatRupiah(p.budgetPlanned)}</span>
                    <span className="capitalize font-medium">{p.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: VILLAGE RESEARCH & SURVEYS */}
        {activeTab === 'surveys' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Riset Lapangan & Potensi Wilayah Desa
              </h2>
              <p className="text-xs text-stone-500">
                Dokumentasi temuan survei awal, potensi ekonomi tenun & pertanian, analisis SWOT, dan kebutuhan prioritas 7 dusun.
              </p>
            </div>

            {villageResearch ? (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3 text-xs">
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    Profil Geografis & Demografi {villageResearch.villageName}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    {villageResearch.overview || villageResearch.geography}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200">
                      <span className="text-stone-400 text-[10px] block">Jumlah Penduduk</span>
                      <span className="font-bold text-stone-900">{villageResearch.totalPopulation?.toLocaleString('id-ID') || '5.240'} Jiwa</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200">
                      <span className="text-stone-400 text-[10px] block">Jumlah KK</span>
                      <span className="font-bold text-stone-900">{villageResearch.totalHouseholds?.toLocaleString('id-ID') || '1.420'} KK</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200">
                      <span className="text-stone-400 text-[10px] block">Luas Wilayah</span>
                      <span className="font-bold text-stone-900">{villageResearch.totalAreaHectares || '412'} Ha</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200">
                      <span className="text-stone-400 text-[10px] block">Elevasi</span>
                      <span className="font-bold text-stone-900">{villageResearch.elevation || '420 mdpl'}</span>
                    </div>
                  </div>
                </div>

                {/* Potencies list */}
                {villageResearch.potencies && villageResearch.potencies.length > 0 && (
                  <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3">
                    <h3 className="font-serif text-base font-semibold text-stone-900">
                      Potensi Unggulan 7 Dusun
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {villageResearch.potencies.map((pot, idx) => (
                        <div key={idx} className="p-3.5 rounded-lg border border-[#E8E6DF] bg-stone-50/50 space-y-1">
                          <span className="text-[10px] font-semibold text-[#4A6B53] block uppercase tracking-wider">
                            {pot.sector} · {pot.dusun || 'Desa'}
                          </span>
                          <h4 className="font-bold text-stone-900">{pot.title}</h4>
                          <p className="text-stone-600 text-[11px] leading-relaxed">{pot.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white border border-[#E8E6DF] text-xs text-stone-500 text-center">
                Memuat data riset desa...
              </div>
            )}
          </div>
        )}

        {/* TAB 7: FIELD DOCUMENTATION REVIEW */}
        {activeTab === 'documentation' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Dokumentasi Kegiatan Lapangan ({documentationAlbums.length} Album)
              </h2>
              <p className="text-xs text-stone-500">
                Arsip foto kegiatan pengabdian mahasiswa posko di 7 dusun Desa Pringgasela Selatan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentationAlbums.map((album) => (
                <div
                  key={album.id}
                  className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xs overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 bg-stone-200 overflow-hidden relative">
                      {album.coverImageUrl ? (
                        <img
                          src={album.coverImageUrl}
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                        {album.photos?.length || 0} Foto
                      </span>
                    </div>

                    <div className="p-4 space-y-1.5 text-xs">
                      <span className="text-[10px] font-semibold text-[#4A6B53] block uppercase tracking-wider">
                        {album.category} · {album.dusun}
                      </span>
                      <h4 className="font-serif font-bold text-stone-900 text-sm leading-snug">
                        {album.title}
                      </h4>
                      <p className="text-stone-600 line-clamp-2 text-[11px] leading-relaxed">
                        {album.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                    <span>{album.date}</span>
                    <span>Fotografer: {album.photographer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: POSKO MEETINGS & AGENDA */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Agenda Rapat & Koordinasi Lapangan ({meetings.length} Rapat)
              </h2>
              <p className="text-xs text-stone-500">
                Notulensi pertemuan posko, tindak lanjut evaluasi mingguan, dan kehadiran mahasiswa.
              </p>
            </div>

            <div className="space-y-3">
              {meetings.map((meet) => (
                <div
                  key={meet.id}
                  className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 text-sm">{meet.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                        {meet.type}
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px] font-mono">
                      {meet.date} · {meet.time}
                    </span>
                  </div>

                  {meet.agenda && meet.agenda.length > 0 && (
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200/70 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
                        Poin Agenda:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5">
                        {meet.agenda.map((ag, idx) => (
                          <li key={idx}>{ag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-stone-600 leading-relaxed">{meet.notesSummary}</p>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100">
                    <span>Lokasi: <strong className="text-stone-700">{meet.location}</strong></span>
                    <span>Hadir: <strong className="text-stone-700">{meet.attendeesCount} Mahasiswa</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: PROJECT RISKS & DELAYED TASKS */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Monitoring Risiko & Tugas Tertunda ({urgentOrDelayedTasks.length} Tugas)
              </h2>
              <p className="text-xs text-stone-500">
                Identifikasi tugas kritis berkategori urgen yang belum terselesaikan untuk mitigasi lapangan DPL.
              </p>
            </div>

            {urgentOrDelayedTasks.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-[#E8E6DF] text-center text-xs text-stone-500">
                Tidak ada tugas yang tertunda atau berisiko tinggi saat ini. Semua tugas berjalan sesuai jadwal.
              </div>
            ) : (
              <div className="space-y-3">
                {urgentOrDelayedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-white border border-amber-200 bg-amber-50/20 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-stone-900 text-sm">{t.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase">
                        Urgent
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-stone-600 text-[11px]">{t.description}</p>
                    )}

                    <div className="pt-2 flex items-center justify-between text-[11px] text-stone-500 border-t border-amber-200/50">
                      <span>Penanggung Jawab: <strong className="text-stone-800">{t.assignee}</strong> ({t.division})</span>
                      <span>Tenggat: <strong className="font-mono text-stone-800">{t.dueDate}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: AUDIT KEUANGAN */}
        {activeTab === 'keuangan' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Audit Kas & Realisasi Anggaran Posko (Read-Only)
              </h2>
              <p className="text-xs text-stone-500">
                Pengawasan perputaran dana iuran mahasiswa, bantuan operasional, dan belanja perlengkapan kegiatan KKN.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs">
                <span className="text-[11px] text-stone-400 block mb-0.5">Total Kas Masuk</span>
                <span className="font-serif text-xl font-bold text-[#4A6B53]">
                  {formatRupiah(financeSummary.totalIncome)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Iuran Anggota & Donatur</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs">
                <span className="text-[11px] text-stone-400 block mb-0.5">Total Realisasi Belanja</span>
                <span className="font-serif text-xl font-bold text-stone-900">
                  {formatRupiah(financeSummary.totalExpense)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Belanja Program 4 Divisi</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs">
                <span className="text-[11px] text-stone-400 block mb-0.5">Sisa Saldo Kas</span>
                <span className="font-serif text-xl font-bold text-stone-900">
                  {formatRupiah(financeSummary.balance)}
                </span>
                <span className="text-[10px] text-stone-500 block mt-1">Saldo Tersedia Posko</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: PROFIL DPL */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone-900">
                Profil & Identitas Dosen Pembimbing Lapangan (DPL)
              </h2>
              <p className="text-xs text-stone-500">
                Data resmi akademis, NIP, fakultas asal, dan wilayah tugas supervisi KKN Tematik.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-6 max-w-2xl">
              <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                <div className="w-16 h-16 rounded-2xl bg-[#2D4734] text-white flex items-center justify-center font-serif font-bold text-2xl shadow-sm">
                  {getInitials(config.dplName)}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">
                    {config.dplName || 'Lalu Muhammad Aby Dujana, M.Si.'}
                  </h3>
                  <span className="text-xs font-mono text-[#4A6B53] font-medium block">
                    NIP / NIDN: {config.dplNip || '198504122010121003'}
                  </span>
                  <span className="text-xs text-stone-500 block mt-0.5">
                    {config.faculty || 'Fakultas Matematika dan Ilmu Pengetahuan Alam'} · Universitas Mataram
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <h4 className="font-semibold text-stone-900 text-sm">Penugasan Supervisi KKN</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200 space-y-1">
                    <span className="text-stone-400 text-[10px] block">Kode & Nama Unit</span>
                    <span className="font-medium text-stone-900">{config.unitCode} — {config.unitName}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200 space-y-1">
                    <span className="text-stone-400 text-[10px] block">Desa & Kecamatan Sasaran</span>
                    <span className="font-medium text-stone-900">{config.villageName}, Kec. {config.district}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200 space-y-1">
                    <span className="text-stone-400 text-[10px] block">Kabupaten & Provinsi</span>
                    <span className="font-medium text-stone-900">{config.regency}, NTB</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200 space-y-1">
                    <span className="text-stone-400 text-[10px] block">Periode Pelaksanaan KKN</span>
                    <span className="font-medium text-stone-900">{config.startDate} s/d {config.endDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#EBF1ED] border border-[#CCDCD0] text-xs text-[#284230] space-y-1">
                <span className="font-semibold block text-stone-900">Hak Akses & Kewenangan DPL:</span>
                <p className="text-[11px] leading-relaxed text-stone-700">
                  Sebagai Dosen Pembimbing Lapangan, Anda memiliki hak akses penuh untuk meninjau, mengevaluasi, meminta revisi, dan menyetujui seluruh laporan mahasiswa KKN. Batasan akses: DPL tidak dapat mengubah identitas mahasiswa, memodifikasi akun login, mengelola role admin, atau mengakses data finansial pribadi.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DPL Review & Decision Modal */}
      {reviewingReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
          onClick={() => setReviewingReport(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#E8E6DF] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E8E6DF] bg-[#FAF9F5]">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Formulir Evaluasi & Validasi DPL
              </h3>
              <p className="text-xs text-stone-500">
                Dokumen: <strong className="text-stone-800">{reviewingReport.title}</strong>
              </p>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {reviewError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700">Keputusan Validasi Laporan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approved')}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      reviewDecision === 'approved'
                        ? 'border-[#4A6B53] bg-[#EBF1ED] text-[#284230] font-bold'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    ✓ Setujui
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('revision_requested')}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      reviewDecision === 'revision_requested'
                        ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    ⚠ Minta Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      reviewDecision === 'rejected'
                        ? 'border-red-400 bg-red-50 text-red-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    ✕ Tolak
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700">
                  Catatan Arahan Supervisi & Masukan Akademik {reviewDecision !== 'approved' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Tuliskan catatan arahan, verifikasi metodologi, atau perbaikan data yang harus dilakukan oleh mahasiswa..."
                  className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-500 space-y-1">
                <span className="font-semibold text-stone-700 block">Protokol Backend:</span>
                <span>Keputusan ini diproses melalui Edge Function <code>dpl-report-review</code> dan dicatat ke audit trail supervisi posko.</span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-[#E8E6DF] flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setReviewingReport(null)}
                className="px-3.5 py-1.5 rounded-md border border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors flex items-center gap-1.5"
              >
                {isSubmittingReview ? 'Menyimpan...' : 'Simpan Keputusan Evaluasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
