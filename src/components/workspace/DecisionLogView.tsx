import React, { useState, useMemo } from 'react';
import { DecisionLogRecord, MeetingItem, Member } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Scale,
  Plus,
  CheckCircle2,
  Calendar,
  Users,
  Search,
  Filter,
  Clock,
  ArrowRight,
  Edit3,
  Trash2,
  AlertCircle,
  FileCheck2,
  Check,
  X,
  ChevronDown,
  Building,
  Sparkles,
} from 'lucide-react';

interface DecisionLogViewProps {
  decisions: DecisionLogRecord[];
  meetings: MeetingItem[];
  members: Member[];
  onAddDecision: (decision: DecisionLogRecord) => Promise<void> | void;
  onUpdateDecision?: (decision: DecisionLogRecord) => Promise<void> | void;
  onDeleteDecision?: (decisionId: string) => Promise<void> | void;
}

const DECISION_STATUSES = [
  'Disahkan',
  'Sedang Berjalan',
  'Terealisasi',
  'Dalam Peninjauan',
] as const;

export const DecisionLogView: React.FC<DecisionLogViewProps> = ({
  decisions,
  meetings,
  members,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
}) => {
  const { user, profile } = useAuth();
  const isDpl = profile?.role === 'dpl';
  const canEdit = !!user && !isDpl;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMeeting, setFilterMeeting] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionLogRecord | null>(null);
  const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMeetingId, setFormMeetingId] = useState('');
  const [formContext, setFormContext] = useState('');
  const [formOptionsStr, setFormOptionsStr] = useState('Opsi A: Di Balai Desa\nOpsi B: Di Lapangan Dusun');
  const [formConsensus, setFormConsensus] = useState('');
  const [formRationale, setFormRationale] = useState('');
  const [formConsequences, setFormConsequences] = useState('');
  const [formPic, setFormPic] = useState(members[0]?.name || 'Josua Ujung');
  const [formDeadline, setFormDeadline] = useState('2026-08-10');
  const [formStatus, setFormStatus] = useState<DecisionLogRecord['status']>('Disahkan');
  const [selectedSigners, setSelectedSigners] = useState<string[]>([
    'Josua Ujung (Ketua)',
    'Mulia Oktaviani (Sekretaris)',
  ]);

  // Next recommended decision number
  const nextDecNumber = useMemo(() => {
    const pad = String(decisions.length + 1).padStart(3, '0');
    return `KEP-${pad}/KKN-PRG-SEL/VIII/2026`;
  }, [decisions.length]);

  // Filtered decisions
  const filtered = useMemo(() => {
    return decisions.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        d.title.toLowerCase().includes(q) ||
        d.decisionNumber.toLowerCase().includes(q) ||
        d.consensusDecision.toLowerCase().includes(q) ||
        (d.pic && d.pic.toLowerCase().includes(q)) ||
        (d.sourceMeetingTitle && d.sourceMeetingTitle.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === 'all' ||
        d.status === filterStatus ||
        (filterStatus === 'Disahkan' && d.status === 'Ratified') ||
        (filterStatus === 'Dalam Peninjauan' && d.status === 'Under Review');

      const matchesMeeting = filterMeeting === 'all' || d.sourceMeetingId === filterMeeting;

      return matchesSearch && matchesStatus && matchesMeeting;
    });
  }, [decisions, search, filterStatus, filterMeeting]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormNumber(nextDecNumber);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMeetingId(meetings[0]?.id || '');
    setFormContext('');
    setFormOptionsStr('Opsi 1: Pelaksanaan di Aula Kantor Desa Pringgasela Selatan\nOpsi 2: Pelaksanaan di Posko KKN Dusun Gubuk Lauk');
    setFormConsensus('');
    setFormRationale('');
    setFormConsequences('');
    setFormPic(members[0]?.name || 'Josua Ujung');
    setFormDeadline(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setFormStatus('Disahkan');
    setSelectedSigners(['Josua Ujung (Ketua)', 'Mulia Oktaviani (Sekretaris)']);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (dec: DecisionLogRecord) => {
    setEditingDecision(dec);
    setFormTitle(dec.title);
    setFormNumber(dec.decisionNumber);
    setFormDate(dec.date);
    setFormMeetingId(dec.sourceMeetingId || '');
    setFormContext(dec.context || '');
    setFormOptionsStr(dec.optionsConsidered ? dec.optionsConsidered.join('\n') : '');
    setFormConsensus(dec.consensusDecision);
    setFormRationale(dec.rationale || '');
    setFormConsequences(dec.consequences || '');
    setFormPic(dec.pic || members[0]?.name || '');
    setFormDeadline(dec.deadline || '');
    setFormStatus(dec.status);
    setSelectedSigners(dec.signedBy || []);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formConsensus.trim()) return;

    const sourceMeeting = meetings.find((m) => m.id === formMeetingId);

    const newDec: DecisionLogRecord = {
      id: `dec-${Date.now()}`,
      decisionNumber: formNumber.trim() || nextDecNumber,
      title: formTitle.trim(),
      date: formDate,
      sourceMeetingId: formMeetingId || undefined,
      sourceMeetingTitle: sourceMeeting ? sourceMeeting.title : undefined,
      context: formContext.trim(),
      optionsConsidered: formOptionsStr
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean),
      consensusDecision: formConsensus.trim(),
      rationale: formRationale.trim(),
      consequences: formConsequences.trim(),
      signedBy: selectedSigners,
      pic: formPic.trim(),
      deadline: formDeadline,
      status: formStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddDecision(newDec);
    setIsCreateModalOpen(false);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDecision || !formTitle.trim() || !formConsensus.trim()) return;

    const sourceMeeting = meetings.find((m) => m.id === formMeetingId);

    const updated: DecisionLogRecord = {
      ...editingDecision,
      decisionNumber: formNumber.trim(),
      title: formTitle.trim(),
      date: formDate,
      sourceMeetingId: formMeetingId || undefined,
      sourceMeetingTitle: sourceMeeting ? sourceMeeting.title : undefined,
      context: formContext.trim(),
      optionsConsidered: formOptionsStr
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean),
      consensusDecision: formConsensus.trim(),
      rationale: formRationale.trim(),
      consequences: formConsequences.trim(),
      signedBy: selectedSigners,
      pic: formPic.trim(),
      deadline: formDeadline,
      status: formStatus,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateDecision) {
      await onUpdateDecision(updated);
    }
    setEditingDecision(null);
  };

  // Quick Status Switcher
  const handleQuickStatusChange = async (
    dec: DecisionLogRecord,
    newStatus: DecisionLogRecord['status']
  ) => {
    if (!canEdit || !onUpdateDecision) return;
    const updated: DecisionLogRecord = {
      ...dec,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateDecision(updated);
  };

  // Status Badge Helper
  const getStatusBadge = (status: DecisionLogRecord['status']) => {
    if (status === 'Terealisasi') {
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
    }
    if (status === 'Sedang Berjalan') {
      return 'bg-blue-50 text-blue-800 border-blue-200 font-medium';
    }
    if (status === 'Dalam Peninjauan' || status === 'Under Review') {
      return 'bg-amber-50 text-amber-800 border-amber-200 font-medium';
    }
    return 'bg-[#EBF1ED] text-[#284230] border-[#CCDCD0] font-medium';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="Scale">
              ⚖️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Decision Log & Buku Keputusan Bersama
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#284230] border border-[#CCDCD0] font-medium">
              {decisions.length} Keputusan
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Pencatatan resmi keputusan musyawarah posko KKN, kaitan rapat sumber, penetapan PIC pelaksana, tenggat waktu, dan pelacakan status implementasi.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Keputusan Baru</span>
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
            placeholder="Cari nomor keputusan, judul, PIC, atau rapat sumber..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#4A6B53] focus:ring-1 focus:ring-[#4A6B53]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Status</option>
            {DECISION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filterMeeting}
            onChange={(e) => setFilterMeeting(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E0DED7] text-stone-700 focus:outline-none focus:border-[#4A6B53]"
          >
            <option value="all">Semua Rapat Sumber</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white border border-[#E8E6DF] text-stone-500 text-xs space-y-2">
            <Scale className="w-8 h-8 mx-auto text-stone-400" />
            <p className="font-medium text-stone-700">Belum ada catatan keputusan yang cocok</p>
            <p className="text-stone-400">Silakan ubah filter atau catat keputusan musyawarah baru.</p>
          </div>
        ) : (
          filtered.map((dec) => {
            const sourceMeeting = meetings.find((m) => m.id === dec.sourceMeetingId);

            return (
              <div
                key={dec.id}
                className="p-5 sm:p-6 rounded-xl bg-white border border-[#E8E6DF] shadow-xs space-y-4 hover:border-[#CCDCD0] transition-colors"
              >
                {/* Card Top: Number, Date, Status, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      {dec.decisionNumber}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="flex items-center gap-1 text-stone-500">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {dec.date}
                    </span>

                    {/* Source Meeting Link Chip */}
                    {(dec.sourceMeetingTitle || sourceMeeting) && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200 font-medium">
                          <Calendar className="w-3 h-3 text-purple-600" />
                          <span>Dari: {dec.sourceMeetingTitle || sourceMeeting?.title}</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Status switcher */}
                    {canEdit ? (
                      <select
                        value={dec.status}
                        onChange={(e) => handleQuickStatusChange(dec, e.target.value as any)}
                        className={`text-xs px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer ${getStatusBadge(
                          dec.status
                        )}`}
                      >
                        {DECISION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusBadge(dec.status)}`}>
                        {dec.status}
                      </span>
                    )}

                    {canEdit && (
                      <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
                        <button
                          onClick={() => openEditModal(dec)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Edit keputusan"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteDecision && (
                          <button
                            onClick={() => setDeletingDecisionId(dec.id)}
                            className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus keputusan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Title & Core Consensus */}
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-medium text-stone-900 leading-snug">
                    {dec.title}
                  </h3>

                  <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200/90 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#4A6B53] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Keputusan Musyawarah:</span>
                    </span>
                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {dec.consensusDecision}
                    </p>
                  </div>
                </div>

                {/* Context, Options, and Rationale Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {dec.context && (
                    <div className="p-3 rounded-lg bg-stone-50/70 border border-stone-200/60 space-y-1">
                      <span className="font-medium text-stone-500 text-[11px] block">Latar Belakang:</span>
                      <p className="text-stone-700 leading-relaxed">{dec.context}</p>
                    </div>
                  )}

                  {dec.rationale && (
                    <div className="p-3 rounded-lg bg-stone-50/70 border border-stone-200/60 space-y-1">
                      <span className="font-medium text-stone-500 text-[11px] block">Alasan Pemilihan:</span>
                      <p className="text-stone-700 leading-relaxed">{dec.rationale}</p>
                    </div>
                  )}
                </div>

                {/* Options Considered */}
                {dec.optionsConsidered && dec.optionsConsidered.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-stone-500 block">
                      Alternatif yang Dipertimbangkan:
                    </span>
                    <div className="space-y-1">
                      {dec.optionsConsidered.map((opt, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-stone-600 flex items-start gap-2 bg-[#FAF9F5] p-2 rounded border border-stone-200/60"
                        >
                          <span className="font-mono text-stone-400 text-[11px] shrink-0 mt-0.5">•</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Responsible Person, Deadline, and Signatories */}
                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600 bg-stone-50/60 p-3 rounded-lg">
                  <div className="flex items-center gap-3 flex-wrap">
                    {dec.pic && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#4A6B53]" />
                        <span>PIC Pelaksana: <strong className="text-stone-800">{dec.pic}</strong></span>
                      </span>
                    )}

                    {dec.deadline && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tenggat Waktu: <strong className="font-mono text-stone-800">{dec.deadline}</strong></span>
                      </span>
                    )}
                  </div>

                  {dec.signedBy && dec.signedBy.length > 0 && (
                    <div className="text-[11px] text-stone-500 sm:text-right">
                      <span>Disahkan oleh: </span>
                      <strong className="text-stone-700">{dec.signedBy.join(', ')}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE DECISION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Catat Keputusan Musyawarah Baru
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-medium text-stone-700">Judul Keputusan *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Penetapan Lokasi Sentra Edukasi Tenun di Dusun Gubuk Lauk"
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Nomor Keputusan</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 font-mono text-[11px] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tanggal Keputusan</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-medium text-stone-700">Rapat Sumber Musyawarah</label>
                  <select
                    value={formMeetingId}
                    onChange={(e) => setFormMeetingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="">-- Tanpa Rapat Formal --</option>
                    {meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Core Consensus */}
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keputusan Bersama (Konsensus) *</label>
                <textarea
                  rows={3}
                  required
                  value={formConsensus}
                  onChange={(e) => setFormConsensus(e.target.value)}
                  placeholder="Rumuskan keputusan final yang telah disetujui bersama oleh seluruh anggota/pihak terkait..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Latar Belakang / Konteks</label>
                  <textarea
                    rows={2}
                    value={formContext}
                    onChange={(e) => setFormContext(e.target.value)}
                    placeholder="Masalah atau kebutuhan yang mendasari keputusan..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Alasan Pemilihan (Rationale)</label>
                  <textarea
                    rows={2}
                    value={formRationale}
                    onChange={(e) => setFormRationale(e.target.value)}
                    placeholder="Mengapa opsi ini yang disepakati..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Alternatif Opsi yang Dipertimbangkan (1 per baris)</label>
                <textarea
                  rows={2}
                  value={formOptionsStr}
                  onChange={(e) => setFormOptionsStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              {/* PIC, Deadline, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">PIC Penanggung Jawab</label>
                  <select
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={`${m.name} (${m.role})`}>
                        {m.name} - {m.role}
                      </option>
                    ))}
                    <option value="BPH (Ketua/Sekretaris/Bendahara)">BPH Inti</option>
                    <option value="Divisi Acara">Divisi Acara</option>
                    <option value="Divisi PDD">Divisi PDD</option>
                    <option value="Divisi Humper">Divisi Humper</option>
                    <option value="Divisi Konsumsi">Divisi Konsumsi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tenggat Waktu Implementasi</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Status Implementasi</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {DECISION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
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
                  Simpan Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DECISION MODAL */}
      {editingDecision && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#4A6B53]" />
                <h3 className="font-serif font-semibold text-base text-stone-900">
                  Edit Catatan Keputusan Bersama
                </h3>
              </div>
              <button
                onClick={() => setEditingDecision(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-medium text-stone-700">Judul Keputusan *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Nomor Keputusan</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 font-mono text-[11px] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keputusan Konsensus *</label>
                <textarea
                  rows={3}
                  required
                  value={formConsensus}
                  onChange={(e) => setFormConsensus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">PIC</label>
                  <select
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={`${m.name} (${m.role})`}>
                        {m.name} - {m.role}
                      </option>
                    ))}
                    <option value="BPH (Ketua/Sekretaris/Bendahara)">BPH Inti</option>
                    <option value="Divisi Acara">Divisi Acara</option>
                    <option value="Divisi PDD">Divisi PDD</option>
                    <option value="Divisi Humper">Divisi Humper</option>
                    <option value="Divisi Konsumsi">Divisi Konsumsi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
                  >
                    {DECISION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingDecision(null)}
                  className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] shadow-xs"
                >
                  Perbarui Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDecisionId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-sm w-full p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-stone-900 text-sm">Hapus Catatan Keputusan?</h3>
            </div>
            <p className="text-stone-600">
              Keputusan ini akan dihapus dari arsip musyawarah posko KKN Pringgasela Selatan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDecisionId(null)}
                className="px-3 py-1.5 rounded text-stone-600 hover:bg-stone-100"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (onDeleteDecision) {
                    await onDeleteDecision(deletingDecisionId);
                  }
                  setDeletingDecisionId(null);
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
