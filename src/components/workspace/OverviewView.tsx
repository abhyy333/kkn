import React from 'react';
import {
  WorkProgram,
  TaskItem,
  MeetingItem,
  WorkspaceModuleId,
} from '../../types';
import { Transaction, formatRupiah } from '../../utils/finance';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';

interface OverviewViewProps {
  programs: WorkProgram[];
  tasks: TaskItem[];
  meetings: MeetingItem[];
  transactions: Transaction[];
  onNavigate: (module: WorkspaceModuleId) => void;
  onToggleTask: (taskId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  programs,
  tasks,
  meetings,
  transactions,
  onNavigate,
  onToggleTask,
}) => {
  // Aggregate stats
  const totalPrograms = programs.length;
  const completedPrograms = programs.filter((p) => p.status === 'completed').length;
  const avgProgress = Math.round(
    programs.reduce((acc, p) => acc + p.progressPercent, 0) / (totalPrograms || 1)
  );

  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
  const pendingTasks = tasks.filter((t) => t.status !== 'done').slice(0, 5);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Notion-style Page Header with Cover & Icon */}
      <div className="space-y-4">
        {/* Subtle Decorative Cover Bar */}
        <div className="h-32 sm:h-40 w-full rounded-xl bg-gradient-to-r from-[#2F4735] via-[#4A6B53] to-[#5C7E65] relative overflow-hidden shadow-xs">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute bottom-3 right-4 text-white/80 text-xs font-mono tracking-wider">
            KKN PRINGGASELA SELATAN · LOMBOK TIMUR
          </div>
        </div>

        {/* Title & Notion Icon */}
        <div className="px-1 sm:px-2 pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl" role="img" aria-label="Sprout">
                🌱
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">
                KKN SPACE — Posko Desa Pringgasela Selatan
              </h1>
            </div>
            <p className="text-sm text-stone-600 max-w-2xl font-normal">
              Ruang kerja kolaboratif KKN Pringgasela Selatan di Desa Pringgasela Selatan, Kec. Pringgasela, Kab. Lombok Timur, NTB.
              Sinkronisasi sentra tenun tradisional, program kerja lapangan, keuangan, logistik, dan transparansi warga.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <MapPin className="w-4 h-4 text-[#4A6B53]" />
            <span>Ketinggian ±450 mdpl · Kaki Gunung Rinjani</span>
          </div>
        </div>
      </div>

      {/* Top Metric Cards - Notion Clean Aesthetic (No candy pills) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Program Capaian */}
        <div
          onClick={() => onNavigate('programs')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] transition-colors cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Program Kerja</span>
            <Sparkles className="w-4 h-4 text-[#4A6B53]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">{avgProgress}%</span>
            <span className="text-xs text-stone-500">rata-rata progres</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span>{completedPrograms} selesai dari {totalPrograms} program</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
          </div>
        </div>

        {/* Card 2: Keuangan Kas */}
        <div
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] transition-colors cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Saldo Kas Posko</span>
            <TrendingUp className="w-4 h-4 text-[#4A6B53]" />
          </div>
          <div className="text-2xl font-semibold text-stone-900 truncate">
            {formatRupiah(currentBalance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span>Total Masuk: {formatRupiah(totalIncome)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
          </div>
        </div>

        {/* Card 3: Tasks Checklist */}
        <div
          onClick={() => onNavigate('tasks')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] transition-colors cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Tugas & Target</span>
            <CheckCircle2 className="w-4 h-4 text-[#4A6B53]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">{doneTasks}</span>
            <span className="text-xs text-stone-500">/ {tasks.length} tugas selesai</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span className={urgentTasks.length > 0 ? 'text-amber-800 font-medium' : ''}>
              {urgentTasks.length} tugas mendesak
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
          </div>
        </div>

        {/* Card 4: Countdown Hari */}
        <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Masa Pengabdian</span>
            <Clock className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-stone-900">Hari ke-18</span>
            <span className="text-xs text-stone-500">dari 45 hari</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
            <span>Sisa 27 hari pengabdian</span>
            <span className="text-[11px] text-[#4A6B53] font-medium">40% waktu</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Programs Overview & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Program Kerja Unggulan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-serif text-base font-semibold text-stone-900">
                  Status Program Kerja Unggulan
                </h2>
                <p className="text-xs text-stone-500">
                  Kemajuan 5 program kerja utama berbasis kebutuhan masyarakat desa
                </p>
              </div>
              <button
                onClick={() => onNavigate('programs')}
                className="text-xs font-medium text-[#4A6B53] hover:text-[#385240] flex items-center gap-1 transition-colors"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {programs.slice(0, 4).map((prog) => (
                <div
                  key={prog.id}
                  onClick={() => onNavigate('programs')}
                  className="p-3 rounded-md hover:bg-[#FAF9F5] transition-colors border border-transparent hover:border-[#E8E6DF] cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span className="font-mono text-stone-600">{prog.code}</span>
                        <span>·</span>
                        <span>{prog.division}</span>
                        <span>·</span>
                        <span>PIC: {prog.pic.split(' ')[0]}</span>
                      </div>
                      <h3 className="text-sm font-medium text-stone-900 group-hover:text-[#4A6B53] transition-colors">
                        {prog.title}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-stone-700 shrink-0">
                      {prog.progressPercent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#EDEAE3] rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full transition-all duration-300"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda & Meetings Box */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-serif text-base font-semibold text-stone-900">
                  Agenda & Pertemuan Terdekat
                </h2>
                <p className="text-xs text-stone-500">
                  Jadwal rapat evaluasi posko, koordinasi balai desa, dan kunjungan DPL
                </p>
              </div>
              <button
                onClick={() => onNavigate('meetings')}
                className="text-xs font-medium text-[#4A6B53] hover:text-[#385240] flex items-center gap-1 transition-colors"
              >
                <span>Buka Agenda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {meetings.slice(0, 3).map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => onNavigate('meetings')}
                  className="p-3 rounded-md border border-[#EBE8E1] hover:border-[#CCDCD0] bg-[#FAF9F5] transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-medium text-[#4A6B53]">{meeting.type}</span>
                    <span className="flex items-center gap-1 text-stone-600">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {meeting.date} · {meeting.time}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-stone-900">{meeting.title}</div>
                  <p className="text-xs text-stone-600 line-clamp-1">{meeting.notesSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Tasks Focus & Quick Links */}
        <div className="space-y-6">
          {/* Action Tasks Card */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-base font-semibold text-stone-900">
                  Tugas Prioritas
                </h2>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-[#4A6B53] font-medium hover:underline"
              >
                Lihat Board
              </button>
            </div>

            <div className="space-y-2.5">
              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-2.5 p-2 rounded-md hover:bg-stone-50 text-xs transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={t.status === 'done'}
                    onChange={() => onToggleTask(t.id)}
                    className="mt-0.5 rounded border-stone-300 text-[#4A6B53] focus:ring-[#4A6B53] cursor-pointer"
                    id={`overview-task-${t.id}`}
                  />
                  <label
                    htmlFor={`overview-task-${t.id}`}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="text-stone-800 font-medium group-hover:text-stone-900 line-clamp-2">
                      {t.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span>{t.assignee.split(' ')[0]}</span>
                      <span>·</span>
                      <span className={t.priority === 'urgent' ? 'text-amber-800 font-medium' : ''}>
                        {t.priority}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Posko Contact & Quick Notice */}
          <div className="p-4 rounded-lg bg-[#F7F6F2] border border-[#E3E0D6] text-xs space-y-3">
            <div className="font-semibold text-stone-800 flex items-center justify-between">
              <span>Posko KKN Pringgasela Selatan</span>
              <span className="text-[11px] text-[#4A6B53] font-medium">Desa Pringgasela Selatan</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Dusun Gubuk Lauk RT 03 (Sentra Tenun Gedogan). Kontak Ketua Tim (Josua Ujung): +62 882-9692-4050.
            </p>
            <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-[11px] text-stone-500">
              <span>DPL: Dr. Lalu Syamsuddin, M.Si.</span>
              <button
                onClick={() => onNavigate('members')}
                className="text-[#4A6B53] font-medium hover:underline"
              >
                Lihat Kontak Tim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
