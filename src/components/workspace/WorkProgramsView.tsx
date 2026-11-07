import React, { useState } from 'react';
import { WorkProgram } from '../../types';
import { formatRupiah } from '../../utils/finance';
import {
  Sparkles,
  Calendar,
  MapPin,
  CheckCircle2,
  DollarSign,
  Globe,
  Eye,
  Plus,
} from 'lucide-react';

interface WorkProgramsViewProps {
  programs: WorkProgram[];
  onToggleMilestone: (programId: string, milestoneIndex: number) => void;
  onTogglePublicVisibility: (programId: string) => void;
}

export const WorkProgramsView: React.FC<WorkProgramsViewProps> = ({
  programs,
  onToggleMilestone,
  onTogglePublicVisibility,
}) => {
  const [filterDivision, setFilterDivision] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState<WorkProgram | null>(null);

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
            Katalog 5 program kerja tematik KKN Pringgasela Selatan dengan tracking indikator output, milestone, dan serapan anggaran.
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

          return (
            <div
              key={prog.id}
              className="p-5 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs space-y-4 transition-colors flex flex-col justify-between"
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
                    onClick={() => onTogglePublicVisibility(prog.id)}
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
                  <h3 className="font-serif text-base font-semibold text-stone-900 leading-snug">
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
                  </div>
                  <div className="space-y-1">
                    {prog.keyMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => onToggleMilestone(prog.id, idx)}
                        className="flex items-center gap-2 text-xs cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={m.completed}
                          onChange={() => {}}
                          className="rounded border-stone-300 text-[#4A6B53] focus:ring-[#4A6B53] cursor-pointer"
                          id={`milestone-${prog.id}-${idx}`}
                        />
                        <label
                          htmlFor={`milestone-${prog.id}-${idx}`}
                          className={`cursor-pointer min-w-0 truncate ${
                            m.completed ? 'line-through text-stone-400' : 'text-stone-700'
                          }`}
                        >
                          {m.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* View Full Detail Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {prog.startDate} s/d {prog.endDate}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProgram(prog)}
                  className="flex items-center gap-1 text-xs font-medium text-[#4A6B53] hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detail Output</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="font-mono text-stone-400 text-[11px] font-semibold">
                  {selectedProgram.code} · {selectedProgram.division}
                </span>
                <h3 className="font-serif text-lg font-semibold text-stone-900 mt-0.5">
                  {selectedProgram.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-stone-700 uppercase tracking-wider text-[11px]">
                Latar Belakang & Tujuan
              </span>
              <p className="text-stone-600 leading-relaxed bg-[#FAF9F5] p-3 rounded border border-stone-200/60">
                {selectedProgram.objective}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-stone-700">
              <div className="p-2.5 rounded bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 block text-[10px]">Penanggung Jawab (PIC)</span>
                <span className="font-medium text-stone-900">{selectedProgram.pic}</span>
              </div>
              <div className="p-2.5 rounded bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 block text-[10px]">Lokasi Pelaksanaan</span>
                <span className="font-medium text-stone-900">{selectedProgram.location}</span>
              </div>
            </div>

            {/* Tangible Outputs */}
            <div className="space-y-2">
              <span className="font-semibold text-stone-700 uppercase tracking-wider text-[11px]">
                Target Output Konkret
              </span>
              <ul className="space-y-1.5 pl-4 list-disc text-stone-700">
                {selectedProgram.outputs.map((out, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {out}
                  </li>
                ))}
              </ul>
            </div>

            {/* Budget status */}
            <div className="p-3 rounded-md bg-[#FAF9F5] border border-stone-200/70 flex items-center justify-between">
              <div>
                <span className="text-stone-400 block text-[10px]">Anggaran Disetujui</span>
                <span className="font-medium text-stone-900">
                  {formatRupiah(selectedProgram.budgetPlanned)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Realisasi Pengeluaran</span>
                <span className="font-medium text-[#4A6B53]">
                  {formatRupiah(selectedProgram.budgetUsed)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px]">Sisa Anggaran</span>
                <span className="font-medium text-stone-700">
                  {formatRupiah(selectedProgram.budgetPlanned - selectedProgram.budgetUsed)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedProgram(null)}
                className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
