import React, { useState, useMemo } from 'react';
import {
  SurveyRecord,
  SurveyCategory,
  VerificationStatus,
  Member,
  WorkProgram,
  VillageResearchData,
  DocumentationPhoto,
  UploadedFileMetadata,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { VillageObservationMap } from './VillageObservationMap';
import { exportSurveyReportToPdf, exportAllSurveysToPdf } from '../../utils/pdfExport';
import { FileUploader } from '../common/FileUploader';
import {
  Plus,
  MapPin,
  Calendar,
  User,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  FileDown,
  Edit3,
  Trash2,
  Link2,
  Camera,
  FileText,
  Lock,
  Globe,
  ShieldCheck,
  Map,
  LayoutList,
  Download,
} from 'lucide-react';

interface SurveysViewProps {
  surveys: SurveyRecord[];
  members?: Member[];
  programs?: WorkProgram[];
  villageResearch: VillageResearchData;
  photos?: DocumentationPhoto[];
  onAddSurvey: (survey: SurveyRecord) => void;
  onUpdateSurvey?: (survey: SurveyRecord) => void;
  onDeleteSurvey?: (surveyId: string) => void;
}

const SURVEY_CATEGORIES: SurveyCategory[] = [
  'Kesehatan',
  'Ekonomi',
  'Lingkungan',
  'Pendidikan',
  'Infrastruktur',
  'Pertanian',
  'Budaya & Wisata',
  'Fasilitas Umum',
];

export const SurveysView: React.FC<SurveysViewProps> = ({
  surveys,
  members = [],
  programs = [],
  villageResearch,
  photos = [],
  onAddSurvey,
  onUpdateSurvey,
  onDeleteSurvey,
}) => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canEdit = profile?.role !== 'dpl' && profile?.role !== 'viewer';
  const canVerifyOrApprove = isAdmin || isSuperAdmin;

  // View & Filter State
  const [displayMode, setDisplayMode] = useState<'list' | 'grouped_dusun' | 'grouped_category' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dusunFilter, setDusunFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyRecord | null>(null);
  const [selectedSurveyDetail, setSelectedSurveyDetail] = useState<SurveyRecord | null>(null);

  // Form Fields (Dusun + Location Name + Detailed Address + Direct File Uploads)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SurveyCategory>('Ekonomi');
  const [objectObserved, setObjectObserved] = useState('');
  const [dusun, setDusun] = useState(villageResearch.dusuns[0]?.name || 'Dusun Gubuk Lauk');
  const [locationDetail, setLocationDetail] = useState('Sentra Tenun / Balai Dusun');
  const [addressDetail, setAddressDetail] = useState(
    'Jl. Poros Dusun, Desa Pringgasela Selatan, Kec. Pringgasela'
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [surveyor, setSurveyor] = useState(
    profile?.displayName || 'Abdul Habir Al Majdi (Divisi Acara 1)'
  );
  const [findings, setFindings] = useState('');
  const [existingProblems, setExistingProblems] = useState('');
  const [potentialOpportunities, setPotentialOpportunities] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [linkedProgramId, setLinkedProgramId] = useState('');
  const [uploadedPhotoFiles, setUploadedPhotoFiles] = useState<UploadedFileMetadata[]>([]);
  const [uploadedDocFiles, setUploadedDocFiles] = useState<UploadedFileMetadata[]>([]);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>('unverified_observation');
  const [isPubliclyApproved, setIsPubliclyApproved] = useState(false);

  const dusunList = useMemo(
    () => villageResearch.dusuns.map((d) => d.name),
    [villageResearch.dusuns]
  );

  // Filtered Surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.findings.toLowerCase().includes(q) ||
        (s.objectObserved || '').toLowerCase().includes(q) ||
        (s.existingProblems || '').toLowerCase().includes(q) ||
        (s.potentialOpportunities || '').toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.addressDetail || '').toLowerCase().includes(q) ||
        s.surveyor.toLowerCase().includes(q);

      const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
      const matchesDusun =
        dusunFilter === 'ALL' ||
        s.dusun === dusunFilter ||
        s.location.toLowerCase().includes(dusunFilter.replace('Dusun ', '').toLowerCase());
      const matchesVerification =
        verificationFilter === 'ALL' || s.verificationStatus === verificationFilter;

      return matchesSearch && matchesCategory && matchesDusun && matchesVerification;
    });
  }, [surveys, searchQuery, categoryFilter, dusunFilter, verificationFilter]);

  const openCreateModal = () => {
    setEditingSurvey(null);
    setTitle('');
    setCategory('Ekonomi');
    setObjectObserved('');
    setDusun(dusunList[0] || 'Dusun Gubuk Lauk');
    setLocationDetail('');
    setAddressDetail('');
    setDate(new Date().toISOString().slice(0, 10));
    setSurveyor(
      profile?.displayName
        ? `${profile.displayName}${profile.position ? ` (${profile.position})` : ''}`
        : 'Abdul Habir Al Majdi (Divisi Acara 1)'
    );
    setFindings('');
    setExistingProblems('');
    setPotentialOpportunities('');
    setRecommendations('');
    setLinkedProgramId('');
    setUploadedPhotoFiles([]);
    setUploadedDocFiles([]);
    setVerificationStatus('unverified_observation');
    setIsPubliclyApproved(false);
    setIsModalOpen(true);
  };

  const openEditModal = (s: SurveyRecord) => {
    setEditingSurvey(s);
    setTitle(s.title);
    setCategory(s.category);
    setObjectObserved(s.objectObserved || '');
    setDusun(s.dusun || dusunList[0] || 'Dusun Gubuk Lauk');
    setLocationDetail(s.location);
    setAddressDetail(s.addressDetail || '');
    setDate(s.date);
    setSurveyor(s.surveyor);
    setFindings(s.findings);
    setExistingProblems(s.existingProblems || '');
    setPotentialOpportunities(s.potentialOpportunities || '');
    setRecommendations(s.recommendations);
    setLinkedProgramId(s.linkedProgramId || '');

    // Convert existing photos and documents into UploadedFileMetadata for preview/replacement/deletion
    const existingPhotos: UploadedFileMetadata[] =
      s.photoMetadata && s.photoMetadata.length > 0
        ? s.photoMetadata
        : (s.photos || []).map((url, idx) => ({
            id: `srv-photo-${idx}`,
            name: `Foto Survei ${idx + 1}.jpg`,
            url,
            storagePath: '',
            folder: 'surveys',
            size: 0,
            sizeFormatted: '',
            contentType: 'image/jpeg',
            uploadedAt: s.date,
            uploadedBy: s.surveyor,
          }));

    const existingDocs: UploadedFileMetadata[] = (s.documents || []).map((doc, idx) => ({
      id: doc.id || `srv-doc-${idx}`,
      name: doc.name,
      url: doc.url,
      storagePath: doc.storagePath || '',
      folder: 'surveys',
      size: 0,
      sizeFormatted: doc.sizeFormatted || '',
      contentType: doc.contentType || 'application/pdf',
      uploadedAt: s.date,
      uploadedBy: s.surveyor,
    }));

    setUploadedPhotoFiles(existingPhotos);
    setUploadedDocFiles(existingDocs);
    setVerificationStatus(s.verificationStatus || 'unverified_observation');
    setIsPubliclyApproved(Boolean(s.isPubliclyApproved));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !findings.trim()) return;

    const linkedProg = programs.find((p) => p.id === linkedProgramId);
    const parsedPhotos = uploadedPhotoFiles.map((f) => f.url);
    const parsedDocs = uploadedDocFiles.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      storagePath: f.storagePath,
      sizeFormatted: f.sizeFormatted,
      contentType: f.contentType,
    }));

    const locInput = locationDetail.trim() || 'Desa Pringgasela Selatan';
    const fullLocation = locInput.includes(dusun) ? locInput : `${dusun}, ${locInput}`;

    const record: SurveyRecord = {
      id: editingSurvey?.id || `srv-${Date.now()}`,
      title: title.trim(),
      category,
      objectObserved: objectObserved.trim() || title.trim(),
      dusun,
      location: fullLocation,
      addressDetail:
        addressDetail.trim() || `${dusun}, Desa Pringgasela Selatan, Kec. Pringgasela`,
      // Preserve historical coordinates if editing an older record, without requiring GPS input
      coordinates: editingSurvey?.coordinates,
      date,
      surveyor,
      findings: findings.trim(),
      existingProblems: existingProblems.trim(),
      potentialOpportunities: potentialOpportunities.trim(),
      recommendations: recommendations.trim(),
      linkedProgramId: linkedProgramId || undefined,
      linkedProgramTitle: linkedProg ? `${linkedProg.code} — ${linkedProg.title}` : undefined,
      photos: parsedPhotos,
      photoMetadata: uploadedPhotoFiles,
      documents: parsedDocs,
      verificationStatus: canVerifyOrApprove ? verificationStatus : 'unverified_observation',
      isPubliclyApproved: canVerifyOrApprove ? isPubliclyApproved : false,
      createdAt: editingSurvey?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSurvey && onUpdateSurvey) {
      onUpdateSurvey(record);
    } else {
      onAddSurvey(record);
    }

    setIsModalOpen(false);
    setEditingSurvey(null);
  };

  const handleQuickToggleVerify = (s: SurveyRecord) => {
    if (!onUpdateSurvey || !canVerifyOrApprove) return;
    const nextStatus: VerificationStatus =
      s.verificationStatus === 'verified' ? 'unverified_observation' : 'verified';
    onUpdateSurvey({
      ...s,
      verificationStatus: nextStatus,
      verifiedBy:
        nextStatus === 'verified'
          ? profile?.displayName || profile?.email || 'Admin KKN'
          : undefined,
      verifiedAt: nextStatus === 'verified' ? new Date().toISOString().slice(0, 10) : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleQuickTogglePublic = (s: SurveyRecord) => {
    if (!onUpdateSurvey || !canVerifyOrApprove) return;
    onUpdateSurvey({
      ...s,
      isPubliclyApproved: !s.isPubliclyApproved,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderSurveyCard = (s: SurveyRecord) => {
    const linkedProg = programs.find((p) => p.id === s.linkedProgramId);
    const isVerified = s.verificationStatus === 'verified';

    return (
      <div
        key={s.id}
        className="p-5 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs space-y-4 transition-all"
      >
        {/* Top Row: Badges & Actions */}
        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230]">
                {s.category}
              </span>
              {s.dusun && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                  {s.dusun}
                </span>
              )}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi Resmi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" /> Observasi Belum Diverifikasi
                </span>
              )}
              {s.isPubliclyApproved ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  <Globe className="w-3 h-3" /> Publik
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                  <Lock className="w-3 h-3" /> Internal Posko
                </span>
              )}
            </div>

            <h3 className="font-serif text-base font-semibold text-stone-900">{s.title}</h3>
            {s.objectObserved && (
              <p className="text-xs text-stone-500">
                Objek Observasi: <strong className="text-stone-700">{s.objectObserved}</strong>
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportSurveyReportToPdf(s)}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#D5D2C8] text-[11px] font-medium text-stone-700 hover:bg-stone-50"
              title="Unduh Laporan Survei PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[#4A6B53]" />
              <span>PDF</span>
            </button>

            {canVerifyOrApprove && (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickToggleVerify(s)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white text-stone-700 border-[#D5D2C8] hover:bg-stone-50'
                  }`}
                >
                  {isVerified ? 'Batalkan Verifikasi' : 'Verifikasi'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTogglePublic(s)}
                  className="p-1.5 rounded border border-[#D5D2C8] text-stone-600 hover:bg-stone-50"
                  title={
                    s.isPubliclyApproved
                      ? 'Sembunyikan dari Portal Publik'
                      : 'Setujui Tampil di Portal Publik'
                  }
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => openEditModal(s)}
                className="p-1.5 rounded border border-[#D5D2C8] text-stone-600 hover:bg-stone-50"
                title="Edit Rekaman Survei"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {canEdit && onDeleteSurvey && (
              <button
                type="button"
                onClick={() => onDeleteSurvey(s.id)}
                className="p-1.5 rounded border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                title="Hapus Survei"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            {s.location}
          </span>
          {s.addressDetail && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600">
              Alamat: {s.addressDetail}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            {s.date}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-stone-400" />
            Surveyor: <strong className="text-stone-700">{s.surveyor}</strong>
          </span>
        </div>

        {/* 4-Column / 2x2 Observation Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-md bg-[#F7F6F2] border border-[#E8E6DF] space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">
              Temuan & Observasi Lapangan
            </span>
            <p className="text-stone-700 leading-relaxed">{s.findings}</p>
          </div>

          <div className="p-3.5 rounded-md bg-rose-50/40 border border-rose-200/70 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-800 block">
              Permasalahan Eksisting (Masalah Desa)
            </span>
            <p className="text-stone-700 leading-relaxed">
              {s.existingProblems || 'Belum ada rincian masalah spesifik yang dicatat.'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-sky-50/40 border border-sky-200/70 space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 block">
              Potensi & Peluang Pengembangan
            </span>
            <p className="text-stone-700 leading-relaxed">
              {s.potentialOpportunities || 'Belum ada rincian peluang pengembangan.'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-[#EBF1ED]/60 border border-[#CCDCD0] space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#284230] flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              <span>Rekomendasi & Tautan Program Kerja</span>
            </span>
            <p className="text-stone-800 leading-relaxed">{s.recommendations}</p>
            {(linkedProg || s.linkedProgramTitle) && (
              <div className="pt-1.5 mt-1.5 border-t border-[#CCDCD0]/70 flex items-center gap-1.5 text-[11px] font-semibold text-[#284230]">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Ditautkan ke Proker: {linkedProg ? `${linkedProg.code} — ${linkedProg.title}` : s.linkedProgramTitle}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attached Photos & Documents */}
        {((s.photos && s.photos.length > 0) || (s.documents && s.documents.length > 0)) && (
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            {s.photos && s.photos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-semibold uppercase text-stone-400 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Foto ({s.photos.length}):
                </span>
                {s.photos.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title="Lihat foto ukuran penuh"
                  >
                    <img
                      src={url || undefined}
                      alt={`${s.title} - ${idx + 1}`}
                      className="w-16 h-12 object-cover rounded border border-[#E8E6DF] hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            )}

            {s.documents && s.documents.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {s.documents.map((d, idx) => (
                  <a
                    key={idx}
                    href={d.url}
                    download={d.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded bg-stone-100 text-[#284230] hover:bg-stone-200 border border-stone-200"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{d.name}</span>
                    {d.sizeFormatted && (
                      <span className="text-[10px] text-stone-500">({d.sizeFormatted})</span>
                    )}
                    <Download className="w-3 h-3 ml-0.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Survey">
              🗺️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Database Survei & Manajemen Riset Desa Pringgasela Selatan
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Pencatatan observasi lapangan per dusun, unggah langsung foto & dokumen bukti survei ke Supabase Storage, dan ekspor laporan PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => exportAllSurveysToPdf(filteredSurveys, villageResearch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C8] bg-white text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
          >
            <FileDown className="w-4 h-4 text-[#4A6B53]" />
            <span>Ekspor Rekap PDF ({filteredSurveys.length})</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Input Survei Lapangan</span>
            </button>
          )}
        </div>
      </div>

      {/* Research Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
            Total Rekaman Survei
          </span>
          <span className="text-xl font-serif font-semibold text-stone-900 mt-0.5 block">
            {surveys.length} Dokumen
          </span>
        </div>
        <div className="p-3.5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">
            Terverifikasi Resmi
          </span>
          <span className="text-xl font-serif font-semibold text-emerald-800 mt-0.5 block">
            {surveys.filter((s) => s.verificationStatus === 'verified').length} Survei
          </span>
        </div>
        <div className="p-3.5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 block">
            Observasi Lapangan
          </span>
          <span className="text-xl font-serif font-semibold text-amber-800 mt-0.5 block">
            {surveys.filter((s) => s.verificationStatus !== 'verified').length} Observasi
          </span>
        </div>
        <div className="p-3.5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#284230] block">
            Tertaut ke Program Kerja
          </span>
          <span className="text-xl font-serif font-semibold text-[#284230] mt-0.5 block">
            {surveys.filter((s) => Boolean(s.linkedProgramId)).length} Temuan
          </span>
        </div>
      </div>

      {/* Research Management Controls: Search, Filters & Grouping Mode */}
      <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari temuan, objek, masalah, alamat, surveyor..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#D5D2C8] text-xs focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-[#D5D2C8] text-xs bg-white"
            >
              <option value="ALL">Semua Kategori Riset</option>
              {SURVEY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Kategori: {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Dusun */}
          <div>
            <select
              value={dusunFilter}
              onChange={(e) => setDusunFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-[#D5D2C8] text-xs bg-white"
            >
              <option value="ALL">Semua Wilayah Dusun (7 Dusun)</option>
              {dusunList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Verification Status */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-[#D5D2C8] text-xs bg-white"
            >
              <option value="ALL">Semua Status Verifikasi</option>
              <option value="verified">Terverifikasi Resmi</option>
              <option value="unverified_observation">Observasi Belum Diverifikasi</option>
              <option value="needs_review">Perlu Tinjauan</option>
            </select>
          </div>
        </div>

        {/* Organization / View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-stone-500 font-medium mr-1">Organisasi Riset:</span>
            {(
              [
                { id: 'list', label: 'Daftar Survei', icon: LayoutList },
                { id: 'grouped_dusun', label: 'Kelompokkan per Dusun', icon: MapPin },
                { id: 'grouped_category', label: 'Kelompokkan per Kategori', icon: Filter },
                { id: 'map', label: 'Peta Wilayah Dusun', icon: Map },
              ] as const
            ).map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDisplayMode(mode.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    displayMode === mode.id
                      ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-stone-400">
            Menampilkan {filteredSurveys.length} dari {surveys.length} rekaman survei
          </span>
        </div>
      </div>

      {/* DISPLAY MODE: MAP */}
      {displayMode === 'map' && (
        <div className="space-y-4">
          <VillageObservationMap
            dusuns={villageResearch.dusuns}
            surveys={filteredSurveys}
            photos={photos}
            facilities={villageResearch.facilities}
            onSelectSurvey={(s) => setSelectedSurveyDetail(s)}
          />
          {selectedSurveyDetail && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#284230]">
                  Detail Survei Terpilih
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSurveyDetail(null)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Tutup Detail
                </button>
              </div>
              {renderSurveyCard(selectedSurveyDetail)}
            </div>
          )}
        </div>
      )}

      {/* DISPLAY MODE: STANDARD LIST */}
      {displayMode === 'list' && (
        <div className="space-y-4">
          {filteredSurveys.length === 0 ? (
            <div className="p-8 rounded-lg bg-white border border-[#E8E6DF] text-center space-y-2">
              <p className="text-sm font-medium text-stone-700">
                Tidak ada rekaman survei yang cocok dengan filter pencarian.
              </p>
              <p className="text-xs text-stone-500">
                Silakan ubah kata kunci pencarian atau tambahkan rekaman observasi lapangan baru.
              </p>
            </div>
          ) : (
            filteredSurveys.map((s) => renderSurveyCard(s))
          )}
        </div>
      )}

      {/* DISPLAY MODE: GROUPED BY DUSUN */}
      {displayMode === 'grouped_dusun' && (
        <div className="space-y-6">
          {dusunList.map((dName) => {
            const group = filteredSurveys.filter(
              (s) =>
                s.dusun === dName ||
                s.location.toLowerCase().includes(dName.replace('Dusun ', '').toLowerCase())
            );
            if (group.length === 0) return null;
            return (
              <div key={dName} className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-[#EBF1ED] border border-[#CCDCD0]">
                  <h3 className="font-serif text-sm font-semibold text-[#284230] flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{dName}</span>
                  </h3>
                  <span className="text-xs font-medium text-[#284230]">
                    {group.length} Rekaman Survei
                  </span>
                </div>
                <div className="space-y-4 pl-2 border-l-2 border-[#CCDCD0]">
                  {group.map((s) => renderSurveyCard(s))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DISPLAY MODE: GROUPED BY CATEGORY */}
      {displayMode === 'grouped_category' && (
        <div className="space-y-6">
          {SURVEY_CATEGORIES.map((cat) => {
            const group = filteredSurveys.filter((s) => s.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                  <h3 className="font-serif text-sm font-semibold text-stone-900">
                    Bidang / Kategori: {cat}
                  </h3>
                  <span className="text-xs font-medium text-stone-600">
                    {group.length} Rekaman Survei
                  </span>
                </div>
                <div className="space-y-4">{group.map((s) => renderSurveyCard(s))}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SURVEY MODAL (Mobile Field Entry Ready) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-serif text-lg font-semibold text-stone-900">
                  {editingSurvey
                    ? 'Edit Rekaman Survei Lapangan'
                    : 'Formulir Input Survei Lapangan (Desa Pringgasela Selatan)'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Mendukung unggah langsung foto & berkas dari ponsel saat turun lapangan di 7 dusun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-medium text-stone-700">Judul Survei / Observasi *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Pemetaan Pengrajin Tenun Gedogan Dusun Gubuk Lauk"
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori Survei *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SurveyCategory)}
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    {SURVEY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">
                    Objek yang Diamati / Narasumber *
                  </label>
                  <input
                    type="text"
                    required
                    value={objectObserved}
                    onChange={(e) => setObjectObserved(e.target.value)}
                    placeholder="Contoh: Kelompok Penenun / Saluran Irigasi / Posyandu"
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Wilayah Dusun *</label>
                  <select
                    value={dusun}
                    onChange={(e) => setDusun(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  >
                    {dusunList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Nama Tempat / Lokasi Observasi *</label>
                  <input
                    type="text"
                    required
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="Contoh: Sentra Tenun Gubuk Lauk / Balai Posyandu"
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Alamat Lengkap / Patokan Lokasi</label>
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Contoh: RT 02 Sebelah Masjid / Jalan Poros Dusun"
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tanggal Survei *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Petugas Surveyor (Anggota KKN) *</label>
                  {members.length > 0 ? (
                    <select
                      value={surveyor}
                      onChange={(e) => setSurveyor(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                    >
                      {members.map((m) => {
                        const label = `${m.name} (${m.role})`;
                        return (
                          <option key={m.id} value={label}>
                            {label}
                          </option>
                        );
                      })}
                      <option value="Tim Gabungan KKN Pringgasela Selatan">
                        Tim Gabungan KKN Pringgasela Selatan
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={surveyor}
                      onChange={(e) => setSurveyor(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Temuan & Hasil Observasi Lapangan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Tuliskan fakta hasil pengamatan langsung atau wawancara di lokasi..."
                  className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">
                    Permasalahan Eksisting yang Ditemukan
                  </label>
                  <textarea
                    rows={2}
                    value={existingProblems}
                    onChange={(e) => setExistingProblems(e.target.value)}
                    placeholder="Kendala atau masalah utama yang dihadapi warga di lokasi ini..."
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">
                    Potensi & Peluang Pengembangan
                  </label>
                  <textarea
                    rows={2}
                    value={potentialOpportunities}
                    onChange={(e) => setPotentialOpportunities(e.target.value)}
                    placeholder="Peluang kolaborasi atau potensi lokal yang dapat dikembangkan..."
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">
                    Rekomendasi Tindak Lanjut Program *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Rencana intervensi atau rekomendasi program kerja..."
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">
                    Tautkan ke Program Kerja KKN Relevan
                  </label>
                  <select
                    value={linkedProgramId}
                    onChange={(e) => setLinkedProgramId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="">-- Belum Ditautkan ke Program Kerja --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.title} ({p.division})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Direct Photo & Document Uploads via Supabase Storage */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <FileUploader
                  folder="surveys"
                  accept="image"
                  multiple={true}
                  maxSizeMB={8}
                  label="Unggah Foto Dokumentasi Survei (Bisa Lebih dari 1 Foto)"
                  uploaderName={surveyor}
                  isPubliclyApproved={isPubliclyApproved}
                  value={uploadedPhotoFiles}
                  onChange={setUploadedPhotoFiles}
                  compact
                />

                <FileUploader
                  folder="surveys"
                  accept="document"
                  multiple={true}
                  maxSizeMB={15}
                  label="Unggah Dokumen / Lampiran Survei (PDF, Word, Excel)"
                  uploaderName={surveyor}
                  isPubliclyApproved={isPubliclyApproved}
                  value={uploadedDocFiles}
                  onChange={setUploadedDocFiles}
                  compact
                />
              </div>

              {/* Verification Status & Privacy Controls */}
              {canVerifyOrApprove && (
                <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-stone-800">Status Verifikasi Data</label>
                    <select
                      value={verificationStatus}
                      onChange={(e) =>
                        setVerificationStatus(e.target.value as VerificationStatus)
                      }
                      className="w-full px-3 py-1.5 rounded border border-[#D5D2C8] bg-white"
                    >
                      <option value="unverified_observation">
                        Observasi Belum Diverifikasi
                      </option>
                      <option value="verified">Terverifikasi Resmi</option>
                      <option value="needs_review">Perlu Tinjauan</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      id="surveyPublicApprove"
                      type="checkbox"
                      checked={isPubliclyApproved}
                      onChange={(e) => setIsPubliclyApproved(e.target.checked)}
                      className="rounded border-stone-300 text-[#4A6B53]"
                    />
                    <label htmlFor="surveyPublicApprove" className="text-stone-700 font-medium">
                      Setujui tampil di ringkasan publik (Default: Privat Internal)
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
                  {editingSurvey ? 'Simpan Perubahan Survei' : 'Simpan Survei Lapangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
