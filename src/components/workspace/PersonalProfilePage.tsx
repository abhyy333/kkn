import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Member, UploadedFileMetadata } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { FileUploader } from '../common/FileUploader';
import { uploadFileToStorage } from '../../utils/storageService';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Award,
  ShieldCheck,
  Edit3,
  Save,
  X,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  HeartPulse,
  Building2,
  Hash,
  FileText,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface PersonalProfilePageProps {
  members: Member[];
  targetMemberId?: string | null;
  mode?: 'view' | 'edit' | 'view_self' | 'edit_self' | 'view_member';
  initialEditMode?: boolean;
  onUpdateMember: (member: Member) => Promise<void> | void;
  onNavigate: (path: string) => void;
}

const DIVISION_OPTIONS = [
  'Badan Pengurus Harian (BPH)',
  'Divisi Acara',
  'Divisi PDD',
  'Divisi Humper',
  'Divisi Konsumsi',
];

export const PersonalProfilePage: React.FC<PersonalProfilePageProps> = ({
  members,
  targetMemberId,
  mode = 'view',
  initialEditMode = false,
  onUpdateMember,
  onNavigate,
}) => {
  const { user, profile, isSuperAdmin, logAdminActivity } = useAuth();
  const { confirm, notify } = useConfirm();

  // Resolve which member profile is being viewed
  const selfMember = useMemo(() => {
    if (targetMemberId) {
      const byTarget = members.find((m) => m.id === targetMemberId);
      if (byTarget) return byTarget;
    }
    if (profile?.memberId) {
      const byProfileId = members.find((m) => m.id === profile.memberId);
      if (byProfileId) return byProfileId;
    }
    if (user?.email) {
      const cleanEmail = user.email.toLowerCase();
      const byEmail = members.find(
        (m) =>
          (m.email && m.email.toLowerCase() === cleanEmail) ||
          (m.registeredEmail && m.registeredEmail.toLowerCase() === cleanEmail)
      );
      if (byEmail) return byEmail;
    }
    if (profile?.displayName) {
      const byName = members.find(
        (m) => m.name.toLowerCase() === profile.displayName.toLowerCase()
      );
      if (byName) return byName;
    }
    return members.find((m) => m.id === 'm-4') || members[0];
  }, [members, targetMemberId, profile, user]);

  // Verify strict ownership: is the authenticated user viewing their OWN member record?
  const isOwnProfile = useMemo(() => {
    if (!selfMember || !user) return false;
    if (profile?.memberId && selfMember.id === profile.memberId) return true;
    if (selfMember.authUid && selfMember.authUid === user.uid) return true;
    if (
      user.email &&
      ((selfMember.email &&
        selfMember.email.toLowerCase() === user.email.toLowerCase()) ||
        (selfMember.registeredEmail &&
          selfMember.registeredEmail.toLowerCase() === user.email.toLowerCase()))
    ) {
      return true;
    }
    if (
      user.email &&
      user.email.toLowerCase() === 'abhyy333@gmail.com' &&
      selfMember.id === 'm-4'
    ) {
      return true;
    }
    return false;
  }, [selfMember, user, profile]);

  // Only the profile owner (or super_admin) is permitted to edit this profile
  const canEditThisProfile = isOwnProfile || isSuperAdmin;
  const shouldStartEditing =
    initialEditMode || mode === 'edit' || mode === 'edit_self';

  const [isEditing, setIsEditing] = useState(
    Boolean(shouldStartEditing && canEditThisProfile)
  );

  // Editable membership & personal fields
  const [name, setName] = useState(selfMember?.name || '');
  const [role, setRole] = useState(selfMember?.role || selfMember?.position || '');
  const [division, setDivision] = useState(
    selfMember?.division || DIVISION_OPTIONS[0]
  );
  const [nim, setNim] = useState(selfMember?.nim || '');
  const [major, setMajor] = useState(selfMember?.major || '');
  const [faculty, setFaculty] = useState(
    selfMember?.faculty || 'UIN Alauddin Makassar'
  );
  const [phone, setPhone] = useState(selfMember?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(
    selfMember?.emergencyContact || ''
  );
  const [bio, setBio] = useState(selfMember?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(selfMember?.avatar || '');
  const [avatarStoragePath, setAvatarStoragePath] = useState(
    selfMember?.avatarStoragePath || ''
  );
  const [responsibilities, setResponsibilities] = useState<string[]>(
    Array.isArray(selfMember?.responsibilities)
      ? selfMember.responsibilities
      : []
  );
  const [newResponsibility, setNewResponsibility] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingQuickPhoto, setUploadingQuickPhoto] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when viewed member changes (only when not mid-edit, or when target member switches)
  useEffect(() => {
    if (!selfMember) return;
    setName(selfMember.name || '');
    setRole(selfMember.role || selfMember.position || '');
    setDivision(selfMember.division || DIVISION_OPTIONS[0]);
    setNim(selfMember.nim || '');
    setMajor(selfMember.major || '');
    setFaculty(selfMember.faculty || 'UIN Alauddin Makassar');
    setPhone(selfMember.phone || '');
    setEmergencyContact(selfMember.emergencyContact || '');
    setBio(selfMember.bio || '');
    setAvatarUrl(selfMember.avatar || '');
    setAvatarStoragePath(selfMember.avatarStoragePath || '');
    setResponsibilities(
      Array.isArray(selfMember.responsibilities)
        ? selfMember.responsibilities
        : []
    );
    setValidationError(null);
  }, [selfMember]);

  useEffect(() => {
    setIsEditing(
      Boolean(
        (initialEditMode || mode === 'edit' || mode === 'edit_self') &&
          canEditThisProfile
      )
    );
  }, [initialEditMode, mode, canEditThisProfile]);

  // Compute whether the user has unsaved edits compared to saved `selfMember`
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing || !selfMember) return false;
    const origResp = Array.isArray(selfMember.responsibilities)
      ? selfMember.responsibilities
      : [];
    const respChanged =
      responsibilities.length !== origResp.length ||
      responsibilities.some((item, idx) => item !== origResp[idx]);

    return (
      name.trim() !== (selfMember.name || '').trim() ||
      role.trim() !== (selfMember.role || selfMember.position || '').trim() ||
      division.trim() !== (selfMember.division || '').trim() ||
      nim.trim() !== (selfMember.nim || '').trim() ||
      major.trim() !== (selfMember.major || '').trim() ||
      faculty.trim() !==
        (selfMember.faculty || 'UIN Alauddin Makassar').trim() ||
      phone.trim() !== (selfMember.phone || '').trim() ||
      emergencyContact.trim() !== (selfMember.emergencyContact || '').trim() ||
      bio.trim() !== (selfMember.bio || '').trim() ||
      avatarUrl !== (selfMember.avatar || '') ||
      respChanged
    );
  }, [
    isEditing,
    selfMember,
    name,
    role,
    division,
    nim,
    major,
    faculty,
    phone,
    emergencyContact,
    bio,
    avatarUrl,
    responsibilities,
  ]);

  // Warn before browser tab close / reload when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!selfMember) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-stone-200">
        <p className="text-sm text-stone-600">Data profil tidak ditemukan.</p>
      </div>
    );
  }

  const resetFormToSaved = () => {
    setName(selfMember.name || '');
    setRole(selfMember.role || selfMember.position || '');
    setDivision(selfMember.division || DIVISION_OPTIONS[0]);
    setNim(selfMember.nim || '');
    setMajor(selfMember.major || '');
    setFaculty(selfMember.faculty || 'UIN Alauddin Makassar');
    setPhone(selfMember.phone || '');
    setEmergencyContact(selfMember.emergencyContact || '');
    setBio(selfMember.bio || '');
    setAvatarUrl(selfMember.avatar || '');
    setAvatarStoragePath(selfMember.avatarStoragePath || '');
    setResponsibilities(
      Array.isArray(selfMember.responsibilities)
        ? selfMember.responsibilities
        : []
    );
    setNewResponsibility('');
    setValidationError(null);
  };

  const handleCancelEdit = async () => {
    if (hasUnsavedChanges) {
      const discardConfirmed = await confirm({
        title: 'Batalkan Perubahan yang Belum Disimpan?',
        description:
          'Anda memiliki perubahan data keanggotaan atau profil yang belum disimpan. Jika dibatalkan, seluruh perubahan baru akan dikembalikan ke data tersimpan sebelumnya.',
        confirmLabel: 'Ya, Batalkan Perubahan',
        cancelLabel: 'Lanjutkan Mengedit',
        level: 'warning',
      });
      if (!discardConfirmed) return;
    }

    resetFormToSaved();
    setIsEditing(false);
    if (window.location.pathname === '/workspace/profile/edit') {
      onNavigate('/workspace/profile');
    }
  };

  const handleSafeNavigate = async (targetPath: string) => {
    if (hasUnsavedChanges) {
      const leaveConfirmed = await confirm({
        title: 'Tinggalkan Halaman Tanpa Menyimpan?',
        description:
          'Perubahan profil Anda belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini dan membatalkan perubahan?',
        confirmLabel: 'Tinggalkan Halaman',
        cancelLabel: 'Tetap di Halaman Ini',
        level: 'warning',
      });
      if (!leaveConfirmed) return;
    }
    resetFormToSaved();
    setIsEditing(false);
    onNavigate(targetPath);
  };

  const handleQuickAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canEditThisProfile) {
      notify({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Anda hanya dapat mengubah foto profil Anda sendiri.',
      });
      return;
    }

    setUploadingQuickPhoto(true);
    try {
      const metadata = await uploadFileToStorage(
        file,
        'avatars',
        undefined,
        user?.email || selfMember.name
      );
      setAvatarUrl(metadata.url);
      setAvatarStoragePath(metadata.storagePath || '');

      // If not currently in full form edit mode, persist the new profile photo immediately
      if (!isEditing) {
        const updated: Member = {
          ...selfMember,
          avatar: metadata.url,
          avatarStoragePath: metadata.storagePath,
        };
        await onUpdateMember(updated);
        await logAdminActivity(
          'UPDATE_MEMBER_PHOTO',
          `${selfMember.name} (${selfMember.id})`,
          `Mengunggah foto profil baru ke Supabase Storage (${metadata.name})`
        );
      }

      notify({
        type: 'success',
        title: 'Foto Profil Diperbarui',
        message: isEditing
          ? 'Foto profil berhasil diunggah. Klik "Simpan Perubahan" untuk menyimpan seluruh pembaruan.'
          : 'Foto profil Anda berhasil diunggah dan langsung diperbarui.',
      });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Gagal Mengunggah Foto',
        message:
          err?.message || 'Terjadi kesalahan saat mengunggah foto profil.',
      });
    } finally {
      setUploadingQuickPhoto(false);
      if (quickPhotoInputRef.current) quickPhotoInputRef.current.value = '';
    }
  };

  const handleAddResponsibility = () => {
    const trimmed = newResponsibility.trim();
    if (!trimmed) return;
    if (responsibilities.includes(trimmed)) {
      setNewResponsibility('');
      return;
    }
    setResponsibilities((prev) => [...prev, trimmed]);
    setNewResponsibility('');
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!canEditThisProfile) {
      notify({
        type: 'error',
        title: 'Akses Ditolak',
        message: 'Anda hanya diizinkan memperbarui profil Anda sendiri.',
      });
      return;
    }

    const cleanName = name.trim();
    const cleanRole = role.trim();
    const cleanDivision = division.trim();
    const cleanNim = nim.trim();
    const cleanMajor = major.trim();
    const cleanFaculty = faculty.trim();

    if (!cleanName || cleanName.length < 3) {
      const msg = 'Nama lengkap wajib diisi (minimal 3 karakter).';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    if (!cleanRole) {
      const msg = 'Jabatan resmi KKN wajib diisi.';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    if (!cleanDivision) {
      const msg = 'Divisi KKN wajib dipilih atau diisi.';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    if (!cleanNim) {
      const msg = 'Nomor Induk Mahasiswa (NIM) wajib diisi.';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    if (!cleanMajor) {
      const msg = 'Program Studi wajib diisi.';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    if (!cleanFaculty) {
      const msg = 'Fakultas / Universitas wajib diisi.';
      setValidationError(msg);
      notify({ type: 'error', title: 'Validasi Profil', message: msg });
      return;
    }

    setSaving(true);
    try {
      // Preserve existing information for any field left unchanged and strictly lock security fields
      const updatedMember: Member = {
        ...selfMember,
        name: cleanName || selfMember.name,
        role: cleanRole || selfMember.role,
        position: cleanRole || selfMember.position || selfMember.role,
        division: cleanDivision || selfMember.division,
        nim: cleanNim || selfMember.nim,
        major: cleanMajor || selfMember.major,
        faculty: cleanFaculty || selfMember.faculty,
        phone: phone.trim() || selfMember.phone || '-',
        emergencyContact:
          emergencyContact.trim() || selfMember.emergencyContact || '-',
        bio: bio.trim(),
        avatar: avatarUrl || selfMember.avatar,
        avatarStoragePath:
          avatarStoragePath || selfMember.avatarStoragePath,
        responsibilities:
          responsibilities.length > 0
            ? responsibilities
            : selfMember.responsibilities,
        // Strictly preserve protected security & authorization fields
        id: selfMember.id,
        systemRole: selfMember.systemRole,
        authUid: selfMember.authUid,
        accountStatus: selfMember.accountStatus,
        email: selfMember.email,
        registeredEmail: selfMember.registeredEmail,
        acceptedAt: selfMember.acceptedAt,
        disabledAt: selfMember.disabledAt,
      };

      await onUpdateMember(updatedMember);

      await logAdminActivity(
        isOwnProfile ? 'SELF_UPDATE_MEMBER_PROFILE' : 'ADMIN_UPDATE_MEMBER_PROFILE',
        `${updatedMember.name} (${updatedMember.id})`,
        `Memperbarui data keanggotaan & profil: ${updatedMember.name}, Jabatan: ${updatedMember.role}, Divisi: ${updatedMember.division}, NIM: ${updatedMember.nim}, Prodi: ${updatedMember.major}, Fakultas: ${updatedMember.faculty}`
      );

      notify({
        type: 'success',
        title: 'Profil Berhasil Disimpan',
        message:
          'Data keanggotaan dan profil pribadi Anda telah diperbarui di Supabase.',
      });

      setIsEditing(false);
      if (window.location.pathname === '/workspace/profile/edit') {
        onNavigate('/workspace/profile');
      }
    } catch (err: any) {
      const errMsg =
        err?.message || 'Terjadi kesalahan saat menyimpan perubahan profil.';
      setValidationError(errMsg);
      notify({
        type: 'error',
        title: 'Gagal Menyimpan Profil',
        message: errMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            handleSafeNavigate(
              targetMemberId ? '/workspace/members' : '/workspace'
            )
          }
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200/80 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-stone-500" />
          <span>
            {targetMemberId
              ? 'Kembali ke Direktori Anggota'
              : 'Kembali ke Workspace'}
          </span>
        </button>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span>Workspace</span>
          <span>/</span>
          <span className="font-semibold text-stone-800">
            {isOwnProfile ? 'Profil Saya' : `Profil ${selfMember.name}`}
          </span>
          {isEditing && (
            <>
              <span>/</span>
              <span className="text-[#4A6B53] font-semibold">Edit Profil</span>
            </>
          )}
        </div>
      </div>

      {/* Main Profile Identity Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Direct Device Upload Trigger */}
          <div className="relative group shrink-0">
            <img
              src={avatarUrl || selfMember.avatar}
              alt={name || selfMember.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover ring-1 ring-stone-200 shadow-sm bg-stone-100"
            />
            {canEditThisProfile && (
              <>
                <input
                  ref={quickPhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleQuickAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingQuickPhoto || saving}
                  onClick={() => quickPhotoInputRef.current?.click()}
                  title="Unggah foto profil baru dari perangkat"
                  className="absolute -bottom-2 -right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F2421] text-white text-[11px] font-semibold shadow-md hover:bg-[#4A6B53] transition-colors disabled:opacity-60"
                >
                  {uploadingQuickPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingQuickPhoto ? 'Mengunggah...' : 'Foto'}</span>
                </button>
              </>
            )}
          </div>

          {/* Identity & Status Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#E8ECE9] text-[#284230] text-[11px] font-semibold">
                {role || selfMember.role}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                {division || selfMember.division}
              </span>
              {selfMember.accountStatus === 'active' || isOwnProfile ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/70">
                  <CheckCircle2 className="w-3 h-3" />
                  Akun Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/70">
                  <Clock className="w-3 h-3" />
                  Menunggu Aktivasi
                </span>
              )}
              {(selfMember.systemRole === 'super_admin' ||
                (isOwnProfile && isSuperAdmin)) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                  Super Admin
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight break-words">
              {name || selfMember.name}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              {major || selfMember.major} · {faculty || selfMember.faculty}
            </p>
            <p className="text-xs text-stone-500 mt-0.5 font-mono">
              NIM: {nim || selfMember.nim || '-'}
            </p>
          </div>

          {/* Primary Action Controls */}
          {canEditThisProfile && (
            <div className="shrink-0 flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    if ( isOwnProfile && window.location.pathname === '/workspace/profile') {
                      onNavigate('/workspace/profile/edit');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A6B53] text-white text-xs font-semibold hover:bg-[#3d5944] transition-colors shadow-xs w-full sm:w-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profil</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCancelEdit}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Self-Service Membership Data + Protected Security Metadata */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card 1: Official KKN Membership Summary */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Data Keanggotaan Resmi KKN
                </h2>
              </div>
              {canEditThisProfile ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#284230] bg-[#E8ECE9] px-2 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5" />
                  Dapat Diedit
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" />
                  Profil Anggota
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Nama Lengkap
                </p>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {selfMember.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Jabatan Resmi
                  </p>
                  <p className="font-semibold text-stone-900 mt-0.5">
                    {selfMember.role}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Divisi
                  </p>
                  <p className="font-semibold text-stone-900 mt-0.5">
                    {selfMember.division}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  NIM Mahasiswa
                </p>
                <p className="font-mono font-semibold text-stone-800 mt-0.5">
                  {selfMember.nim || '-'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Program Studi & Fakultas
                </p>
                <p className="font-semibold text-stone-800 mt-0.5">
                  {selfMember.major}
                </p>
                <p className="text-[11px] text-stone-500">
                  {selfMember.faculty}
                </p>
              </div>
            </div>

            {canEditThisProfile && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  if (isOwnProfile && window.location.pathname === '/workspace/profile') {
                    onNavigate('/workspace/profile/edit');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#4A6B53]/30 bg-[#E8ECE9]/50 text-[#284230] text-xs font-semibold hover:bg-[#E8ECE9] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Data Keanggotaan & Profil</span>
              </button>
            )}
          </div>

          {/* Card 2: Security & System Authorization (Strictly Protected) */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-stone-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Otorisasi & Keamanan Akun
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                <Lock className="w-2.5 h-2.5" />
                Dilindungi Sistem
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Email Akun Resmi</span>
                <span className="font-mono text-[11px] font-medium text-stone-800 truncate max-w-[180px]">
                  {selfMember.email && selfMember.email.trim() !== ''
                    ? selfMember.email
                    : 'Belum Didaftarkan'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Peran Sistem (Role)</span>
                <span className="font-semibold text-stone-800">
                  {selfMember.systemRole === 'super_admin' ||
                  (isOwnProfile && isSuperAdmin)
                    ? 'super_admin'
                    : selfMember.systemRole || 'member'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500">Status Aktivasi</span>
                <span className="font-semibold text-emerald-700">
                  {selfMember.accountStatus === 'active' || isOwnProfile
                    ? 'Aktif (Terverifikasi)'
                    : selfMember.accountStatus === 'disabled'
                    ? 'Dinonaktifkan'
                    : 'Menunggu Aktivasi'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-stone-500">ID Keanggotaan</span>
                <span className="font-mono text-[11px] text-stone-600">
                  {selfMember.id}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed pt-1">
              Hak akses sistem, email autentikasi, dan status akun dikelola
              melalui kebijakan keamanan RLS Supabase dan hanya dapat diubah oleh
              Super Admin.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Form OR Complete Profile View */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing && canEditThisProfile ? (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-7 shadow-xs space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-900">
                    Edit Data Keanggotaan & Profil Pribadi
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Perbarui informasi keanggotaan resmi KKN, akademik, foto
                    profil, kontak, dan biografi Anda.
                  </p>
                </div>
                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Belum disimpan
                  </span>
                )}
              </div>

              {validationError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Section 1: Foto Profil via Supabase Storage */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  Foto Profil Anggota (Unggah Langsung dari Perangkat)
                </label>
                <FileUploader
                  folder="avatars"
                  accept="image"
                  maxSizeMB={5}
                  singleUrl={avatarUrl}
                  singleStoragePath={avatarStoragePath}
                  uploaderName={user?.email || selfMember.name}
                  label="Pilih Foto Profil dari Perangkat"
                  helperText="Format JPG, PNG, atau WEBP (maks. 5 MB). Diunggah langsung ke Supabase Storage tanpa memerlukan URL gambar."
                  onSingleUpload={(meta: UploadedFileMetadata | null) => {
                    if (!meta) return;
                    setAvatarUrl(meta.url);
                    setAvatarStoragePath(meta.storagePath || '');
                    notify({
                      type: 'success',
                      title: 'Foto Siap Disimpan',
                      message:
                        'Foto berhasil diunggah ke Supabase Storage. Klik Simpan Perubahan untuk menerapkan.',
                    });
                  }}
                />
              </div>

              {/* Section 2: Identitas & Keanggotaan KKN */}
              <div className="pt-2 border-t border-stone-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6B53] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Identitas & Jabatan Keanggotaan KKN</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama lengkap resmi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 font-medium focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Jabatan Resmi KKN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Contoh: Ketua / Sekretaris / Divisi Acara 1"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 font-medium focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Divisi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 font-medium focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                    >
                      {DIVISION_OPTIONS.map((divOption) => (
                        <option key={divOption} value={divOption}>
                          {divOption}
                        </option>
                      ))}
                      {!DIVISION_OPTIONS.includes(division) && division && (
                        <option value={division}>{division}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Data Akademik Mahasiswa */}
              <div className="pt-2 border-t border-stone-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6B53] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Informasi Akademik Mahasiswa</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Nomor Induk Mahasiswa (NIM){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={nim}
                        onChange={(e) => setNim(e.target.value)}
                        placeholder="Nomor Induk Mahasiswa"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs font-mono text-stone-800 focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Program Studi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="Contoh: Teknik Informatika"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 font-medium focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Fakultas / Universitas{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={faculty}
                        onChange={(e) => setFaculty(e.target.value)}
                        placeholder="Fakultas / Universitas"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 font-medium focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Kontak, Bio & Tanggung Jawab */}
              <div className="pt-2 border-t border-stone-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A6B53] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Kontak, Biografi & Tanggung Jawab</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Nomor Telepon / WhatsApp Aktif
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+62 812-xxxx-xxxx"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                      Kontak Darurat (Keluarga / Wali)
                    </label>
                    <div className="relative">
                      <HeartPulse className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Nama & Nomor Telepon Wali"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Biografi Singkat & Fokus Pengabdian Masyarakat
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tuliskan deskripsi singkat mengenai latar belakang keilmuan dan fokus kontribusi Anda di Desa Pringgasela Selatan..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 leading-relaxed focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                  />
                </div>

                {/* Operational Responsibilities */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Tanggung Jawab Operasional
                  </label>
                  <div className="flex gap-2 mb-2.5">
                    <input
                      type="text"
                      value={newResponsibility}
                      onChange={(e) => setNewResponsibility(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddResponsibility();
                        }
                      }}
                      placeholder="Tambahkan butir tanggung jawab baru..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-[#4A6B53] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddResponsibility}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  {responsibilities.length > 0 && (
                    <ul className="space-y-1.5">
                      {responsibilities.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F7F6F2] border border-stone-200/80 text-xs text-stone-700"
                        >
                          <span className="truncate">{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveResponsibility(idx)}
                            className="text-stone-400 hover:text-red-600 transition-colors p-0.5"
                            title="Hapus butir tanggung jawab"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A6B53] text-white text-xs font-semibold hover:bg-[#3d5944] transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {saving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-900">
                    Informasi Kontak & Biografi Anggota
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Detail kontak koordinasi lapangan, biografi, dan tanggung
                    jawab operasional.
                  </p>
                </div>
                {canEditThisProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      if (
                        isOwnProfile &&
                        window.location.pathname === '/workspace/profile'
                      ) {
                        onNavigate('/workspace/profile/edit');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4A6B53] hover:bg-[#E8ECE9]/60 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                  <div className="flex items-center gap-2 text-stone-400 mb-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Email Akun Terdaftar
                    </span>
                  </div>
                  <p className="font-semibold text-stone-800 break-all">
                    {selfMember.email && selfMember.email.trim() !== ''
                      ? selfMember.email
                      : 'Belum Didaftarkan'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F6F2] border border-stone-200/70">
                  <div className="flex items-center gap-2 text-stone-400 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Nomor Telepon / WhatsApp
                    </span>
                  </div>
                  <p className="font-semibold text-stone-800">
                    {selfMember.phone && selfMember.phone !== '-'
                      ? selfMember.phone
                      : 'Belum diisi'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F6F2] border border-stone-200/70 sm:col-span-2">
                  <div className="flex items-center gap-2 text-stone-400 mb-1">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Kontak Darurat
                    </span>
                  </div>
                  <p className="font-semibold text-stone-800">
                    {selfMember.emergencyContact &&
                    selfMember.emergencyContact !== '-'
                      ? selfMember.emergencyContact
                      : 'Belum diisi'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Biografi & Fokus Kontribusi
                </h3>
                <div className="p-4 rounded-xl bg-[#F7F6F2] border border-stone-200/70 text-xs text-stone-700 leading-relaxed">
                  {selfMember.bio || 'Belum ada biografi yang ditambahkan.'}
                </div>
              </div>

              {selfMember.responsibilities &&
                selfMember.responsibilities.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                      Tanggung Jawab Utama ({selfMember.division})
                    </h3>
                    <ul className="space-y-2">
                      {selfMember.responsibilities.map((resp, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-stone-700 bg-[#F7F6F2] px-3.5 py-2.5 rounded-xl border border-stone-200/60"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
