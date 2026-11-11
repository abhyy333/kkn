import React, { useState } from 'react';
import {
  DocumentationPhoto,
  VerificationStatus,
  VillageDusun,
  SurveyRecord,
  Member,
  UploadedFileMetadata,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { VillageObservationMap } from './VillageObservationMap';
import { FileUploader } from '../common/FileUploader';
import { deleteFileFromStorage } from '../../utils/storageService';
import {
  Plus,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Trash2,
  ShieldCheck,
  Map,
  LayoutGrid,
  Download,
} from 'lucide-react';

interface DocumentationViewProps {
  photos: DocumentationPhoto[];
  dusuns?: VillageDusun[];
  surveys?: SurveyRecord[];
  members?: Member[];
  onAddPhoto: (photo: DocumentationPhoto) => void;
  onUpdatePhoto?: (photo: DocumentationPhoto) => void;
  onDeletePhoto?: (photoId: string) => void;
}

const DEFAULT_DUSUNS = [
  'Dusun Gubuk Lauk',
  'Dusun Gubuk Rempung',
  'Dusun Sinar Sari',
  'Dusun Kedondong',
  'Dusun Timba Gerah',
  'Dusun Pancor Kopong',
  'Dusun Pancor Kopong Utara',
];

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  photos,
  dusuns = [],
  surveys = [],
  members = [],
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}) => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canEdit = profile?.role !== 'dpl' && profile?.role !== 'viewer';
  const canApprovePublic = isAdmin || isSuperAdmin;

  const [viewLayout, setViewLayout] = useState<'grid' | 'map'>('grid');
  const [filter, setFilter] = useState('all');
  const [dusunFilter, setDusunFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<DocumentationPhoto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dusunNames = dusuns.length > 0 ? dusuns.map((d) => d.name) : DEFAULT_DUSUNS;

  // New photo form state (Direct Supabase Storage Upload + Dusun/Location/Detailed Address)
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<DocumentationPhoto['category']>('Observasi Survei');
  const [dusun, setDusun] = useState(dusunNames[0] || 'Dusun Gubuk Lauk');
  const [location, setLocation] = useState('Sentra Tenun & Balai Warga');
  const [addressDetail, setAddressDetail] = useState(
    'Jl. Poros Desa Pringgasela Selatan, Kec. Pringgasela'
  );
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedFileMetadata[]>([]);
  const [caption, setCaption] = useState('');
  const [photographer, setPhotographer] = useState(
    profile?.displayName || 'Muhammad Agits Haibatulloh'
  );
  const [surveyId, setSurveyId] = useState('');
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('unverified_observation');
  const [isApprovedForPublic, setIsApprovedForPublic] = useState(false);

  const filtered = photos.filter((p) => {
    const matchCat = filter === 'all' || p.category === filter;
    const matchDusun =
      dusunFilter === 'all' ||
      p.dusun === dusunFilter ||
      p.location.toLowerCase().includes(dusunFilter.replace('Dusun ', '').toLowerCase());
    return matchCat && matchDusun;
  });

  const openUploadModal = () => {
    setTitle('');
    setCategory('Observasi Survei');
    setDusun(dusunNames[0] || 'Dusun Gubuk Lauk');
    setLocation('');
    setAddressDetail('');
    setUploadedPhotos([]);
    setCaption('');
    setPhotographer(profile?.displayName || 'Muhammad Agits Haibatulloh');
    setSurveyId('');
    setVerificationStatus('unverified_observation');
    setIsApprovedForPublic(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Judul dokumentasi wajib diisi.');
      return;
    }

    if (uploadedPhotos.length === 0) {
      setFormError('Silakan unggah minimal 1 foto dokumentasi dari perangkat Anda.');
      return;
    }

    const locPart = location.trim() || 'Desa Pringgasela Selatan';
    const fullLoc = locPart.includes(dusun) ? locPart : `${dusun}, ${locPart}`;

    // Support multiple photo uploads in a single submission
    uploadedPhotos.forEach((fileMeta, idx) => {
      const photoTitle =
        uploadedPhotos.length > 1 ? `${title.trim()} (${idx + 1})` : title.trim();

      const newPhoto: DocumentationPhoto = {
        id: `doc-${Date.now()}-${idx}`,
        title: photoTitle,
        category,
        date: new Date().toISOString().slice(0, 10),
        dusun,
        location: fullLoc,
        addressDetail:
          addressDetail.trim() || `${dusun}, Desa Pringgasela Selatan, Kec. Pringgasela`,
        imageUrl: fileMeta.url,
        storagePath: fileMeta.storagePath,
        fileSizeFormatted: fileMeta.sizeFormatted,
        caption: caption.trim() || photoTitle,
        photographer,
        tags: ['Dokumentasi', category, dusun],
        surveyId: surveyId || undefined,
        verificationStatus: canApprovePublic ? verificationStatus : 'unverified_observation',
        isApprovedForPublic: canApprovePublic ? isApprovedForPublic : false,
      };

      onAddPhoto(newPhoto);
    });

    setIsModalOpen(false);
    setTitle('');
    setCaption('');
    setUploadedPhotos([]);
  };

  const handleTogglePublicApproval = (photo: DocumentationPhoto) => {
    if (!onUpdatePhoto || !canApprovePublic) return;
    const updated: DocumentationPhoto = {
      ...photo,
      isApprovedForPublic: !photo.isApprovedForPublic,
    };
    onUpdatePhoto(updated);
    if (selectedPhoto?.id === photo.id) {
      setSelectedPhoto(updated);
    }
  };

  const handleToggleVerification = (photo: DocumentationPhoto) => {
    if (!onUpdatePhoto || !canApprovePublic) return;
    const nextStatus: VerificationStatus =
      photo.verificationStatus === 'verified' ? 'unverified_observation' : 'verified';
    const updated: DocumentationPhoto = {
      ...photo,
      verificationStatus: nextStatus,
    };
    onUpdatePhoto(updated);
    if (selectedPhoto?.id === photo.id) {
      setSelectedPhoto(updated);
    }
  };

  const handleDeletePhotoRecord = async (photo: DocumentationPhoto) => {
    if (!onDeletePhoto) return;
    if (photo.storagePath) {
      await deleteFileFromStorage(photo.storagePath);
    }
    onDeletePhoto(photo.id);
    setSelectedPhoto(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Camera">
              📸
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Galeri & Dokumentasi Kegiatan Lapangan Posko
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Unggah langsung foto kegiatan, observasi survei, dan pelaksanaan program kerja per dusun di Desa Pringgasela Selatan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-md border border-[#D5D2C8] bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                viewLayout === 'grid'
                  ? 'bg-[#284230] text-white font-medium'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Galeri
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('map')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded ${
                viewLayout === 'map'
                  ? 'bg-[#284230] text-white font-medium'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Sebaran Dusun
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={openUploadModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Foto Dokumentasi</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            'all',
            'Observasi Survei',
            'Program Kerja',
            'Sosialisasi',
            'Kegiatan Harian',
            'Kunjungan Tokoh',
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                filter === cat
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              {cat === 'all' ? 'Semua Dokumentasi' : cat}
            </button>
          ))}
        </div>

        <select
          value={dusunFilter}
          onChange={(e) => setDusunFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-[#D5D2C8] bg-white text-xs text-stone-700"
        >
          <option value="all">Semua Wilayah Dusun (7 Dusun)</option>
          {dusunNames.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* MAP VIEW */}
      {viewLayout === 'map' && dusuns.length > 0 && (
        <VillageObservationMap
          dusuns={dusuns}
          surveys={surveys}
          photos={filtered}
          onSelectPhoto={(p) => setSelectedPhoto(p)}
        />
      )}

      {/* PHOTO GALLERY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((photo) => {
          const isVerified = photo.verificationStatus === 'verified';
          return (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs overflow-hidden cursor-pointer flex flex-col justify-between transition-all"
            >
              <div className="aspect-4/3 w-full bg-stone-100 overflow-hidden relative">
                <img
                  src={photo.imageUrl || undefined}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                  <span className="text-[10px] bg-stone-900/75 text-white backdrop-blur-xs px-2 py-0.5 rounded font-medium">
                    {photo.category}
                  </span>
                  {photo.isApprovedForPublic ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-900/80 text-white px-2 py-0.5 rounded font-medium">
                      <Globe className="w-2.5 h-2.5" /> Publik
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-stone-900/75 text-stone-200 px-2 py-0.5 rounded font-medium">
                      <Lock className="w-2.5 h-2.5" /> Internal
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 left-2">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50/95 text-emerald-800 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50/95 text-amber-900 px-2 py-0.5 rounded font-medium border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> Observasi Lapangan
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 space-y-2">
                <h3 className="font-medium text-xs text-stone-900 line-clamp-1 group-hover:text-[#4A6B53] transition-colors">
                  {photo.title}
                </h3>
                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                  {photo.caption}
                </p>

                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{photo.dusun || photo.location.split(',')[0]}</span>
                  </span>
                  <span className="font-mono">{photo.date}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg border border-[#E8E6DF] shadow-2xl max-w-2xl w-full overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[55vh] bg-stone-900 flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.imageUrl || undefined}
                alt={selectedPhoto.title}
                className="max-h-[55vh] w-auto object-contain"
              />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-stone-500 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#4A6B53] uppercase tracking-wider">
                    {selectedPhoto.category}
                  </span>
                  {selectedPhoto.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> Observasi Lapangan
                    </span>
                  )}
                  {selectedPhoto.isApprovedForPublic ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      <Globe className="w-3 h-3" /> Tampil di Portal Publik
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      <Lock className="w-3 h-3" /> Privat Internal
                    </span>
                  )}
                </div>
                <span className="text-stone-400">{selectedPhoto.date}</span>
              </div>

              <h2 className="font-serif text-base font-semibold text-stone-900">
                {selectedPhoto.title}
              </h2>

              <p className="text-stone-600 leading-relaxed text-xs">{selectedPhoto.caption}</p>

              {selectedPhoto.addressDetail && (
                <p className="text-[11px] text-stone-500 bg-[#FAF9F5] px-3 py-1.5 rounded border border-stone-200">
                  Alamat / Detail Lokasi: <strong className="text-stone-700">{selectedPhoto.addressDetail}</strong>
                </p>
              )}

              <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {selectedPhoto.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    Fotografer: {selectedPhoto.photographer}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedPhoto.imageUrl}
                    download={`${selectedPhoto.title}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D5D2C8] text-stone-700 hover:bg-stone-50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#4A6B53]" />
                    <span>Unduh</span>
                  </a>

                  {canApprovePublic && onUpdatePhoto && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleVerification(selectedPhoto)}
                        className="px-2.5 py-1 rounded border border-[#D5D2C8] text-stone-700 hover:bg-stone-50"
                      >
                        {selectedPhoto.verificationStatus === 'verified'
                          ? 'Tandai Observasi'
                          : 'Verifikasi Foto'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublicApproval(selectedPhoto)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#D5D2C8] text-stone-700 hover:bg-stone-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#4A6B53]" />
                        <span>
                          {selectedPhoto.isApprovedForPublic
                            ? 'Sembunyikan dari Publik'
                            : 'Setujui Publikasi'}
                        </span>
                      </button>
                    </>
                  )}
                  {canEdit && onDeletePhoto && (
                    <button
                      type="button"
                      onClick={() => handleDeletePhotoRecord(selectedPhoto)}
                      className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className="px-3 py-1 rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Field Documentation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  Unggah Foto Dokumentasi Lapangan
                </h3>
                <p className="text-[11px] text-stone-500">
                  Unggah langsung dari galeri HP, kamera, atau komputer ke Supabase Storage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              {/* Direct File Uploader */}
              <FileUploader
                folder="documentation"
                accept="image"
                multiple={true}
                maxSizeMB={8}
                label="Berkas Foto Dokumentasi (Bisa Pilih Lebih dari 1 Foto) *"
                uploaderName={photographer}
                isPubliclyApproved={isApprovedForPublic}
                value={uploadedPhotos}
                onChange={setUploadedPhotos}
              />

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Dokumentasi / Objek Kegiatan *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Observasi Sentra Tenun Gedogan Dusun Gubuk Lauk"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori Album</label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DocumentationPhoto['category'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Observasi Survei">Observasi Survei</option>
                    <option value="Program Kerja">Program Kerja</option>
                    <option value="Sosialisasi">Sosialisasi</option>
                    <option value="Kegiatan Harian">Kegiatan Harian</option>
                    <option value="Kunjungan Tokoh">Kunjungan Tokoh</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Wilayah Dusun *</label>
                  <select
                    value={dusun}
                    onChange={(e) => setDusun(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    {dusunNames.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Nama Tempat / Lokasi *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Balai Posyandu / Sentra Tenun"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Alamat Lengkap / Patokan</label>
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Contoh: RT 02 Sebelah Masjid Jami' Dusun"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Fotografer (Anggota KKN)</label>
                  {members.length > 0 ? (
                    <select
                      value={photographer}
                      onChange={(e) => setPhotographer(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={photographer}
                      onChange={(e) => setPhotographer(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tautkan ke Rekaman Survei</label>
                  <select
                    value={surveyId}
                    onChange={(e) => setSurveyId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="">-- Tidak Ditautkan --</option>
                    {surveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keterangan / Catatan Observasi Foto</label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Jelaskan kondisi lapangan atau kegiatan yang terekam pada foto ini..."
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>

              {canApprovePublic && (
                <div className="p-3 rounded bg-[#F7F6F2] border border-[#E8E6DF] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-800">Status Verifikasi</label>
                    <select
                      value={verificationStatus}
                      onChange={(e) =>
                        setVerificationStatus(e.target.value as VerificationStatus)
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#D5D2C8] bg-white"
                    >
                      <option value="unverified_observation">Observasi Lapangan</option>
                      <option value="verified">Terverifikasi Resmi</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      id="docPublicApprove"
                      type="checkbox"
                      checked={isApprovedForPublic}
                      onChange={(e) => setIsApprovedForPublic(e.target.checked)}
                      className="rounded border-stone-300 text-[#4A6B53]"
                    />
                    <label htmlFor="docPublicApprove" className="font-medium text-stone-700">
                      Tampilkan di Galeri Portal Publik
                    </label>
                  </div>
                </div>
              )}

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
                  Simpan Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
