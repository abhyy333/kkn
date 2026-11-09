import React, { useState, useEffect } from 'react';
import { Member } from '../../types';
import { formatInternationalPhone, getWhatsAppUrl } from '../../utils/phone';
import { FileUploader } from '../common/FileUploader';
import {
  X,
  User,
  Phone,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface EditMemberModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (updated: Member) => Promise<void>;
}

const PRESET_AVATARS = [
  { label: 'Pria 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Pria 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { label: 'Pria 3', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80' },
  { label: 'Pria 4', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 4', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 5', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' },
  { label: 'Wanita 6', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
];

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [division, setDivision] = useState('Divisi Acara');
  const [major, setMajor] = useState('');
  const [faculty, setFaculty] = useState('');
  const [nim, setNim] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarStoragePath, setAvatarStoragePath] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newRespItem, setNewRespItem] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setRole(member.role || '');
      setDivision(member.division || 'Divisi Acara');
      setMajor(member.major || '');
      setFaculty(member.faculty || '');
      setNim(member.nim || '');
      setPhone(member.phone ? formatInternationalPhone(member.phone) : '');
      setEmergencyContact(member.emergencyContact || '');
      setAvatar(member.avatar || '');
      setAvatarStoragePath(member.avatarStoragePath || '');
      setResponsibilities(member.responsibilities || []);
      setErrorMsg('');
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handlePhoneChange = (val: string) => {
    setPhone(val);
  };

  const handlePhoneBlur = () => {
    if (phone.trim()) {
      setPhone(formatInternationalPhone(phone));
    }
  };

  const handleAddResponsibility = () => {
    if (!newRespItem.trim()) return;
    setResponsibilities((prev) => [...prev, newRespItem.trim()]);
    setNewRespItem('');
  };

  const handleRemoveResponsibility = (idx: number) => {
    setResponsibilities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const formattedPhone = formatInternationalPhone(phone);
      const updated: Member = {
        ...member,
        name: name.trim(),
        role: role.trim(),
        division,
        major: major.trim(),
        faculty: faculty.trim(),
        nim: nim.trim(),
        phone: formattedPhone,
        emergencyContact: emergencyContact.trim(),
        avatar: avatar.trim(),
        avatarStoragePath: avatarStoragePath || undefined,
        responsibilities,
      };

      await onSave(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan anggota.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto text-xs my-6">
        {/* Header */}
        <div className="p-5 bg-[#FAF9F5] border-b border-[#E8E6DF] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4A6B53] text-white flex items-center justify-center font-medium">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-sm font-semibold text-stone-900">
                Edit Profil Anggota Tim KKN
              </h2>
              <p className="text-[11px] text-stone-500">
                Perbarui foto profil, nomor WhatsApp (+62), divisi, dan tanggung jawab operasional.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 rounded"
            aria-label="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo & Basic Details */}
          <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200/70 space-y-3">
            <FileUploader
              folder="members"
              accept="image"
              multiple={false}
              label="Foto Profil Anggota (Unggah dari Perangkat / Kamera)"
              helperText="JPG, PNG, WEBP hingga 10MB"
              singleUrl={avatar}
              singleStoragePath={avatarStoragePath}
              onSingleUpload={(meta) => {
                setAvatar(meta?.url || '');
                setAvatarStoragePath(meta?.storagePath || '');
              }}
              compact
            />

            {/* Preset selection pills */}
            <div className="space-y-1 pt-1 border-t border-stone-200/60">
              <span className="text-[10px] text-stone-500 font-medium">Atau Gunakan Avatar Standar:</span>
              <div className="flex flex-wrap gap-1">
                {PRESET_AVATARS.map((p, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      setAvatar(p.url);
                      setAvatarStoragePath('');
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      avatar === p.url
                        ? 'bg-[#4A6B53] text-white border-[#4A6B53]'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-stone-700 font-medium">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama mahasiswa"
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-700 font-medium">Jabatan / Posisi</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Contoh: Ketua Tim KKN (Kormades)"
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-700 font-medium">Divisi Penugasan</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] bg-white focus:outline-none focus:border-[#4A6B53]"
              >
                <option value="Badan Pengurus Harian (BPH)">Badan Pengurus Harian (BPH)</option>
                <option value="Divisi Acara">Divisi Acara</option>
                <option value="Divisi PDD">Divisi PDD (Publikasi, Desain & IT)</option>
                <option value="Divisi Humper">Divisi Humper (Humas & Perlengkapan)</option>
                <option value="Divisi Konsumsi">Divisi Konsumsi (Konsumsi & Gizi)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-stone-700 font-medium">
                Nomor WhatsApp (+62 Standar Internasional)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="+62 882-9692-4050"
                  className="w-full pl-8 pr-3 py-1.5 rounded border border-[#D5D2C8] font-mono focus:outline-none focus:border-[#4A6B53]"
                />
              </div>
              <span className="text-[10px] text-stone-400">
                Tersimpan dalam format internasional. Preview tautan: {getWhatsAppUrl(phone)}
              </span>
            </div>
          </div>

          {/* Academic Background */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-stone-100">
            <div className="space-y-1">
              <label className="text-stone-700 font-medium">Jurusan / Program Studi</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Ilmu Pemerintahan"
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-700 font-medium">NIM Mahasiswa</label>
              <input
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="22/498210/SP/31201"
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] font-mono focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-700 font-medium">Kontak Darurat Posko</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Posko KKN Dusun Gubuk Lauk"
                className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
            </div>
          </div>

          {/* Responsibilities Builder */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="text-stone-700 font-medium flex items-center justify-between">
              <span>Tanggung Jawab Operasional Lapangan</span>
              <span className="text-[10px] text-stone-400 font-normal">
                {responsibilities.length} butir terdaftar
              </span>
            </label>

            <div className="space-y-1.5">
              {responsibilities.map((resp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded bg-stone-50 border border-stone-200"
                >
                  <span className="text-[10px] text-stone-400 font-mono w-4 text-center">
                    {idx + 1}.
                  </span>
                  <span className="flex-1 text-stone-700">{resp}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveResponsibility(idx)}
                    className="text-stone-400 hover:text-red-600 p-0.5"
                    title="Hapus butir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newRespItem}
                onChange={(e) => setNewRespItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddResponsibility();
                  }
                }}
                placeholder="Tambah butir tugas baru (contoh: Mengelola katalog digital tenun)..."
                className="flex-1 px-3 py-1.5 rounded border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
              />
              <button
                type="button"
                onClick={handleAddResponsibility}
                className="px-3 py-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
