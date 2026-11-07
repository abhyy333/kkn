import React, { useState, useMemo } from 'react';
import { Member } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { InvitationManagerModal } from '../admin/InvitationManagerModal';
import { EditMemberModal } from './EditMemberModal';
import { formatInternationalPhone, getWhatsAppUrl, maskPhoneNumber } from '../../utils/phone';
import {
  Mail,
  Phone,
  Shield,
  GraduationCap,
  HeartHandshake,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Briefcase,
  Search,
  Filter,
  Lock,
  Edit3,
  ExternalLink,
  MessageCircle,
  X,
  Sparkles,
} from 'lucide-react';

interface MembersViewProps {
  members: Member[];
  onUpdateMember?: (updated: Member) => Promise<void>;
  onOpenAuthModal?: () => void;
}

const DIVISIONS = [
  'Semua Divisi',
  'Badan Pengurus Harian (BPH)',
  'Divisi Acara',
  'Divisi PDD',
  'Divisi Humper',
  'Divisi Konsumsi',
];

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  onUpdateMember,
  onOpenAuthModal,
}) => {
  const { user, isAdmin } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('Semua Divisi');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'bph' | 'divisi'>('all');

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopyPhone = (phone: string) => {
    const formatted = formatInternationalPhone(phone);
    navigator.clipboard.writeText(formatted);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Division filter
      if (selectedDivision !== 'Semua Divisi' && m.division !== selectedDivision) {
        return false;
      }

      // 2. Role filter
      if (selectedRoleFilter === 'bph' && m.division !== 'Badan Pengurus Harian (BPH)') {
        return false;
      }
      if (selectedRoleFilter === 'divisi' && m.division === 'Badan Pengurus Harian (BPH)') {
        return false;
      }

      // 3. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inName = m.name.toLowerCase().includes(q);
      const inRole = m.role.toLowerCase().includes(q);
      const inDiv = m.division.toLowerCase().includes(q);
      const inMajor = m.major?.toLowerCase().includes(q);
      const inNim = m.nim?.toLowerCase().includes(q);
      const inResp = m.responsibilities?.some((r) => r.toLowerCase().includes(q));

      return inName || inRole || inDiv || inMajor || inNim || inResp;
    });
  }, [members, searchQuery, selectedDivision, selectedRoleFilter]);

  // Division counts
  const divisionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Semua Divisi': members.length,
      'Badan Pengurus Harian (BPH)': 0,
      'Divisi Acara': 0,
      'Divisi PDD': 0,
      'Divisi Humper': 0,
      'Divisi Konsumsi': 0,
    };
    members.forEach((m) => {
      if (counts[m.division] !== undefined) {
        counts[m.division]++;
      }
    });
    return counts;
  }, [members]);

  const handleMemberSave = async (updated: Member) => {
    if (onUpdateMember) {
      await onUpdateMember(updated);
    }
  };

  const handleLockedContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenAuthModal) {
      onOpenAuthModal();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Modals */}
      <InvitationManagerModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <EditMemberModal
        isOpen={!!editingMember}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSave={handleMemberSave}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Team">
              👥
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Members & Tim Pengabdian KKN
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Direktori resmi tim KKN Desa Pringgasela Selatan (10 Mahasiswa), kontak WhatsApp (+62), deskripsi tanggung jawab, DPL, dan mitra desa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Kelola Undangan</span>
            </button>
          )}
        </div>
      </div>

      {/* Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
              Total Tim KKN
            </span>
            <span className="font-serif text-lg font-bold text-stone-900">
              {members.length} Mahasiswa
            </span>
          </div>
          <span className="text-xl">🎓</span>
        </div>

        <div className="p-3 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
              Struktur BPH
            </span>
            <span className="font-serif text-lg font-bold text-stone-900">
              3 Anggota (K, S, B)
            </span>
          </div>
          <span className="text-xl">🏛️</span>
        </div>

        <div className="p-3 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
              Divisi Lapangan
            </span>
            <span className="font-serif text-lg font-bold text-stone-900">
              7 Mahasiswa (4 Divisi)
            </span>
          </div>
          <span className="text-xl">✨</span>
        </div>

        <div className="p-3 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
              DPL & Wilayah
            </span>
            <span className="font-serif text-lg font-bold text-stone-900">
              7 Dusun Binaan
            </span>
          </div>
          <span className="text-xl">🧭</span>
        </div>
      </div>

      {/* Leadership & Advisory Banner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DPL Card */}
        <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#4A6B53] text-white flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900 text-sm">
                  Dr. Lalu Syamsuddin, M.Si.
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  DPL (Read-Only)
                </span>
              </div>
              <div className="text-stone-600 font-medium">Dosen Pembimbing Lapangan (DPL)</div>
              <div className="text-stone-500 text-[11px]">
                NIP: 197508122002121002 · Pembimbing Akademik & Evaluasi Lapangan
              </div>
              <div className="pt-1.5 flex flex-wrap items-center gap-3 text-stone-600">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-stone-400" />
                  {user ? '+62 812-3988-1122' : '+62 812-••••-••••'}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Mail className="w-3 h-3 text-stone-400" /> syamsuddin.lalu@univ.ac.id
                </span>
              </div>
            </div>
          </div>

          {/* DPL Actions */}
          <div className="pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              {user ? (
                <a
                  href="https://wa.me/6281239881122?text=Selamat%20siang%20Bapak%20Dr.%20Lalu%20Syamsuddin%2C%20M.Si."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#DEE8E1] transition-colors"
                >
                  <MessageCircle className="w-3 h-3 text-[#4A6B53]" />
                  <span>WhatsApp DPL</span>
                </a>
              ) : (
                <button
                  onClick={handleLockedContactClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-700"
                  title="Masuk untuk melihat kontak WhatsApp DPL"
                >
                  <Lock className="w-3 h-3 text-stone-400" />
                  <span>Masuk untuk Chat WA</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-stone-500 font-mono text-[10px]">
                Token: <strong>KKN-PRG-DPL-00</strong>
              </span>
              <button
                onClick={() => handleCopy('KKN-PRG-DPL-00')}
                className="text-[#4A6B53] hover:underline font-medium text-[10px] flex items-center gap-0.5"
              >
                {copiedToken === 'KKN-PRG-DPL-00' ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-green-600" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>Salin Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Kepala Desa Card */}
        <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-stone-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900 text-sm">
                  Kepala Desa Pringgasela Selatan
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                  Mitra Desa
                </span>
              </div>
              <div className="text-stone-600 font-medium">Pemerintahan Desa Pringgasela Selatan</div>
              <div className="text-stone-500 text-[11px]">
                Kantor Desa Pringgasela Selatan · Jl. Raya Pringgasela, Kec. Pringgasela
              </div>
              <div className="pt-1.5 flex flex-wrap items-center gap-3 text-stone-600">
                <span className="flex items-center gap-1 text-[11px]">
                  <Phone className="w-3 h-3 text-stone-400" /> (0376) 29910
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Shield className="w-3 h-3 text-stone-400" /> Pengayom 7 Wilayah Dusun
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
            <span>Koordinasi Mingguan dengan jajaran Pemdes & BPD</span>
            <span className="text-[10px] text-[#4A6B53] font-medium">Posko Terdaftar Resmi</span>
          </div>
        </div>
      </div>

      {/* Directory Section: Search, Filters & Members Grid */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
          <div>
            <h2 className="font-serif text-base font-semibold text-stone-900">
              Daftar Anggota Tim KKN ({filteredMembers.length} Mahasiswa)
            </h2>
            <p className="text-[11px] text-stone-500">
              Data terverifikasi, nomor WhatsApp internasional (+62), pembagian divisi, dan deskripsi tugas posko.
            </p>
          </div>

          {!user && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Nomor WhatsApp disamarkan untuk pengunjung publik</span>
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3.5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama anggota, jabatan, divisi, jurusan, atau NIM..."
                className="w-full pl-8 pr-8 py-2 rounded-md border border-[#D5D2C8] text-xs focus:outline-none focus:border-[#4A6B53] bg-[#FAF9F5]/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Segment Filter */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'all'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedRoleFilter('bph')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'bph'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                BPH Posko
              </button>
              <button
                onClick={() => setSelectedRoleFilter('divisi')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'divisi'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Divisi Operasional
              </button>
            </div>
          </div>

          {/* Division Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-stone-400 font-medium shrink-0 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>Divisi:</span>
            </span>

            {DIVISIONS.map((div) => {
              const count = divisionCounts[div] || 0;
              const isSelected = selectedDivision === div;
              return (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#EBF1ED] text-[#284230] border-[#CCDCD0] shadow-2xs font-semibold'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span>{div}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-[#4A6B53] text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {(searchQuery || selectedDivision !== 'Semua Divisi' || selectedRoleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDivision('Semua Divisi');
                  setSelectedRoleFilter('all');
                }}
                className="text-[11px] text-red-600 hover:underline px-2 py-1 shrink-0"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => {
            const isBph = m.division === 'Badan Pengurus Harian (BPH)';
            const waUrl = getWhatsAppUrl(
              m.phone,
              `Halo ${m.name} (${m.role} KKN Pringgasela Selatan)`
            );

            return (
              <div
                key={m.id}
                className={`p-4 rounded-lg bg-white border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isBph
                    ? 'border-[#CCDCD0] hover:border-[#4A6B53]'
                    : 'border-[#E8E6DF] hover:border-[#CCDCD0]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Header: Avatar, Name, Role & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-stone-200 shadow-2xs"
                        />
                        {isBph && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4A6B53] text-white rounded-full flex items-center justify-center text-[9px] shadow-xs"
                            title="BPH KKN"
                          >
                            ★
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-xs text-stone-900 truncate">
                          {m.name}
                        </h3>
                        <p className="text-[11px] text-[#4A6B53] font-medium truncate">
                          {m.role}
                        </p>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {m.nim || 'NIM KKN'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Admin Edit */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {m.accountStatus === 'active' ? (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium border border-green-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Undangan</span>
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setEditingMember(m)}
                          className="text-[10px] text-stone-500 hover:text-[#4A6B53] font-medium flex items-center gap-1 p-0.5 hover:bg-stone-50 rounded"
                          title="Edit profil anggota ini di Firestore"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Division & Academic Information */}
                  <div className="space-y-1 text-xs text-stone-600 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Divisi:</span>
                      <span className="font-medium text-stone-800 truncate">
                        {m.division}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Jurusan:</span>
                      <span className="text-stone-700 truncate">{m.major}</span>
                    </div>
                  </div>

                  {/* Operational Responsibilities */}
                  {m.responsibilities && m.responsibilities.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span>Tanggung Jawab Operasional:</span>
                      </span>
                      <ul className="text-[11px] text-stone-600 space-y-1 list-disc list-inside">
                        {m.responsibilities.map((resp, idx) => (
                          <li key={idx} className="leading-snug">
                            {resp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom Section: Contact & WhatsApp */}
                <div className="pt-3 border-t border-stone-100 space-y-2 text-[11px] mt-2">
                  {/* Token Helper for Admin */}
                  {m.invitationToken && (
                    <div className="p-2 rounded bg-[#FAF9F5] border border-stone-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-600">
                        <KeyRound className="w-3 h-3 text-[#4A6B53]" />
                        <span>{m.invitationToken}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(m.invitationToken!)}
                        className="text-[10px] text-[#4A6B53] font-medium hover:underline flex items-center gap-0.5"
                        title="Salin token untuk aktivasi anggota"
                      >
                        {copiedToken === m.invitationToken ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-green-600" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Salin Token</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Phone & Direct WhatsApp Action */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {user ? (
                      /* Authenticated User: Real International Phone & Clickable WhatsApp */
                      <>
                        <div className="flex items-center gap-1 text-stone-800 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-[#4A6B53]" />
                          <span>{formatInternationalPhone(m.phone)}</span>
                          <button
                            onClick={() => handleCopyPhone(m.phone)}
                            className="text-stone-400 hover:text-stone-600 p-0.5 ml-0.5"
                            title="Salin nomor telepon"
                          >
                            {copiedPhone === m.phone ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#DEE8E1] transition-colors text-[11px]"
                          title={`Kirim pesan WhatsApp ke ${m.name}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#4A6B53]" />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    ) : (
                      /* Unauthenticated Public: Masked Phone & Sign-In prompt */
                      <>
                        <div
                          onClick={handleLockedContactClick}
                          className="flex items-center gap-1 text-stone-500 font-mono text-[11px] cursor-pointer hover:text-stone-700"
                          title="Nomor disamarkan untuk privasi. Klik untuk masuk."
                        >
                          <Lock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{maskPhoneNumber(m.phone)}</span>
                        </div>

                        <button
                          onClick={handleLockedContactClick}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 text-stone-600 font-medium hover:bg-stone-200 text-[11px]"
                          title="Masuk ke workspace untuk membuka WhatsApp"
                        >
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>Buka Kontak</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white border border-dashed border-stone-300 rounded-lg space-y-2">
              <Search className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-stone-600 font-medium text-xs">
                Tidak ada anggota tim yang cocok dengan kata kunci atau filter yang dipilih.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDivision('Semua Divisi');
                  setSelectedRoleFilter('all');
                }}
                className="text-xs text-[#4A6B53] underline font-medium"
              >
                Tampilkan seluruh anggota (10 Orang)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
