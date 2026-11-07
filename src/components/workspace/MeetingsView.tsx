import React, { useState } from 'react';
import { MeetingItem } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';

interface MeetingsViewProps {
  meetings: MeetingItem[];
  onAddMeeting: (meeting: MeetingItem) => void;
  onToggleActionItem: (meetingId: string, actionItemId: string) => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  onAddMeeting,
  onToggleActionItem,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    meetings[0]?.id || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for new meeting
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-08-05');
  const [time, setTime] = useState('19:30 - 21:00 WIB');
  const [location, setLocation] = useState('Posko KKN Pringgasela Selatan');
  const [type, setType] = useState<MeetingItem['type']>('Evaluasi Mingguan');
  const [notesSummary, setNotesSummary] = useState('');
  const [agendaText, setAgendaText] = useState('Evaluasi program kerja divisi\nSinkronisasi logbook DPL\nPiket dapur dan kebersihan posko');

  const filtered = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.notesSummary.toLowerCase().includes(search.toLowerCase()) ||
      m.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || filtered[0];

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newMeeting: MeetingItem = {
      id: `mtg-${Date.now()}`,
      title,
      date,
      time,
      location,
      type,
      attendeesCount: 8,
      agenda: agendaText.split('\n').filter((l) => l.trim().length > 0),
      notesSummary: notesSummary || 'Rapat koordinasi internal evaluasi program.',
      actionItems: [
        { id: `ai-${Date.now()}-1`, text: 'Penyusunan bahan laporan divisi', pic: 'PIC Divisi', completed: false },
      ],
      status: 'upcoming',
    };

    onAddMeeting(newMeeting);
    setSelectedMeetingId(newMeeting.id);
    setIsModalOpen(false);
    setTitle('');
    setNotesSummary('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Calendar">
              🗓️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Meetings & Agenda
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Pusat koordinasi agenda, notulensi musyawarah desa, evaluasi mingguan posko, dan tindak lanjut program.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal / Notula</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari notula rapat, topik bahasan, atau lokasi..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#4A6B53] focus:ring-1 focus:ring-[#4A6B53]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'Internal Posko', 'Koordinasi Desa', 'Supervisi DPL', 'Evaluasi Mingguan', 'Musyawarah Warga'].map(
            (t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  filterType === t
                    ? 'bg-[#EBF1ED] text-[#2D4834] font-semibold'
                    : 'text-stone-600 hover:bg-[#EFECE5]'
                }`}
              >
                {t === 'all' ? 'Semua Rapat' : t}
              </button>
            )
          )}
        </div>
      </div>

      {/* Master - Detail Notion Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Meeting List Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 bg-white border border-[#E8E6DF] rounded-lg">
              Tidak ada agenda pertemuan yang cocok dengan filter.
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
              const completedActions = m.actionItems.filter((a) => a.completed).length;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white border-[#4A6B53] shadow-xs'
                      : 'bg-white/80 border-[#E8E6DF] hover:border-[#CCDCD0] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1.5">
                    <span className="font-medium text-[#4A6B53]">{m.type}</span>
                    <span className="flex items-center gap-1 text-stone-600">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {m.date}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-stone-900 line-clamp-2 mb-2">
                    {m.title}
                  </h3>

                  <div className="flex items-center gap-4 text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {m.time.split(' ')[0]}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{m.location.split(',')[0]}</span>
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-stone-400">
                      {completedActions}/{m.actionItems.length} tindak lanjut
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Meeting Detail Sheet (7 cols) */}
        <div className="lg:col-span-7">
          {selectedMeeting ? (
            <div className="p-6 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-6">
              {/* Top Meta */}
              <div className="space-y-2 pb-4 border-b border-stone-100">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2A4432] font-medium text-[11px]">
                    {selectedMeeting.type}
                  </span>
                  <span className="text-stone-400 text-xs">ID: {selectedMeeting.id}</span>
                </div>

                <h2 className="font-serif text-xl font-semibold text-stone-900 leading-snug">
                  {selectedMeeting.title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedMeeting.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedMeeting.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedMeeting.attendeesCount} Peserta Hadir</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{selectedMeeting.location}</span>
                </div>
              </div>

              {/* Agenda Section */}
              <div className="space-y-2">
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-stone-400" />
                  <span>Pokok Bahasan / Agenda</span>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-700 pl-4 list-disc">
                  {selectedMeeting.agenda.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notes Summary */}
              <div className="space-y-2">
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                  Ringkasan Notulensi & Keputusan
                </div>
                <div className="p-3.5 rounded-md bg-[#FAF9F5] border border-[#EBE8E1] text-xs text-stone-800 leading-relaxed">
                  {selectedMeeting.notesSummary}
                </div>
              </div>

              {/* Action Items Interactive Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4A6B53]" />
                    <span>Action Items / Tindak Lanjut</span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Klik untuk memperbarui status tugas
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedMeeting.actionItems.map((ai) => (
                    <div
                      key={ai.id}
                      onClick={() => onToggleActionItem(selectedMeeting.id, ai.id)}
                      className={`flex items-start gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        ai.completed
                          ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                          : 'bg-white border-[#E0DED7] text-stone-800 hover:border-[#CCDCD0]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ai.completed}
                        onChange={() => {}} // Handled by parent div
                        className="mt-0.5 rounded border-stone-300 text-[#4A6B53] focus:ring-[#4A6B53] cursor-pointer"
                        id={`ai-check-${ai.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={ai.completed ? 'line-through text-stone-400' : ''}>
                          {ai.text}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-stone-500 shrink-0">
                        PIC: {ai.pic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Tambah Agenda / Notulensi Rapat
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Rapat</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Rapat Koordinasi dengan Perangkat Desa Pringgasela Selatan"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Waktu</label>
                  <input
                    type="text"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="19:30 - 21:00 WIB"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Jenis Pertemuan</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MeetingItem['type'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Evaluasi Mingguan">Evaluasi Mingguan</option>
                    <option value="Internal Posko">Internal Posko</option>
                    <option value="Koordinasi Desa">Koordinasi Desa</option>
                    <option value="Supervisi DPL">Supervisi DPL</option>
                    <option value="Musyawarah Warga">Musyawarah Warga</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Posko KKN / Balai Desa"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Agenda Pembahasan (1 per baris)
                </label>
                <textarea
                  rows={3}
                  value={agendaText}
                  onChange={(e) => setAgendaText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Ringkasan Notulensi / Catatan</label>
                <textarea
                  rows={3}
                  value={notesSummary}
                  onChange={(e) => setNotesSummary(e.target.value)}
                  placeholder="Poin-poin kesepakatan dan hasil rapat..."
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
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
                  Simpan Notula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
