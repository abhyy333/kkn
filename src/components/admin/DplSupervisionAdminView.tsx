import React, { useState, useEffect, useCallback } from 'react';
import { ReportRecord, Member } from '../../types';
import { OFFICIAL_PROJECT_ID, OFFICIAL_DPL_MEMBER_ID, DPL_SUPERVISOR } from '../../data/mockData';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { triggerFileDownload } from '../../utils/storageService';
import { useDplAccountStatus } from '../../hooks/useDplAccountStatus';
import {
  GraduationCap,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileText,
  Eye,
  FileDown,
  History,
  Layers,
  Edit3,
  X,
  FileCode,
  Activity,
  Calendar,
} from 'lucide-react';

interface DplSupervisionAdminViewProps {
  reports: ReportRecord[];
  members: Member[];
  onRefreshData?: () => void;
}

interface RegisteredDplRecord {
  email: string | null;
  status: string;
  activated_at?: string;
  registered_at?: string;
}

interface DplReviewLogRecord {
  id: string;
  report_id: string;
  decision: 'approved' | 'revision_requested' | 'rejected';
  feedback: string;
  reviewed_by: string;
  reviewed_at: string;
}

export const DplSupervisionAdminView: React.FC<DplSupervisionAdminViewProps> = ({
  reports,
  members,
  onRefreshData,
}) => {
  const { dplStatus, isLoading: isDplStatusLoading } = useDplAccountStatus('abhyy333@gmail.com');
  const dplActivationStatus = dplStatus?.account.activation_status || 'unknown';
  const [reviewLogs, setReviewLogs] = useState<DplReviewLogRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const registeredDpl: RegisteredDplRecord | null =
    dplStatus?.account?.email_registered
      ? {
          email: dplStatus.admin_private?.email || null,
          status: dplStatus.account.activation_status,
          registered_at: dplStatus.admin_private?.registered_at,
        }
      : null;

  // Fetch actual DPL review logs from Supabase
  const loadDplSupervisionData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        // Fetch DPL review logs
        const { data: logData } = await supabase
          .from('report_reviews')
          .select('*')
          .order('reviewed_at', { ascending: false });

        if (Array.isArray(logData)) {
          setReviewLogs(logData as DplReviewLogRecord[]
        );
        }
      }
    } catch (err) {
      console.warn('DPL Supervision data fetch notice:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDplSupervisionData();
  }, [loadDplSupervisionData]);

  // Derived Metrics from Actual Reports
  const totalReports = reports.length;
  const pendingReports = reports.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'resubmitted'
  );
  const approvedReports = reports.filter(
    (r) => r.status === 'approved' || r.status === 'approved_by_dpl'
  );
  const revisionRequestedReports = reports.filter(
    (r) => r.status === 'revision_requested' || r.status === 'revision_required'
  );
  const rejectedReports = reports.filter((r) => r.status === 'rejected');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Supervisor">
              🎓
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Monitoring DPL & Supervisi Akademik KKN
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Panel khusus Super Admin untuk memantau aktivitas evaluasi Dosen Pembimbing Lapangan, status akun DPL, dan dokumen laporan. Pengelolaan registrasi email DPL terpusat di Admin Console (/admin/members).
          </p>
        </div>

        <button
          onClick={() => {
            window.location.hash = '#admin';
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#284230] text-white text-xs font-medium hover:bg-[#1E3224] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Edit3 className="w-4 h-4 text-emerald-400" />
          <span>Kelola DPL di Admin Console</span>
        </button>
      </div>

      {/* SECTION 1: DPL PROFILE CARD */}
      <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-stone-100">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#2D4734] text-white flex items-center justify-center font-serif font-bold text-xl shrink-0 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  {DPL_SUPERVISOR.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Dosen Pembimbing Lapangan
                </span>
              </div>
              <p className="text-xs text-stone-600">
                NIP: <span className="font-mono font-medium text-stone-800">{DPL_SUPERVISOR.nip}</span> · Program Studi: <strong className="text-stone-800">{DPL_SUPERVISOR.faculty}</strong>
              </p>
              <p className="text-[11px] text-stone-500">
                Proyek KKN Sasaran: <strong className="font-mono text-stone-700">Pringgasela Selatan (ID: {OFFICIAL_PROJECT_ID})</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
            {registeredDpl ? (
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-0.5 min-w-[200px]">
                <span className="text-stone-400 text-[10px] block">Email Login DPL:</span>
                <span className="font-mono font-bold text-stone-900 block truncate">
                  {registeredDpl.email || 'Email hanya terlihat Super Admin'}
                </span>
                <div className="pt-1 flex items-center gap-1 text-[11px]">
                  {registeredDpl.status === 'activated' || registeredDpl.status === 'active' ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Akun Aktif
                    </span>
                  ) : registeredDpl.status === 'pending_activation' ? (
                    <span className="text-amber-800 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu Aktivasi
                    </span>
                  ) : (
                    <span className="text-red-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Akun Nonaktif
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <span className="font-semibold block text-[11px]">
                  {isDplStatusLoading
                    ? 'Memuat status email DPL...'
                    : !dplStatus
                      ? 'Status Email: Tidak Tersedia'
                      : dplActivationStatus === 'disabled'
                        ? 'Email DPL Dinonaktifkan'
                        : 'Status Email: Belum Didaftarkan'}
                </span>
                {dplStatus && !dplStatus.account.email_registered && (
                  <button
                  onClick={() => {
                    window.location.hash = '#admin';
                  }}
                  className="px-3 py-1 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] text-[11px] block w-full text-center"
                >
                  Kelola DPL di Admin Console
                </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#EBF1ED] border border-[#CCDCD0] text-xs text-[#284230] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Batas Akses Super Admin:</strong> Super Admin dapat mendaftarkan/mengganti email DPL dan memantau dokumen laporan. Namun, Super Admin <strong>TIDAK DAPAT</strong> menyetujui, menolak, atau meminta revisi laporan atas nama DPL. Keputusan evaluasi laporan hanya dapat diproses oleh akun DPL resmi secara langsung melalui Edge Function <code>dpl-report-review</code>.
          </p>
        </div>
      </div>

      {/* SECTION 2: SUPERVISION OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-stone-400 text-xs">Total Laporan Diserahkan</span>
          <div className="font-serif text-2xl font-bold text-stone-900">{totalReports}</div>
          <span className="text-[11px] text-stone-500 block">Seluruh 10 Mahasiswa KKN</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-blue-700 text-xs font-medium">Menunggu Evaluasi DPL</span>
          <div className="font-serif text-2xl font-bold text-blue-900">{pendingReports.length}</div>
          <span className="text-[11px] text-stone-500 block">Antrean review DPL</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-emerald-700 text-xs font-medium">Laporan Disetujui</span>
          <div className="font-serif text-2xl font-bold text-[#4A6B53]">{approvedReports.length}</div>
          <span className="text-[11px] text-stone-500 block">Disetujui DPL</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-amber-700 text-xs font-medium">Memerlukan Revisi</span>
          <div className="font-serif text-2xl font-bold text-amber-900">{revisionRequestedReports.length}</div>
          <span className="text-[11px] text-stone-500 block">Permintaan perbaikan</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-red-700 text-xs font-medium">Laporan Ditolak</span>
          <div className="font-serif text-2xl font-bold text-red-900">{rejectedReports.length}</div>
          <span className="text-[11px] text-stone-500 block">Ditolak DPL</span>
        </div>
      </div>

      {/* SECTION 3: REPORT MONITORING TABLE */}
      <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
          <div>
            <h3 className="font-serif text-base font-semibold text-stone-900">
              Monitoring Dokumen Laporan KKN ({reports.length} Dokumen)
            </h3>
            <p className="text-xs text-stone-500">
              Pantau status penyerahan laporan harian, mingguan, kegiatan, dan LPJ akhir beserta catatan DPL.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-semibold">
                <th className="p-3">Judul & Jenis Laporan</th>
                <th className="p-3">Penyusun</th>
                <th className="p-3">Periode & Tgl Kirim</th>
                <th className="p-3">Status Supervisi</th>
                <th className="p-3">Catatan / Feedback DPL</th>
                <th className="p-3 text-right">Aksi Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reports.map((rep) => (
                <tr key={rep.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="p-3 space-y-0.5">
                    <span className="font-semibold text-stone-900 block">{rep.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-700">
                      {rep.type}
                    </span>
                  </td>
                  <td className="p-3 text-stone-700 font-medium">{rep.author}</td>
                  <td className="p-3 text-stone-500 text-[11px]">
                    <div>{rep.period}</div>
                    <div className="font-mono text-[10px] text-stone-400">{rep.submissionDate}</div>
                  </td>
                  <td className="p-3">
                    {rep.status === 'approved_by_dpl' || rep.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Disetujui DPL</span>
                      </span>
                    ) : rep.status === 'revision_requested' || rep.status === 'revision_required' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Minta Revisi</span>
                      </span>
                    ) : rep.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Ditolak</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Menunggu Review</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-stone-600 max-w-xs truncate italic">
                    {rep.dplNotes || 'Belum ada catatan DPL'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="p-1.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-700"
                        title="Lihat Detail & Versi Laporan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {rep.fileUrl && (
                        <button
                          onClick={() => triggerFileDownload(rep.fileUrl!, rep.fileName || `${rep.title}.pdf`)}
                          className="p-1.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-700"
                          title="Unduh PDF Laporan"
                        >
                          <FileDown className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: DPL ACTIVITY HISTORY TIMELINE */}
      <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Activity className="w-4 h-4 text-[#4A6B53]" />
          <h3 className="font-serif text-base font-semibold text-stone-900">
            Jejak Rekam Aktivitas & Decision Log DPL
          </h3>
        </div>

        {reviewLogs.length === 0 ? (
          <div className="p-6 rounded-lg bg-stone-50 text-center text-stone-500 text-xs italic">
            Belum ada riwayat aktivitas evaluasi DPL yang tercatat di database Supabase.
          </div>
        ) : (
          <div className="space-y-2.5">
            {reviewLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-[#E8E6DF] bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900">
                      Keputusan: <strong className="capitalize text-[#4A6B53]">{log.decision.replace('_', ' ')}</strong>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Laporan ID: {log.report_id}
                    </span>
                  </div>
                  {log.feedback && (
                    <p className="text-stone-600 italic">"{log.feedback}"</p>
                  )}
                  <span className="text-[10px] text-stone-400 block">
                    Evaluator: {log.reviewed_by}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-stone-400 shrink-0">
                  {new Date(log.reviewed_at).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REPORT DETAIL MODAL FOR ADMIN */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 text-xs">
          <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[10px] font-semibold text-[#4A6B53] uppercase tracking-wider block">
                  {selectedReport.type}
                </span>
                <h3 className="font-serif text-base font-semibold text-stone-900 leading-snug">
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
                <span className="font-medium text-stone-900">{selectedReport.author}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Tanggal Kirim</span>
                <span className="font-medium text-stone-900">{selectedReport.submissionDate}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Periode</span>
                <span className="font-medium text-stone-900">{selectedReport.period}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">Status DPL</span>
                <span className="font-semibold text-stone-900 capitalize">
                  {selectedReport.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {selectedReport.dplNotes && (
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-semibold text-[#4A6B53] text-[11px] block">
                  Catatan Arahan Evaluasi DPL:
                </span>
                <p className="text-stone-700 italic leading-relaxed">{selectedReport.dplNotes}</p>
              </div>
            )}

            {/* Document Versions */}
            <div className="space-y-2 pt-2">
              <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#4A6B53]" />
                <span>Versi Berkas Dokumen ({selectedReport.documentVersions?.length || 1})</span>
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
                    className="p-3 rounded-lg border border-[#E8E6DF] bg-stone-50/50 flex items-center justify-between"
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
    </div>
  );
};
