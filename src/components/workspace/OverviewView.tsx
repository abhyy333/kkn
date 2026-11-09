import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Plus,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  DecisionLogRecord,
  MeetingItem,
  TaskItem,
  TransactionRecord,
  WorkProgram,
  WorkspaceModuleId,
} from '../../types';

interface OverviewViewProps {
  programs: WorkProgram[];
  tasks: TaskItem[];
  meetings: MeetingItem[];
  transactions: TransactionRecord[];
  decisions: DecisionLogRecord[];
  onNavigate: (page: WorkspaceModuleId) => void;
  onToggleTask?: (taskId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  programs,
  tasks,
  meetings,
  transactions,
  decisions,
  onNavigate,
  onToggleTask,
}) => {
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');
  const nextMeeting = upcomingMeetings[0] || meetings[0];

  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');

  const avgProgramProgress = Math.round(
    programs.reduce((acc, p) => acc + p.progressPercent, 0) / (programs.length || 1)
  );

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Compact Page Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-stone-900 tracking-tight">
            Overview
          </h1>
          <p className="text-xs text-stone-500">
            Ringkasan operasional KKN Desa Pringgasela Selatan, agenda rapat, tugas prioritas, dan realisasi program kerja.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('meetings')}
            className="px-3 py-1.5 rounded-md border border-[#E8E6DF] bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
          >
            Jadwal Rapat
          </button>
          <button
            onClick={() => onNavigate('tasks')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] hover:bg-[#3d5944] text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Tugas</span>
          </button>
        </div>
      </div>

      {/* Clean, Consistently Sized Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('programs')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[104px]"
        >
          <span className="text-xs text-stone-500 font-normal">Realisasi Program Kerja</span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold text-stone-900 tabular-nums">
              {avgProgramProgress}%
            </span>
            <span className="text-[11px] text-stone-500">
              {programs.length} program
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[104px]"
        >
          <span className="text-xs text-stone-500 font-normal">Penyelesaian Tugas</span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold text-stone-900 tabular-nums">
              {completedTasks}/{tasks.length}
            </span>
            <span className="text-[11px] text-stone-500">
              {inProgressTasks} berjalan
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[104px]"
        >
          <span className="text-xs text-stone-500 font-normal">Saldo Kas Operasional</span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-semibold text-stone-900 tabular-nums">
              Rp {(currentBalance / 1000000).toFixed(1)} jt
            </span>
            <span className="text-[11px] text-stone-500">
              {transactions.length} transaksi
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('decisions')}
          className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-stone-300 transition-colors text-left flex flex-col justify-between min-h-[104px]"
        >
          <span className="text-xs text-stone-500 font-normal">Keputusan & Rapat</span>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold text-stone-900 tabular-nums">
              {decisions.length}
            </span>
            <span className="text-[11px] text-stone-500">
              {meetings.length} rapat
            </span>
          </div>
        </button>
      </div>

      {/* Main Content Grid: Next Meeting & Priority Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Scheduled Meeting */}
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Agenda Rapat Terdekat</h2>
                <p className="text-xs text-stone-500">Jadwal koordinasi anggota dan evaluasi</p>
              </div>
              <button
                onClick={() => onNavigate('meetings')}
                className="text-xs text-[#4A6B53] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Semua rapat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {nextMeeting ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-stone-500">{nextMeeting.type}</div>
                  <h3 className="text-sm font-semibold text-stone-900 mt-0.5">
                    {nextMeeting.title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{nextMeeting.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{nextMeeting.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{nextMeeting.location}</span>
                  </div>
                </div>

                {nextMeeting.agenda && nextMeeting.agenda.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 space-y-1.5">
                    <div className="text-[11px] font-medium text-stone-400">Pokok Bahasan</div>
                    <ul className="space-y-1">
                      {nextMeeting.agenda.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="text-xs text-stone-600 flex items-start gap-2">
                          <span className="text-stone-400 font-mono text-[11px]">{idx + 1}.</span>
                          <span className="line-clamp-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500 py-6 text-center">
                Belum ada rapat terjadwal dalam waktu dekat.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>{upcomingMeetings.length} rapat akan datang</span>
            <button
              onClick={() => onNavigate('meetings')}
              className="text-stone-700 hover:text-stone-900 font-medium"
            >
              Buka Notulensi →
            </button>
          </div>
        </div>

        {/* Priority & Urgent Tasks */}
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Tugas Prioritas</h2>
                <p className="text-xs text-stone-500">Tindak lanjut operasional yang memerlukan perhatian</p>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-[#4A6B53] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Semua tugas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {(urgentTasks.length > 0 ? urgentTasks : tasks.filter((t) => t.status !== 'done'))
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleTask?.(task.id)}
                        className="mt-0.5 text-stone-400 hover:text-[#4A6B53] transition-colors shrink-0"
                        title="Tandai selesai"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4A6B53]" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <div
                        onClick={() => onNavigate('tasks')}
                        className="min-w-0 cursor-pointer"
                      >
                        <div className="text-xs font-medium text-stone-900 group-hover:text-[#4A6B53] transition-colors truncate">
                          {task.title}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                          {task.assignee} · {task.division}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-stone-400 font-mono">{task.dueDate}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>{urgentTasks.length} tugas berprioritas mendesak</span>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-stone-700 hover:text-stone-900 font-medium"
            >
              Kelola Tugas →
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Work Programs & Recent Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Programs List */}
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Progres Program Kerja</h2>
              <p className="text-xs text-stone-500">Status pelaksanaan program utama dan pendamping</p>
            </div>
            <button
              onClick={() => onNavigate('programs')}
              className="text-xs text-[#4A6B53] hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {programs.slice(0, 5).map((program) => (
              <div
                key={program.id}
                onClick={() => onNavigate('programs')}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-stone-900 group-hover:text-[#4A6B53] transition-colors truncate">
                    {program.title}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                    {program.division} · PIC: {program.pic.split(' (')[0]}
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-700 tabular-nums shrink-0">
                  {program.progressPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Log Summary */}
        <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Keputusan Musyawarah Terbaru</h2>
                <p className="text-xs text-stone-500">Hasil kesepakatan rapat posko dan koordinasi desa</p>
              </div>
              <button
                onClick={() => onNavigate('decisions')}
                className="text-xs text-[#4A6B53] hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Semua</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {decisions.slice(0, 4).map((dec) => (
                <div
                  key={dec.id}
                  onClick={() => onNavigate('decisions')}
                  className="py-2.5 first:pt-0 last:pb-0 space-y-0.5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-stone-900 group-hover:text-[#4A6B53] transition-colors truncate">
                      {dec.title}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono shrink-0">{dec.date}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-1">
                    PIC: {dec.pic}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>{decisions.length} keputusan terdokumentasi</span>
            <button
              onClick={() => onNavigate('decisions')}
              className="text-stone-700 hover:text-stone-900 font-medium"
            >
              Log Keputusan →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
