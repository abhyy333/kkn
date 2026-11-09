export type WorkspaceModuleId =
  | 'overview'
  | 'meetings'
  | 'tasks'
  | 'members'
  | 'profile'
  | 'village-research'
  | 'surveys'
  | 'programs'
  | 'finance'
  | 'inventory'
  | 'documentation'
  | 'reports'
  | 'decisions'
  | 'archive'
  | 'settings';

export type ViewMode = 'workspace' | 'public' | 'dpl' | 'admin';

export type SystemRole = 'super_admin' | 'admin' | 'member' | 'dpl' | 'viewer' | 'user';

export type StorageFolderCategory =
  | 'documentation'
  | 'documentation_albums'
  | 'avatars'
  | 'surveys'
  | 'village-research'
  | 'members'
  | 'meetings'
  | 'tasks'
  | 'programs'
  | 'reports'
  | 'finance'
  | 'inventory'
  | 'archive'
  | 'articles';

export interface UploadedFileMetadata {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  folder: StorageFolderCategory;
  size: number;
  sizeFormatted: string;
  contentType: string;
  uploadedAt: string;
  uploadedBy?: string;
  isPubliclyApproved?: boolean;
}

export interface RegisteredEmailRecord {
  id: string; // sanitized email or unique id
  email: string;
  name: string;
  position: string;
  division: string;
  memberId?: string;
  systemRole?: SystemRole;
  registeredBy: string;
  registeredAt: string;
  status: 'pending_activation' | 'activated' | 'revoked' | 'disabled';
  activatedAt?: any;
  activatedUid?: string;
  disabledAt?: string;
  disabledReason?: string;
}

export interface AdminActivityLogRecord {
  id: string;
  timestamp: string;
  adminEmail: string;
  adminName: string;
  action:
    | 'BOOTSTRAP_SUPER_ADMIN'
    | 'REGISTER_MEMBER_EMAIL'
    | 'UPDATE_REGISTERED_EMAIL'
    | 'ACTIVATE_ACCOUNT'
    | 'DISABLE_ACCOUNT'
    | 'RESTORE_ACCOUNT'
    | 'DELETE_AUTH_ACCOUNT'
    | 'UPDATE_MEMBER_PROFILE'
    | 'UPDATE_ROLE'
    | 'APPROVE_PUBLIC_CONTENT'
    | 'ADMIN_CRUD_CREATE'
    | 'ADMIN_CRUD_UPDATE'
    | 'ADMIN_CRUD_DELETE'
    | 'UPDATE_SYSTEM_CONFIG'
    | 'SYSTEM_SETTING_CHANGED'
    | 'DB_BACKUP_EXPORT'
    | 'REVOKE_EMAIL'
    | 'SWITCH_MODE';
  target: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  ip?: string;
}

export interface StakeholderRecord {
  id: string;
  name: string;
  role: string;
  organization?: string;
  category?: string;
  dusun: string;
  phone?: string;
  influence?: string;
  notes?: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  author?: string;
  authorName?: string;
  isPinned?: boolean;
  isPublic?: boolean;
  isPublished?: boolean;
}

export interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  pic?: string;
  Division?: string;
  recordedBy: string;
  status?: string;
  source?: string;
  programId?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  receiptStoragePath?: string;
  receiptFileName?: string;
  attachments?: UploadedFileMetadata[];
}

export interface PublicTeamMember {
  id: string;
  name: string;
  role: string;
  division: string;
  major?: string;
  faculty?: string;
  bio?: string;
  responsibilities?: string[];
  avatar: string;
}

export interface PublicArticleRecord {
  id: string;
  title: string;
  category:
    | 'Berita Kegiatan'
    | 'Profil Inovasi Desa'
    | 'Profil Potensi Desa'
    | 'Edukasi Masyarakat'
    | 'Edukasi Warga'
    | 'Rilis Resmi Posko'
    | 'Pengumuman';
  summary: string;
  content: string;
  author: string;
  date: string;
  dusun?: string;
  locationName?: string;
  coverImageUrl?: string;
  coverStoragePath?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentStoragePath?: string;
  attachments?: UploadedFileMetadata[];
  isPublished: boolean;
}

