import React, { useState } from 'react';
import { WorkProgram } from '../../types';
import { formatRupiah } from '../../utils/finance';
import { FileUploader } from '../common/FileUploader';
import { triggerFileDownload } from '../../utils/storageService';
import { useConfirm } from '../../context/ConfirmContext';
import {
  Calendar,
  Globe,
  Eye,
  Paperclip,
  FileText,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  User,
} from 'lucide-react';

interface WorkProgramsViewProps {
  programs: WorkProgram[];
  selectedProgramIdFromRoute?: string;
  onNavigate?: (path: string) => void;
  onToggleMilestone: (programId: string, milestoneIndex: number) => void;
  onTogglePublicVisibility: (programId: string) => void;
  onUpdateProgram?: (program: WorkProgram) => void | Promise<void>;
}

export const WorkProgramsView: React.FC<WorkProgramsViewProps> = ({
  programs,
  selectedProgramIdFromRoute,
  onNavigate,
  onToggleMilestone,
  onTogglePublicVisibility,
  onUpdateProgram,
}) => {
  const { confirm, notify } = useConfirm();
  const [filterDivision, setFilterDivision] = useState('all');

  const go = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleConfirmTogglePublic = async (prog: WorkProgram) => {
    const nextPublic = !prog.isFeaturedInPublic;
    const ok = await confirm({
      title: nextPublic
        ? 'Publikasikan Program Kerja ke Portal Publik?'
        : 'Tarik Program Kerja dari Portal Publik?',
      description: nextPublic
        ? 'Program kerja ini beserta capaian progres dan anggarannya akan ditampilkan di halaman publik Desa Pringgasela Selatan.'
        : 'Program kerja ini akan disembunyikan dari pengunjung publik dan hanya terlihat di ruang kerja internal.',
      targetName: `${prog.code} — ${prog.title}`,
      level: nextPublic ? 'ordinary' : 'warning',
      confirmLabel: nextPublic ? 'Publikasikan ke Publik' : 'Sembunyikan dari Publik',
    });

    if (!ok) return;
    onTogglePublicVisibility(prog.id);
    notify({
      type: 'success',
      title: nextPublic ? 'Program Kerja Dipublikasikan' : 'Program Kerja Disembunyikan',
      message: `Status visibilitas "${prog.code}" telah diperbarui.`,
    });
  };

  // ============================================================================
  // DEDICATED PROGRAM DETAIL PAGE (/workspace/programs/:id)
  // ============================================================================
  if (selectedProgramIdFromRoute) {
    const selectedProgram = programs.find((p) => p.id === selectedProgramIdFromRoute);

    if (!selectedProgram) {
      return (
        <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Program Kerja Tidak Ditemukan
          </h2>
          <button
            type="button"
            onClick={() => go('/workspace/programs')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Program Kerja
          </button>
        </div>
      );
    }

    const completedMilestones = selectedProgram.keyMilestones.filter((m) => m.completed).length;

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-14">
        {/* Breadcrumb & Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-4">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-1.5">
              <button
                type="button"
                onClick={() => go('/workspace')}
                className="hover:text-stone-900"
              >
                Ruang Kerja
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => go('/workspace/programs')}
                className="hover:text-stone-900"
              >
                Program Kerja
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold">{selectedProgram.code}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-2xl font-bold text-stone-900">
                {selectedProgram.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => go('/workspace/programs')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Daftar Program
            </button>

            <button
              type="button"
              onClick={() => handleConfirmTogglePublic(selectedProgram)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                selectedProgram.isFeaturedInPublic
                  ? 'bg-[#EBF1ED] text-[#284230] border-[#CCDCD0]'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {selectedProgram.isFeaturedInPublic
                  ? 'Terpublikasi di Portal Publik'
                  : 'Internal Posko (Klik untuk Publikasikan)'}
              </span>
            </button>
          </div>
        </div>

        {/* Main Program Detail Card */}
        <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs">
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block">Penanggung Jawab (PIC)</span>
                <span className="font-semibold text-stone-900">
                  {selectedProgram.pic} ({selectedProgram.division})
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block">Lokasi Pelaksanaan</span>
                <span className="font-semibold text-stone-900">{selectedProgram.location}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block">Periode Waktu</span>
                <span className="font-semibold text-stone-900">
                  {selectedProgram.startDate} s/d {selectedProgram.endDate}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Latar Belakang & Tujuan Program
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed bg-[#FAF9F5] p-4 rounded-xl border border-stone-200/70">
              {selectedProgram.objective}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Milestones Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Tahapan Milestone ({completedMilestones}/{selectedProgram.keyMilestones.length})
                </h2>
                <span className="text-xs font-bold text-[#4A6B53]">
                  {selectedProgram.progressPercent}% Selesai
                </span>
              </div>

              <div className="space-y-2">
                {selectedProgram.keyMilestones.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => onToggleMilestone(selectedProgram.id, idx)}
                    className="p-3 rounded-xl bg-[#FAF9F5] border border-stone-200/80 flex items-center gap-3 cursor-pointer hover:border-[#4A6B53] transition-colors text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={m.completed}
                      onChange={() => {}}
                      className="rounded border-stone-300 text-[#4A6B53] focus:ring-[#4A6B53]"
                    />
                    <span
                      className={
                        m.completed
                          ? 'line-through text-stone-400'
                          : 'font-medium text-stone-800'
                      }
                    >
                      {m.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Outputs */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Target Luaran Konkret (Outputs)
              </h2>
              <ul className="space-y-2">
                {selectedProgram.outputs.map((out, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                    <span>{out}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-stone-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-stone-400 block">Anggaran Disetujui</span>
              <span className="text-base font-bold text-stone-900">
                {formatRupiah(selectedProgram.budgetPlanned)}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block">Realisasi Pengeluaran</span>
              <span className="text-base font-bold text-[#4A6B53]">
                {formatRupiah(selectedProgram.budgetUsed)}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block">Sisa Pagu Anggaran</span>
              <span className="text-base font-bold text-stone-800">
                {formatRupiah(selectedProgram.budgetPlanned - selectedProgram.budgetUsed)}
              </span>
            </div>
          </div>

          {/* Direct File Upload for Program Documentation */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <FileUploader
              folder="programs"
              accept="any"
              multiple={true}
              label="Dokumentasi & Berkas Program Kerja (Foto, TOR, Materi, LPJ)"
              helperText="Unggah langsung dari perangkat Anda ke Supabase Storage"
              files={selectedProgram.attachments || []}
              onChange={async (uploaded) => {
                if (onUpdateProgram) {
                  await onUpdateProgram({
                    ...selectedProgram,
                    attachments: uploaded,
                    coverPhotoUrl:
                      uploaded.find((f) => f.contentType?.startsWith('image/'))?.url ||
                      selectedProgram.coverPhotoUrl,
                  });
                }
              }}
            />

            {(selectedProgram.attachments || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {(selectedProgram.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#4A6B53] shrink-0" />
                      <span className="font-medium text-stone-800 truncate">{att.name}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        ({att.sizeFormatted})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(att.url, att.name)}
                      className="inline-flex items-center gap-1 text-xs text-[#4A6B53] font-semibold hover:underline shrink-0"
                    >
                      <span>Unduh</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PROGRAMS DIRECTORY PAGE (/workspace/programs)
  // ============================================================================
  const filtered = programs.filter(
    (p) => filterDivision === 'all' || p.division === filterDivision
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Sparkles">
              ✨
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Work Programs (Program Kerja Unggulan)
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Katalog 5 program kerja tematik KKN Pringgasela Selatan. Klik kartu program untuk membuka halaman detail & dokumentasi.
          </p>
        </div>

        {/* Division Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua Proker' },
            { id: 'Divisi PDD', label: 'PDD (Katalog Tenun)' },
            { id: 'Divisi Konsumsi', label: 'Konsumsi & Gizi' },
            { id: 'Divisi Acara', label: 'Acara & Literasi' },
            { id: 'Divisi Humper', label: 'Humper & Sarana' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterDivision(tab.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                filterDivision === tab.id
                  ? 'bg-[#EBF1ED] text-[#2A4432] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((prog) => {
          const budgetPercent = Math.round(
            (prog.budgetUsed / (prog.budgetPlanned || 1)) * 100
          );
          const completedMilestones = prog.keyMilestones.filter((m) => m.completed).length;
          const attachmentCount = (prog.attachments || []).length;

          return (
            <div
              key={prog.id}
              className="p-5 rounded-xl bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs space-y-4 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Meta Bar */}
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-700 font-semibold">{prog.code}</span>
                    <span>·</span>
                    <span className="text-[#4A6B53] font-medium">{prog.division}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirmTogglePublic(prog)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
                      prog.isFeaturedInPublic
                        ? 'text-[#284230] bg-[#EBF1ED]'
                        : 'text-stone-400 bg-stone-100 hover:text-stone-600'
                    }`}
                    title="Visibilitas di Portal Publik Warga"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{prog.isFeaturedInPublic ? 'Publik' : 'Internal'}</span>
                  </button>
                </div>

                {/* Title & Objective */}
                <div>
                  <h3
                    onClick={() => go(`/workspace/programs/${prog.id}`)}
                    className="font-serif text-base font-semibold text-stone-900 hover:text-[#4A6B53] cursor-pointer leading-snug"
                  >
                    {prog.title}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed mt-1.5 line-clamp-2">
                    {prog.objective}
                  </p>
                </div>

                {/* PIC and Target Audience */}
                <div className="space-y-1 text-xs text-stone-600 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">PIC:</span>
                    <span className="font-medium text-stone-800">{prog.pic}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">Sasaran:</span>
                    <span className="text-stone-700 truncate max-w-[240px]">
                      {prog.targetAudience}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Progres Pelaksanaan</span>
                    <span className="font-semibold text-stone-900">{prog.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#EDEAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full transition-all duration-300"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Budget Utilization bar */}
                <div className="p-2.5 rounded-md bg-[#FAF9F5] border border-stone-200/60 text-xs flex items-center justify-between">
                  <span className="text-stone-500">Realisasi Biaya:</span>
                  <div className="text-right">
                    <span className="font-semibold text-stone-900">
                      {formatRupiah(prog.budgetUsed)}
                    </span>
                    <span className="text-stone-400 text-[11px]">
                      {' '}
                      / {formatRupiah(prog.budgetPlanned)} ({budgetPercent}%)
                    </span>
                  </div>
                </div>

                {/* Milestones preview */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="font-semibold uppercase tracking-wider">
                      Tahapan Milestone ({completedMilestones}/{prog.keyMilestones.length})
                    </span>
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#4A6B53] font-medium">
                        <Paperclip className="w-3 h-3" />
                        {attachmentCount} Berkas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Full Detail Page Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {prog.startDate} s/d {prog.endDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => go(`/workspace/programs/${prog.id}`)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#4A6B53] hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Halaman Detail Program →</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
