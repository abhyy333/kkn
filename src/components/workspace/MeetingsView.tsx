import React, { useState, useMemo } from 'react';
import { MeetingItem, MeetingAttendee, MeetingDocument, Member } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FileUploader } from '../common/FileUploader';
import { deleteFileFromStorage, triggerFileDownload } from '../../utils/storageService';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  CheckCircle2,
  ListTodo,
  FileText,
  Paperclip,
  ExternalLink,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
  Share2,
} from 'lucide-react';

interface MeetingsViewProps {
  meetings: MeetingItem[];
  members: Member[];
  onAddMeeting: (meeting: MeetingItem) => Promise<void> | void;
  onUpdateMeeting?: (meeting: MeetingItem) => Promise<void> | void;
  onDeleteMeeting?: (meetingId: string) => Promise<void> | void;
  onToggleActionItem?: (meetingId: string, actionItemId: string) => Promise<void> | void;
}

const MEETING_TYPES: MeetingItem['type'][] = [
  'Internal Posko',
  'Koordinasi Desa',
  'Supervisi DPL',
  'Evaluasi Mingguan',
  'Musyawarah Warga',
];

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  members,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onToggleActionItem,
}) => {
  const { user, profile, isAdmin } = useAuth();
  const isDpl = profile?.role === 'dpl';
  const canEdit = !!user && !isDpl;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    meetings[0]?.id || null
  );

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState('19:30 - 21:00 WITA');
  const [formLocation, setFormLocation] = useState('Posko KKN Desa Pringgasela Selatan');
  const [formType, setFormType] = useState<MeetingItem['type']>('Internal Posko');
  const [formNotes, setFormNotes] = useState('');
  const [formAgendaLines, setFormAgendaLines] = useState(
    'Evaluasi capaian program kerja mingguan\nSinkronisasi logbook DPL & administrasi posko\nPembagian jadwal piket kebersihan dan konsumsi'
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [formDocs, setFormDocs] = useState<MeetingDocument[]>([]);
  const [actionItemText, setActionItemText] = useState('');
  const [actionItemPic, setActionItemPic] = useState('');
  const [formActionItems, setFormActionItems] = useState<{ id: string; text: string; pic: string; completed: boolean }[]>([]);

  // Filtered meetings
  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      if (!m) return false;
      const q = search.toLowerCase();
      const matchesSearch =
        (m.title || '').toLowerCase().includes(q) ||
        (m.notesSummary || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (Array.isArray(m.agenda) && m.agenda.some((a) => String(a || '').toLowerCase().includes(q)));

      const matchesType = filterType === 'all' || m.type === filterType;
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [meetings, search, filterType, filterStatus]);

  // Selected meeting
  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || filtered[0] || null;
  }, [meetings, selectedMeetingId, filtered]);

  // Initialize Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTime('19:30 - 21:00 WITA');
    setFormLocation('Posko KKN Desa Pringgasela Selatan');
    setFormType('Internal Posko');
    setFormNotes('');
    setFormAgendaLines(
      'Evaluasi capaian program kerja mingguan\nSinkronisasi logbook DPL & administrasi posko\nPembagian jadwal piket kebersihan dan konsumsi'
    );
    setSelectedParticipantIds(members.map((m) => m.id));
    setFormDocs([]);
    setFormActionItems([
      { id: `ai-${Date.now()}-1`, text: 'Penyusunan draft laporan mingguan', pic: 'Sekretaris', completed: false },
    ]);
    setIsCreateModalOpen(true);
  };

  // Initialize Edit Modal
  const openEditModal = (meeting: MeetingItem) => {
    setEditingMeeting(meeting);
    setFormTitle(meeting.title);
    setFormDate(meeting.date);
    setFormTime(meeting.time);
    setFormLocation(meeting.location);
    setFormType(meeting.type);
    setFormNotes(meeting.notesSummary);
    setFormAgendaLines(meeting.agenda ? meeting.agenda.join('\n') : '');
    setSelectedParticipantIds(
      meeting.attendeesList
        ? meeting.attendeesList.map((a) => a.memberId)
        : members.map((m) => m.id)
    );
    setFormDocs(meeting.documents || []);
    setFormActionItems(meeting.actionItems || []);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const agenda = formAgendaLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const attendeesList: MeetingAttendee[] = selectedParticipantIds.map((id) => {
      const m = members.find((mem) => mem.id === id);
      return {
        memberId: id,
        name: m ? m.name : 'Anggota KKN',
        status: 'hadir',
      };
    });

    const newMeeting: MeetingItem = {
      id: `mtg-${Date.now()}`,
      title: formTitle.trim(),
      date: formDate,
      time: formTime,
      location: formLocation,
      type: formType,
      attendeesCount: attendeesList.length,
      attendeesList,
      agenda,
      notesSummary: formNotes.trim() || 'Notulensi rapat koordinasi posko.',
      actionItems: formActionItems,
      documents: formDocs,
      status: 'upcoming',
      createdBy: profile?.displayName || user?.email || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddMeeting(newMeeting);
    setSelectedMeetingId(newMeeting.id);
    setIsCreateModalOpen(false);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !formTitle.trim()) return;

    const agenda = formAgendaLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Maintain existing attendance status if member already had one
    const existingMap = new Map(
      (editingMeeting.attendeesList || []).map((a) => [a.memberId, a])
    );

    const attendeesList: MeetingAttendee[] = selectedParticipantIds.map((id) => {
      const existing = existingMap.get(id);
      const m = members.find((mem) => mem.id === id);
      return {
        memberId: id,
        name: m ? m.name : existing?.name || 'Anggota KKN',
        status: existing ? existing.status : 'hadir',
        notes: existing?.notes,
      };
    });

    const updated: MeetingItem = {
      ...editingMeeting,
      title: formTitle.trim(),
      date: formDate,
      time: formTime,
      location: formLocation,
      type: formType,
      attendeesCount: attendeesList.filter((a) => a.status === 'hadir').length,
      attendeesList,
      agenda,
      notesSummary: formNotes.trim(),
      actionItems: formActionItems,
      documents: formDocs,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateMeeting) {
      await onUpdateMeeting(updated);
    }
    setEditingMeeting(null);
  };

  // Toggle Meeting Status (Upcoming <-> Completed)
  const handleToggleStatus = async (meeting: MeetingItem) => {
    if (!canEdit || !onUpdateMeeting) return;
    const nextStatus = meeting.status === 'completed' ? 'upcoming' : 'completed';
    const updated: MeetingItem = {
      ...meeting,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateMeeting(updated);
  };

  // Update Individual Attendance
  const handleUpdateAttendeeStatus = async (
    meeting: MeetingItem,
    memberId: string,
    newStatus: 'hadir' | 'izin' | 'alpa'
  ) => {
    if (!canEdit || !onUpdateMeeting) return;
    const currentList = meeting.attendeesList || members.map((m) => ({
      memberId: m.id,
      name: m.name,
      status: 'hadir' as const,
    }));

    const updatedList = currentList.map((a) =>
      a.memberId === memberId ? { ...a, status: newStatus } : a
    );

    const presentCount = updatedList.filter((a) => a.status === 'hadir').length;

    const updated: MeetingItem = {
      ...meeting,
      attendeesList: updatedList,
      attendeesCount: presentCount,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateMeeting(updated);
  };

  // Mark all present
  const handleMarkAllPresent = async (meeting: MeetingItem) => {
    if (!canEdit || !onUpdateMeeting) return;
    const updatedList: MeetingAttendee[] = (meeting.attendeesList || members).map((m) => ({
      memberId: 'memberId' in m ? (m as any).memberId : (m as any).id,
      name: m.name,
      status: 'hadir',
    }));

    const updated: MeetingItem = {
      ...meeting,
      attendeesList: updatedList,
      attendeesCount: updatedList.length,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateMeeting(updated);
  };

  // Add Action Item to existing selected meeting
  const [inlineActionText, setInlineActionText] = useState('');
  const [inlineActionPic, setInlineActionPic] = useState('');

  const handleAddInlineActionItem = async (meeting: MeetingItem) => {
    if (!canEdit || !onUpdateMeeting || !inlineActionText.trim()) return;
    const newItem = {
      id: `ai-${Date.now()}`,
      text: inlineActionText.trim(),
      pic: inlineActionPic.trim() || 'Divisi Terkait',
      completed: false,
    };
    const updated: MeetingItem = {
      ...meeting,
      actionItems: [...(meeting.actionItems || []), newItem],
      updatedAt: new Date().toISOString(),
    };
    await onUpdateMeeting(updated);
    setInlineActionText('');
    setInlineActionPic('');
  };

  // Add Document to existing selected meeting via Supabase Storage
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const handleDeleteDoc = async (meeting: MeetingItem, index: number) => {
    if (!canEdit || !onUpdateMeeting) return;
    const docToRemove = (meeting.documents || [])[index];
    if (docToRemove?.storagePath) {
      await deleteFileFromStorage(docToRemove.storagePath);
    }
    const nextDocs = [...(meeting.documents || [])];
    nextDocs.splice(index, 1);
    const updated: MeetingItem = {
      ...meeting,
      documents: nextDocs,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateMeeting(updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="Calendar">
              🗓️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Meetings & Agenda
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#284230] border border-[#CCDCD0] font-medium">
              {meetings.length} Rapat Terdata
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Pusat penjadwalan musyawarah, absensi kehadiran 10 mahasiswa KKN, notulensi rapat, dokumen pendukung, dan tindak lanjut program.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Jadwalkan Rapat Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari notula, topik bahasan, atau lokasi rapat..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#4A6B53] focus:ring-1 focus:ring-[#4A6B53]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-[#EFECE5] p-0.5 rounded-lg text-xs border border-[#DFDBD0]">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setFilterStatus('upcoming')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterStatus === 'upcoming'
                  ? 'bg-white text-emerald-900 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Akan Datang
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Selesai
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Jenis Rapat</option>
            {MEETING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meeting List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-stone-500 font-medium">
            <span>Daftar Pertemuan ({filtered.length})</span>
            <span>Urut berdasarkan waktu</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white border border-[#E8E6DF] text-stone-500 text-xs space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-stone-400" />
              <p className="font-medium text-stone-700">Tidak ada jadwal rapat yang cocok</p>
              <p className="text-stone-400">Silakan ubah filter atau kata kunci pencarian.</p>
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
              const isUpcoming = m.status === 'upcoming';
              const attendeesCount =
                m.attendeesList?.filter((a) => a.status === 'hadir').length ?? m.attendeesCount;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2.5 relative ${
                    isSelected
                      ? 'bg-white border-[#4A6B53] shadow-xs ring-1 ring-[#4A6B53]'
                      : 'bg-white border-[#E8E6DF] hover:border-[#CCDCD0] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        m.type === 'Internal Posko'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : m.type === 'Supervisi DPL'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : m.type === 'Koordinasi Desa'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {m.type}
                    </span>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isUpcoming
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {isUpcoming ? 'Akan Datang' : 'Selesai'}
                    </span>
                  </div>

                  <h3 className="font-serif font-medium text-sm text-stone-900 line-clamp-2">
                    {m.title}
                  </h3>

                  <div className="space-y-1 text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono text-stone-700">{m.date}</span>
                      <span className="text-stone-300">·</span>
                      <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{m.time}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{m.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>{attendeesCount} Mahasiswa Hadir</span>
                    </span>

                    {m.actionItems && m.actionItems.length > 0 && (
                      <span className="text-stone-400 font-mono">
                        {m.actionItems.filter((a) => a.completed).length}/{m.actionItems.length} Tindak Lanjut
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Meeting Sheet (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedMeeting ? (
            <div className="bg-white rounded-xl border border-[#E8E6DF] p-6 shadow-xs space-y-6">
              {/* Header Info */}
              <div className="space-y-3 pb-4 border-b border-[#E8E6DF]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        selectedMeeting.type === 'Internal Posko'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : selectedMeeting.type === 'Supervisi DPL'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : selectedMeeting.type === 'Koordinasi Desa'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {selectedMeeting.type}
                    </span>

                    <button
                      onClick={() => handleToggleStatus(selectedMeeting)}
                      disabled={!canEdit}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                        selectedMeeting.status === 'upcoming'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      } ${canEdit ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      title={canEdit ? 'Klik untuk mengganti status rapat' : undefined}
                    >
                      {selectedMeeting.status === 'upcoming' ? 'Status: Akan Datang' : 'Status: Selesai'}
                    </button>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(selectedMeeting)}
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors"
                        title="Edit jadwal atau notula rapat"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteMeeting && (
                        <button
                          onClick={() => setDeletingMeetingId(selectedMeeting.id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus rapat ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 leading-tight">
                  {selectedMeeting.title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 bg-[#FAF9F5] p-3 rounded-lg border border-stone-200/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4A6B53] shrink-0" />
                    <span>Tanggal: <strong className="font-mono text-stone-800">{selectedMeeting.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#4A6B53] shrink-0" />
                    <span>Waktu: <strong className="text-stone-800">{selectedMeeting.time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-[#4A6B53] shrink-0" />
                    <span>Lokasi: <strong className="text-stone-800">{selectedMeeting.location}</strong></span>
                  </div>
                </div>
              </div>

              {/* Attendance Tracking Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#4A6B53]" />
                    <h3 className="font-serif font-semibold text-sm text-stone-900">
                      Daftar Kehadiran Mahasiswa
                    </h3>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => handleMarkAllPresent(selectedMeeting)}
                      className="text-[11px] text-[#4A6B53] hover:underline font-medium"
                    >
                      Tandai Semua Hadir
                    </button>
                  )}
                </div>

                {/* Attendance Summary */}
                {(() => {
                  const list = selectedMeeting.attendeesList || members.map((m) => ({
                    memberId: m.id,
                    name: m.name,
                    status: 'hadir' as const,
                  }));
                  const hadir = list.filter((a) => a.status === 'hadir').length;
                  const izin = list.filter((a) => a.status === 'izin').length;
                  const alpa = list.filter((a) => a.status === 'alpa').length;

                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                        {hadir} Hadir
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                        {izin} Izin
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 font-medium border border-red-200">
                        {alpa} Alpa
                      </span>
                      <span className="text-stone-400 text-[11px] ml-auto">
                        Total {list.length} Anggota
                      </span>
                    </div>
                  );
                })()}

                {/* Attendee Badges / Checkers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {(selectedMeeting.attendeesList || members.map((m) => ({
                    memberId: m.id,
                    name: m.name || 'Anggota KKN',
                    status: 'hadir' as const,
                  }))).map((attendee, idx) => {
                    const memberInfo = members.find((m) => m.id === attendee.memberId);
                    const displayName = attendee.name || memberInfo?.name || 'Anggota KKN';
                    const initial = displayName.trim()[0] || 'A';

                    return (
                      <div
                        key={attendee.memberId || `att-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] border border-stone-200/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {memberInfo?.avatar ? (
                            <img
                              src={memberInfo.avatar}
                              alt={displayName}
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#EBF1ED] text-[#284230] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-medium text-stone-800 truncate block">
                              {displayName}
                            </span>
                            <span className="text-[10px] text-stone-400 block truncate">
                              {memberInfo?.division || 'Tim KKN'}
                            </span>
                          </div>
                        </div>

                        {canEdit ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleUpdateAttendeeStatus(selectedMeeting, attendee.memberId, 'hadir')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                attendee.status === 'hadir'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:bg-stone-200'
                              }`}
                              title="Hadir"
                            >
                              H
                            </button>
                            <button
                              onClick={() => handleUpdateAttendeeStatus(selectedMeeting, attendee.memberId, 'izin')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                attendee.status === 'izin'
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:bg-stone-200'
                              }`}
                              title="Izin"
                            >
                              I
                            </button>
                            <button
                              onClick={() => handleUpdateAttendeeStatus(selectedMeeting, attendee.memberId, 'alpa')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                attendee.status === 'alpa'
                                  ? 'bg-red-600 text-white shadow-2xs'
                                  : 'text-stone-500 hover:bg-stone-200'
                              }`}
                              title="Alpa"
                            >
                              A
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              attendee.status === 'hadir'
                                ? 'bg-emerald-50 text-emerald-800'
                                : attendee.status === 'izin'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-red-50 text-red-800'
                            }`}
                          >
                            {attendee.status === 'hadir' ? 'Hadir' : attendee.status === 'izin' ? 'Izin' : 'Alpa'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agenda Items */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
                  <ListTodo className="w-4 h-4 text-[#4A6B53]" />
                  <h3 className="font-serif font-semibold text-sm text-stone-900">
                    Agenda & Poin Pembahasan
                  </h3>
                </div>

                <div className="space-y-1.5">
                  {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 ? (
                    selectedMeeting.agenda.map((ag, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-stone-50/80 border border-stone-200/60 text-xs text-stone-800"
                      >
                        <span className="font-mono text-[#4A6B53] font-bold text-xs shrink-0 mt-0.5">
                          {idx + 1}.
                        </span>
                        <span className="leading-relaxed">{ag}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-400 italic">Belum ada rincian agenda.</p>
                  )}
                </div>
              </div>

              {/* Meeting Minutes (Notulensi) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-stone-100">
                  <FileText className="w-4 h-4 text-[#4A6B53]" />
                  <h3 className="font-serif font-semibold text-sm text-stone-900">
                    Notulensi Rapat & Hasil Musyawarah
                  </h3>
                </div>

                <div className="p-4 rounded-lg bg-white border border-stone-200/90 text-xs text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMeeting.notesSummary || 'Belum ada catatan notulensi.'}
                </div>
              </div>

              {/* Action Items (Tindak Lanjut) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4A6B53]" />
                    <h3 className="font-serif font-semibold text-sm text-stone-900">
                      Tindak Lanjut & Tanggung Jawab
                    </h3>
                  </div>

                  <span className="text-[11px] text-stone-500 font-mono">
                    {(selectedMeeting.actionItems || []).filter((a) => a.completed).length}/
                    {(selectedMeeting.actionItems || []).length} Selesai
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedMeeting.actionItems || []).map((ai) => (
                    <div
                      key={ai.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => onToggleActionItem && onToggleActionItem(selectedMeeting.id, ai.id)}
                          disabled={!canEdit}
                          className={`mt-0.5 text-[#4A6B53] ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {ai.completed ? (
                            <CheckSquare className="w-4 h-4 text-[#4A6B53]" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </button>
                        <span
                          className={`truncate ${
                            ai.completed ? 'line-through text-stone-400' : 'text-stone-800 font-medium'
                          }`}
                        >
                          {ai.text}
                        </span>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600 shrink-0 font-medium">
                        PIC: {ai.pic}
                      </span>
                    </div>
                  ))}

                  {/* Add action item form */}
                  {canEdit && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={inlineActionText}
                        onChange={(e) => setInlineActionText(e.target.value)}
                        placeholder="Tambah butir tindak lanjut..."
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                      />
                      <input
                        type="text"
                        value={inlineActionPic}
                        onChange={(e) => setInlineActionPic(e.target.value)}
                        placeholder="PIC (e.g. Divisi Acara)"
                        className="w-36 px-2.5 py-1.5 rounded-lg text-xs bg-white border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                      />
                      <button
                        onClick={() => handleAddInlineActionItem(selectedMeeting)}
                        className="px-3 py-1.5 rounded-lg bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors"
                      >
                        Tambah
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Attachments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#4A6B53]" />
                    <h3 className="font-serif font-semibold text-sm text-stone-900">
                      Dokumen & Lampiran Notulensi Rapat
                    </h3>
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => setIsAddingDoc((prev) => !prev)}
                      className="text-[11px] text-[#4A6B53] hover:underline font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingDoc ? 'Tutup Panel Unggah' : 'Unggah Berkas Rapat'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(selectedMeeting.documents || []).length > 0 ? (
                    (selectedMeeting.documents || []).map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-[#4A6B53] shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-stone-800 truncate block">{doc.name}</span>
                            {doc.sizeFormatted && (
                              <span className="text-[10px] text-stone-400">{doc.sizeFormatted}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => triggerFileDownload(doc.url, doc.name)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#4A6B53] font-medium hover:underline bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs"
                          >
                            <span>Buka / Unduh</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => handleDeleteDoc(selectedMeeting, idx)}
                              className="text-stone-400 hover:text-red-600 transition-colors"
                              title="Hapus lampiran"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-400 italic">Belum ada dokumen lampiran rapat.</p>
                  )}

                  {isAddingDoc && canEdit && (
                    <div className="p-3 rounded-lg bg-[#FAF9F5] border border-stone-200 space-y-2">
                      <FileUploader
                        folder="meetings"
                        accept="any"
                        multiple={true}
                        label="Unggah Notulensi / Dokumen Rapat"
                        helperText="PDF, DOCX, XLSX, PPTX, atau Foto Daftar Hadir (Maks 20MB)"
                        files={(selectedMeeting.documents || []).map((d, idx) => ({
                          id: `mtg-doc-${idx}`,
                          name: d.name,
                          url: d.url,
                          storagePath: d.storagePath || '',
                          contentType: d.contentType || 'application/pdf',
                          size: 0,
                          sizeFormatted: d.sizeFormatted || 'Dokumen Rapat',
                          folder: 'meetings',
                          uploadedAt: selectedMeeting.updatedAt || new Date().toISOString(),
                        }))}
                        onChange={async (uploaded) => {
                          if (!onUpdateMeeting) return;
                          const nextDocs: MeetingDocument[] = uploaded.map((u) => ({
                            name: u.name,
                            url: u.url,
                            storagePath: u.storagePath,
                            sizeFormatted: u.sizeFormatted,
                            contentType: u.contentType,
                          }));
                          await onUpdateMeeting({
                            ...selectedMeeting,
                            documents: nextDocs,
                            updatedAt: new Date().toISOString(),
                          });
                        }}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-white border border-[#E8E6DF] text-stone-500 text-xs">
              Pilih rapat dari daftar di sebelah kiri untuk melihat notulensi dan absensi kehadiran.
            </div>
          )}
        </div>
      </div>

      {/* CREATE MEETING MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗓️</span>
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Jadwalkan Rapat / Pertemuan Baru
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
                <label className="font-medium text-stone-700">Topik / Nama Pertemuan *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Evaluasi Mingguan Ke-3 Program Stunting & Sentra Tenun"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Jenis Pertemuan</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tanggal Pertemuan</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="Contoh: 19:30 - 21:30 WITA"
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Pertemuan</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Contoh: Balai Pertemuan Desa / Posko KKN"
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              {/* Participants Selection from Actual KKN Members */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-stone-700">Peserta Rapat (Tim KKN)</label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedParticipantIds(members.map((m) => m.id))}
                      className="text-[#4A6B53] hover:underline"
                    >
                      Pilih Semua (10)
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedParticipantIds([])}
                      className="text-stone-500 hover:underline"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-stone-50 border border-stone-200">
                  {members.map((m) => {
                    const isChecked = selectedParticipantIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/70 border border-emerald-200/60' : 'hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipantIds((prev) => [...prev, m.id]);
                            } else {
                              setSelectedParticipantIds((prev) => prev.filter((id) => id !== m.id));
                            }
                          }}
                          className="rounded text-[#4A6B53] focus:ring-[#4A6B53]"
                        />
                        <div className="truncate">
                          <span className="text-[11px] font-medium text-stone-800 truncate block">{m.name}</span>
                          <span className="text-[9px] text-stone-400 truncate block">{m.role}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Agenda items */}
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Rencana Agenda (1 butir per baris)</label>
                <textarea
                  rows={3}
                  value={formAgendaLines}
                  onChange={(e) => setFormAgendaLines(e.target.value)}
                  placeholder="Agenda 1&#10;Agenda 2&#10;Agenda 3"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              {/* Initial Notulensi */}
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Catatan Awal / Notulensi</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Hasil musyawarah atau ringkasan topik bahasan..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              {/* Direct File Upload for Meeting Documents */}
              <FileUploader
                folder="meetings"
                accept="any"
                multiple={true}
                label="Lampiran Dokumen / Notulensi Rapat (Opsional)"
                helperText="Unggah PDF, Word, Excel, atau Foto Absensi Rapat"
                files={formDocs.map((d, idx) => ({
                  id: `form-doc-${idx}`,
                  name: d.name,
                  url: d.url,
                  storagePath: d.storagePath || '',
                  contentType: d.contentType || 'application/pdf',
                  size: 0,
                  sizeFormatted: d.sizeFormatted || 'Dokumen',
                  folder: 'meetings',
                  uploadedAt: new Date().toISOString(),
                }))}
                onChange={(uploaded) =>
                  setFormDocs(
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
                  Simpan Jadwal Rapat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEETING MODAL */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#4A6B53]" />
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Edit Data & Notulensi Rapat
                </h3>
              </div>
              <button
                onClick={() => setEditingMeeting(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Topik / Nama Pertemuan *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Jenis Pertemuan</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tanggal Pertemuan</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Pertemuan</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Agenda (1 butir per baris)</label>
                <textarea
                  rows={3}
                  value={formAgendaLines}
                  onChange={(e) => setFormAgendaLines(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Notulensi Lengkap</label>
                <textarea
                  rows={4}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <FileUploader
                folder="meetings"
                accept="any"
                multiple={true}
                label="Lampiran Dokumen / Notulensi Rapat"
                helperText="Unggah PDF, Word, Excel, atau Foto Absensi Rapat"
                files={formDocs.map((d, idx) => ({
                  id: `edit-doc-${idx}`,
                  name: d.name,
                  url: d.url,
                  storagePath: d.storagePath || '',
                  contentType: d.contentType || 'application/pdf',
                  size: 0,
                  sizeFormatted: d.sizeFormatted || 'Dokumen',
                  folder: 'meetings',
                  uploadedAt: new Date().toISOString(),
                }))}
                onChange={(uploaded) =>
                  setFormDocs(
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] shadow-xs"
                >
                  Perbarui Rapat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMeetingId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-sm w-full p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-stone-900 text-sm">Hapus Jadwal Rapat?</h3>
            </div>
            <p className="text-stone-600">
              Pertemuan ini beserta data notulensi dan absensinya akan dihapus dari database posko KKN.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingMeetingId(null)}
                className="px-3 py-1.5 rounded text-stone-600 hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (onDeleteMeeting) {
                    await onDeleteMeeting(deletingMeetingId);
                  }
                  setDeletingMeetingId(null);
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
