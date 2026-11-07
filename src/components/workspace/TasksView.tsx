import React, { useState } from 'react';
import { TaskItem, Member } from '../../types';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface TasksViewProps {
  tasks: TaskItem[];
  members: Member[];
  onAddTask: (task: TaskItem) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskItem['status']) => void;
  onToggleComplete: (taskId: string) => void;
}

const COLUMNS: { id: TaskItem['status']; label: string; dotColor: string }[] = [
  { id: 'todo', label: 'To-Do', dotColor: 'bg-stone-400' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
  { id: 'review', label: 'Review DPL / BPH', dotColor: 'bg-indigo-500' },
  { id: 'done', label: 'Selesai', dotColor: 'bg-[#4A6B53]' },
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  members,
  onAddTask,
  onUpdateTaskStatus,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(members[0]?.name || 'Josua Ujung');
  const [division, setDivision] = useState('Divisi Acara');
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');
  const [dueDate, setDueDate] = useState('2026-08-05');
  const [tagsStr, setTagsStr] = useState('Logistik, Posko');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee.toLowerCase().includes(search.toLowerCase());
    const matchesDivision = divisionFilter === 'all' || t.division === divisionFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesDivision && matchesPriority;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      title,
      description,
      assignee,
      division,
      priority,
      status: 'todo',
      dueDate,
      tags: tagsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    onAddTask(newTask);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const getNextStatus = (current: TaskItem['status']): TaskItem['status'] | null => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'review';
    if (current === 'review') return 'done';
    return null;
  };

  const getPrevStatus = (current: TaskItem['status']): TaskItem['status'] | null => {
    if (current === 'done') return 'review';
    if (current === 'review') return 'in_progress';
    if (current === 'in_progress') return 'todo';
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Task Check">
              ✅
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Tasks & Target Lapangan
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Daftar tugas terkoordinasi antar 5 divisi, tenggat waktu penyiapan program, dan tracking progres harian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher Table / Kanban */}
          <div className="flex items-center p-0.5 rounded-md bg-[#EDEAE3] border border-[#E0DED7]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Tampilan Kanban Board"
              aria-label="Tampilan Kanban Board"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Tampilan Tabel"
              aria-label="Tampilan Tabel"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas, PIC penanggung jawab, atau tag..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#4A6B53]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Divisi</option>
            <option value="Badan Pengurus Harian (BPH)">BPH</option>
            <option value="Divisi Ekonomi">Divisi Ekonomi & UMKM</option>
            <option value="Divisi Kesehatan">Divisi Kesehatan & Stunting</option>
            <option value="Divisi Pendidikan">Divisi Pendidikan</option>
            <option value="Divisi Lingkungan">Divisi Lingkungan</option>
            <option value="Divisi Humas & IT">Divisi Humas & IT</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Prioritas</option>
            <option value="urgent">Mendesak (Urgent)</option>
            <option value="high">Tinggi (High)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="low">Rendah (Low)</option>
          </select>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#F6F5F0] rounded-lg p-3 border border-[#E8E6DF] space-y-3 min-h-[350px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E3E0D6] px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-semibold text-stone-800">{col.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.2 rounded border border-stone-200">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {colTasks.map((t) => {
                    const nextSt = getNextStatus(t.status);
                    const prevSt = getPrevStatus(t.status);

                    return (
                      <div
                        key={t.id}
                        className="p-3 bg-white rounded-md border border-[#E0DED7] hover:border-[#CCDCD0] shadow-2xs space-y-2 group transition-all"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="text-xs font-medium text-stone-900 line-clamp-2 leading-snug">
                            {t.title}
                          </h3>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1.5 border-t border-stone-100">
                          <span className="truncate font-medium text-stone-700">
                            {t.assignee.split(' ')[0]}
                          </span>

                          <div className="flex items-center gap-1 text-stone-400">
                            <Calendar className="w-3 h-3" />
                            <span>{t.dueDate.slice(5)}</span>
                          </div>
                        </div>

                        {/* Fast Status Shift Controls */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-100/70 text-[10px]">
                          {prevSt ? (
                            <button
                              onClick={() => onUpdateTaskStatus(t.id, prevSt)}
                              className="text-stone-400 hover:text-stone-700 flex items-center gap-0.5 p-0.5"
                              title="Pindahkan ke kolom sebelumnya"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              <span>Kembali</span>
                            </button>
                          ) : (
                            <span />
                          )}

                          {nextSt ? (
                            <button
                              onClick={() => onUpdateTaskStatus(t.id, nextSt)}
                              className="text-[#4A6B53] hover:text-[#385240] font-medium flex items-center gap-0.5 p-0.5"
                              title="Pindahkan ke tahap berikutnya"
                            >
                              <span>Lanjut</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[#4A6B53] font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Tuntas</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-stone-400 border border-dashed border-stone-300 rounded-md">
                      Belum ada tugas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg border border-[#E8E6DF] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-stone-500 border-b border-[#E8E6DF]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Judul Tugas</th>
                  <th className="py-2.5 px-4 font-medium">Divisi</th>
                  <th className="py-2.5 px-4 font-medium">PIC</th>
                  <th className="py-2.5 px-4 font-medium">Prioritas</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Tenggat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-stone-900 max-w-xs">
                      <div>{t.title}</div>
                      {t.description && (
                        <div className="text-[11px] text-stone-500 truncate mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600">{t.division}</td>
                    <td className="py-3 px-4 text-stone-800 font-medium">{t.assignee}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-medium ${
                          t.priority === 'urgent'
                            ? 'text-red-700 font-semibold'
                            : t.priority === 'high'
                            ? 'text-amber-700'
                            : 'text-stone-600'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={t.status}
                        onChange={(e) =>
                          onUpdateTaskStatus(t.id, e.target.value as TaskItem['status'])
                        }
                        className="text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-700"
                      >
                        <option value="todo">To-Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Selesai</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                      {t.dueDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Tambah Tugas Baru
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
                <label className="font-medium text-stone-700">Nama Tugas</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Cetak pamflet penyuluhan gizi 100 lbr"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi Detail</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruksi tambahan, spesifikasi, atau lokasi..."
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Penanggung Jawab (PIC)</label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Divisi</label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Badan Pengurus Harian (BPH)">BPH</option>
                    <option value="Divisi Ekonomi">Divisi Ekonomi</option>
                    <option value="Divisi Kesehatan">Divisi Kesehatan</option>
                    <option value="Divisi Pendidikan">Divisi Pendidikan</option>
                    <option value="Divisi Lingkungan">Divisi Lingkungan</option>
                    <option value="Divisi Humas & IT">Divisi Humas & IT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tingkat Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskItem['priority'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Sedang (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Mendesak (Urgent)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tenggat Waktu</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
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
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