export interface NavSection {
  title: string;
  items: {
    id: WorkspaceModuleId;
    label: string;
    icon: string;
    badge?: string | number;
  }[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
  position?: string;
  division: string;
  major: string;
  faculty: string;
  nim: string;
  phone: string;
  email: string;
  registeredEmail?: string;
  emergencyContact: string;
  avatar: string;
  avatarStoragePath?: string;
  bio?: string;
  isLeader?: boolean;
  status: 'active' | 'on_duty' | 'leave';
  responsibilities?: string[];
  systemRole?: SystemRole;
  accountStatus?: 'unregistered' | 'pending' | 'pending_activation' | 'active' | 'disabled' | 'pending_invitation';
  authUid?: string;
  acceptedAt?: any;
  disabledAt?: string;
  invitationToken?: string; // Kept optional for backward compatibility
}

export interface MeetingAttendee {
  memberId: string;
  name: string;
  status: 'hadir' | 'izin' | 'alpa';
  notes?: string;
}

export interface MeetingDocument {
  id?: string;
  name: string;
  url: string;
  storagePath?: string;
  type?: string;
  contentType?: string;
  sizeFormatted?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'Internal Posko' | 'Koordinasi Desa' | 'Supervisi DPL' | 'Evaluasi Mingguan' | 'Musyawarah Warga';
  attendeesCount: number;
  attendeesList?: MeetingAttendee[];
  absentMembers?: string[];
  agenda: string[];
  notesSummary: string;
  actionItems: { id: string; text: string; pic: string; completed: boolean }[];
  documents?: MeetingDocument[];
  status: 'upcoming' | 'completed';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskAttachment {
  id?: string;
  name: string;
  url: string;
  storagePath?: string;
  type?: string;
  contentType?: string;
  sizeFormatted?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  memberId?: string;
  division: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  dueDate: string;
  tags: string[];
  programId?: string;
  attachments?: TaskAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export type VerificationStatus = 'verified' | 'unverified_observation' | 'needs_review';

export interface VillageDusun {
  id?: string;
  name: string;
  headOfDusun: string;
  headName?: string;
  population: number | null;
  populationNote?: string;
  households: number | null;
  rtCount?: number | null;
  locationName?: string;
  addressDetail?: string;
  coordinates?: string; // Preserved optional for legacy historical records only
  keyFocus: string;
  characteristics?: string;
  keyCharacteristics?: string;
  mainNeeds?: string[];
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface VillageFacility {
  id: string;
  name: string;
  category: 'Pendidikan' | 'Kesehatan' | 'Ibadah' | 'Tempat Ibadah' | 'Fasilitas Umum';
  dusun: string;
  locationName?: string;
  addressDetail?: string;
  condition: 'Baik' | 'Cukup' | 'Perlu Perbaikan' | 'Perlu Verifikasi' | 'Belum Diverifikasi';
  coordinates?: string;
  notes: string;
  photoUrl?: string;
  photoStoragePath?: string;
  attachments?: UploadedFileMetadata[];
  verificationStatus: VerificationStatus;
  recordedBy?: string;
  updatedAt?: string;
}

export interface VillageInfrastructure {
  id: string;
  aspect:
    | 'Akses Jalan Desa'
    | 'Akses Jalan'
    | 'Transportasi'
    | 'Transportasi Umum'
    | 'Air Bersih & Irigasi'
    | 'Jaringan Air Bersih & Irigasi'
    | 'Listrik & Telekomunikasi'
    | 'Listrik & Penerangan'
    | 'Telekomunikasi & Internet'
    | 'Sanitasi & Persampahan';
  dusun: string;
  locationName?: string;
  addressDetail?: string;
  conditionSummary: string;
  issuesObserved: string;
  photoUrl?: string;
  photoStoragePath?: string;
  attachments?: UploadedFileMetadata[];
  verificationStatus: VerificationStatus;
  recordedBy?: string;
  updatedAt?: string;
}

export interface VillagePotency {
  id?: string;
  sector:
    | 'Kerajinan'
    | 'Pertanian'
    | 'Pariwisata'
    | 'UMKM'
    | 'Pertanian & Perkebunan'
    | 'Pariwisata Alam'
    | 'UMKM & Industri Rumahan'
    | 'Sosial & Budaya'
    | 'Ekonomi Lokal';
  title: string;
  location?: string;
  dusun?: string;
  addressDetail?: string;
  description: string;
  existingProblems?: string;
  opportunity?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  linkedProgramId?: string;
  verificationStatus?: VerificationStatus;
}

export interface VillagePriorityNeed {
  id?: string;
  rank?: number;
  title: string;
  urgency: 'Tinggi' | 'Sedang';
  sector: string;
  description: string;
  linkedProgramId?: string;
  verificationStatus?: VerificationStatus;
}

export interface VillageResearchData {
  id?: string;
  villageName: string;
  kecamatan: string;
  kabupaten: string;
  province: string;
  district?: string;
  regency?: string;
  overview?: string;
  geography: string;
  elevation: string;
  coordinates?: string;
  totalPopulation: number | null;
  totalHouseholds: number | null;
  totalAreaHectares: number | null;
  demographicNotes?: string;
  boundaries?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  dusuns: VillageDusun[];
  facilities?: VillageFacility[];
  infrastructure?: VillageInfrastructure[];
  potencies: VillagePotency[];
  attachments?: UploadedFileMetadata[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  priorityNeeds: VillagePriorityNeed[];
  verificationStatus?: VerificationStatus;
  isPubliclyApproved?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export type SurveyCategory =
  | 'Kesehatan'
  | 'Ekonomi'
  | 'Lingkungan'
  | 'Pendidikan'
  | 'Infrastruktur'
  | 'Pertanian'
  | 'Budaya & Wisata'
  | 'Fasilitas Umum';

export interface SurveyDocumentAttachment {
  id?: string;
  name: string;
  url: string;
  storagePath?: string;
  sizeFormatted?: string;
  contentType?: string;
}

export interface SurveyRecord {
  id: string;
  title: string;
  category: SurveyCategory;
  objectObserved?: string;
  dusun?: string;
  location: string;
  addressDetail?: string;
  coordinates?: string; // Preserved optional for legacy historical records only
  date: string;
  surveyor: string;
  surveyorId?: string;
  findings: string;
  existingProblems?: string;
  potentialOpportunities?: string;
  recommendations: string;
  linkedProgramId?: string;
  linkedProgramTitle?: string;
  photos?: string[];
  photoMetadata?: UploadedFileMetadata[];
  documents?: SurveyDocumentAttachment[];
  verificationStatus?: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  isPubliclyApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkProgram {
  id: string;
  code: string;
  title: string;
  division: string;
  pic: string;
  objective: string;
  targetAudience: string;
  budgetPlanned: number;
  budgetUsed: number;
  progressPercent: number;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  startDate: string;
  endDate: string;
  location: string;
  dusun?: string;
  addressDetail?: string;
  outputs: string[];
  keyMilestones: { title: string; completed: boolean }[];
  documentationPhotos?: string[];
  coverPhotoUrl?: string;
  attachments?: UploadedFileMetadata[];
  isFeaturedInPublic: boolean;
}

export interface InventoryRecord {
  id: string;
  name: string;
  category: 'Elektronik & IT' | 'Peralatan Posko' | 'Medis & P3K' | 'Protokol & Acara' | 'Perkakas Lapangan';
  quantity: number;
  unit: string;
  condition: 'Baik' | 'Cukup' | 'Rusak Ringan';
  ownership: 'Milik Unit' | 'Pinjaman Desa' | 'Sewa' | 'Milik Pribadi';
  storageLocation: string;
  pic: string;
  lastChecked: string;
  photoUrl?: string;
  photoStoragePath?: string;
}

export interface DocumentationPhoto {
  id: string;
  albumId?: string;
  title: string;
  category: 'Program Kerja' | 'Sosialisasi' | 'Kegiatan Harian' | 'Kunjungan Tokoh' | 'Observasi Survei';
  date: string;
  dusun?: string;
  location: string;
  addressDetail?: string;
  coordinates?: string; // Preserved optional for legacy historical records only
  imageUrl: string;
  storagePath?: string;
  fileSizeFormatted?: string;
  tags: string[];
  caption: string;
  photographer: string;
  surveyId?: string;
  programId?: string;
  verificationStatus?: VerificationStatus;
  isApprovedForPublic?: boolean;
}

export interface AlbumPhotoItem {
  id: string;
  albumId: string;
  imageUrl: string;
  url?: string;
  storagePath?: string;
  caption: string;
  photographer: string;
  sortOrder: number;
  order?: number;
  isCover: boolean;
  fileSize?: string;
  sizeFormatted?: string;
  uploadedBy?: string;
  uploadedAt: string;
  isApprovedForPublic: boolean;
}

export interface DocumentationAlbum {
  id: string;
  title: string;
  description: string;
  date: string;
  dusun: string;
  location: string;
  addressDetail?: string;
  coordinates?: string;
  category:
    | 'Program Kerja'
    | 'Observasi Survei'
    | 'Sosialisasi Warga'
    | 'Rapat & Koordinasi'
    | 'Kehidupan Posko'
    | 'Sosialisasi'
    | 'Kegiatan Harian'
    | 'Kunjungan Tokoh';
  photographer: string;
  responsibleMembers?: string[];
  coverImageUrl: string;
  coverPhotoUrl?: string;
  photos: AlbumPhotoItem[];
  tags: string[];
  verificationStatus: VerificationStatus;
  isPublished: boolean;
  programId?: string;
  surveyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportRevisionEntry {
  version: number;
  status: string;
  comments?: string;
  reviewedBy?: string;
  timestamp: string;
}

export interface ReportDocumentVersion {
  version: number;
  url: string;
  name: string;
  storagePath?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  type:
    | 'Laporan Harian'
    | 'Laporan Mingguan'
    | 'Laporan Kegiatan / Program Kerja'
    | 'Laporan Akhir KKN'
    | 'Dokumen Pendukung'
    | 'Logbook Harian'
    | 'Laporan Antara'
    | 'Draft Akhir LPJ';
  author: string;
  period: string;
  submissionDate: string;
  status:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'revision_requested'
    | 'revision_required'
    | 'resubmitted'
    | 'approved'
    | 'rejected'
    | 'approved_by_dpl';
  dplNotes?: string;
  reviewedBy?: string;
  reviewTimestamp?: string;
  fileSize: string;
  fileUrl?: string;
  fileName?: string;
  storagePath?: string;
  revisionHistory?: ReportRevisionEntry[];
  documentVersions?: ReportDocumentVersion[];
}

export interface DecisionLogRecord {
  id: string;
  title: string;
  date: string;
  decisionNumber: string;
  sourceMeetingId?: string;
  sourceMeetingTitle?: string;
  context: string;
  optionsConsidered: string[];
  consensusDecision: string;
  rationale: string;
  consequences: string;
  signedBy: string[];
  pic?: string;
  deadline?: string;
  status: 'Disahkan' | 'Dalam Peninjauan' | 'Sedang Berjalan' | 'Terealisasi' | 'Ratified' | 'Under Review';
  createdAt?: string;
  updatedAt?: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  category: 'Legalitas & Izin' | 'Proposal & Kerangka Acuan' | 'Surat Keluar' | 'Template & Kop' | 'Laporan Final';
  fileFormat: 'PDF' | 'DOCX' | 'XLSX' | 'ZIP';
  dateUploaded: string;
  size: string;
  referenceNumber?: string;
  fileUrl?: string;
  fileName?: string;
  storagePath?: string;
  uploadedBy?: string;
}

export interface PublicFeedbackRecord {
  id: string;
  name: string;
  dusun: string;
  role: string; // e.g. "Warga Dusun Krajan", "Karang Taruna", "Kader Posyandu"
  message: string;
  date: string;
  category: 'Apresiasi' | 'Saran Program' | 'Permintaan Bantuan' | 'Pertanyaan';
  status: 'reviewed' | 'new';
}

export interface UnitConfig {
  unitCode: string;
  unitName: string;
  university: string;
  faculty: string;
  period: string;
  villageName: string;
  district: string;
  regency: string;
  startDate: string;
  endDate: string;
  dplName: string;
  dplNip: string;
  poskoAddress: string;
}
