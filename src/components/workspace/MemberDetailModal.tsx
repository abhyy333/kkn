import React from 'react';
import { Member } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatInternationalPhone, getWhatsAppUrl, maskPhoneNumber } from '../../utils/phone';
import {
  X,
  CheckCircle2,
  Clock,
  Briefcase,
  GraduationCap,
  Building,
  Phone,
  Mail,
  HeartHandshake,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Copy,
  Check,
  KeyRound,
  Lock,
} from 'lucide-react';

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal?: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  onOpenAuthModal,
}) => {
  const { user, isAdmin } = useAuth();
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [copiedToken, setCopiedToken] = React.useState(false);

  if (!isOpen || !member) return null;

  const isActive = member.accountStatus === 'active';
  const isBph = member.division === 'Badan Pengurus Harian (BPH)';
  const waUrl = getWhatsAppUrl(
    member.phone,
    `Halo ${member.name} (${member.role} KKN Desa Pringgasela Selatan)`
  );

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
      return (
        new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date) + ' WITA'
      );
    } catch {
      return null;
    }
  };

  const activationDateStr = formatActivationDate(member.acceptedAt);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(formatInternationalPhone(member.phone));
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyToken = () => {
    if (member.invitationToken) {
      navigator.clipboard.writeText(member.invitationToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-[#E8E6DF] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div
          className={`h-2.5 w-full ${
            isActive
              ? 'bg-gradient-to-r from-[#4A6B53] via-[#5F876B] to-[#78A385]'
              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
          }`}
        />

        {/* Modal Top Bar */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-[#E8E6DF] bg-[#FAF9F5]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <img
                src={member.avatar || undefined}
                alt={member.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-stone-200"
              />
              {isBph && (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#4A6B53] text-white rounded-full flex items-center justify-center text-[10px] shadow-xs"
                  title="Badan Pengurus Harian (BPH)"
                >
                  ★
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-lg font-semibold text-stone-900 truncate">
                  {member.name}
                </h3>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Aktif</span>
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Undangan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                    <span>Anggota Posko</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[#4A6B53]">{member.role}</p>
              <p className="text-[11px] text-stone-500">{member.division}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Activation Date banner (Active only, and only if timestamp exists) */}
          {isActive && activationDateStr && (
            <div className="p-3 rounded-lg bg-[#EBF1ED]/70 border border-[#CCDCD0] flex items-center gap-2.5 text-[#284230]">
              <ShieldCheck className="w-4 h-4 text-[#4A6B53] shrink-0" />
              <div className="text-[11px]">
                <span className="font-semibold">Akun Terverifikasi:</span> Diaktivasi pada{' '}
                <span className="font-medium">{activationDateStr}</span>
              </div>
            </div>
          )}

          {/* Pending Token Banner (Visible ONLY to authorized Administrators) */}
          {!isActive && isAdmin && member.invitationToken && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium flex items-center gap-1.5 text-amber-800">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Token Aktivasi Akun Anggota</span>
                </span>
                <button
                  onClick={handleCopyToken}
                  className="text-[10px] text-amber-900 font-semibold hover:underline flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-amber-300"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Token</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-xs font-semibold bg-white px-2.5 py-1 rounded border border-amber-200 tracking-wider inline-block">
                {member.invitationToken}
              </p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Kirimkan token ini kepada yang bersangkutan untuk mengaktifkan akun di KKN SPACE.
              </p>
            </div>
          )}

          {/* Academic Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-500">
              <GraduationCap className="w-3.5 h-3.5 text-[#4A6B53]" />
              <span>Informasi Akademik</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF]">
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Program Studi / Jurusan</span>
                <span className="text-stone-800 font-medium">{member.major || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Fakultas</span>
                <span className="text-stone-800 font-medium">{member.faculty || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Nomor Induk Mahasiswa (NIM)</span>
                <span className="text-stone-800 font-mono font-medium">{member.nim || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">Status Penugasan Posko</span>
                <span className="text-stone-800 font-medium capitalize">
                  {member.status === 'active' ? 'Aktif Bertugas di Desa' : member.status}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Responsibilities */}
          {member.responsibilities && member.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-500">
                <Briefcase className="w-3.5 h-3.5 text-[#4A6B53]" />
                <span>Tanggung Jawab Operasional Posko</span>
              </h4>
              <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF]">
                <ul className="space-y-2 text-[11px] text-stone-700">
                  {member.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B53] shrink-0 mt-1.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-900 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-500">
              <Phone className="w-3.5 h-3.5 text-[#4A6B53]" />
              <span>Kontak & Komunikasi</span>
            </h4>
            <div className="space-y-2 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-stone-500">Nomor WhatsApp Resmi (+62):</span>
                {user ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-stone-900">
                      {formatInternationalPhone(member.phone)}
                    </span>
                    <button
                      onClick={handleCopyPhone}
                      className="text-stone-400 hover:text-stone-700 p-1"
                      title="Salin nomor"
                    >
                      {copiedPhone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onOpenAuthModal}
                    className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800"
                  >
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span className="font-mono">{maskPhoneNumber(member.phone)}</span>
                    <span className="text-[10px] text-[#4A6B53] underline ml-1">(Masuk)</span>
                  </button>
                )}
              </div>

              {member.email && (
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-stone-200/60">
                  <span className="text-[11px] text-stone-500">Email Akun:</span>
                  <span className="text-stone-800 font-mono text-[11px]">{member.email}</span>
                </div>
              )}

              {member.emergencyContact && (
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-stone-200/60">
                  <span className="text-[11px] text-stone-500">Kontak Darurat / Keluarga:</span>
                  <span className="text-stone-800 font-mono text-[11px]">
                    {user ? member.emergencyContact : 'Tersedia untuk anggota tim'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-[#E8E6DF] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md border border-stone-300 text-xs text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {user ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat via WhatsApp</span>
              </a>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-300 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Masuk untuk WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
