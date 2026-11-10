import React, { useState, useMemo, useCallback } from 'react';
import { Member } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { InvitationManagerModal } from '../admin/InvitationManagerModal';
import { EditMemberModal } from './EditMemberModal';
import { MemberDetailModal } from './MemberDetailModal';
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
  MessageCircle,
  X,
  Eye,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

import { OFFICIAL_DPL_MEMBER_ID, DPL_SUPERVISOR } from '../../data/mockData';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface MembersViewProps {
  members: Member[];
  onUpdateMember?: (updated: Member) => Promise<void>;
  onOpenAuthModal?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigate?: (path: string) => void;
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
  onNavigateToAdmin,
  onNavigate,
}) => {
  const { user, profile, isAdmin, isSuperAdmin } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [dplRegStatus, setDplRegStatus] = useState<{ email: string; status: string } | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<Member | null>(null);

  // Fetch actual DPL registered email status
  const fetchDplStatus = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('registered_emails')
          .select('email, status')
          .eq('member_id', OFFICIAL_DPL_MEMBER_ID)
          .maybeSingle();

        if (data) {
          setDplRegStatus({ email: data.email, status: data.status || 'pending_activation' });
        } else {
          setDplRegStatus(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch DPL status:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchDplStatus();
  }, [fetchDplStatus]);

  const openMemberPage = (m: Member) => {
    if (onNavigate) {
      onNavigate(`/workspace/members/${m.id}`);
    } else {
      window.history.pushState({}, '', `/workspace/members/${m.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('Semua Divisi');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'bph' | 'divisi'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'pending'>('all');

  const handleCopy = (token: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopyPhone = (phone: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const formatted = formatInternationalPhone(phone);
    navigator.clipboard.writeText(formatted);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const handleCopyEmail = (email: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  // Helper to format activation date if exists
  const formatActivationDate = (val: any): string | null => {
    if (!val) return null;
    try {
      let date: Date;
      if (val?.toDate && typeof val.toDate === 'function') {
        date = val.toDate();
      } else if (val?.seconds) {
        date = new Date(val.seconds * 1000);
      } else if (val instanceof Date) {
        date = val;
      } else {
        date = new Date(val);
      }
      if (isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return null;
    }
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

      // 3. Status filter
      if (selectedStatusFilter === 'active' && m.accountStatus !== 'active') {
        return false;
      }
      if (selectedStatusFilter === 'pending' && m.accountStatus === 'active') {
        return false;
      }

      // 4. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inName = (m.name || '').toLowerCase().includes(q);
      const inRole = (m.role || '').toLowerCase().includes(q);
      const inDiv = (m.division || '').toLowerCase().includes(q);
      const inMajor = m.major?.toLowerCase().includes(q);
      const inNim = m.nim?.toLowerCase().includes(q);
      const inResp = m.responsibilities?.some((r) => String(r || '').toLowerCase().includes(q));

      return inName || inRole || inDiv || inMajor || inNim || inResp;
    });
  }, [members, searchQuery, selectedDivision, selectedRoleFilter, selectedStatusFilter]);

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

  // Status counts
  const activeCount = useMemo(() => {
    return members.filter((m) => m.accountStatus === 'active').length;
  }, [members]);

  const pendingCount = useMemo(() => {
    return members.filter((m) => m.accountStatus !== 'active').length;
  }, [members]);

  const handleMemberSave = async (updated: Member) => {
    if (onUpdateMember) {
      await onUpdateMember(updated);
    }
  };

  const handleLockedContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

      <MemberDetailModal
        isOpen={!!selectedMemberForDetail}
        member={selectedMemberForDetail}
        onClose={() => setSelectedMemberForDetail(null)}
        onOpenAuthModal={onOpenAuthModal}
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
          {isSuperAdmin && onNavigateToAdmin ? (
            <button
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#284230] text-white text-xs font-medium hover:bg-[#1E3224] transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Kelola Registrasi Email (Admin Console)</span>
            </button>
          ) : null}
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
              Status Keanggotaan
            </span>
            {isAdmin ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {activeCount} Aktif
                </span>
                <span className="text-xs font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {pendingCount} Belum Aktif
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-[#284230] bg-[#EBF1ED] px-2 py-0.5 rounded border border-[#CCDCD0]">
                  10 Mahasiswa Resmi
                </span>
              </div>
            )}
          </div>
          <span className="text-xl">✨</span>
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
                  {DPL_SUPERVISOR.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  DPL (Supervisi Akademik)
                </span>
              </div>
              <div className="text-stone-600 font-medium">Dosen Pembimbing Lapangan (DPL) · {DPL_SUPERVISOR.faculty}</div>
              <div className="text-stone-500 text-[11px]">
                NIP: {DPL_SUPERVISOR.nip} · Pembimbing Akademik & Evaluasi Lapangan
              </div>
              <div className="pt-1.5 flex flex-wrap items-center gap-3 text-stone-600">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-stone-400" />
                  Koordinasi Posko
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Mail className="w-3 h-3 text-stone-400" />
                  {dplRegStatus ? (
                    <strong className="font-mono text-stone-800">{dplRegStatus.email}</strong>
                  ) : (
                    <span className="text-stone-500 italic">Belum Didaftarkan</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* DPL Actions */}
          <div className="pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              {dplRegStatus ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border ${
                    dplRegStatus.status === 'activated' || dplRegStatus.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {dplRegStatus.status === 'activated' || dplRegStatus.status === 'active' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Akun DPL Aktif</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Menunggu Aktivasi</span>
                    </>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 text-stone-600 font-medium">
                  <span>Email DPL Belum Didaftarkan</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onNavigateToAdmin) {
                    onNavigateToAdmin();
                  } else {
                    window.location.hash = '#admin';
                  }
                }}
                className="px-3 py-1 rounded-md bg-[#284230] text-white font-medium hover:bg-[#1E3224] transition-colors flex items-center gap-1 text-[11px] shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kelola di Admin Console</span>
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
              Data terverifikasi, status keanggotaan terpadu, nomor WhatsApp (+62), dan pembagian divisi posko.
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

            {/* Status Filter (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-xs shrink-0">
                <button
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    selectedStatusFilter === 'all'
                      ? 'bg-stone-800 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  Semua Status
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('active')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    selectedStatusFilter === 'active'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Aktif ({activeCount})</span>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('pending')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    selectedStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Belum Aktif ({pendingCount})</span>
                </button>
              </div>
            )}

            {/* Quick Segment Filter (BPH vs Divisi) */}
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-xs shrink-0">
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'all'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Semua Posisi
              </button>
              <button
                onClick={() => setSelectedRoleFilter('bph')}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'bph'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                BPH
              </button>
              <button
                onClick={() => setSelectedRoleFilter('divisi')}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  selectedRoleFilter === 'divisi'
                    ? 'bg-[#4A6B53] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                Divisi
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

            {(searchQuery ||
              selectedDivision !== 'Semua Divisi' ||
              selectedRoleFilter !== 'all' ||
              selectedStatusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDivision('Semua Divisi');
                  setSelectedRoleFilter('all');
                  setSelectedStatusFilter('all');
                }}
                className="text-[11px] text-red-600 hover:underline px-2 py-1 shrink-0 ml-auto"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => {
            const isActive = m.accountStatus === 'active';
            const isBph = m.division === 'Badan Pengurus Harian (BPH)';
            const activationDateStr = formatActivationDate(m.acceptedAt);
            const waUrl = getWhatsAppUrl(
              m.phone,
              `Halo ${m.name} (${m.role} KKN Desa Pringgasela Selatan)`
            );
            const isSelfCard = Boolean(
              user &&
                ((profile?.memberId && profile.memberId === m.id) ||
                  (m.authUid && m.authUid === user.uid) ||
                  (user.email &&
                    m.email &&
                    m.email.toLowerCase() === user.email.toLowerCase()) ||
                  (user.email?.toLowerCase() === 'abhyy333@gmail.com' &&
                    m.id === 'm-4'))
            );

            // ==========================================
            // STATE 1: ACTIVATED MEMBER CARD
            // ==========================================
            if (isActive) {
              return (
                <div
                  key={m.id}
                  className={`rounded-xl bg-white border transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                    isBph
                      ? 'border-[#CCDCD0] hover:border-[#4A6B53]/60 ring-1 ring-[#CCDCD0]/30'
                      : 'border-[#E8E6DF] hover:border-[#CCDCD0]'
                  }`}
                >
                  {/* Top section: Avatar, Info, Status Badge */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white ring-1 ring-emerald-200/80 shadow-2xs"
                          />
                          {isBph && (
                            <span
                              className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4A6B53] text-white rounded-full flex items-center justify-center text-[9px] shadow-xs"
                              title="Badan Pengurus Harian (BPH)"
                            >
                              ★
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-medium text-xs font-serif text-stone-900 truncate">
                            {m.name}
                          </h3>
                          <p className="text-[11px] text-[#4A6B53] font-semibold truncate">
                            {m.role}
                          </p>
                          <span className="text-[10px] text-stone-400 font-mono block">
                            {m.nim || 'NIM KKN'}
                          </span>
                        </div>
                      </div>

                      {/* Header Badges & Admin Edit */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </span>

                        {isSelfCard ? (
                          <button
                            onClick={() =>
                              onNavigate
                                ? onNavigate('/workspace/profile/edit')
                                : setEditingMember(m)
                            }
                            className="text-[10px] text-[#4A6B53] hover:text-[#284230] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 bg-[#E8ECE9]/70 hover:bg-[#E8ECE9] rounded"
                            title="Edit profil dan data keanggotaan Anda"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Profil Saya</span>
                          </button>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => setEditingMember(m)}
                              className="text-[10px] text-stone-400 hover:text-[#4A6B53] font-medium flex items-center gap-0.5 p-0.5 hover:bg-stone-50 rounded"
                              title="Edit data anggota ini"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Division & Academic Information */}
                    <div className="pt-2 border-t border-stone-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Divisi:</span>
                        <span className="font-medium text-stone-800 truncate">{m.division}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">Program Studi:</span>
                        <span className="text-stone-700 truncate">{m.major || '-'}</span>
                      </div>
                    </div>

                    {/* Operational Responsibilities */}
                    {m.responsibilities && m.responsibilities.length > 0 && (
                      <div className="pt-1.5 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-[#4A6B53]" />
                          <span>Tanggung Jawab Operasional:</span>
                        </span>
                        <div className="p-2 rounded-md bg-[#FAF9F5] border border-[#EFECE6]">
                          <ul className="text-[11px] text-stone-600 space-y-1 list-disc list-inside">
                            {m.responsibilities.slice(0, 2).map((resp, idx) => (
                              <li key={idx} className="leading-snug truncate">
                                {resp}
                              </li>
                            ))}
                            {m.responsibilities.length > 2 && (
                              <li className="text-[10px] text-stone-400 list-none pl-1 italic">
                                +{m.responsibilities.length - 2} tanggung jawab lainnya
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Activation date: ONLY IF ACTUAL TIMESTAMP EXISTS */}
                    {activationDateStr && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-stone-500">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>Diaktivasi pada: <strong className="font-medium text-stone-700">{activationDateStr}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Phone Display & Actions */}
                  <div className="px-4 py-3 bg-stone-50/70 border-t border-[#E8E6DF] flex items-center justify-between gap-2 text-[11px]">
                    {/* Phone preview */}
                    <div className="min-w-0">
                      {user ? (
                        <div className="flex items-center gap-1 text-stone-800 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-[#4A6B53] shrink-0" />
                          <span className="truncate">{formatInternationalPhone(m.phone)}</span>
                          <button
                            onClick={(e) => handleCopyPhone(m.phone, e)}
                            className="text-stone-400 hover:text-stone-700 p-0.5 ml-0.5 shrink-0"
                            title="Salin nomor"
                          >
                            {copiedPhone === m.phone ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleLockedContactClick}
                          className="flex items-center gap-1 text-stone-500 font-mono text-[11px] hover:text-stone-700"
                          title="Klik untuk membuka nomor WhatsApp"
                        >
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>{maskPhoneNumber(m.phone)}</span>
                        </button>
                      )}
                    </div>

                    {/* Active Actions: "Lihat Profil" and "WhatsApp" */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openMemberPage(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-stone-200 text-stone-700 font-medium hover:bg-stone-100 hover:text-stone-900 transition-colors text-[11px] shadow-2xs"
                        title="Buka halaman profil lengkap"
                      >
                        <Eye className="w-3 h-3 text-stone-500" />
                        <span>Halaman Profil</span>
                      </button>

                      {user ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#DEE8E1] transition-colors text-[11px] shadow-2xs"
                          title={`Kirim pesan WhatsApp ke ${m.name}`}
                        >
                          <MessageCircle className="w-3 h-3 text-[#4A6B53]" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          onClick={handleLockedContactClick}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-200 text-stone-600 font-medium hover:bg-stone-300 transition-colors text-[11px]"
                          title="Masuk untuk membuka chat WhatsApp"
                        >
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>WA</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // ==========================================
            // STATE 2: PENDING INVITATION MEMBER CARD
            // ==========================================
            return (
              <div
                key={m.id}
                className="rounded-xl bg-[#FAF9F5] border border-amber-200/80 transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-sm hover:border-amber-300"
              >
                {/* Top section: Avatar, Info, Pending Badge */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white ring-1 ring-amber-300/80 opacity-90 shadow-2xs"
                        />
                        {isBph && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4A6B53] text-white rounded-full flex items-center justify-center text-[9px] shadow-xs"
                            title="Badan Pengurus Harian (BPH)"
                          >
                            ★
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-medium text-xs font-serif text-stone-900 truncate">
                          {m.name}
                        </h3>
                        <p className="text-[11px] text-amber-900 font-semibold truncate">
                          {m.role}
                        </p>
                        <span className="text-[10px] text-stone-400 font-mono block">
                          {m.nim || 'NIM KKN'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Admin Edit */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isAdmin ? (
                        m.accountStatus === 'disabled' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-800 bg-red-100/80 border border-red-300 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3 text-red-600" />
                            <span>Dinonaktifkan</span>
                          </span>
                        ) : m.email || m.registeredEmail ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100/70 border border-amber-300/80 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Menunggu Aktivasi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-700 bg-stone-200/80 border border-stone-300 px-2 py-0.5 rounded-full">
                            <Mail className="w-3 h-3 text-stone-500" />
                            <span>Belum Didaftarkan</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                          <span>Anggota Posko</span>
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setEditingMember(m)}
                          className="text-[10px] text-stone-400 hover:text-amber-800 font-medium flex items-center gap-0.5 p-0.5 hover:bg-amber-100/50 rounded"
                          title="Edit data anggota ini"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Division & Academic Information */}
                  <div className="pt-2 border-t border-amber-200/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Divisi:</span>
                      <span className="font-medium text-stone-800 truncate">{m.division}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Program Studi:</span>
                      <span className="text-stone-700 truncate">{m.major || '-'}</span>
                    </div>
                  </div>

                  {/* Pending State: Email Registration Box STRICTLY MANAGED BY ADMIN */}
                  {isAdmin ? (
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-medium">
                          <Mail className="w-3.5 h-3.5 text-amber-600" />
                          <span>Status Email Terdaftar</span>
                        </div>
                        {(m.registeredEmail || m.email) && (
                          <button
                            onClick={(e) => handleCopyEmail(m.registeredEmail || m.email || '', e)}
                            className="text-[10px] text-[#4A6B53] font-semibold hover:underline flex items-center gap-1 bg-[#FAF9F5] px-2 py-0.5 rounded border border-stone-200"
                            title="Salin email terdaftar"
                          >
                            {copiedEmail === (m.registeredEmail || m.email) ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-green-600" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Salin Email</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {m.registeredEmail || m.email ? (
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-semibold text-emerald-900 tracking-tight bg-emerald-50/80 border border-emerald-200 px-2 py-1 rounded truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{m.registeredEmail || m.email}</span>
                          </div>
                          <p className="text-[10px] text-emerald-800 leading-snug">
                            {m.accountStatus === 'disabled'
                              ? 'Akun anggota ini sedang dinonaktifkan oleh Super Admin.'
                              : 'Email resmi terdaftar. Anggota dapat mengaktifkan akun menggunakan email ini.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-stone-700 bg-stone-100 px-2 py-1 rounded border border-stone-200">
                            Belum Didaftarkan
                          </div>
                          <p className="text-[10px] text-stone-500 leading-snug">
                            Email anggota belum didaftarkan. Tambahkan email resmi di Admin Console agar anggota dapat aktivasi.
                          </p>
                          {isSuperAdmin && onNavigateToAdmin && (
                            <button
                              onClick={onNavigateToAdmin}
                              className="w-full text-[11px] font-medium text-[#284230] bg-[#EBF1ED] hover:bg-[#DEE8E1] border border-[#CCDCD0] py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors"
                            >
                              <ShieldCheck className="w-3 h-3 text-[#4A6B53]" />
                              <span>Daftarkan Email di Admin Console</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    m.responsibilities && m.responsibilities.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-[#4A6B53]" />
                          <span>Tanggung Jawab Posko:</span>
                        </span>
                        <div className="p-2 rounded-md bg-white border border-stone-200/80">
                          <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                            {m.responsibilities[0]}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Card Bottom: Phone Display & Actions */}
                <div className="px-4 py-3 bg-amber-50/60 border-t border-amber-200/70 flex items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0">
                    {user ? (
                      <div className="flex items-center gap-1 text-stone-800 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-[#4A6B53] shrink-0" />
                        <span className="truncate">{formatInternationalPhone(m.phone)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-stone-500 font-mono text-[11px]">
                        <Lock className="w-3 h-3 text-stone-400" />
                        <span>{maskPhoneNumber(m.phone)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openMemberPage(m)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-stone-200 text-stone-700 font-medium hover:bg-stone-100 transition-colors text-[11px] shadow-2xs"
                      title="Buka halaman profil anggota"
                    >
                      <Eye className="w-3 h-3 text-stone-500" />
                      <span>Halaman Profil</span>
                    </button>

                    {user && (
                      isAdmin ? (
                        <a
                          href={getWhatsAppUrl(
                            m.phone,
                            m.registeredEmail
                              ? `Halo ${m.name}, akun KKN SPACE kamu telah disiapkan dengan email ${m.registeredEmail}. Silakan buka website KKN Pringgasela Selatan dan aktivasi akun kamu dengan memasukkan email tersebut.`
                              : `Halo ${m.name}, silakan hubungi administrator posko KKN Pringgasela Selatan untuk mendaftarkan email kamu agar dapat mengaktifkan akun KKN SPACE.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#DEE8E1] transition-colors text-[11px] shadow-2xs"
                          title="Kirim instruksi aktivasi via WhatsApp (Khusus Admin)"
                        >
                          <MessageCircle className="w-3 h-3 text-[#4A6B53]" />
                          <span>Kirim WA</span>
                        </a>
                      ) : (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-[#284230] font-medium hover:bg-[#DEE8E1] transition-colors text-[11px] shadow-2xs"
                          title={`Kirim pesan WhatsApp ke ${m.name}`}
                        >
                          <MessageCircle className="w-3 h-3 text-[#4A6B53]" />
                          <span>WhatsApp</span>
                        </a>
                      )
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
                  setSelectedStatusFilter('all');
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
