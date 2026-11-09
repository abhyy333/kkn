import React, { useState, useMemo } from 'react';
import { TaskItem, Member, TaskAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileUploader } from '../common/FileUploader';
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
  Users,
  Paperclip,
  ExternalLink,
  Edit3,
  Trash2,
  Clock,
  Filter,
  CheckSquare,
  Square,
  X,
  Tag,
  AlertTriangle,
} from 'lucide-react';

interface TasksViewProps {
  tasks: TaskItem[];
  members: Member[];
  onAddTask: (task: TaskItem) => Promise<void> | void;
  onUpdateTask?: (task: TaskItem) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskItem['status']) => Promise<void> | void;
  onToggleComplete: (taskId: string) => Promise<void> | void;
}

const COLUMNS: { id: TaskItem['status']; label: string; dotColor: string }[] = [
  { id: 'todo', label: 'To-Do', dotColor: 'bg-stone-400' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
  { id: 'review', label: 'Review DPL / BPH', dotColor: 'bg-indigo-500' },
  { id: 'done', label: 'Selesai', dotColor: 'bg-[#4A6B53]' },
];

const DIVISIONS = [
  'Semua Divisi',
  'Badan Pengurus Harian (BPH)',
  'Divisi Acara',
  'Divisi PDD',
  'Divisi Humper',
  'Divisi Konsumsi',
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  members,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onToggleComplete,
}) => {
  const { user, profile } = useAuth();
  const isDpl = profile?.role === 'dpl';
  const canEdit = !!user && !isDpl;

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignee, setFormAssignee] = useState(members[0]?.name || 'Josua Ujung');
  const [formMemberId, setFormMemberId] = useState(members[0]?.id || 'm-1');
  const [formDivision, setFormDivision] = useState('Divisi Acara');
  const [formPriority, setFormPriority] = useState<TaskItem['priority']>('medium');
  const [formStatus, setFormStatus] = useState<TaskItem['status']>('todo');
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTagsStr, setFormTagsStr] = useState('Operasional, Lapangan');
  const [formAttachments, setFormAttachments] = useState<TaskAttachment[]>([]);

  // Today ISO string for overdue detection
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)));

      const matchesDivision = divisionFilter === 'all' || t.division === divisionFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || t.assignee === assigneeFilter;

      let matchesMyTasks = true;
      if (onlyMyTasks) {
        const myName = profile?.displayName?.toLowerCase();
        const myEmail = user?.email?.toLowerCase();
        matchesMyTasks =
          (myName && t.assignee.toLowerCase().includes(myName)) ||
          (t.memberId && profile?.memberId === t.memberId) ||
          (myEmail === 'abhyy333@gmail.com' && t.assignee.toLowerCase().includes('habir'));
      }

      return matchesSearch && matchesDivision && matchesPriority && matchesAssignee && matchesMyTasks;
    });
  }, [tasks, search, divisionFilter, priorityFilter, assigneeFilter, onlyMyTasks, profile, user]);

  // Aggregate stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr
  ).length;
  const percentComplete = Math.round((doneTasks / (totalTasks || 1)) * 100);

  // Open Create Modal
  const openCreateModal = (defaultStatus: TaskItem['status'] = 'todo') => {
    setFormTitle('');
    setFormDescription('');
    setFormAssignee(members[0]?.name || 'Josua Ujung');
    setFormMemberId(members[0]?.id || 'm-1');
    setFormDivision('Divisi Acara');
    setFormPriority('medium');
    setFormStatus(defaultStatus);
    setFormDueDate(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    setFormTagsStr('Operasional');
    setFormAttachments([]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormAssignee(task.assignee);
    setFormMemberId(task.memberId || '');
    setFormDivision(task.division);
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormDueDate(task.dueDate);
    setFormTagsStr(task.tags ? task.tags.join(', ') : '');
    setFormAttachments(task.attachments || []);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const tags = formTagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      assignee: formAssignee,
      memberId: formMemberId,
      division: formDivision,
      priority: formPriority,
      status: formStatus,
      dueDate: formDueDate,
      tags,
      attachments: formAttachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddTask(newTask);
    setIsCreateModalOpen(false);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !formTitle.trim()) return;

    const tags = formTagsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: TaskItem = {
      ...editingTask,
      title: formTitle.trim(),
      description: formDescription.trim(),
      assignee: formAssignee,
      memberId: formMemberId,
      division: formDivision,
      priority: formPriority,
      status: formStatus,
      dueDate: formDueDate,
      tags,
      attachments: formAttachments,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateTask) {
      await onUpdateTask(updated);
    }
    setEditingTask(null);
  };

  // Kanban column navigation
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

  // Priority badge styling
  const getPriorityBadge = (p: TaskItem['priority']) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-50 text-red-800 border-red-200 font-semibold';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
      case 'medium':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getPriorityLabel = (p: TaskItem['priority']) => {
    switch (p) {
      case 'urgent':
        return 'Mendesak';
      case 'high':
        return 'Tinggi';
      case 'medium':
        return 'Sedang';
      default:
        return 'Rendah';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="Tasks">
              ✅
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Task Management & Logbook Kerja
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#284230] border border-[#CCDCD0] font-medium">
              {doneTasks}/{totalTasks} Selesai ({percentComplete}%)
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Distribusi penugasan divisi posko, penanggung jawab 10 mahasiswa KKN, prioritas tugas, tenggat waktu, dan sinkronisasi logbook.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canEdit && (
            <button
              onClick={() => openCreateModal('todo')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
            Total Tugas Posko
          </span>
          <span className="font-serif text-xl font-bold text-stone-900">{totalTasks} Tugas</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
            Tuntas Diselesaikan
          </span>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold text-emerald-800">{doneTasks}</span>
            <span className="text-xs text-emerald-600 font-medium">({percentComplete}%)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
            Prioritas Mendesak
          </span>
          <span className={`font-serif text-xl font-bold ${urgentTasks > 0 ? 'text-amber-800' : 'text-stone-700'}`}>
            {urgentTasks} Mendesak
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
            Melewati Tenggat (Overdue)
          </span>
          <span className={`font-serif text-xl font-bold ${overdueTasks > 0 ? 'text-red-700' : 'text-stone-700'}`}>
            {overdueTasks} Terlambat
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas, deskripsi, atau nama PIC..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#4A6B53] focus:ring-1 focus:ring-[#4A6B53]"
            />
          </div>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d === 'Semua Divisi' ? 'all' : d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Prioritas</option>
            <option value="urgent">Mendesak</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          {user && (
            <button
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                onlyMyTasks
                  ? 'bg-[#284230] text-white border-[#284230] shadow-2xs'
                  : 'bg-white text-stone-700 border-[#E0DED7] hover:bg-stone-50'
              }`}
            >
              Tugas Saya
            </button>
          )}

          {/* View switcher: Kanban vs Table */}
          <div className="flex items-center bg-[#EFECE5] p-0.5 rounded-lg text-xs border border-[#DFDBD0]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'kanban'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Tampilan Papan Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Tampilan Tabel Berbaris"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#F7F6F2] rounded-xl border border-[#E8E6DF] p-3 space-y-3 min-h-[450px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="font-serif font-semibold text-xs text-stone-800">
                      {col.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/80 text-stone-600 font-mono">
                      {colTasks.length}
                    </span>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => openCreateModal(col.id)}
                      className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70"
                      title={`Tambah tugas baru di kolom ${col.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Column Task Cards */}
                <div className="space-y-2.5 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-stone-400 text-[11px] italic">
                      Kosong
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const isOverdue = t.status !== 'done' && t.dueDate && t.dueDate < todayStr;
                      const assigneeMember = members.find((m) => m.name === t.assignee || m.id === t.memberId);

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-lg bg-white border border-[#E3E0D6] shadow-2xs hover:border-[#CCDCD0] hover:shadow-xs transition-all space-y-2.5 text-xs text-left group"
                        >
                          {/* Priority & Division Strip */}
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${getPriorityBadge(
                                t.priority
                              )}`}
                            >
                              {getPriorityLabel(t.priority)}
                            </span>

                            <span className="text-[10px] text-stone-500 font-medium truncate max-w-[120px]">
                              {t.division}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="font-medium text-stone-900 leading-snug line-clamp-2">
                            {t.title}
                          </h4>

                          {/* Description if present */}
                          {t.description && (
                            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}

                          {/* Tags */}
                          {t.tags && t.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {t.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Attachments Indicator */}
                          {t.attachments && t.attachments.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-stone-100">
                              {t.attachments.map((att, idx) => (
                                <a
                                  key={idx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-[#4A6B53] hover:underline truncate"
                                >
                                  <Paperclip className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Bottom: Assignee & Due Date */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-[11px]">
                            {/* Assignee chip with photo */}
                            <div className="flex items-center gap-1.5 truncate">
                              {assigneeMember?.avatar ? (
                                <img
                                  src={assigneeMember.avatar}
                                  alt={t.assignee || 'Tim KKN'}
                                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-stone-200"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-[#EBF1ED] text-[#284230] font-bold text-[9px] flex items-center justify-center shrink-0">
                                  {(t.assignee || 'T')[0]}
                                </div>
                              )}
                              <span className="text-stone-700 truncate font-medium">
                                {(t.assignee || 'Tim').split(' ')[0]}
                              </span>
                            </div>

                            {/* Due Date Indicator */}
                            <div
                              className={`flex items-center gap-1 font-mono text-[10px] shrink-0 ${
                                isOverdue
                                  ? 'text-red-700 font-bold'
                                  : t.status === 'done'
                                  ? 'text-stone-400'
                                  : 'text-stone-500'
                              }`}
                              title={isOverdue ? 'Tugas melewati tenggat waktu!' : undefined}
                            >
                              {isOverdue && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                              <span>{t.dueDate}</span>
                            </div>
                          </div>

                          {/* Card Actions: Move left, move right, edit, delete */}
                          {canEdit && (
                            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-stone-400">
                              <div className="flex items-center gap-1">
                                {getPrevStatus(t.status) && (
                                  <button
                                    onClick={() => onUpdateTaskStatus(t.id, getPrevStatus(t.status)!)}
                                    className="p-1 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                                    title="Pindahkan ke kolom sebelumnya"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {getNextStatus(t.status) && (
                                  <button
                                    onClick={() => onUpdateTaskStatus(t.id, getNextStatus(t.status)!)}
                                    className="p-1 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                                    title="Pindahkan ke kolom berikutnya"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800"
                                  title="Edit tugas"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteTask && (
                                  <button
                                    onClick={() => setDeletingTaskId(t.id)}
                                    className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600"
                                    title="Hapus tugas"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW MODE 2: TABLE LIST VIEW */
        <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E8E6DF] text-stone-500 font-medium text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">Status</th>
                  <th className="py-2.5 px-3">Judul Tugas & Rincian</th>
                  <th className="py-2.5 px-3">Divisi</th>
                  <th className="py-2.5 px-3">Penanggung Jawab (PIC)</th>
                  <th className="py-2.5 px-3">Prioritas</th>
                  <th className="py-2.5 px-3">Tenggat</th>
                  {canEdit && <th className="py-2.5 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400 italic">
                      Tidak ada tugas yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const isOverdue = t.status !== 'done' && t.dueDate && t.dueDate < todayStr;
                    const assigneeMember = members.find((m) => m.name === t.assignee || m.id === t.memberId);

                    return (
                      <tr key={t.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onToggleComplete(t.id)}
                            disabled={!canEdit}
                            className={`cursor-pointer ${!canEdit ? 'opacity-70 cursor-default' : ''}`}
                          >
                            {t.status === 'done' ? (
                              <CheckSquare className="w-4 h-4 text-[#4A6B53]" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-400 hover:text-stone-700" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-md">
                            <span
                              className={`font-medium text-stone-900 block ${
                                t.status === 'done' ? 'line-through text-stone-400' : ''
                              }`}
                            >
                              {t.title}
                            </span>
                            {t.description && (
                              <p className="text-[11px] text-stone-500 line-clamp-1">{t.description}</p>
                            )}
                            {t.attachments && t.attachments.length > 0 && (
                              <div className="flex items-center gap-2 pt-0.5">
                                {t.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-[#4A6B53] hover:underline"
                                  >
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span>{att.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-stone-600 font-medium truncate">{t.division}</td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {assigneeMember?.avatar ? (
                              <img
                                src={assigneeMember.avatar}
                                alt={t.assignee || 'Tim KKN'}
                                className="w-5 h-5 rounded-full object-cover shrink-0 border border-stone-200"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[#EBF1ED] text-[#284230] font-bold text-[9px] flex items-center justify-center shrink-0">
                                {(t.assignee || 'T')[0]}
                              </div>
                            )}
                            <span className="text-stone-800 font-medium truncate">{t.assignee || 'Tim KKN'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${getPriorityBadge(
                              t.priority
                            )}`}
                          >
                            {getPriorityLabel(t.priority)}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px]">
                          <span className={isOverdue ? 'text-red-700 font-bold flex items-center gap-1' : 'text-stone-600'}>
                            {isOverdue && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
                            {t.dueDate}
                          </span>
                        </td>

                        {canEdit && (
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <select
                                value={t.status}
                                onChange={(e) => onUpdateTaskStatus(t.id, e.target.value as any)}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-stone-200 bg-white text-stone-700 focus:outline-none focus:border-[#4A6B53]"
                              >
                                <option value="todo">To-Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Selesai</option>
                              </select>

                              <button
                                onClick={() => openEditModal(t)}
                                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                                title="Edit tugas"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {onDeleteTask && (
                                <button
                                  onClick={() => setDeletingTaskId(t.id)}
                                  className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50"
                                  title="Hapus tugas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Tambah Tugas Baru
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Tugas *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pembuatan poster edukasi stunting posyandu"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi / Detail Pengerjaan</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Spesifikasi tugas, instruksi koordinasi, atau rincian teknis..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Penanggung Jawab (PIC)</label>
                  <select
                    value={formAssignee}
                    onChange={(e) => {
                      setFormAssignee(e.target.value);
                      const mem = members.find((m) => m.name === e.target.value);
                      if (mem) {
                        setFormMemberId(mem.id);
                        if (mem.division) setFormDivision(mem.division);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Divisi</label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {DIVISIONS.filter((d) => d !== 'Semua Divisi').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Prioritas</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Mendesak</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tenggat Waktu</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Tag / Label (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={formTagsStr}
                  onChange={(e) => setFormTagsStr(e.target.value)}
                  placeholder="e.g. Desain, Cetak, Dapur, Logistik"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              {/* Attachments inside modal via Supabase Storage */}
              <div className="pt-1 border-t border-stone-100">
                <FileUploader
                  folder="tasks"
                  accept="any"
                  multiple={true}
                  label="Lampiran Dokumen / Berkas Tugas"
                  helperText="Unggah PDF, Word, Excel, Desain, atau Foto Pendukung"
                  files={formAttachments.map((att, idx) => ({
                    id: `task-att-${idx}`,
                    name: att.name,
                    url: att.url,
                    storagePath: att.storagePath || '',
                    contentType: att.contentType || 'application/octet-stream',
                    size: 0,
                    sizeFormatted: att.sizeFormatted || 'Lampiran',
                    folder: 'tasks',
                    uploadedAt: new Date().toISOString(),
                  }))}
                  onChange={(uploaded) =>
                    setFormAttachments(
                      uploaded.map((u) => ({
                        name: u.name,
                        url: u.url,
                        storagePath: u.storagePath,
                        sizeFormatted: u.sizeFormatted,
                        contentType: u.contentType,
                      }))
                    )
                  }
                  compact
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] shadow-xs"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#4A6B53]" />
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Edit Tugas
                </h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Tugas *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi / Detail</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">PIC</label>
                  <select
                    value={formAssignee}
                    onChange={(e) => {
                      setFormAssignee(e.target.value);
                      const mem = members.find((m) => m.name === e.target.value);
                      if (mem) setFormMemberId(mem.id);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Divisi</label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {DIVISIONS.filter((d) => d !== 'Semua Divisi').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Prioritas</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Mendesak</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tenggat Waktu</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                >
                  <option value="todo">To-Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Selesai</option>
                </select>
              </div>

              <div className="pt-1 border-t border-stone-100">
                <FileUploader
                  folder="tasks"
                  accept="any"
                  multiple={true}
                  label="Lampiran Dokumen / Berkas Tugas"
                  helperText="Unggah atau hapus berkas pendukung tugas"
                  files={formAttachments.map((att, idx) => ({
                    id: `edit-task-att-${idx}`,
                    name: att.name,
                    url: att.url,
                    storagePath: att.storagePath || '',
                    contentType: att.contentType || 'application/octet-stream',
                    size: 0,
                    sizeFormatted: att.sizeFormatted || 'Lampiran',
                    folder: 'tasks',
                    uploadedAt: new Date().toISOString(),
                  }))}
                  onChange={(uploaded) =>
                    setFormAttachments(
                      uploaded.map((u) => ({
                        name: u.name,
                        url: u.url,
                        storagePath: u.storagePath,
                        sizeFormatted: u.sizeFormatted,
                        contentType: u.contentType,
                      }))
                    )
                  }
                  compact
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] shadow-xs"
                >
                  Perbarui Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-sm w-full p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-stone-900 text-sm">Hapus Tugas Ini?</h3>
            </div>
            <p className="text-stone-600">
              Tugas ini akan dihapus dari database posko KKN Pringgasela Selatan secara permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTaskId(null)}
                className="px-3 py-1.5 rounded text-stone-600 hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (onDeleteTask) {
                    await onDeleteTask(deletingTaskId);
                  }
                  setDeletingTaskId(null);
                }}
                className="px-3 py-1.5 rounded bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
