export type WorkspaceModuleId =
  | 'overview'
  | 'meetings'
  | 'tasks'
  | 'members'
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

export type ViewMode = 'workspace' | 'public';

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
  division: string;
  major: string;
  faculty: string;
  nim: string;
  phone: string;
  email: string;
  emergencyContact: string;
  avatar: string;
  isLeader?: boolean;
  status: 'active' | 'on_duty' | 'leave';
  responsibilities?: string[];
  invitationToken?: string;
  systemRole?: 'admin' | 'member' | 'dpl' | 'viewer';
  accountStatus?: 'pending_invitation' | 'active';
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'Internal Posko' | 'Koordinasi Desa' | 'Supervisi DPL' | 'Evaluasi Mingguan' | 'Musyawarah Warga';
  attendeesCount: number;
  absentMembers?: string[];
  agenda: string[];
  notesSummary: string;
  actionItems: { id: string; text: string; pic: string; completed: boolean }[];
  status: 'upcoming' | 'completed';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  division: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  dueDate: string;
  tags: string[];
  programId?: string;
}

export interface VillageDusun {
  name: string;
  headName: string;
  population: number;
  households: number;
  characteristics: string;
}

export interface VillagePotency {
  sector: 'Pertanian & Perkebunan' | 'Pariwisata Alam' | 'UMKM & Industri Rumahan' | 'Sosial & Budaya';
  title: string;
  description: string;
  opportunity: string;
}

export interface VillagePriorityNeed {
  rank: number;
  title: string;
  description: string;
  targetSector: string;
  addressedByProgram: string;
}

export interface VillageResearchData {
  villageName: string;
  district: string;
  regency: string;
  province: string;
  villageHead: string;
  secretary: string;
  totalPopulation: number;
  totalHouseholds: number;
  totalAreaHectares: number;
  coordinates: string;
  dusunList: VillageDusun[];
  potencies: VillagePotency[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  priorityNeeds: VillagePriorityNeed[];
}

export interface SurveyRecord {
  id: string;
  title: string;
  category: 'Kesehatan & Stunting' | 'Ekonomi & UMKM' | 'Lingkungan & Sampah' | 'Pendidikan & Literasi';
  date: string;
  targetRespondents: number;
  completedRespondents: number;
  location: string;
  pic: string;
  keyFindings: string[];
  status: 'active' | 'completed' | 'draft';
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
  outputs: string[];
  keyMilestones: { title: string; completed: boolean }[];
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
}

export interface DocumentationPhoto {
  id: string;
  title: string;
  category: 'Program Kerja' | 'Sosialisasi' | 'Kegiatan Harian' | 'Kunjungan Tokoh';
  date: string;
  location: string;
  imageUrl: string;
  tags: string[];
  caption: string;
  photographer: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  type: 'Laporan Mingguan' | 'Logbook Harian' | 'Laporan Antara' | 'Draft Akhir LPJ';
  author: string;
  period: string;
  submissionDate: string;
  status: 'draft' | 'submitted' | 'approved_by_dpl' | 'revision_required';
  dplNotes?: string;
  fileSize: string;
}

export interface DecisionLogRecord {
  id: string;
  title: string;
  date: string;
  decisionNumber: string;
  context: string;
  optionsConsidered: string[];
  consensusDecision: string;
  rationale: string;
  consequences: string;
  signedBy: string[];
  status: 'Ratified' | 'Under Review';
}

export interface ArchiveRecord {
  id: string;
  title: string;
  category: 'Legalitas & Izin' | 'Proposal & Kerangka Acuan' | 'Surat Keluar' | 'Template & Kop' | 'Laporan Final';
  fileFormat: 'PDF' | 'DOCX' | 'XLSX' | 'ZIP';
  dateUploaded: string;
  size: string;
  referenceNumber?: string;
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
