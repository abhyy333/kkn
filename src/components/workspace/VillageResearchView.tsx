import React, { useState } from 'react';
import {
  VillageResearchData,
  VillageDusun,
  VillageFacility,
  VillageInfrastructure,
  VillagePotency,
  VillagePriorityNeed,
  VerificationStatus,
  WorkProgram,
  SurveyRecord,
  DocumentationPhoto,
  UploadedFileMetadata,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { VillageObservationMap } from './VillageObservationMap';
import { FileUploader } from '../common/FileUploader';
import {
  MapPin,
  Users,
  Sparkles,
  AlertTriangle,
  Mountain,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Route,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Globe,
  Link2,
  Info,
  FileText,
  Download,
} from 'lucide-react';

interface VillageResearchViewProps {
  data: VillageResearchData;
  programs?: WorkProgram[];
  surveys?: SurveyRecord[];
  photos?: DocumentationPhoto[];
  onUpdateVillageResearch?: (updated: VillageResearchData) => void;
  onNavigateToSurveys?: () => void;
}

type ResearchTab =
  | 'overview'
  | 'dusuns'
  | 'demographics'
  | 'facilities'
  | 'infrastructure'
  | 'potency';

export const VillageResearchView: React.FC<VillageResearchViewProps> = ({
  data,
  programs = [],
  surveys = [],
  photos = [],
  onUpdateVillageResearch,
  onNavigateToSurveys,
}) => {
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const canEdit = profile?.role !== 'dpl' && profile?.role !== 'viewer';
  const canApprovePublic = isAdmin || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<ResearchTab>('overview');

  // Modals State
  const [isGeoModalOpen, setIsGeoModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [editingDusun, setEditingDusun] = useState<VillageDusun | null>(null);
  const [isDusunModalOpen, setIsDusunModalOpen] = useState(false);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<VillageFacility | null>(null);
  const [isInfraModalOpen, setIsInfraModalOpen] = useState(false);
  const [editingInfra, setEditingInfra] = useState<VillageInfrastructure | null>(null);
  const [isPotencyModalOpen, setIsPotencyModalOpen] = useState(false);
  const [editingPotency, setEditingPotency] = useState<VillagePotency | null>(null);
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);

  // Geo Form State
  const [geoText, setGeoText] = useState(data.geography);
  const [elevationText, setElevationText] = useState(data.elevation);
  const [northBound, setNorthBound] = useState(data.boundaries?.north || '');
  const [southBound, setSouthBound] = useState(data.boundaries?.south || '');
  const [eastBound, setEastBound] = useState(data.boundaries?.east || '');
  const [westBound, setWestBound] = useState(data.boundaries?.west || '');
  const [geoStatus, setGeoStatus] = useState<VerificationStatus>(
    data.verificationStatus || 'unverified_observation'
  );

  // Demographics Form State
  const [popInput, setPopInput] = useState<string>(
    data.totalPopulation !== null ? String(data.totalPopulation) : ''
  );
  const [hhInput, setHhInput] = useState<string>(
    data.totalHouseholds !== null ? String(data.totalHouseholds) : ''
  );
  const [areaInput, setAreaInput] = useState<string>(
    data.totalAreaHectares !== null ? String(data.totalAreaHectares) : ''
  );
  const [demoNotes, setDemoNotes] = useState(data.demographicNotes || '');

  // Dusun Form State
  const [dusunName, setDusunName] = useState('');
  const [dusunKadus, setDusunKadus] = useState('');
  const [dusunPop, setDusunPop] = useState('');
  const [dusunHh, setDusunHh] = useState('');
  const [dusunFocus, setDusunFocus] = useState('');
  const [dusunAddress, setDusunAddress] = useState('');
  const [dusunStatus, setDusunStatus] = useState<VerificationStatus>('unverified_observation');

  // Facility Form State
  const [facName, setFacName] = useState('');
  const [facCategory, setFacCategory] =
    useState<VillageFacility['category']>('Pendidikan');
  const [facDusun, setFacDusun] = useState(data.dusuns[0]?.name || 'Dusun Gubuk Lauk');
  const [facAddress, setFacAddress] = useState('');
  const [facCondition, setFacCondition] =
    useState<VillageFacility['condition']>('Perlu Verifikasi');
  const [facNotes, setFacNotes] = useState('');
  const [facPhotoMeta, setFacPhotoMeta] = useState<UploadedFileMetadata | null>(null);
  const [facStatus, setFacStatus] = useState<VerificationStatus>('unverified_observation');

  // Infrastructure Form State
  const [infraAspect, setInfraAspect] =
    useState<VillageInfrastructure['aspect']>('Akses Jalan Desa');
  const [infraDusun, setInfraDusun] = useState('Seluruh Wilayah Desa');
  const [infraSummary, setInfraSummary] = useState('');
  const [infraIssues, setInfraIssues] = useState('');
  const [infraStatus, setInfraStatus] = useState<VerificationStatus>('unverified_observation');

  // Potency Form State
  const [potSector, setPotSector] = useState<VillagePotency['sector']>('Kerajinan');
  const [potTitle, setPotTitle] = useState('');
  const [potDesc, setPotDesc] = useState('');
  const [potLoc, setPotLoc] = useState('Dusun Gubuk Tengak');
  const [potProgId, setPotProgId] = useState('');
  const [potStatus, setPotStatus] = useState<VerificationStatus>('unverified_observation');

  // Priority Need Form State
  const [needTitle, setNeedTitle] = useState('');
  const [needUrgency, setNeedUrgency] = useState<'Tinggi' | 'Sedang'>('Tinggi');
  const [needSector, setNeedSector] = useState('Ekonomi & Kreatif');
  const [needDesc, setNeedDesc] = useState('');
  const [needProgId, setNeedProgId] = useState('');
  const [needStatus, setNeedStatus] = useState<VerificationStatus>('unverified_observation');

  const facilities = data.facilities || [];
  const infrastructure = data.infrastructure || [];

  const renderVerificationBadge = (status?: VerificationStatus) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Terverifikasi Resmi
        </span>
      );
    }
    if (status === 'needs_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Perlu Tinjauan Ulang
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> Observasi Belum Diverifikasi
      </span>
    );
  };

  // Save Handlers
  const handleSaveGeo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch) return;
    onUpdateVillageResearch({
      ...data,
      geography: geoText,
      elevation: elevationText,
      boundaries: {
        north: northBound,
        south: southBound,
        east: eastBound,
        west: westBound,
      },
      verificationStatus: geoStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.displayName || profile?.email || 'Anggota KKN',
    });
    setIsGeoModalOpen(false);
  };

  const handleSaveDemographics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch) return;
    const parsedPop = popInput.trim() === '' ? null : Number(popInput);
    const parsedHh = hhInput.trim() === '' ? null : Number(hhInput);
    const parsedArea = areaInput.trim() === '' ? null : Number(areaInput);

    onUpdateVillageResearch({
      ...data,
      totalPopulation: parsedPop !== null && !isNaN(parsedPop) ? parsedPop : null,
      totalHouseholds: parsedHh !== null && !isNaN(parsedHh) ? parsedHh : null,
      totalAreaHectares: parsedArea !== null && !isNaN(parsedArea) ? parsedArea : null,
      demographicNotes: demoNotes,
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.displayName || profile?.email || 'Anggota KKN',
    });
    setIsDemoModalOpen(false);
  };

  const openDusunModal = (dusun?: VillageDusun) => {
    if (dusun) {
      setEditingDusun(dusun);
      setDusunName(dusun.name);
      setDusunKadus(dusun.headOfDusun);
      setDusunPop(dusun.population !== null ? String(dusun.population) : '');
      setDusunHh(dusun.households !== null ? String(dusun.households) : '');
      setDusunFocus(dusun.keyFocus);
      setDusunAddress(dusun.addressDetail || '');
      setDusunStatus(dusun.verificationStatus || 'unverified_observation');
    } else {
      setEditingDusun(null);
      setDusunName('');
      setDusunKadus('Belum Diverifikasi (Menunggu Konfirmasi Pemdes)');
      setDusunPop('');
      setDusunHh('');
      setDusunFocus('');
      setDusunAddress('Desa Pringgasela Selatan, Kec. Pringgasela');
      setDusunStatus('unverified_observation');
    }
    setIsDusunModalOpen(true);
  };

  const handleSaveDusun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch || !dusunName.trim()) return;

    const newDusun: VillageDusun = {
      id: editingDusun?.id || `dusun-${Date.now()}`,
      name: dusunName.trim(),
      headOfDusun: dusunKadus.trim() || 'Belum Diverifikasi',
      population: dusunPop.trim() === '' ? null : Number(dusunPop),
      households: dusunHh.trim() === '' ? null : Number(dusunHh),
      keyFocus: dusunFocus.trim(),
      addressDetail: dusunAddress.trim() || `${dusunName.trim()}, Desa Pringgasela Selatan`,
      coordinates: editingDusun?.coordinates,
      verificationStatus: dusunStatus,
    };

    const updatedDusuns = editingDusun
      ? data.dusuns.map((d) => (d.name === editingDusun.name ? newDusun : d))
      : [...data.dusuns, newDusun];

    onUpdateVillageResearch({
      ...data,
      dusuns: updatedDusuns,
      updatedAt: new Date().toISOString(),
    });
    setIsDusunModalOpen(false);
  };

  const openFacilityModal = (fac?: VillageFacility) => {
    if (fac) {
      setEditingFacility(fac);
      setFacName(fac.name);
      setFacCategory(fac.category);
      setFacDusun(fac.dusun);
      setFacAddress(fac.addressDetail || '');
      setFacCondition(fac.condition);
      setFacNotes(fac.notes);
      setFacPhotoMeta(
        fac.photoUrl
          ? {
              id: fac.id,
              name: `${fac.name}.jpg`,
              url: fac.photoUrl,
              storagePath: fac.photoStoragePath || '',
              folder: 'village-research',
              size: 0,
              sizeFormatted: '',
              contentType: 'image/jpeg',
              uploadedAt: '',
              uploadedBy: '',
            }
          : null
      );
      setFacStatus(fac.verificationStatus);
    } else {
      setEditingFacility(null);
      setFacName('');
      setFacCategory('Pendidikan');
      setFacDusun(data.dusuns[0]?.name || 'Dusun Gubuk Lauk');
      setFacAddress('');
      setFacCondition('Perlu Verifikasi');
      setFacNotes('');
      setFacPhotoMeta(null);
      setFacStatus('unverified_observation');
    }
    setIsFacilityModalOpen(true);
  };

  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch || !facName.trim()) return;

    const item: VillageFacility = {
      id: editingFacility?.id || `fac-${Date.now()}`,
      name: facName.trim(),
      category: facCategory,
      dusun: facDusun,
      addressDetail: facAddress.trim() || `${facDusun}, Desa Pringgasela Selatan`,
      condition: facCondition,
      notes: facNotes.trim(),
      photoUrl: facPhotoMeta?.url,
      photoStoragePath: facPhotoMeta?.storagePath,
      verificationStatus: facStatus,
    };

    const nextFacilities = editingFacility
      ? facilities.map((f) => (f.id === editingFacility.id ? item : f))
      : [...facilities, item];

    onUpdateVillageResearch({
      ...data,
      facilities: nextFacilities,
      updatedAt: new Date().toISOString(),
    });
    setIsFacilityModalOpen(false);
  };

  const handleDeleteFacility = (id: string) => {
    if (!onUpdateVillageResearch) return;
    onUpdateVillageResearch({
      ...data,
      facilities: facilities.filter((f) => f.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const openInfraModal = (inf?: VillageInfrastructure) => {
    if (inf) {
      setEditingInfra(inf);
      setInfraAspect(inf.aspect);
      setInfraDusun(inf.dusun);
      setInfraSummary(inf.conditionSummary);
      setInfraIssues(inf.issuesObserved);
      setInfraStatus(inf.verificationStatus);
    } else {
      setEditingInfra(null);
      setInfraAspect('Akses Jalan Desa');
      setInfraDusun('Seluruh Wilayah Desa');
      setInfraSummary('');
      setInfraIssues('');
      setInfraStatus('unverified_observation');
    }
    setIsInfraModalOpen(true);
  };

  const handleSaveInfra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch || !infraSummary.trim()) return;

    const item: VillageInfrastructure = {
      id: editingInfra?.id || `inf-${Date.now()}`,
      aspect: infraAspect,
      dusun: infraDusun,
      conditionSummary: infraSummary.trim(),
      issuesObserved: infraIssues.trim(),
      verificationStatus: infraStatus,
    };

    const nextInfra = editingInfra
      ? infrastructure.map((i) => (i.id === editingInfra.id ? item : i))
      : [...infrastructure, item];

    onUpdateVillageResearch({
      ...data,
      infrastructure: nextInfra,
      updatedAt: new Date().toISOString(),
    });
    setIsInfraModalOpen(false);
  };

  const handleDeleteInfra = (id: string) => {
    if (!onUpdateVillageResearch) return;
    onUpdateVillageResearch({
      ...data,
      infrastructure: infrastructure.filter((i) => i.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const openPotencyModal = (pot?: VillagePotency) => {
    if (pot) {
      setEditingPotency(pot);
      setPotSector(pot.sector);
      setPotTitle(pot.title);
      setPotDesc(pot.description);
      setPotLoc(pot.location || 'Dusun Gubuk Tengak');
      setPotProgId(pot.linkedProgramId || '');
      setPotStatus(pot.verificationStatus || 'unverified_observation');
    } else {
      setEditingPotency(null);
      setPotSector('Kerajinan');
      setPotTitle('');
      setPotDesc('');
      setPotLoc('Dusun Gubuk Tengak');
      setPotProgId('');
      setPotStatus('unverified_observation');
    }
    setIsPotencyModalOpen(true);
  };

  const handleSavePotency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch || !potTitle.trim()) return;

    const item: VillagePotency = {
      id: editingPotency?.id || `pot-${Date.now()}`,
      sector: potSector,
      title: potTitle.trim(),
      description: potDesc.trim(),
      location: potLoc.trim(),
      linkedProgramId: potProgId || undefined,
      verificationStatus: potStatus,
    };

    const nextPotencies = editingPotency
      ? data.potencies.map((p) => (p.id === editingPotency.id ? item : p))
      : [...data.potencies, item];

    onUpdateVillageResearch({
      ...data,
      potencies: nextPotencies,
      updatedAt: new Date().toISOString(),
    });
    setIsPotencyModalOpen(false);
  };

  const handleSavePriorityNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateVillageResearch || !needTitle.trim()) return;

    const item: VillagePriorityNeed = {
      id: `need-${Date.now()}`,
      title: needTitle.trim(),
      urgency: needUrgency,
      sector: needSector,
      description: needDesc.trim(),
      linkedProgramId: needProgId || undefined,
      verificationStatus: needStatus,
    };

    onUpdateVillageResearch({
      ...data,
      priorityNeeds: [...data.priorityNeeds, item],
      updatedAt: new Date().toISOString(),
    });
    setNeedTitle('');
    setNeedDesc('');
    setIsNeedModalOpen(false);
  };

  const handleTogglePublicApproval = () => {
    if (!onUpdateVillageResearch || !canApprovePublic) return;
    onUpdateVillageResearch({
      ...data,
      isPubliclyApproved: !data.isPubliclyApproved,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Village">
              🏡
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Profil & Riset Wilayah {data.villageName}
            </h1>
            {renderVerificationBadge(data.verificationStatus)}
            {data.isPubliclyApproved ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe className="w-3 h-3" /> Disetujui Publik
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                <Lock className="w-3 h-3" /> Internal Posko (Privat)
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Kecamatan {data.kecamatan}, {data.kabupaten}, Provinsi {data.province} • Basis data monografi, pemetaan 7 dusun, fasilitas, infrastruktur, dan potensi desa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {canApprovePublic && (
            <button
              type="button"
              onClick={handleTogglePublicApproval}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                data.isPubliclyApproved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-stone-700 border-[#D5D2C8] hover:bg-stone-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {data.isPubliclyApproved ? 'Publikasi Aktif' : 'Setujui Publikasi Profil'}
              </span>
            </button>
          )}
          {onNavigateToSurveys && (
            <button
              type="button"
              onClick={onNavigateToSurveys}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors"
            >
              <span>Buka Database Survei ({surveys.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Strict Data Integrity Notice Banner */}
      <div className="p-3.5 rounded-lg bg-[#F7F6F2] border border-[#E8E6DF] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 leading-relaxed">
          <span className="font-semibold text-stone-900">
            Prinsip Integritas Data Riset Desa Pringgasela Selatan:
          </span>{' '}
          Angka statistik kependudukan, jumlah KK, dan fasilitas resmi hanya ditampilkan sebagai{' '}
          <span className="font-medium text-emerald-700">Terverifikasi Resmi</span> setelah diinput dari Buku Induk / Profil Resmi Pemerintah Desa Pringgasela Selatan. Data hasil pengamatan awal tim KKN diberi label{' '}
          <span className="font-medium text-amber-800">Observasi Belum Diverifikasi</span> dan bersifat privat di dalam Workspace.
        </div>
      </div>

      {/* 6-Part Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E8E6DF]">
        {(
          [
            { id: 'overview', label: '1. Geografis & Peta Observasi' },
            { id: 'dusuns', label: `2. Pemetaan Dusun (${data.dusuns.length})` },
            { id: 'demographics', label: '3. Demografi & Kependudukan' },
            { id: 'facilities', label: `4. Fasilitas Desa (${facilities.length})` },
            { id: 'infrastructure', label: `5. Infrastruktur & Jalan (${infrastructure.length})` },
            { id: 'potency', label: '6. Ekonomi, Budaya, Wisata & Kebutuhan' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-t-md text-xs font-medium transition-colors shrink-0 border-b-2 ${
              activeTab === tab.id
                ? 'bg-[#EBF1ED] text-[#284230] border-[#284230] font-semibold'
                : 'text-stone-600 border-transparent hover:bg-[#EFECE5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GEOGRAFIS & GAMBARAN UMUM + PETA OBSERVASI */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4A6B53]">
                  <Mountain className="w-4 h-4" />
                  <span>Letak Geografis & Gambaran Umum Wilayah</span>
                </div>
                <h2 className="font-serif text-lg font-medium text-stone-900">
                  Desa {data.villageName}, Kec. {data.kecamatan}, {data.kabupaten}
                </h2>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setGeoText(data.geography);
                    setElevationText(data.elevation);
                    setNorthBound(data.boundaries?.north || '');
                    setSouthBound(data.boundaries?.south || '');
                    setEastBound(data.boundaries?.east || '');
                    setWestBound(data.boundaries?.west || '');
                    setGeoStatus(data.verificationStatus || 'unverified_observation');
                    setIsGeoModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#D5D2C8] text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Geografis
                </button>
              )}
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">{data.geography}</p>

            {/* Boundaries & Elevation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Ketinggian / Topografi
                </span>
                <span className="text-xs font-medium text-stone-800 mt-1 block">
                  {data.elevation}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Batas Utara
                </span>
                <span className="text-xs font-medium text-stone-800 mt-1 block">
                  {data.boundaries?.north || 'Belum Diverifikasi'}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Batas Selatan
                </span>
                <span className="text-xs font-medium text-stone-800 mt-1 block">
                  {data.boundaries?.south || 'Belum Diverifikasi'}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Batas Timur
                </span>
                <span className="text-xs font-medium text-stone-800 mt-1 block">
                  {data.boundaries?.east || 'Belum Diverifikasi'}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Batas Barat
                </span>
                <span className="text-xs font-medium text-stone-800 mt-1 block">
                  {data.boundaries?.west || 'Belum Diverifikasi'}
                </span>
              </div>
            </div>
          </div>

          {/* Village Research Attachments (Direct Upload to Supabase Storage) */}
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
              <div>
                <h3 className="font-serif text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4A6B53]" />
                  <span>Lampiran Dokumen Monografi & Berkas Riset Desa</span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  Unggah dokumen profil resmi desa, peta wilayah, atau berkas pendukung riset ke Supabase Storage.
                </p>
              </div>
            </div>

            {canEdit ? (
              <FileUploader
                folder="village-research"
                accept="document"
                multiple={true}
                maxSizeMB={15}
                label="Unggah Lampiran Riset Desa (PDF, Word, Excel, atau Foto Peta)"
                uploaderName={profile?.displayName || 'Anggota KKN'}
                value={data.attachments || []}
                onChange={(nextFiles) => {
                  if (onUpdateVillageResearch) {
                    onUpdateVillageResearch({
                      ...data,
                      attachments: nextFiles,
                      updatedAt: new Date().toISOString(),
                    });
                  }
                }}
                compact
              />
            ) : (data.attachments || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(data.attachments || []).map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-100 text-xs font-medium text-[#284230] hover:bg-stone-200"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{att.name}</span>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">Belum ada lampiran dokumen riset desa.</p>
            )}
          </div>

          {/* Interactive Observation Map */}
          <VillageObservationMap
            dusuns={data.dusuns}
            surveys={surveys}
            photos={photos}
            facilities={facilities}
          />
        </div>
      )}

      {/* TAB 2: PEMETAAN DUSUN & WILAYAH */}
      {activeTab === 'dusuns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#4A6B53]" />
                <span>Daftar Kewilayahan Dusun di Desa Pringgasela Selatan</span>
              </h2>
              <p className="text-xs text-stone-500">
                Data kepala kewilayahan (Kadus), populasi per dusun, titik koordinat, dan fokus observasi lapangan.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => openDusunModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643]"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Wilayah Dusun
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.dusuns.map((d) => {
              const dusunSurveysCount = surveys.filter((s) => s.dusun === d.name).length;
              return (
                <div
                  key={d.name}
                  className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-sm font-semibold text-stone-900">
                          {d.name}
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          Kepala Dusun: <span className="font-medium text-stone-700">{d.headOfDusun}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderVerificationBadge(d.verificationStatus)}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openDusunModal(d)}
                            className="p-1 rounded hover:bg-stone-100 text-stone-500"
                            title="Edit Data Dusun"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed bg-[#F7F6F2] p-2.5 rounded border border-[#E8E6DF]">
                      {d.keyFocus}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                    <div>
                      Populasi:{' '}
                      <span className="font-semibold text-stone-800">
                        {d.population !== null ? `${d.population} Jiwa` : 'Belum Diverifikasi'}
                      </span>{' '}
                      • KK:{' '}
                      <span className="font-semibold text-stone-800">
                        {d.households !== null ? `${d.households} KK` : 'Belum Diverifikasi'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.addressDetail && (
                        <span className="text-[10px] text-stone-500 truncate max-w-[160px]">
                          {d.addressDetail}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-medium text-[10px]">
                        {dusunSurveysCount} Survei
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DEMOGRAFI & KEPENDUDUKAN */}
      {activeTab === 'demographics' && (
        <div className="space-y-5">
          <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4A6B53]" />
                  <span>Statistik Kependudukan & Demografi Desa Pringgasela Selatan</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Data agregat jumlah penduduk, kepala keluarga (KK), dan luas wilayah administratif desa.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setPopInput(data.totalPopulation !== null ? String(data.totalPopulation) : '');
                    setHhInput(data.totalHouseholds !== null ? String(data.totalHouseholds) : '');
                    setAreaInput(
                      data.totalAreaHectares !== null ? String(data.totalAreaHectares) : ''
                    );
                    setDemoNotes(data.demographicNotes || '');
                    setIsDemoModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643]"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Perbarui Data Monografi Desa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[#F7F6F2] border border-[#E8E6DF] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Total Populasi Penduduk
                </span>
                {data.totalPopulation !== null ? (
                  <div className="text-2xl font-serif font-semibold text-stone-900">
                    {data.totalPopulation.toLocaleString('id-ID')} <span className="text-sm font-sans font-normal text-stone-500">Jiwa</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2.5 py-2 mt-1">
                    Belum Diverifikasi (Menunggu Input Buku Induk Desa)
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-[#F7F6F2] border border-[#E8E6DF] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Jumlah Kepala Keluarga (KK)
                </span>
                {data.totalHouseholds !== null ? (
                  <div className="text-2xl font-serif font-semibold text-stone-900">
                    {data.totalHouseholds.toLocaleString('id-ID')} <span className="text-sm font-sans font-normal text-stone-500">KK</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2.5 py-2 mt-1">
                    Belum Diverifikasi (Menunggu Input Buku Induk Desa)
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-[#F7F6F2] border border-[#E8E6DF] space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Luas Wilayah Desa
                </span>
                {data.totalAreaHectares !== null ? (
                  <div className="text-2xl font-serif font-semibold text-stone-900">
                    {data.totalAreaHectares.toLocaleString('id-ID')} <span className="text-sm font-sans font-normal text-stone-500">Hektare</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2.5 py-2 mt-1">
                    Belum Diverifikasi (Menunggu Data Monografi Resmi)
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="font-semibold text-stone-800">Catatan Verifikasi Demografi:</div>
              <p className="leading-relaxed">
                {data.demographicNotes ||
                  'Belum ada catatan tambahan. Silakan perbarui setelah melakukan pencocokan dengan Kaur Pemerintahan Desa Pringgasela Selatan.'}
              </p>
            </div>
          </div>

          {/* Per-Dusun Demographic Table */}
          <div className="rounded-lg bg-white border border-[#E8E6DF] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E6DF] bg-[#F7F6F2]">
              <h3 className="font-serif text-sm font-semibold text-stone-900">
                Rincian Demografi Per Dusun ({data.dusuns.length} Wilayah)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E6DF] text-[11px] text-stone-500 bg-stone-50/60">
                    <th className="py-2.5 px-4 font-semibold">Nama Dusun</th>
                    <th className="py-2.5 px-4 font-semibold">Kepala Kewilayahan</th>
                    <th className="py-2.5 px-4 font-semibold">Jumlah Penduduk</th>
                    <th className="py-2.5 px-4 font-semibold">Jumlah KK</th>
                    <th className="py-2.5 px-4 font-semibold">Status Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DF]">
                  {data.dusuns.map((d) => (
                    <tr key={d.name} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4 font-medium text-stone-900">{d.name}</td>
                      <td className="py-3 px-4 text-stone-600">{d.headOfDusun}</td>
                      <td className="py-3 px-4 text-stone-700">
                        {d.population !== null ? (
                          `${d.population.toLocaleString('id-ID')} Jiwa`
                        ) : (
                          <span className="text-stone-400 italic">Belum diverifikasi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {d.households !== null ? (
                          `${d.households.toLocaleString('id-ID')} KK`
                        ) : (
                          <span className="text-stone-400 italic">Belum diverifikasi</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{renderVerificationBadge(d.verificationStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FASILITAS PENDIDIKAN, KESEHATAN, IBADAH & UMUM */}
      {activeTab === 'facilities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4A6B53]" />
                <span>Inventarisasi Fasilitas Pendidikan, Kesehatan, Ibadah & Umum</span>
              </h2>
              <p className="text-xs text-stone-500">
                Pencatatan sarana prasarana pelayanan masyarakat di Desa Pringgasela Selatan.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => openFacilityModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643]"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Data Fasilitas
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230]">
                        {fac.category}
                      </span>
                      <h3 className="font-serif text-sm font-semibold text-stone-900 mt-1.5">
                        {fac.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderVerificationBadge(fac.verificationStatus)}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => openFacilityModal(fac)}
                            className="p-1 rounded hover:bg-stone-100 text-stone-500"
                            title="Edit Fasilitas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFacility(fac.id)}
                            className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                            title="Hapus Fasilitas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {fac.photoUrl && (
                    <div className="w-full h-36 rounded-md overflow-hidden bg-stone-100 border border-stone-200">
                      <img
                        src={fac.photoUrl}
                        alt={fac.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-stone-600 leading-relaxed">{fac.notes}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{fac.addressDetail || fac.dusun}</span>
                  </span>
                  <span className="shrink-0">
                    Kondisi: <strong className="text-stone-700">{fac.condition}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INFRASTRUKTUR, AKSES JALAN & TRANSPORTASI */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                <Route className="w-4 h-4 text-[#4A6B53]" />
                <span>Kondisi Infrastruktur, Akses Jalan & Transportasi Desa</span>
              </h2>
              <p className="text-xs text-stone-500">
                Hasil pengamatan akses jalan poros desa, jalan lingkungan dusun, irigasi, air bersih, dan konektivitas.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => openInfraModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643]"
              >
                <Plus className="w-3.5 h-3.5" /> Catat Observasi Infrastruktur
              </button>
            )}
          </div>

          <div className="space-y-3">
            {infrastructure.map((inf) => (
              <div
                key={inf.id}
                className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#EBF1ED] text-[#284230]">
                      {inf.aspect}
                    </span>
                    <span className="text-xs font-medium text-stone-500">• {inf.dusun}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {renderVerificationBadge(inf.verificationStatus)}
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openInfraModal(inf)}
                          className="p-1 rounded hover:bg-stone-100 text-stone-500"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInfra(inf.id)}
                          className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded bg-[#F7F6F2] border border-[#E8E6DF]">
                    <span className="text-[10px] font-semibold uppercase text-stone-400 block mb-1">
                      Ringkasan Kondisi Eksisting
                    </span>
                    <p className="text-stone-700 leading-relaxed">{inf.conditionSummary}</p>
                  </div>
                  <div className="p-3 rounded bg-amber-50/40 border border-amber-200/70">
                    <span className="text-[10px] font-semibold uppercase text-amber-800 block mb-1">
                      Kendala / Kebutuhan Perbaikan
                    </span>
                    <p className="text-stone-700 leading-relaxed">{inf.issuesObserved}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: EKONOMI LOKAL, PERTANIAN, BUDAYA, WISATA & KEBUTUHAN PRIORITAS */}
      {activeTab === 'potency' && (
        <div className="space-y-6">
          {/* Potencies Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#4A6B53]" />
                  <span>Potensi Ekonomi, Pertanian, Budaya Tenun & Wisata Desa</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Pemetaan potensi unggulan masyarakat Desa Pringgasela Selatan yang ditautkan ke Program Kerja KKN.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openPotencyModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643]"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Potensi Desa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.potencies.map((p, idx) => {
                const linkedProg = programs.find((pr) => pr.id === p.linkedProgramId);
                return (
                  <div
                    key={p.id || idx}
                    className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230]">
                          Sektor {p.sector}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {renderVerificationBadge(p.verificationStatus)}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openPotencyModal(p)}
                              className="p-1 rounded hover:bg-stone-100 text-stone-500"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-serif text-sm font-semibold text-stone-900 pt-1">
                        {p.title}
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed">{p.description}</p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" /> {p.location || 'Desa Pringgasela Selatan'}
                      </span>
                      {linkedProg && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-[#284230]">
                          <Link2 className="w-3 h-3" /> {linkedProg.code}: {linkedProg.title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Needs Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-base font-semibold text-stone-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Identifikasi Masalah & Kebutuhan Prioritas Masyarakat</span>
                </h2>
                <p className="text-xs text-stone-500">
                  Rumusan permasalahan utama hasil survei yang menjadi dasar intervensi Program Kerja KKN.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsNeedModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C8] bg-white text-stone-700 text-xs font-medium hover:bg-stone-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kebutuhan Prioritas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.priorityNeeds.map((need, idx) => {
                const linkedProg = programs.find((pr) => pr.id === need.linkedProgramId);
                return (
                  <div
                    key={need.id || idx}
                    className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
                          {need.sector}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            need.urgency === 'Tinggi'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          Urgensi {need.urgency}
                        </span>
                      </div>
                      <h3 className="font-medium text-xs text-stone-900">{need.title}</h3>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        {need.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      {renderVerificationBadge(need.verificationStatus)}
                      {linkedProg && (
                        <div className="text-[10px] font-medium text-[#284230] flex items-center gap-1 truncate">
                          <Link2 className="w-3 h-3 shrink-0" /> Tindak Lanjut: {linkedProg.title}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SWOT Matrix */}
          <div className="space-y-3">
            <h2 className="font-serif text-base font-semibold text-stone-900">
              Matriks Analisis SWOT Desa Pringgasela Selatan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] border-t-4 border-t-emerald-600 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Strengths (Kekuatan Internal)
                </span>
                <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-4">
                  {data.swot.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] border-t-4 border-t-amber-500 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Weaknesses (Kelemahan / Kendala)
                </span>
                <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-4">
                  {data.swot.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] border-t-4 border-t-sky-600 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  Opportunities (Peluang Pengembangan)
                </span>
                <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-4">
                  {data.swot.opportunities.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] border-t-4 border-t-rose-600 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Threats (Ancaman / Tantangan Eksternal)
                </span>
                <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-4">
                  {data.swot.threats.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT GEOGRAFIS */}
      {isGeoModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Perbarui Data Geografis & Batas Desa
              </h3>
              <button
                type="button"
                onClick={() => setIsGeoModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveGeo} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi Geografis Wilayah</label>
                <textarea
                  rows={4}
                  required
                  value={geoText}
                  onChange={(e) => setGeoText(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Elevasi & Topografi</label>
                <input
                  type="text"
                  required
                  value={elevationText}
                  onChange={(e) => setElevationText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Batas Utara</label>
                  <input
                    type="text"
                    value={northBound}
                    onChange={(e) => setNorthBound(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Batas Selatan</label>
                  <input
                    type="text"
                    value={southBound}
                    onChange={(e) => setSouthBound(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Batas Timur</label>
                  <input
                    type="text"
                    value={eastBound}
                    onChange={(e) => setEastBound(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Batas Barat</label>
                  <input
                    type="text"
                    value={westBound}
                    onChange={(e) => setWestBound(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Status Verifikasi Profil</label>
                <select
                  value={geoStatus}
                  onChange={(e) => setGeoStatus(e.target.value as VerificationStatus)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="unverified_observation">
                    Observasi Lapangan (Belum Diverifikasi Resmi)
                  </option>
                  <option value="verified">Terverifikasi Dokumen Resmi Desa</option>
                  <option value="needs_review">Perlu Tinjauan Ulang</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsGeoModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DEMOGRAFI RESMI */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Input Data Kependudukan Resmi Desa
              </h3>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDemographics} className="space-y-3 text-xs">
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                Kosongkan kolom angka apabila data resmi dari Buku Induk Desa Pringgasela Selatan belum diperoleh. Jangan memasukkan angka perkiraan.
              </p>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Total Penduduk Resmi (Jiwa)</label>
                <input
                  type="number"
                  min={0}
                  value={popInput}
                  onChange={(e) => setPopInput(e.target.value)}
                  placeholder="Kosongkan jika belum diverifikasi"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Jumlah Kepala Keluarga (KK)</label>
                <input
                  type="number"
                  min={0}
                  value={hhInput}
                  onChange={(e) => setHhInput(e.target.value)}
                  placeholder="Kosongkan jika belum diverifikasi"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Luas Wilayah (Hektare)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  placeholder="Kosongkan jika belum diverifikasi"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Sumber Dokumen / Catatan Verifikasi</label>
                <textarea
                  rows={3}
                  value={demoNotes}
                  onChange={(e) => setDemoNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Data Demografi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT DUSUN */}
      {isDusunModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                {editingDusun ? `Edit ${editingDusun.name}` : 'Tambah Wilayah Dusun'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDusunModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDusun} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nama Dusun</label>
                <input
                  type="text"
                  required
                  value={dusunName}
                  onChange={(e) => setDusunName(e.target.value)}
                  placeholder="Contoh: Dusun Gubuk Tengak"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nama Kepala Dusun (Kadus)</label>
                <input
                  type="text"
                  value={dusunKadus}
                  onChange={(e) => setDusunKadus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Populasi (Opsional)</label>
                  <input
                    type="number"
                    value={dusunPop}
                    onChange={(e) => setDusunPop(e.target.value)}
                    placeholder="Kosongkan jika belum resmi"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Jumlah KK (Opsional)</label>
                  <input
                    type="number"
                    value={dusunHh}
                    onChange={(e) => setDusunHh(e.target.value)}
                    placeholder="Kosongkan jika belum resmi"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Alamat / Lokasi Balai Dusun & Patokan</label>
                <input
                  type="text"
                  value={dusunAddress}
                  onChange={(e) => setDusunAddress(e.target.value)}
                  placeholder="Contoh: Jl. Poros Dusun Gubuk Lauk, dekat Masjid Jami'"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Karakteristik & Fokus Observasi Dusun</label>
                <textarea
                  rows={3}
                  required
                  value={dusunFocus}
                  onChange={(e) => setDusunFocus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Status Verifikasi</label>
                <select
                  value={dusunStatus}
                  onChange={(e) => setDusunStatus(e.target.value as VerificationStatus)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="unverified_observation">Observasi Belum Diverifikasi</option>
                  <option value="verified">Terverifikasi Resmi</option>
                  <option value="needs_review">Perlu Tinjauan</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsDusunModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Dusun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD/EDIT FACILITY */}
      {isFacilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                {editingFacility ? 'Edit Data Fasilitas Desa' : 'Tambah Fasilitas Desa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFacilityModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveFacility} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nama Fasilitas / Sarana</label>
                <input
                  type="text"
                  required
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  placeholder="Contoh: Posyandu Keluarga Dusun Gubuk Lauk"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori</label>
                  <select
                    value={facCategory}
                    onChange={(e) => setFacCategory(e.target.value as VillageFacility['category'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Pendidikan">Pendidikan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Ibadah">Ibadah</option>
                    <option value="Fasilitas Umum">Fasilitas Umum</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Dusun</label>
                  <select
                    value={facDusun}
                    onChange={(e) => setFacDusun(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    {data.dusuns.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kondisi Fisik</label>
                  <select
                    value={facCondition}
                    onChange={(e) =>
                      setFacCondition(e.target.value as VillageFacility['condition'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Perlu Verifikasi">Perlu Verifikasi</option>
                    <option value="Baik">Baik</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Status Verifikasi</label>
                  <select
                    value={facStatus}
                    onChange={(e) => setFacStatus(e.target.value as VerificationStatus)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="unverified_observation">Observasi Lapangan</option>
                    <option value="verified">Terverifikasi Resmi</option>
                    <option value="needs_review">Perlu Tinjauan</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Alamat / Detail Lokasi Fasilitas</label>
                <input
                  type="text"
                  value={facAddress}
                  onChange={(e) => setFacAddress(e.target.value)}
                  placeholder="Contoh: RT 01 Dusun Gubuk Lauk, Jalan Utama Desa"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Catatan Observasi</label>
                <textarea
                  rows={2}
                  required
                  value={facNotes}
                  onChange={(e) => setFacNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <FileUploader
                folder="village-research"
                accept="image"
                multiple={false}
                maxSizeMB={8}
                label="Foto Fasilitas (Opsional)"
                singleUrl={facPhotoMeta?.url}
                singleFileName={facPhotoMeta?.name}
                singleStoragePath={facPhotoMeta?.storagePath}
                onSingleUpload={(meta) => setFacPhotoMeta(meta)}
                compact
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsFacilityModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Fasilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD/EDIT INFRASTRUCTURE */}
      {isInfraModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                {editingInfra ? 'Edit Observasi Infrastruktur' : 'Catat Infrastruktur & Jalan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsInfraModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveInfra} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Aspek Infrastruktur</label>
                  <select
                    value={infraAspect}
                    onChange={(e) =>
                      setInfraAspect(e.target.value as VillageInfrastructure['aspect'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Akses Jalan Desa">Akses Jalan Desa</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Air Bersih & Irigasi">Air Bersih & Irigasi</option>
                    <option value="Listrik & Telekomunikasi">Listrik & Telekomunikasi</option>
                    <option value="Sanitasi & Persampahan">Sanitasi & Persampahan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Cakupan Wilayah / Dusun</label>
                  <input
                    type="text"
                    required
                    value={infraDusun}
                    onChange={(e) => setInfraDusun(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Ringkasan Kondisi Lapangan</label>
                <textarea
                  rows={3}
                  required
                  value={infraSummary}
                  onChange={(e) => setInfraSummary(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Masalah / Kebutuhan Tindak Lanjut</label>
                <textarea
                  rows={2}
                  required
                  value={infraIssues}
                  onChange={(e) => setInfraIssues(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Status Verifikasi</label>
                <select
                  value={infraStatus}
                  onChange={(e) => setInfraStatus(e.target.value as VerificationStatus)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="unverified_observation">Observasi Belum Diverifikasi</option>
                  <option value="verified">Terverifikasi Resmi</option>
                  <option value="needs_review">Perlu Tinjauan</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsInfraModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Infrastruktur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ADD/EDIT POTENCY */}
      {isPotencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                {editingPotency ? 'Edit Potensi Desa' : 'Tambah Potensi Desa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPotencyModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePotency} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Sektor Potensi</label>
                  <select
                    value={potSector}
                    onChange={(e) => setPotSector(e.target.value as VillagePotency['sector'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Kerajinan">Kerajinan & Budaya</option>
                    <option value="Pertanian">Pertanian & Perkebunan</option>
                    <option value="Pariwisata">Pariwisata</option>
                    <option value="UMKM">Ekonomi Lokal & UMKM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Dusun</label>
                  <input
                    type="text"
                    value={potLoc}
                    onChange={(e) => setPotLoc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Potensi Unggulan</label>
                <input
                  type="text"
                  required
                  value={potTitle}
                  onChange={(e) => setPotTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi & Temuan Potensi</label>
                <textarea
                  rows={3}
                  required
                  value={potDesc}
                  onChange={(e) => setPotDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Tautkan ke Program Kerja KKN</label>
                <select
                  value={potProgId}
                  onChange={(e) => setPotProgId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="">-- Belum Ditautkan --</option>
                  {programs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.code} — {pr.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Status Verifikasi</label>
                <select
                  value={potStatus}
                  onChange={(e) => setPotStatus(e.target.value as VerificationStatus)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="unverified_observation">Observasi Belum Diverifikasi</option>
                  <option value="verified">Terverifikasi Resmi</option>
                  <option value="needs_review">Perlu Tinjauan</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPotencyModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Potensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD PRIORITY NEED */}
      {isNeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-semibold text-stone-900">
                Tambah Kebutuhan Prioritas Desa
              </h3>
              <button
                type="button"
                onClick={() => setIsNeedModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePriorityNeed} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Masalah / Kebutuhan</label>
                <input
                  type="text"
                  required
                  value={needTitle}
                  onChange={(e) => setNeedTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Sektor</label>
                  <input
                    type="text"
                    required
                    value={needSector}
                    onChange={(e) => setNeedSector(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Tingkat Urgensi</label>
                  <select
                    value={needUrgency}
                    onChange={(e) => setNeedUrgency(e.target.value as 'Tinggi' | 'Sedang')}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                  >
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Deskripsi Kebutuhan</label>
                <textarea
                  rows={3}
                  required
                  value={needDesc}
                  onChange={(e) => setNeedDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Tautkan ke Program Kerja</label>
                <select
                  value={needProgId}
                  onChange={(e) => setNeedProgId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8]"
                >
                  <option value="">-- Belum Ditautkan --</option>
                  {programs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.code} — {pr.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNeedModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan Kebutuhan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
