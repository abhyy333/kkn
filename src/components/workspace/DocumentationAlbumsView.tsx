import React, { useState, useRef } from 'react';
import {
  Camera,
  Plus,
  Search,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  UploadCloud,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Star,
  Edit3,
  Image as ImageIcon,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  DocumentationAlbum,
  AlbumPhotoItem,
  Member,
  WorkProgram,
  SurveyRecord,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { uploadFileToStorage, deleteFileFromStorage } from '../../utils/storageService';

interface DocumentationAlbumsViewProps {
  albums: DocumentationAlbum[];
  members: Member[];
  programs: WorkProgram[];
  surveys: SurveyRecord[];
  selectedAlbumId?: string;
  onSaveAlbums: (albums: DocumentationAlbum[]) => void;
  onNavigate: (path: string) => void;
}

const DUSUN_OPTIONS = [
  'Dusun Gubuk Lauk',
  'Dusun Gubuk Daya',
  'Dusun Sinar Sari',
  'Dusun Timba Gerah',
  'Dusun Pancor Kopong',
  'Dusun Kedondong',
  'Dusun Aik Dewa',
  'Pusat Pemerintahan Desa',
];

const CATEGORY_OPTIONS: Array<DocumentationAlbum['category']> = [
  'Program Kerja',
  'Observasi Survei',
  'Sosialisasi Warga',
  'Rapat & Koordinasi',
  'Kehidupan Posko',
];

interface DraftPhotoUpload {
  tempId: string;
  imageUrl: string;
  storagePath?: string;
  fileSize?: string;
  caption: string;
  isCover: boolean;
}

export const DocumentationAlbumsView: React.FC<DocumentationAlbumsViewProps> = ({
  albums,
  members,
  programs,
  selectedAlbumId,
  onSaveAlbums,
  onNavigate,
}) => {
  const { user, profile, canWrite, isSuperAdmin } = useAuth();
  const canEditWorkspace = canWrite || Boolean(user);
  const currentUserName = user?.displayName || profile?.displayName;
  const { confirm, notify } = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [dusunFilter, setDusunFilter] = useState<string>('Semua');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Album Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<DocumentationAlbum['category']>('Program Kerja');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDusun, setNewDusun] = useState('Dusun Gubuk Lauk');
  const [newLocation, setNewLocation] = useState('Desa Pringgasela Selatan');
  const [newPhotographer, setNewPhotographer] = useState(
    currentUserName || 'Muhammad Agits Haibatulloh'
  );
  const [newProgramId, setNewProgramId] = useState('');
  const [newTags, setNewTags] = useState('Tenun Gedogan, Pengabdian Desa');
  const [newIsPublished, setNewIsPublished] = useState(true);
  const [draftPhotos, setDraftPhotos] = useState<DraftPhotoUpload[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);

  // Detail Page States
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [editingAlbumMeta, setEditingAlbumMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentationAlbum['category']>('Program Kerja');
  const [editDate, setEditDate] = useState('');
  const [editPhotographer, setEditPhotographer] = useState('');
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);

  const createFilesInputRef = useRef<HTMLInputElement>(null);
  const createCameraInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const addMoreCameraInputRef = useRef<HTMLInputElement>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);

  const selectedAlbum = selectedAlbumId
    ? albums.find((a) => a.id === selectedAlbumId)
    : undefined;

  // Handle Multi-File Upload for New Album
  const handleSelectNewAlbumFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    e.target.value = '';

    setIsUploadingBatch(true);
    setBatchProgress(5);
    const uploadedDrafts: DraftPhotoUpload[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const result = await uploadFileToStorage(
          file,
          'documentation_albums',
          (p) => {
            const overall = Math.round(((i + p / 100) / files.length) * 100);
            setBatchProgress(overall);
          },
          currentUserName || newPhotographer,
          true
        );

        uploadedDrafts.push({
          tempId: `draft-${Date.now()}-${i}`,
          imageUrl: result.url,
          storagePath: result.storagePath,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          isCover: draftPhotos.length === 0 && i === 0,
        });
      }

      setDraftPhotos((prev) => [...prev, ...uploadedDrafts]);
      notify({
        type: 'success',
        title: `${uploadedDrafts.length} Foto Berhasil Diunggah`,
        message: 'Anda dapat melengkapi caption setiap foto dan memilih foto sampul album.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Gagal Mengunggah Foto',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah foto.',
      });
    } finally {
      setIsUploadingBatch(false);
      setBatchProgress(0);
    }
  };

  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify({
        type: 'error',
        title: 'Judul Album Wajib Diisi',
        message: 'Harap masukkan judul album kegiatan KKN.',
      });
      return;
    }
    if (draftPhotos.length === 0) {
      notify({
        type: 'error',
        title: 'Minimal 1 Foto Diperlukan',
        message: 'Harap unggah minimal satu foto dokumentasi kegiatan ke dalam album.',
      });
      return;
    }

    const albumId = `alb-${Date.now()}`;
    const coverDraft = draftPhotos.find((p) => p.isCover) || draftPhotos[0];

    const photos: AlbumPhotoItem[] = draftPhotos.map((d, idx) => ({
      id: `${albumId}-p-${idx + 1}`,
      albumId,
      imageUrl: d.imageUrl,
      storagePath: d.storagePath,
      fileSize: d.fileSize,
      caption: d.caption.trim() || `${newTitle} — Foto ${idx + 1}`,
      photographer: newPhotographer,
      sortOrder: idx,
      isCover: d.tempId === coverDraft.tempId,
      isApprovedForPublic: newIsPublished,
      uploadedAt: new Date().toISOString(),
    }));

    const newAlbum: DocumentationAlbum = {
      id: albumId,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      date: newDate,
      dusun: newDusun,
      location: newLocation.trim() || `${newDusun}, Desa Pringgasela Selatan`,
      photographer: newPhotographer.trim(),
      responsibleMembers: [newPhotographer.trim()],
      programId: newProgramId || undefined,
      coverImageUrl: coverDraft.imageUrl,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      verificationStatus: 'verified',
      isPublished: newIsPublished,
      photos,
    };

    onSaveAlbums([newAlbum, ...albums]);
    setShowCreateForm(false);
    setNewTitle('');
    setNewDescription('');
    setDraftPhotos([]);
    notify({
      type: 'success',
      title: 'Album Dokumentasi Berhasil Dibuat',
      message: `Album "${newAlbum.title}" dengan ${photos.length} foto telah tersimpan.`,
    });
    onNavigate(`/workspace/documentation/${albumId}`);
  };

  // Add More Photos to an Existing Album
  const handleAddPhotosToExistingAlbum = async (
    album: DocumentationAlbum,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList);
    e.target.value = '';

    setIsUploadingBatch(true);
    setBatchProgress(5);
    const addedPhotos: AlbumPhotoItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const result = await uploadFileToStorage(
          file,
          'documentation_albums',
          (p) => {
            const overall = Math.round(((i + p / 100) / files.length) * 100);
            setBatchProgress(overall);
          },
          currentUserName || album.photographer,
          album.isPublished
        );

        addedPhotos.push({
          id: `${album.id}-p-${Date.now()}-${i}`,
          albumId: album.id,
          imageUrl: result.url,
          storagePath: result.storagePath,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          caption: `${album.title} — Dokumentasi Tambahan ${album.photos.length + i + 1}`,
          photographer: currentUserName || album.photographer,
          sortOrder: album.photos.length + i,
          isCover: album.photos.length === 0 && i === 0,
          isApprovedForPublic: album.isPublished,
          uploadedAt: new Date().toISOString(),
        });
      }

      const updatedPhotos = [...album.photos, ...addedPhotos];
      const updatedAlbum: DocumentationAlbum = {
        ...album,
        coverImageUrl: album.coverImageUrl || addedPhotos[0]?.imageUrl || '',
        photos: updatedPhotos,
      };

      onSaveAlbums(albums.map((a) => (a.id === album.id ? updatedAlbum : a)));
      notify({
        type: 'success',
        title: `${addedPhotos.length} Foto Ditambahkan ke Album`,
        message: `Total foto dalam album "${album.title}" kini ${updatedPhotos.length} foto.`,
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Gagal Menambahkan Foto',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah foto.',
      });
    } finally {
      setIsUploadingBatch(false);
      setBatchProgress(0);
    }
  };

  // Replace Single Photo inside Existing Album
  const handleReplaceSinglePhoto = async (
    album: DocumentationAlbum,
    photoId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingBatch(true);
    setBatchProgress(15);
    try {
      const targetPhoto = album.photos.find((p) => p.id === photoId);
      const result = await uploadFileToStorage(
        file,
        'documentation_albums',
        (p) => setBatchProgress(p),
        currentUserName || album.photographer,
        album.isPublished
      );

      if (targetPhoto?.storagePath) {
        await deleteFileFromStorage(targetPhoto.storagePath);
      }

      const updatedPhotos = album.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              imageUrl: result.url,
              storagePath: result.storagePath,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            }
          : p
      );

      const updatedAlbum: DocumentationAlbum = {
        ...album,
        coverImageUrl: targetPhoto?.isCover ? result.url : album.coverImageUrl,
        photos: updatedPhotos,
      };

      onSaveAlbums(albums.map((a) => (a.id === album.id ? updatedAlbum : a)));
      notify({
        type: 'success',
        title: 'Foto Berhasil Diganti',
        message: 'File foto baru telah disimpan di Supabase Storage.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Gagal Mengganti Foto',
        message: err instanceof Error ? err.message : 'Terjadi kendala saat mengganti foto.',
      });
    } finally {
      setIsUploadingBatch(false);
      setBatchProgress(0);
      setReplacingPhotoId(null);
    }
  };

  // Set Cover Photo
  const handleSetCoverPhoto = (album: DocumentationAlbum, photo: AlbumPhotoItem) => {
    const updatedPhotos = album.photos.map((p) => ({
      ...p,
      isCover: p.id === photo.id,
    }));
    const updatedAlbum: DocumentationAlbum = {
      ...album,
      coverImageUrl: photo.imageUrl,
      photos: updatedPhotos,
    };
    onSaveAlbums(albums.map((a) => (a.id === album.id ? updatedAlbum : a)));
    notify({
      type: 'success',
      title: 'Sampul Album Diperbarui',
      message: 'Foto terpilih kini menjadi sampul utama album dokumentasi.',
    });
  };

  // Reorder Photo
  const handleMovePhoto = (album: DocumentationAlbum, index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= album.photos.length) return;
    const copy = [...album.photos];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    const reindexed = copy.map((p, idx) => ({ ...p, sortOrder: idx }));
    onSaveAlbums(
      albums.map((a) => (a.id === album.id ? { ...a, photos: reindexed } : a))
    );
  };

  // Update Photo Caption
  const handleUpdatePhotoCaption = (
    album: DocumentationAlbum,
    photoId: string,
    caption: string
  ) => {
    const updatedPhotos = album.photos.map((p) =>
      p.id === photoId ? { ...p, caption } : p
    );
    onSaveAlbums(
      albums.map((a) => (a.id === album.id ? { ...a, photos: updatedPhotos } : a))
    );
  };

  // Toggle Single Photo Public Visibility
  const handleTogglePhotoPublic = async (album: DocumentationAlbum, photo: AlbumPhotoItem) => {
    const nextState = !photo.isApprovedForPublic;
    const ok = await confirm({
      title: nextState
        ? 'Tampilkan Foto Ini di Galeri Publik?'
        : 'Sembunyikan Foto Ini dari Galeri Publik?',
      description: nextState
        ? 'Foto ini akan dapat dilihat oleh masyarakat umum ketika album dipublikasikan.'
        : 'Foto ini tetap tersimpan di ruang kerja internal tetapi tidak akan ditampilkan ke pengunjung publik.',
      targetName: photo.caption || 'Foto Dokumentasi',
      level: 'ordinary',
      confirmLabel: nextState ? 'Tampilkan ke Publik' : 'Sembunyikan dari Publik',
    });
    if (!ok) return;

    const updatedPhotos = album.photos.map((p) =>
      p.id === photo.id ? { ...p, isApprovedForPublic: nextState } : p
    );
    onSaveAlbums(
      albums.map((a) => (a.id === album.id ? { ...a, photos: updatedPhotos } : a))
    );
    notify({
      type: 'success',
      title: nextState ? 'Foto Disetujui untuk Publik' : 'Foto Disembunyikan dari Publik',
      message: 'Status visibilitas foto berhasil diperbarui.',
    });
  };

  // Delete Single Photo with Centralized Confirmation
  const handleDeletePhoto = async (album: DocumentationAlbum, photo: AlbumPhotoItem) => {
    if (album.photos.length <= 1) {
      notify({
        type: 'error',
        title: 'Tidak Dapat Menghapus Foto Terakhir',
        message: 'Setiap album wajib memiliki minimal 1 foto. Gunakan Hapus Album jika ingin menghapus seluruh album.',
      });
      return;
    }

    const ok = await confirm({
      title: 'Hapus Foto dari Album Dokumentasi?',
      description:
        'Foto ini akan dihapus dari album kegiatan dan file penyimpanannya akan dibersihkan.',
      targetName: `${photo.caption} (Album: ${album.title})`,
      consequences: [
        'Foto tidak lagi tampil di album dokumentasi internal maupun galeri publik.',
      ],
      level: 'warning',
      confirmLabel: 'Ya, Hapus Foto',
    });
    if (!ok) return;

    if (photo.storagePath) {
      await deleteFileFromStorage(photo.storagePath);
    }

    const remaining = album.photos
      .filter((p) => p.id !== photo.id)
      .map((p, idx) => ({ ...p, sortOrder: idx }));

    if (photo.isCover && remaining.length > 0) {
      remaining[0].isCover = true;
    }

    const updatedAlbum: DocumentationAlbum = {
      ...album,
      coverImageUrl: remaining.find((p) => p.isCover)?.imageUrl || remaining[0]?.imageUrl || '',
      photos: remaining,
    };

    onSaveAlbums(albums.map((a) => (a.id === album.id ? updatedAlbum : a)));
    notify({
      type: 'success',
      title: 'Foto Berhasil Dihapus',
      message: 'Foto telah dihapus dari album dokumentasi.',
    });
  };

  // Toggle Entire Album Publication Status with Confirmation
  const handleToggleAlbumPublication = async (album: DocumentationAlbum) => {
    const nextPublished = !album.isPublished;
    const ok = await confirm({
      title: nextPublished
        ? 'Publikasikan Album ke Galeri Publik?'
        : 'Tarik Album dari Galeri Publik?',
      description: nextPublished
        ? 'Album kegiatan beserta foto yang disetujui akan tampil di halaman Galeri Dokumentasi Publik.'
        : 'Album ini akan disembunyikan dari halaman publik dan hanya dapat diakses oleh anggota tim KKN.',
      targetName: `${album.title} (${album.photos.length} Foto)`,
      consequences: nextPublished
        ? ['Masyarakat umum dan pemangku kepentingan desa dapat melihat dokumentasi kegiatan ini.']
        : ['Pengunjung publik tidak lagi melihat album ini di halaman /public/documentation.'],
      level: nextPublished ? 'ordinary' : 'warning',
      confirmLabel: nextPublished ? 'Publikasikan Sekarang' : 'Sembunyikan dari Publik',
    });
    if (!ok) return;

    const updated: DocumentationAlbum = {
      ...album,
      isPublished: nextPublished,
      verificationStatus: nextPublished ? 'verified' : album.verificationStatus,
    };
    onSaveAlbums(albums.map((a) => (a.id === album.id ? updated : a)));
    notify({
      type: 'success',
      title: nextPublished ? 'Album Dipublikasikan' : 'Album Disembunyikan dari Publik',
      message: `Status publikasi album "${album.title}" berhasil diperbarui.`,
    });
  };

  // Delete Entire Album with Irreversible Confirmation
  const handleDeleteAlbum = async (album: DocumentationAlbum) => {
    const ok = await confirm({
      title: 'Hapus Permanen Seluruh Album Dokumentasi?',
      description:
        'Tindakan ini akan menghapus album kegiatan beserta seluruh foto dan caption di dalamnya secara permanen.',
      targetName: `${album.title} (${album.photos.length} Foto — ${album.dusun})`,
      consequences: [
        `Seluruh ${album.photos.length} foto dokumentasi dalam album ini akan terhapus permanen.`,
        'Tautan galeri publik menuju album ini tidak lagi dapat diakses.',
      ],
      level: 'irreversible',
      confirmLabel: 'Hapus Album Permanen',
      requireTypeConfirmation: 'HAPUS',
    });
    if (!ok) return;

    for (const p of album.photos) {
      if (p.storagePath) {
        await deleteFileFromStorage(p.storagePath);
      }
    }

    onSaveAlbums(albums.filter((a) => a.id !== album.id));
    notify({
      type: 'success',
      title: 'Album Dokumentasi Dihapus',
      message: `Album "${album.title}" telah dihapus secara permanen.`,
    });
    onNavigate('/workspace/documentation');
  };

  // Start Editing Album Metadata
  const startEditMetadata = (album: DocumentationAlbum) => {
    setEditTitle(album.title);
    setEditDescription(album.description);
    setEditLocation(album.location);
    setEditDusun(album.dusun);
    setEditCategory(album.category);
    setEditDate(album.date);
    setEditPhotographer(album.photographer);
    setEditingAlbumMeta(true);
  };

  const saveEditMetadata = (album: DocumentationAlbum, e: React.FormEvent) => {
    e.preventDefault();
    const updated: DocumentationAlbum = {
      ...album,
      title: editTitle.trim() || album.title,
      description: editDescription.trim(),
      location: editLocation.trim() || album.location,
      dusun: editDusun,
      category: editCategory,
      date: editDate,
      photographer: editPhotographer.trim() || album.photographer,
    };
    onSaveAlbums(albums.map((a) => (a.id === album.id ? updated : a)));
    setEditingAlbumMeta(false);
    notify({
      type: 'success',
      title: 'Informasi Album Diperbarui',
      message: 'Detail kegiatan album dokumentasi telah disimpan.',
    });
  };

  // ============================================================================
  // DEDICATED ALBUM DETAIL PAGE (/workspace/documentation/:id)
  // ============================================================================
  if (selectedAlbumId) {
    if (!selectedAlbum) {
      return (
        <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-800">
            Album Dokumentasi Tidak Ditemukan
          </h3>
          <p className="text-sm text-stone-500">
            Album yang Anda cari mungkin telah dihapus atau alamat URL tidak valid.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/workspace/documentation')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Album
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-14">
        {/* Breadcrumb & Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-1.5">
              <button
                type="button"
                onClick={() => onNavigate('/workspace')}
                className="hover:text-stone-900 transition-colors"
              >
                Ruang Kerja
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => onNavigate('/workspace/documentation')}
                className="hover:text-stone-900 transition-colors"
              >
                Album Dokumentasi
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold line-clamp-1">
                {selectedAlbum.title}
              </span>
            </nav>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                {selectedAlbum.title}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  selectedAlbum.isPublished
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {selectedAlbum.isPublished ? 'Dipublikasikan di Galeri Desa' : 'Internal Posko'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/workspace/documentation')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Daftar Album
            </button>

            {selectedAlbum.isPublished && (
              <button
                type="button"
                onClick={() => onNavigate(`/public/documentation/${selectedAlbum.id}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <Eye className="w-3.5 h-3.5" />
                Lihat di Galeri Publik
              </button>
            )}

            {(canEditWorkspace || isSuperAdmin) && (
              <>
                <button
                  type="button"
                  onClick={() => handleToggleAlbumPublication(selectedAlbum)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  {selectedAlbum.isPublished ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                      Tarik dari Publik
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Publikasikan Album
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAlbum(selectedAlbum)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50/70 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Album
                </button>
              </>
            )}
          </div>
        </div>

        {/* Album Metadata Overview or Edit Form */}
        {editingAlbumMeta ? (
          <form
            onSubmit={(e) => saveEditMetadata(selectedAlbum, e)}
            className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Edit Detail Kegiatan Album
              </h3>
              <button
                type="button"
                onClick={() => setEditingAlbumMeta(false)}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                Batal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Judul Album Kegiatan
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as DocumentationAlbum['category'])
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tanggal Kegiatan
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Dusun
                </label>
                <select
                  value={editDusun}
                  onChange={(e) => setEditDusun(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
                >
                  {DUSUN_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lokasi Spesifik & Fotografer / PJ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Lokasi kegiatan"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                  />
                  <input
                    type="text"
                    value={editPhotographer}
                    onChange={(e) => setEditPhotographer(e.target.value)}
                    placeholder="Fotografer / PJ"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Deskripsi Kegiatan
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAlbumMeta(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold"
              >
                Simpan Detail Album
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <span className="px-2.5 py-0.5 rounded bg-amber-100/90 text-amber-900 font-semibold">
                    {selectedAlbum.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    {selectedAlbum.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {selectedAlbum.location} ({selectedAlbum.dusun})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    PJ / Fotografer: {selectedAlbum.photographer}
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed pt-1">
                  {selectedAlbum.description}
                </p>
              </div>

              {(canEditWorkspace || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => startEditMetadata(selectedAlbum)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Info Album
                </button>
              )}
            </div>

            {/* Add More Photos Action Bar */}
            {(canEditWorkspace || isSuperAdmin) && (
              <div className="mt-5 pt-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-stone-800">
                    Koleksi Foto Kegiatan ({selectedAlbum.photos.length} Foto)
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Anda dapat menambahkan banyak foto sekaligus, mengatur urutan, mengedit caption, atau memilih foto sampul.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleAddPhotosToExistingAlbum(selectedAlbum, e)}
                    className="hidden"
                  />
                  <input
                    ref={addMoreCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleAddPhotosToExistingAlbum(selectedAlbum, e)}
                    className="hidden"
                  />
                  <input
                    ref={replacePhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (replacingPhotoId) {
                        handleReplaceSinglePhoto(selectedAlbum, replacingPhotoId, e);
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploadingBatch}
                    onClick={() => addMoreInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50"
                  >
                    {isUploadingBatch ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mengunggah ({batchProgress}%)...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        Tambah Foto ke Album (Multi-Pilih)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isUploadingBatch}
                    onClick={() => addMoreCameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-700" />
                    Kamera HP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photos Grid inside Album Detail Page */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedAlbum.photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col justify-between transition-all ${
                photo.isCover
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-stone-200/90'
              }`}
            >
              <div>
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden group">
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption}
                    onClick={() => setActiveLightboxIndex(index)}
                    className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-stone-900/75 text-white text-[11px] font-mono">
                      #{index + 1}
                    </span>
                    {photo.isCover && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white text-[11px] font-bold shadow-xs">
                        <Star className="w-3 h-3 fill-current" />
                        Sampul Utama
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        photo.isApprovedForPublic
                          ? 'bg-emerald-900/80 text-emerald-100'
                          : 'bg-stone-900/80 text-stone-300'
                      }`}
                    >
                      {photo.isApprovedForPublic ? 'Publik' : 'Internal'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  {(canEditWorkspace || isSuperAdmin) ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                        Caption / Keterangan Foto
                      </label>
                      <textarea
                        rows={2}
                        value={photo.caption}
                        onChange={(e) =>
                          handleUpdatePhotoCaption(selectedAlbum, photo.id, e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs text-stone-800 rounded-lg border border-stone-200 focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-stone-700 leading-relaxed">{photo.caption}</p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>Oleh: {photo.photographer}</span>
                    {photo.fileSize && <span>{photo.fileSize}</span>}
                  </div>
                </div>
              </div>

              {(canEditWorkspace || isSuperAdmin) && (
                <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePhoto(selectedAlbum, index, -1)}
                      title="Geser urutan ke awal"
                      className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === selectedAlbum.photos.length - 1}
                      onClick={() => handleMovePhoto(selectedAlbum, index, 1)}
                      title="Geser urutan ke akhir"
                      className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {!photo.isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCoverPhoto(selectedAlbum, photo)}
                        className="px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold hover:bg-amber-100"
                      >
                        Jadikan Sampul
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePhotoPublic(selectedAlbum, photo)}
                      title={
                        photo.isApprovedForPublic
                          ? 'Sembunyikan dari galeri publik'
                          : 'Tampilkan di galeri publik'
                      }
                      className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                    >
                      {photo.isApprovedForPublic ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingPhotoId(photo.id);
                        replacePhotoInputRef.current?.click();
                      }}
                      title="Ganti file foto ini"
                      className="p-1.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(selectedAlbum, photo)}
                      title="Hapus foto dari album"
                      className="p-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Full-Screen Photo Viewer within Album Detail */}
        {activeLightboxIndex !== null && selectedAlbum.photos[activeLightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-stone-950/95 flex flex-col justify-between p-4 sm:p-6">
            <div className="flex items-center justify-between text-white">
              <div className="text-xs font-mono text-stone-300">
                Foto {activeLightboxIndex + 1} dari {selectedAlbum.photos.length} •{' '}
                {selectedAlbum.title}
              </div>
              <button
                type="button"
                onClick={() => setActiveLightboxIndex(null)}
                className="p-2 rounded-lg bg-stone-800/80 text-stone-200 hover:bg-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4">
              <button
                type="button"
                onClick={() =>
                  setActiveLightboxIndex(
                    (activeLightboxIndex - 1 + selectedAlbum.photos.length) %
                      selectedAlbum.photos.length
                  )
                }
                className="absolute left-2 sm:left-6 p-3 rounded-full bg-stone-900/80 text-white hover:bg-stone-800"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={selectedAlbum.photos[activeLightboxIndex].imageUrl}
                alt={selectedAlbum.photos[activeLightboxIndex].caption}
                className="max-h-[72vh] max-w-[88vw] object-contain rounded-lg shadow-2xl"
              />

              <button
                type="button"
                onClick={() =>
                  setActiveLightboxIndex(
                    (activeLightboxIndex + 1) % selectedAlbum.photos.length
                  )
                }
                className="absolute right-2 sm:right-6 p-3 rounded-full bg-stone-900/80 text-white hover:bg-stone-800"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="max-w-3xl mx-auto text-center space-y-1 pb-2">
              <p className="text-sm text-stone-100 font-medium">
                {selectedAlbum.photos[activeLightboxIndex].caption}
              </p>
              <p className="text-xs text-stone-400">
                Fotografer: {selectedAlbum.photos[activeLightboxIndex].photographer} •{' '}
                {selectedAlbum.location}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // ALBUMS DIRECTORY VIEW (/workspace/documentation)
  // ============================================================================
  const filteredAlbums = albums.filter((album) => {
    const matchesSearch =
      album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.dusun.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.photographer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'Semua' || album.category === categoryFilter;
    const matchesDusun = dusunFilter === 'Semua' || album.dusun === dusunFilter;
    return matchesSearch && matchesCategory && matchesDusun;
  });

  const totalPhotosCount = albums.reduce((acc, a) => acc + a.photos.length, 0);

  return (
    <div className="space-y-6 pb-14">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-1">
            Dokumentasi Berbasis Album Kegiatan
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Album Dokumentasi Pengabdian KKN ({albums.length} Album • {totalPhotosCount} Foto)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Kelola dokumentasi multi-foto untuk setiap kegiatan program kerja dan observasi lapangan di 7 dusun Desa Pringgasela Selatan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('/public/documentation')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Eye className="w-4 h-4 text-amber-700" />
            Lihat Galeri Publik
          </button>

          {(canEditWorkspace || isSuperAdmin) && (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {showCreateForm ? 'Tutup Form Album' : 'Buat Album Kegiatan Baru'}
            </button>
          )}
        </div>
      </div>

      {/* Create Multi-Photo Album Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateAlbumSubmit}
          className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Buat Album Dokumentasi Kegiatan Baru
              </h3>
              <p className="text-xs text-stone-500">
                Unggah beberapa foto sekaligus dari perangkat atau kamera ponsel, lengkapi caption, dan pilih foto sampul.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Judul Album Kegiatan *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Contoh: Pendampingan Penenun & Katalogisasi Wastra Dusun Gubuk Lauk"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kategori Kegiatan
              </label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as DocumentationAlbum['category'])
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Wilayah Dusun
              </label>
              <select
                value={newDusun}
                onChange={(e) => setNewDusun(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                {DUSUN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fotografer / Penanggung Jawab
              </label>
              <select
                value={newPhotographer}
                onChange={(e) => setNewPhotographer(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Lokasi Spesifik
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Contoh: Balai Posyandu Dusun Sinar Sari"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tautkan ke Program Kerja (Opsional)
              </label>
              <select
                value={newProgramId}
                onChange={(e) => setNewProgramId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                <option value="">-- Tanpa Tautan Program --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tag Topik (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Deskripsi & Narasi Kegiatan
            </label>
            <textarea
              rows={3}
              required
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Jelaskan konteks kegiatan, keterlibatan warga dusun, dan hasil yang dicapai..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300"
            />
          </div>

          {/* Multi-Photo Direct Upload Area */}
          <div className="p-5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/70 space-y-4">
            <input
              ref={createFilesInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelectNewAlbumFiles}
              className="hidden"
            />
            <input
              ref={createCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleSelectNewAlbumFiles}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Unggah Foto-Foto Kegiatan ({draftPhotos.length} Foto Terpilih)
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Pilih banyak foto sekaligus dari komputer/HP atau ambil langsung dari kamera.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isUploadingBatch}
                  onClick={() => createFilesInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50"
                >
                  {isUploadingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengunggah ({batchProgress}%)...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Pilih Banyak Foto Sekaligus
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isUploadingBatch}
                  onClick={() => createCameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-700" />
                  Kamera HP
                </button>
              </div>
            </div>

            {draftPhotos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {draftPhotos.map((dp, idx) => (
                  <div
                    key={dp.tempId}
                    className={`bg-white rounded-xl border p-3 space-y-2.5 ${
                      dp.isCover ? 'border-amber-600 ring-2 ring-amber-500/20' : 'border-stone-200'
                    }`}
                  >
                    <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-stone-100">
                      <img
                        src={dp.imageUrl}
                        alt={dp.caption}
                        className="w-full h-full object-cover"
                      />
                      {dp.isCover && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                          Sampul Album
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={dp.caption}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftPhotos((prev) =>
                          prev.map((item) =>
                            item.tempId === dp.tempId ? { ...item, caption: val } : item
                          )
                        );
                      }}
                      placeholder={`Caption foto #${idx + 1}...`}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200"
                    />

                    <div className="flex items-center justify-between">
                      {!dp.isCover ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftPhotos((prev) =>
                              prev.map((item) => ({
                                ...item,
                                isCover: item.tempId === dp.tempId,
                              }))
                            )
                          }
                          className="text-[11px] font-semibold text-amber-800 hover:underline"
                        >
                          Jadikan Sampul
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          ✓ Sampul Utama
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setDraftPhotos((prev) =>
                            prev.filter((item) => item.tempId !== dp.tempId)
                          )
                        }
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsPublished}
                onChange={(e) => setNewIsPublished(e.target.checked)}
                className="rounded border-stone-300 text-amber-700 focus:ring-amber-600"
              />
              <span>Publikasikan langsung ke Galeri Dokumentasi Publik</span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploadingBatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan Album Dokumentasi
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-stone-200/80">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul album, narasi kegiatan, dusun, atau fotografer..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-amber-600"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
        >
          <option value="Semua">Semua Kategori Kegiatan</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={dusunFilter}
          onChange={(e) => setDusunFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
        >
          <option value="Semua">Semua Wilayah Dusun</option>
          {DUSUN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Album Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlbums.map((album) => {
          const coverUrl =
            album.coverImageUrl ||
            album.photos.find((p) => p.isCover)?.imageUrl ||
            album.photos[0]?.imageUrl;

          return (
            <div
              key={album.id}
              onClick={() => onNavigate(`/workspace/documentation/${album.id}`)}
              className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-stone-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-16/10 bg-stone-100 overflow-hidden">
                  <img
                    src={coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-md bg-stone-900/80 text-white text-[11px] font-semibold backdrop-blur-xs">
                      {album.category}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur-xs ${
                        album.isPublished
                          ? 'bg-emerald-700/90 text-white'
                          : 'bg-stone-800/90 text-stone-200'
                      }`}
                    >
                      {album.isPublished ? 'Publik' : 'Internal Posko'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-200">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {album.dusun}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-950/80 text-amber-300 text-xs font-bold">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {album.photos.length} Foto
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {album.date}
                    </span>
                    <span>Oleh: {album.photographer}</span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors leading-snug">
                    {album.title}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {album.description}
                  </p>
                </div>
              </div>

              {/* Thumbnail Strip Preview + Actions */}
              <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center -space-x-2">
                  {album.photos.slice(0, 4).map((p) => (
                    <img
                      key={p.id}
                      src={p.imageUrl}
                      alt={p.caption}
                      className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-2xs"
                    />
                  ))}
                  {album.photos.length > 4 && (
                    <span className="w-8 h-8 rounded-lg bg-stone-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-stone-700">
                      +{album.photos.length - 4}
                    </span>
                  )}
                </div>

                <span className="text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform">
                  Buka & Kelola Album →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
