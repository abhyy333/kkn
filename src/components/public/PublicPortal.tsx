import React, { useState } from 'react';
import {
  WorkProgram,
  DocumentationPhoto,
  DocumentationAlbum,
  PublicTeamMember,
  UnitConfig,
  PublicArticleRecord,
  VillageResearchData,
} from '../../types';
import { INITIAL_PUBLIC_ROSTER, INITIAL_DOCUMENTATION_ALBUMS } from '../../data/mockData';
import { Transaction, calculateFinanceSummary, formatRupiah } from '../../utils/finance';
import { triggerFileDownload } from '../../utils/storageService';
import {
  LogIn,
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle2,
  Users,
  Compass,
  GraduationCap,
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  FileText,
  ExternalLink,
  Search,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  BookOpen,
  Building2,
  Camera,
} from 'lucide-react';

function getInitials(name: string): string {
  if (!name) return 'KKN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PublicPortalProps {
  config: UnitConfig;
  programs: WorkProgram[];
  documentation: DocumentationPhoto[];
  documentationAlbums?: DocumentationAlbum[];
  villageResearch?: VillageResearchData;
  transactions: Transaction[];
  articles?: PublicArticleRecord[];
  publicRoster?: PublicTeamMember[];
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onOpenAuthModal: () => void;
  onReturnToWorkspace?: () => void;
  isAuthenticated?: boolean;
  userRole?: string;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  config,
  programs,
  documentation,
  documentationAlbums = INITIAL_DOCUMENTATION_ALBUMS,
  villageResearch,
  transactions,
  articles = [],
  publicRoster = INITIAL_PUBLIC_ROSTER,
  currentPath = '/public',
  onNavigate,
  onOpenAuthModal,
  onReturnToWorkspace,
  isAuthenticated = false,
  userRole,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation helper with fallback
  const go = (path: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Team Page filter states
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDivisionFilter, setTeamDivisionFilter] = useState('Semua');

  // Public Gallery filter & lightbox states
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('Semua');
  const [gallerySearch, setGallerySearch] = useState('');
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number | null>(null);

  const financeSummary = calculateFinanceSummary(transactions);
  const publicPrograms = programs.filter((p) => p.isFeaturedInPublic !== false);

  // Only published albums and approved photos are shown publicly
  const publishedAlbums = documentationAlbums
    .filter((a) => a.isPublished)
    .map((album) => ({
      ...album,
      photos: album.photos.filter((p) => p.isApprovedForPublic !== false),
    }))
    .filter((album) => album.photos.length > 0);

  const publishedArticles = articles.filter((a) => a.isPublished);

  const handleWorkspaceAction = () => {
    setMobileMenuOpen(false);
    if (isAuthenticated && onReturnToWorkspace) {
      onReturnToWorkspace();
    } else {
      onOpenAuthModal();
    }
  };

  // Parse current public route
  const cleanPath = currentPath.replace(/\/+$/, '') || '/public';
  const teamMemberMatch = cleanPath.match(/^\/public\/team\/([^/]+)$/);
  const programDetailMatch = cleanPath.match(/^\/public\/programs\/([^/]+)$/);
  const albumDetailMatch = cleanPath.match(/^\/public\/documentation\/([^/]+)$/);
  const articleDetailMatch = cleanPath.match(/^\/public\/articles\/([^/]+)$/);

  const navItems = [
    { label: 'Beranda', path: '/public' },
    { label: 'Tim KKN', path: '/public/team' },
    { label: 'Program Kerja', path: '/public/programs' },
    { label: 'Dokumentasi', path: '/public/documentation' },
    { label: 'Profil Desa', path: '/public/village-profile' },
  ];

  const renderTopHeader = () => (
    <header className="sticky top-0 z-30 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E8E6DF] shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Branding: Logo + Village Name + Location Info (No badge) */}
        <button
          type="button"
          onClick={() => go('/public')}
          className="flex items-center gap-3 text-left group min-w-0 shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-[#4A6B53] text-white flex items-center justify-center font-serif font-semibold text-base shadow-2xs group-hover:bg-[#3B5643] transition-colors shrink-0">
            K
          </div>
          <div className="min-w-0">
            <div className="font-serif font-semibold text-sm sm:text-base text-stone-900 tracking-tight truncate">
              KKN SPACE · Desa Pringgasela Selatan
            </div>
            <div className="text-[11px] text-stone-500 truncate">
              Kec. Pringgasela, Lombok Timur, NTB
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Navigasi Publik"
          className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0"
        >
          {navItems.map((nav) => {
            const isActive =
              nav.path === '/public'
                ? cleanPath === '/public'
                : cleanPath === nav.path || cleanPath.startsWith(`${nav.path}/`);
            return (
              <button
                key={nav.path}
                type="button"
                onClick={() => go(nav.path)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#4A6B53] text-white font-semibold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {nav.label}
              </button>
            );
          })}
        </nav>

        {/* Workspace Action & Mobile Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleWorkspaceAction}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs whitespace-nowrap"
          >
            {isAuthenticated ? (
              <>
                <span>Buka Workspace ({userRole === 'dpl' ? 'DPL' : 'Anggota'})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Workspace</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E8E6DF] bg-white text-stone-700 hover:bg-stone-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clean Responsive Mobile/Tablet Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E8E6DF] bg-[#FAF9F5] px-4 sm:px-6 py-3 space-y-2 shadow-sm">
          <nav className="grid grid-cols-1 gap-1">
            {navItems.map((nav) => {
              const isActive =
                nav.path === '/public'
                  ? cleanPath === '/public'
                  : cleanPath === nav.path || cleanPath.startsWith(`${nav.path}/`);
              return (
                <button
                  key={nav.path}
                  type="button"
                  onClick={() => go(nav.path)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-[#4A6B53] text-white font-semibold'
                      : 'text-stone-700 hover:bg-stone-200/60'
                  }`}
                >
                  <span>{nav.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-75" />
                </button>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-[#E8E6DF] sm:hidden">
            <button
              type="button"
              onClick={handleWorkspaceAction}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold hover:bg-[#3B5643] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>
                {isAuthenticated
                  ? `Buka Workspace (${userRole === 'dpl' ? 'DPL' : 'Anggota'})`
                  : 'Masuk Workspace'}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );

  const renderFooter = () => (
    <footer className="border-t border-[#E8E6DF] bg-white py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-500 space-y-3 mt-16">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-stone-600 pb-1">
        <button type="button" onClick={() => go('/public')} className="hover:underline">
          Beranda Publik
        </button>
        <span>·</span>
        <button type="button" onClick={() => go('/public/team')} className="hover:underline">
          Profil Tim KKN
        </button>
        <span>·</span>
        <button type="button" onClick={() => go('/public/programs')} className="hover:underline">
          Program Kerja
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => go('/public/documentation')}
          className="hover:underline"
        >
          Galeri Dokumentasi
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => go('/public/village-profile')}
          className="hover:underline"
        >
          Profil Desa Pringgasela Selatan
        </button>
      </div>
      <p className="font-medium text-stone-800">
        {config.unitName} · {config.villageName}, {config.district}, {config.regency}
      </p>
      <p className="text-[11px] text-stone-400">
        {config.university} · Dosen Pembimbing Lapangan: {config.dplName}
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={handleWorkspaceAction}
          className="inline-flex items-center gap-1.5 text-xs text-[#4A6B53] font-semibold hover:underline"
        >
          <span>Masuk ke Workspace Pengurus Internal & DPL →</span>
        </button>
      </div>
    </footer>
  );

  // ==========================================================================
  // ROUTE 1: DEDICATED PUBLIC MEMBER DETAIL PAGE (/public/team/:id)
  // ==========================================================================
  if (teamMemberMatch) {
    const memberId = teamMemberMatch[1];
    const member = publicRoster.find((m) => m.id === memberId);

    if (!member) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col overflow-x-hidden">
          {renderTopHeader()}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
            <Users className="w-12 h-12 text-stone-400 mx-auto" />
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Profil Anggota Tidak Ditemukan
            </h1>
            <button
              type="button"
              onClick={() => go('/public/team')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Halaman Tim KKN
            </button>
          </main>
          {renderFooter()}
        </div>
      );
    }

    const memberPrograms = publicPrograms.filter(
      (p) =>
        p.pic.toLowerCase().includes(member.name.toLowerCase()) ||
        p.division.toLowerCase() === member.division.toLowerCase()
    );

    const memberAlbums = publishedAlbums.filter(
      (a) =>
        a.photographer.toLowerCase().includes(member.name.toLowerCase()) ||
        (a.responsibleMembers || []).some((r) =>
          r.toLowerCase().includes(member.name.toLowerCase())
        )
    );

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          {/* Breadcrumb & Back */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <button type="button" onClick={() => go('/public')} className="hover:text-stone-900">
                Portal Publik
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => go('/public/team')}
                className="hover:text-stone-900"
              >
                Tim KKN
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold">{member.name}</span>
            </nav>

            <button
              type="button"
              onClick={() => go('/public/team')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Daftar Tim KKN
            </button>
          </div>

          {/* Redesigned Member Profile Card (No overlapping banner, full photo beside identity) */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] overflow-hidden shadow-2xs">
            {/* Subtle top green accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#283E2F] via-[#4A6B53] to-[#688B72]" />

            {/* Clean Profile Header: Photo beside Name & Position */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-[#F4F7F4]/90 via-white to-[#FAF9F5] border-b border-[#E8E6DF]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 min-w-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white ring-1 ring-[#E8E6DF] shadow-sm bg-[#2D4734] shrink-0 flex items-center justify-center">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <span className="font-serif font-bold text-2xl sm:text-3xl text-white">
                        {getInitials(member.name)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EBF1ED] text-[#284230] text-xs font-bold">
                        {member.role}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                        {member.division}
                      </span>
                    </div>

                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-tight break-words">
                      {member.name}
                    </h1>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {member.major ? `Program Studi ${member.major}` : 'Anggota Tim Pengabdian'}
                      {member.faculty ? ` · ${member.faculty}` : ''}
                    </p>
                  </div>
                </div>

                {/* Unit code visible without dominating the layout */}
                <div className="sm:text-right shrink-0 self-start sm:self-center bg-white/90 px-3.5 py-2 rounded-xl border border-[#E8E6DF]">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Kode Unit KKN
                  </span>
                  <span className="font-mono text-xs font-bold text-[#4A6B53]">
                    {config.unitCode || 'KKN-PRG-SEL-2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Body Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* 3 Consistent Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                <div className="h-full p-4 sm:p-5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex flex-col justify-between">
                  <div className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#4A6B53] shrink-0" />
                    <span>Jabatan & Divisi</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-stone-900 leading-snug">
                      {member.role}
                    </div>
                    <div className="text-xs text-stone-600 mt-0.5">{member.division}</div>
                  </div>
                </div>

                <div className="h-full p-4 sm:p-5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex flex-col justify-between">
                  <div className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#4A6B53] shrink-0" />
                    <span>Bidang Keilmuan</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-stone-900 leading-snug">
                      {member.major || 'Disiplin Ilmu Terapan'}
                    </div>
                    <div className="text-xs text-stone-600 mt-0.5">
                      {member.faculty || config.faculty}
                    </div>
                  </div>
                </div>

                <div className="h-full p-4 sm:p-5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex flex-col justify-between">
                  <div className="text-[11px] text-stone-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#4A6B53] shrink-0" />
                    <span>Lokasi Pengabdian</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-stone-900 leading-snug">
                      Desa Pringgasela Selatan
                    </div>
                    <div className="text-xs text-stone-600 mt-0.5">
                      Kec. Pringgasela, Lombok Timur
                    </div>
                  </div>
                </div>
              </div>

              {/* Visually Separated Profile Description */}
              {member.bio && (
                <div className="p-5 sm:p-6 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Profil & Fokus Pengabdian Masyarakat
                  </h2>
                  <p className="text-sm text-stone-700 leading-relaxed break-words">
                    {member.bio}
                  </p>
                </div>
              )}

              {/* Visually Separated Contribution & Responsibilities Section */}
              {member.responsibilities && member.responsibilities.length > 0 && (
                <div className="pt-2 border-t border-[#E8E6DF] space-y-3.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Lingkup Tugas & Kontribusi Lapangan
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                    {member.responsibilities.map((resp, idx) => (
                      <div
                        key={idx}
                        className="h-full p-4 rounded-xl bg-white border border-[#E8E6DF] text-xs text-stone-700 leading-relaxed flex items-start gap-3"
                      >
                        <span className="w-6 h-6 rounded-full bg-[#EBF1ED] text-[#284230] font-bold flex items-center justify-center shrink-0 text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="break-words">{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Work Programs */}
          {memberPrograms.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                Program Kerja Terkait ({memberPrograms.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {memberPrograms.map((prog) => (
                  <div
                    key={prog.id}
                    onClick={() => go(`/public/programs/${prog.id}`)}
                    className="group h-full p-5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#4A6B53] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-mono font-bold">
                          {prog.code}
                        </span>
                        <span className="font-semibold text-[#4A6B53]">{prog.division}</span>
                      </div>
                      <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors leading-snug">
                        {prog.title}
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                        {prog.objective}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">
                        {prog.progressPercent}% Terlaksana
                      </span>
                      <span className="font-semibold text-[#4A6B53] inline-flex items-center gap-1">
                        <span>Detail Program</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Documentation Albums */}
          {memberAlbums.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                Dokumentasi Kegiatan Terkait ({memberAlbums.length} Album)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {memberAlbums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => go(`/public/documentation/${alb.id}`)}
                    className="h-full rounded-2xl bg-white border border-[#E8E6DF] overflow-hidden hover:border-[#4A6B53] hover:shadow-md cursor-pointer transition-all flex items-center gap-4 p-4"
                  >
                    <img
                      src={alb.coverImageUrl || alb.photos[0]?.imageUrl}
                      alt={alb.title}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 bg-stone-100"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-bold text-[#4A6B53] uppercase block">
                        {alb.dusun} · {alb.photos.length} Foto
                      </span>
                      <h3 className="font-serif text-sm font-bold text-stone-900 line-clamp-1">
                        {alb.title}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {alb.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 2: DEDICATED KKN TEAM DIRECTORY PAGE (/public/team)
  // ==========================================================================
  if (cleanPath === '/public/team') {
    const divisions = [
      'Semua',
      ...Array.from(new Set(publicRoster.map((m) => m.division))),
    ];

    const filteredMembers = publicRoster.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
        m.role.toLowerCase().includes(teamSearch.toLowerCase()) ||
        m.division.toLowerCase().includes(teamSearch.toLowerCase()) ||
        (m.major || '').toLowerCase().includes(teamSearch.toLowerCase());
      const matchesDivision =
        teamDivisionFilter === 'Semua' || m.division === teamDivisionFilter;
      return matchesSearch && matchesDivision;
    });

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-5">
            <div>
              <nav className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                <button
                  type="button"
                  onClick={() => go('/public')}
                  className="hover:text-stone-900"
                >
                  Portal Publik
                </button>
                <span>/</span>
                <span className="text-stone-900 font-semibold">Tim KKN</span>
              </nav>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Profil Resmi Tim KKN Desa Pringgasela Selatan ({publicRoster.length} Anggota)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Susunan pengurus harian dan koordinator divisi berdasarkan data keanggotaan resmi unit KKN-PRG-SEL-2026.
              </p>
            </div>

            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Beranda Publik
            </button>
          </div>

          {/* Search & Division Filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E6DF]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Cari nama anggota, jabatan, divisi, atau program studi..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {divisions.map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setTeamDivisionFilter(div)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    teamDivisionFilter === div
                      ? 'bg-[#4A6B53] text-white font-semibold'
                      : 'bg-[#FAF9F5] text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* 10 Authoritative Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => go(`/public/team/${member.id}`)}
                className="group h-full bg-white rounded-2xl border border-[#E8E6DF] p-5 shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-4">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white ring-1 ring-stone-200 shadow-xs shrink-0 bg-stone-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-[#2D4734] text-white flex items-center justify-center font-serif font-bold text-base border-2 border-white ring-1 ring-stone-200 shadow-xs shrink-0">
                        {getInitials(member.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230] text-[11px] font-bold mb-1">
                        {member.role}
                      </span>
                      <h2 className="font-serif text-base font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors truncate">
                        {member.name}
                      </h2>
                      <p className="text-xs text-stone-500 truncate">{member.division}</p>
                    </div>
                  </div>

                  {member.major && (
                    <div className="text-xs text-stone-600 bg-[#FAF9F5] px-3 py-2 rounded-lg border border-stone-200/70">
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                        Program Studi
                      </span>
                      <span className="font-medium text-stone-800">{member.major}</span>
                    </div>
                  )}

                  {member.bio && (
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {member.bio}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4A6B53]">
                  <span>Lihat Halaman Profil Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* DPL & Pemerintah Desa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-stretch">
            <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4A6B53] text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Dosen Pembimbing Lapangan (DPL)
                </span>
                <span className="font-serif font-bold text-sm text-stone-900 block">
                  {config.dplName}
                </span>
                <span className="text-xs text-stone-500 block">{config.faculty}</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#E8E6DF] flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Mitra Pemerintahan Desa
                </span>
                <span className="font-serif font-bold text-sm text-stone-900 block">
                  Pemerintah {config.villageName}
                </span>
                <span className="text-xs text-stone-500 block">
                  {config.district}, {config.regency}
                </span>
              </div>
            </div>
          </div>
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 3: DEDICATED PUBLIC PROGRAM DETAIL PAGE (/public/programs/:id)
  // ==========================================================================
  if (programDetailMatch) {
    const programId = programDetailMatch[1];
    const program = publicPrograms.find((p) => p.id === programId);

    if (!program) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col overflow-x-hidden">
          {renderTopHeader()}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Program Kerja Tidak Ditemukan
            </h1>
            <button
              type="button"
              onClick={() => go('/public/programs')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Daftar Program Kerja
            </button>
          </main>
          {renderFooter()}
        </div>
      );
    }

    const linkedAlbums = publishedAlbums.filter((a) => a.programId === program.id);

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E6DF] pb-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <button type="button" onClick={() => go('/public')} className="hover:text-stone-900">
                Portal Publik
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => go('/public/programs')}
                className="hover:text-stone-900"
              >
                Program Kerja
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold">{program.code}</span>
            </nav>

            <button
              type="button"
              onClick={() => go('/public/programs')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Semua Program Kerja
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-[#EBF1ED] text-[#284230] font-mono font-bold">
                  {program.code}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 font-semibold">
                  {program.division}
                </span>
                <span className="text-stone-500">
                  Penanggung Jawab: <strong className="text-stone-800">{program.pic}</strong>
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
                {program.title}
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs items-stretch">
              <div className="flex flex-col justify-between">
                <span className="text-stone-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Lokasi Pelaksanaan
                </span>
                <span className="font-semibold text-stone-900 text-sm">{program.location}</span>
              </div>
              <div className="flex flex-col justify-between">
                <span className="text-stone-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Periode Waktu
                </span>
                <span className="font-semibold text-stone-900 text-sm">
                  {program.startDate} s/d {program.endDate}
                </span>
              </div>
              <div className="flex flex-col justify-between">
                <span className="text-stone-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Capaian Realisasi
                </span>
                <span className="font-bold text-[#4A6B53] text-sm">
                  {program.progressPercent}% Terlaksana
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Tujuan & Latar Belakang Program
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed">{program.objective}</p>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Sasaran Penerima Manfaat Masyarakat
              </h2>
              <p className="text-sm font-medium text-stone-800">{program.targetAudience}</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Luaran & Hasil Nyata (Outputs)
              </h2>
              <ul className="space-y-2.5">
                {program.outputs.map((out, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#FAF9F5] border border-stone-200/80 text-xs sm:text-sm text-stone-800 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#4A6B53] shrink-0 mt-0.5" />
                    <span>{out}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-stone-400 block mb-1">Pagu Anggaran Direncanakan</span>
                <span className="text-base font-bold text-stone-800">
                  {formatRupiah(program.budgetPlanned)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-stone-400 block mb-1">Realisasi Dana Terpakai</span>
                <span className="text-base font-bold text-[#4A6B53]">
                  {formatRupiah(program.budgetUsed)}
                </span>
              </div>
            </div>
          </div>

          {linkedAlbums.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                Album Dokumentasi Program Ini ({linkedAlbums.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
                {linkedAlbums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => go(`/public/documentation/${alb.id}`)}
                    className="rounded-2xl bg-white border border-[#E8E6DF] overflow-hidden hover:border-[#4A6B53] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-16/9 bg-stone-100">
                      <img
                        src={alb.coverImageUrl || alb.photos[0]?.imageUrl}
                        alt={alb.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 space-y-1">
                      <span className="text-[10px] font-bold text-[#4A6B53] uppercase block">
                        {alb.dusun} · {alb.photos.length} Foto Dokumentasi
                      </span>
                      <h3 className="font-serif text-sm font-bold text-stone-900">{alb.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 4: DEDICATED PUBLIC PROGRAMS LIST PAGE (/public/programs)
  // ==========================================================================
  if (cleanPath === '/public/programs') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-5">
            <div>
              <nav className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                <button
                  type="button"
                  onClick={() => go('/public')}
                  className="hover:text-stone-900"
                >
                  Portal Publik
                </button>
                <span>/</span>
                <span className="text-stone-900 font-semibold">Program Kerja</span>
              </nav>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Daftar Program Kerja Pengabdian ({publicPrograms.length} Program)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Klik pada salah satu kartu program kerja untuk membuka halaman detail capaian, anggaran, dan dokumentasi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Beranda Publik
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {publicPrograms.map((prog) => (
              <article
                key={prog.id}
                onClick={() => go(`/public/programs/${prog.id}`)}
                className="group h-full p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-[#EBF1ED] text-[#284230] font-mono font-bold shrink-0">
                      {prog.code}
                    </span>
                    <span className="text-[#4A6B53] font-semibold text-right truncate">
                      {prog.division}
                    </span>
                  </div>

                  <h2 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors leading-snug">
                    {prog.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3 min-h-[3.75rem]">
                    {prog.objective}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-stone-100 space-y-3">
                  <div className="text-xs text-stone-500 flex items-center justify-between gap-2">
                    <span className="truncate">
                      PJ: <strong className="font-semibold text-stone-700">{prog.pic}</strong>
                    </span>
                    <span className="font-bold text-stone-900 shrink-0 tabular-nums">
                      {prog.progressPercent}% Selesai
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#EDEAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full transition-all duration-300"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4A6B53]">
                    <span>Buka Halaman Detail Program</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 5: DEDICATED PUBLIC ALBUM DETAIL PAGE (/public/documentation/:id)
  // ==========================================================================
  if (albumDetailMatch) {
    const albumId = albumDetailMatch[1];
    const album = publishedAlbums.find((a) => a.id === albumId);

    if (!album) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col overflow-x-hidden">
          {renderTopHeader()}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
            <Camera className="w-12 h-12 text-stone-400 mx-auto" />
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Album Dokumentasi Tidak Ditemukan atau Belum Dipublikasikan
            </h1>
            <button
              type="button"
              onClick={() => go('/public/documentation')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Galeri Dokumentasi
            </button>
          </main>
          {renderFooter()}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          {/* Breadcrumbs & Back to Gallery */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-4">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <button type="button" onClick={() => go('/public')} className="hover:text-stone-900">
                Portal Publik
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => go('/public/documentation')}
                className="hover:text-stone-900"
              >
                Galeri Dokumentasi
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold line-clamp-1">{album.title}</span>
            </nav>

            <button
              type="button"
              onClick={() => go('/public/documentation')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Galeri Album
            </button>
          </div>

          {/* Editorial Album Header */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-8 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
              <span className="px-2.5 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-bold">
                {album.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#4A6B53]" />
                {album.date}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#4A6B53]" />
                {album.location} ({album.dusun})
              </span>
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-[#4A6B53]" />
                {album.photos.length} Foto Terverifikasi
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
              {album.title}
            </h1>

            <p className="text-sm text-stone-700 leading-relaxed max-w-4xl">
              {album.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 border-t border-stone-100">
              <span>Dokumentasi oleh: {album.photographer}</span>
              <div className="flex flex-wrap gap-1.5">
                {album.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-stone-200 text-[11px] text-stone-600"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Editorial Photo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {album.photos.map((photo, idx) => (
              <figure
                key={photo.id}
                onClick={() => setLightboxPhotoIndex(idx)}
                className="group h-full bg-white rounded-2xl border border-[#E8E6DF] overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-stone-900/75 text-white text-[11px] font-mono">
                    {idx + 1} / {album.photos.length}
                  </div>
                </div>
                <figcaption className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-stone-800 leading-relaxed">{photo.caption}</p>
                  <div className="text-[11px] text-stone-400 flex items-center justify-between pt-2 border-t border-stone-100">
                    <span>Foto: {photo.photographer}</span>
                    <span className="text-[#4A6B53] font-semibold">Perbesar Foto →</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Full-Size Image Lightbox with Photo-to-Photo Navigation */}
          {lightboxPhotoIndex !== null && album.photos[lightboxPhotoIndex] && (
            <div className="fixed inset-0 z-50 bg-stone-950/95 flex flex-col justify-between p-4 sm:p-6">
              <div className="flex items-center justify-between text-white">
                <div className="text-xs font-mono text-stone-300">
                  Foto {lightboxPhotoIndex + 1} dari {album.photos.length} · {album.title}
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxPhotoIndex(null)}
                  className="p-2 rounded-lg bg-stone-800/80 text-stone-200 hover:bg-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative flex-1 flex items-center justify-center my-4">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhotoIndex(
                      (lightboxPhotoIndex - 1 + album.photos.length) % album.photos.length
                    )
                  }
                  className="absolute left-2 sm:left-6 p-3 rounded-full bg-stone-900/80 text-white hover:bg-stone-800"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <img
                  src={album.photos[lightboxPhotoIndex].imageUrl}
                  alt={album.photos[lightboxPhotoIndex].caption}
                  className="max-h-[75vh] max-w-[88vw] object-contain rounded-lg shadow-2xl"
                />

                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhotoIndex((lightboxPhotoIndex + 1) % album.photos.length)
                  }
                  className="absolute right-2 sm:right-6 p-3 rounded-full bg-stone-900/80 text-white hover:bg-stone-800"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="max-w-3xl mx-auto text-center space-y-1 pb-2">
                <p className="text-sm text-stone-100 font-medium">
                  {album.photos[lightboxPhotoIndex].caption}
                </p>
                <p className="text-xs text-stone-400">
                  Fotografer: {album.photos[lightboxPhotoIndex].photographer} · {album.location}
                </p>
              </div>
            </div>
          )}
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 6: PROFESSIONAL PUBLIC GALLERY PAGE (/public/documentation)
  // ==========================================================================
  if (cleanPath === '/public/documentation') {
    const categories = [
      'Semua',
      ...Array.from(new Set(publishedAlbums.map((a) => a.category))),
    ];

    const filteredAlbums = publishedAlbums.filter((a) => {
      const matchesCat =
        galleryCategoryFilter === 'Semua' || a.category === galleryCategoryFilter;
      const matchesSearch =
        a.title.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        a.description.toLowerCase().includes(gallerySearch.toLowerCase()) ||
        a.dusun.toLowerCase().includes(gallerySearch.toLowerCase());
      return matchesCat && matchesSearch;
    });

    const totalPublicPhotos = publishedAlbums.reduce((acc, a) => acc + a.photos.length, 0);

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-5">
            <div>
              <nav className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                <button
                  type="button"
                  onClick={() => go('/public')}
                  className="hover:text-stone-900"
                >
                  Portal Publik
                </button>
                <span>/</span>
                <span className="text-stone-900 font-semibold">Galeri Dokumentasi</span>
              </nav>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Galeri Album Dokumentasi Pengabdian ({publishedAlbums.length} Album ·{' '}
                {totalPublicPhotos} Foto)
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Arsip visual kegiatan mahasiswa KKN bersama warga di 7 dusun Desa Pringgasela Selatan. Klik album untuk melihat seluruh foto kegiatan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Beranda Publik
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E6DF]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder="Cari album kegiatan, dusun, atau topik dokumentasi..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGalleryCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    galleryCategoryFilter === cat
                      ? 'bg-[#4A6B53] text-white font-semibold'
                      : 'bg-[#FAF9F5] text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Album Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {filteredAlbums.map((album) => {
              const cover =
                album.coverImageUrl ||
                album.photos.find((p) => p.isCover)?.imageUrl ||
                album.photos[0]?.imageUrl;

              return (
                <article
                  key={album.id}
                  onClick={() => go(`/public/documentation/${album.id}`)}
                  className="group h-full bg-white rounded-2xl border border-[#E8E6DF] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-16/10 bg-stone-100 overflow-hidden">
                      <img
                        src={cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-md bg-stone-900/80 text-white text-[11px] font-semibold">
                          {album.category}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-100">
                          <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                          {album.dusun}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-950/80 text-white text-xs font-bold">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-300" />
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
                        <span>Fotografer: {album.photographer}</span>
                      </div>

                      <h2 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors leading-snug">
                        {album.title}
                      </h2>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {album.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-[#FAF9F5] border-t border-[#E8E6DF] flex items-center justify-between">
                    <div className="flex items-center -space-x-2">
                      {album.photos.slice(0, 4).map((p) => (
                        <img
                          key={p.id}
                          src={p.imageUrl}
                          alt={p.caption}
                          className="w-8 h-8 rounded-lg object-cover border-2 border-white shadow-2xs"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#4A6B53] group-hover:translate-x-0.5 transition-transform">
                      Buka Album ({album.photos.length} Foto) →
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 7: DEDICATED PUBLIC ARTICLE DETAIL PAGE (/public/articles/:slug)
  // ==========================================================================
  if (articleDetailMatch) {
    const slugOrId = decodeURIComponent(articleDetailMatch[1]);
    const article = publishedArticles.find(
      (a) =>
        a.id === slugOrId ||
        a.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') === slugOrId
    );

    if (!article) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex flex-col overflow-x-hidden">
          {renderTopHeader()}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
            <FileText className="w-12 h-12 text-stone-400 mx-auto" />
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Artikel Publikasi Tidak Ditemukan
            </h1>
            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6B53] text-white text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda Publik
            </button>
          </main>
          {renderFooter()}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E6DF] pb-4">
            <nav className="flex items-center gap-2 text-xs text-stone-500">
              <button type="button" onClick={() => go('/public')} className="hover:text-stone-900">
                Portal Publik
              </button>
              <span>/</span>
              <span className="text-stone-900 font-semibold line-clamp-1">{article.title}</span>
            </nav>

            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          </div>

          <article className="bg-white rounded-2xl border border-[#E8E6DF] overflow-hidden shadow-xs">
            {article.coverImageUrl && (
              <div className="aspect-16/9 w-full bg-stone-100 overflow-hidden">
                <img
                  src={article.coverImageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 sm:p-10 space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span className="px-2.5 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-semibold">
                  {article.category}
                </span>
                <span>{article.date}</span>
                <span>·</span>
                <span>Penulis: {article.author}</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                {article.title}
              </h1>

              <p className="text-sm font-medium text-stone-600 bg-[#FAF9F5] p-4 rounded-xl border border-stone-200/80 leading-relaxed">
                {article.summary}
              </p>

              <div className="prose prose-stone max-w-none text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                {article.content || article.summary}
              </div>

              {(article.attachments || []).length > 0 && (
                <div className="pt-5 border-t border-stone-200 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Dokumen Lampiran Terkait
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(article.attachments || []).map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => triggerFileDownload(att.url, att.name)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FAF9F5] border border-stone-200 text-xs font-semibold text-[#4A6B53] hover:bg-stone-100"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{att.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // ROUTE 8: DEDICATED VILLAGE PROFILE PAGE (/public/village-profile)
  // ==========================================================================
  if (cleanPath === '/public/village-profile') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col overflow-x-hidden">
        {renderTopHeader()}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E6DF] pb-5">
            <div>
              <nav className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                <button
                  type="button"
                  onClick={() => go('/public')}
                  className="hover:text-stone-900"
                >
                  Portal Publik
                </button>
                <span>/</span>
                <span className="text-stone-900 font-semibold">Profil Desa Pringgasela Selatan</span>
              </nav>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Monografi & Profil Desa Pringgasela Selatan
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Kecamatan Pringgasela, Kabupaten Lombok Timur, Provinsi Nusa Tenggara Barat.
              </p>
            </div>

            <button
              type="button"
              onClick={() => go('/public')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E8E6DF] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Beranda Publik
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E6DF] p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="space-y-2">
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Gambaran Geografis & Demografis
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed">
                {villageResearch?.geography ||
                  'Desa Pringgasela Selatan merupakan salah satu desa penyangga budaya dan agraris di Kecamatan Pringgasela, Kabupaten Lombok Timur, yang terletak di bentang kaki selatan Gunung Rinjani. Masyarakatnya hidup berdampingan dengan tradisi menenun kain gedogan berpewarna alami serta pertanian padi dan hortikultura.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-[11px] text-stone-400 block">Wilayah Administratif</span>
                <span className="font-serif text-xl font-bold text-stone-900">7 Dusun</span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-[11px] text-stone-400 block">Kecamatan</span>
                <span className="font-serif text-xl font-bold text-stone-900">Pringgasela</span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-[11px] text-stone-400 block">Kabupaten</span>
                <span className="font-serif text-xl font-bold text-stone-900">Lombok Timur</span>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <span className="text-[11px] text-stone-400 block">Warisan Unggulan</span>
                <span className="font-serif text-xl font-bold text-[#4A6B53]">Tenun Gedogan</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Pemetaan 7 Wilayah Dusun Binaan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {(
                  villageResearch?.dusuns || [
                    {
                      id: 'd-1',
                      name: 'Dusun Gubuk Lauk',
                      headOfDusun: 'Kawil Gubuk Lauk',
                      rtCount: 4,
                      populationNote: 'Lokasi Posko Utama KKN & Sentra Tenun Nina Penenun',
                      keyCharacteristics: 'Sentra pengrajin tenun gedogan tradisional dengan pewarna alami.',
                      mainNeeds: ['Katalog digital tenun', 'Papan penunjuk arah wisata budaya'],
                    },
                    {
                      id: 'd-2',
                      name: 'Dusun Sinar Sari',
                      headOfDusun: 'Kawil Sinar Sari',
                      rtCount: 3,
                      populationNote: 'Pusat Posyandu Aktif & Edukasi Gizi Keluarga',
                      keyCharacteristics: 'Permukiman warga yang aktif dalam program kesehatan ibu dan anak.',
                      mainNeeds: ['Edukasi variasi MPASI pangan lokal'],
                    },
                  ]
                ).map((d) => (
                  <div
                    key={d.id || d.name}
                    className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-sm text-stone-900">{d.name}</h4>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                        {d.rtCount ?? 4} RT
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {d.keyCharacteristics || ('keyFocus' in d ? d.keyFocus : '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        {renderFooter()}
      </div>
    );
  }

  // ==========================================================================
  // DEFAULT ROUTE: MAIN PUBLIC PORTAL LANDING PAGE (/public)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col font-sans overflow-x-hidden">
      {renderTopHeader()}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-14">
        {/* Editorial Hero Banner */}
        <section className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-r from-[#283E2F] via-[#3E5C46] to-[#55785E] relative overflow-hidden shadow-xs p-6 sm:p-10 text-white flex flex-col justify-between min-h-[210px]">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="relative z-10 space-y-2">
              <span className="text-[11px] uppercase tracking-widest text-[#CCDCD0] font-mono font-medium">
                PENGABDIAN MASYARAKAT DESA PRINGGASELA SELATAN 2026
              </span>
              <h1 className="font-serif text-2xl sm:text-4xl font-normal tracking-tight text-white leading-tight">
                Sinergi Membangun Kemandirian {config.villageName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-200 max-w-2xl font-light leading-relaxed">
                Transparansi program kerja mahasiswa pengabdian, publikasi inovasi sentra tenun Sasak, gotong royong pencegahan stunting, dan dokumentasi pemberdayaan masyarakat di 7 dusun.
              </p>
            </div>

            <div className="relative z-10 pt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleWorkspaceAction}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#284230] text-xs font-semibold hover:bg-stone-100 transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-[#4A6B53]" />
                <span>Masuk Workspace Pengurus</span>
              </button>
              <button
                type="button"
                onClick={() => go('/public/team')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#283E2F]/60 border border-white/20 text-white text-xs font-medium hover:bg-[#283E2F]/80 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Profil Lengkap Tim KKN (10 Anggota)</span>
              </button>
              <button
                type="button"
                onClick={() => go('/public/documentation')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#283E2F]/60 border border-white/20 text-white text-xs font-medium hover:bg-[#283E2F]/80 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Galeri Album Kegiatan</span>
              </button>
            </div>
          </div>

          {/* Clean Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-[11px] text-stone-400 block mb-0.5 font-medium">
                Masa Pengabdian
              </span>
              <div className="font-serif text-2xl font-semibold text-stone-900">45 Hari</div>
              <span className="text-[11px] text-stone-500">Juli – Agustus 2026</span>
            </div>

            <div
              onClick={() => go('/public/programs')}
              className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs cursor-pointer hover:border-[#4A6B53] transition-colors"
            >
              <span className="text-[11px] text-stone-400 block mb-0.5 font-medium">
                Program Terpublikasi
              </span>
              <div className="font-serif text-2xl font-semibold text-[#4A6B53]">
                {publicPrograms.length} Program
              </div>
              <span className="text-[11px] text-stone-500">Lihat Detail Program →</span>
            </div>

            <div
              onClick={() => go('/public/documentation')}
              className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs cursor-pointer hover:border-[#4A6B53] transition-colors"
            >
              <span className="text-[11px] text-stone-400 block mb-0.5 font-medium">
                Album Dokumentasi
              </span>
              <div className="font-serif text-2xl font-semibold text-stone-900">
                {publishedAlbums.length} Album
              </div>
              <span className="text-[11px] text-stone-500">Buka Galeri Foto →</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-[11px] text-stone-400 block mb-0.5 font-medium">
                Akuntabilitas Anggaran
              </span>
              <div className="font-serif text-2xl font-semibold text-stone-900">
                {formatRupiah(financeSummary.totalIncome)}
              </div>
              <span className="text-[11px] text-stone-500">Transparansi Dana Terbuka</span>
            </div>
          </div>
        </section>

        {/* OFFICIAL KKN TEAM ROSTER SECTION (Links to Dedicated /public/team & /public/team/:id) */}
        <section id="tim-kkn" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2 border-b border-[#E8E6DF]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 tracking-tight">
                  Tim Mahasiswa KKN Desa Pringgasela Selatan
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Daftar resmi 10 mahasiswa tim pengabdian masyarakat. Klik kartu anggota untuk membuka halaman profil lengkap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => go('/public/team')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6B53] hover:underline"
            >
              <span>Buka Direktori Tim KKN Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {publicRoster.map((member) => (
              <div
                key={member.id}
                onClick={() => go(`/public/team/${member.id}`)}
                className="group p-4 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex items-center gap-3.5"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-13 h-13 rounded-full object-cover border-2 border-white ring-1 ring-stone-200 shadow-2xs shrink-0 bg-stone-100"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-[#2D4734] text-white flex items-center justify-center font-serif font-bold text-sm border-2 border-white ring-1 ring-stone-200 shadow-2xs shrink-0">
                    {getInitials(member.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm text-stone-900 group-hover:text-[#4A6B53] transition-colors truncate">
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#4A6B53] truncate">{member.role}</p>
                  <p className="text-[11px] text-stone-400 truncate">
                    {member.division}
                    {member.major ? ` · ${member.major}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#4A6B53] shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Program Unggulan Showcase (Links to /public/programs/:id) */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2 border-b border-[#E8E6DF]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 tracking-tight">
                  Capaian Program Kerja Bersama Warga
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Klik pada program kerja untuk melihat rincian capaian, sasaran masyarakat, dan dokumentasi kegiatan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => go('/public/programs')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6B53] hover:underline"
            >
              <span>Lihat Semua Program Kerja</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {publicPrograms.map((prog) => (
              <article
                key={prog.id}
                onClick={() => go(`/public/programs/${prog.id}`)}
                className="group h-full p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-[#EBF1ED] text-[#284230] font-mono font-bold shrink-0">
                      {prog.code}
                    </span>
                    <span className="text-[#4A6B53] font-semibold text-right truncate">
                      {prog.division}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors leading-snug">
                    {prog.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3 min-h-[3.75rem]">
                    {prog.objective}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-stone-100 space-y-3">
                  <div className="text-xs text-stone-500 flex items-center justify-between gap-2">
                    <span className="truncate">Sasaran: {prog.targetAudience}</span>
                    <span className="font-bold text-stone-900 shrink-0 tabular-nums">
                      {prog.progressPercent}% Selesai
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#EDEAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full transition-all duration-300"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4A6B53]">
                    <span>Baca Rincian Program Kerja</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Multi-Photo Activity Albums Showcase (Links to /public/documentation & /public/documentation/:id) */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2 border-b border-[#E8E6DF]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 tracking-tight">
                  Galeri Album Dokumentasi Kegiatan
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Koleksi dokumentasi multi-foto setiap kegiatan pengabdian di 7 dusun Desa Pringgasela Selatan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => go('/public/documentation')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6B53] hover:underline"
            >
              <span>Buka Galeri Dokumentasi Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {publishedAlbums.slice(0, 4).map((album) => {
              const cover =
                album.coverImageUrl ||
                album.photos.find((p) => p.isCover)?.imageUrl ||
                album.photos[0]?.imageUrl;
              return (
                <div
                  key={album.id}
                  onClick={() => go(`/public/documentation/${album.id}`)}
                  className="group rounded-xl bg-white border border-[#E8E6DF] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#4A6B53] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-16/10 bg-stone-100 overflow-hidden">
                      <img
                        src={cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                        <span className="font-medium">{album.dusun}</span>
                        <span className="px-2 py-0.5 rounded bg-stone-900/80 font-bold">
                          {album.photos.length} Foto
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>{album.category}</span>
                        <span>{album.date}</span>
                      </div>
                      <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-[#4A6B53] transition-colors line-clamp-1">
                        {album.title}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {album.description}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-[#FAF9F5] border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4A6B53]">
                    <span>Lihat Semua Foto Kegiatan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Profil & Potensi Desa Pringgasela Selatan */}
        <section className="p-6 rounded-2xl bg-white border border-[#E8E6DF] shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
                  Mengenal Desa Pringgasela Selatan & 7 Dusun Binaan
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Gambaran umum wilayah pengabdian mahasiswa di lereng selatan Gunung Rinjani yang kaya tradisi tenun dan pertanian.
              </p>
            </div>
            <button
              type="button"
              onClick={() => go('/public/village-profile')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6B53] hover:underline"
            >
              <span>Buka Halaman Profil Desa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="font-semibold text-stone-900 block mb-1">Tenun Gedogan Sasak</span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Warisan budaya tenun tangan tradisional dengan pewarna alami di Sentra Tenun Dusun Gubuk Lauk.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="font-semibold text-stone-900 block mb-1">Pertanian Subur</span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Hamparan sawah padi, sayuran hortikultura, dan perkebunan dengan sistem irigasi pegunungan.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="font-semibold text-stone-900 block mb-1">
                Pariwisata Alam & Budaya
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Pesona lanskap perbukitan asri, udara segar lereng Rinjani, dan keramahan masyarakat suku Sasak.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="font-semibold text-stone-900 block mb-1">7 Wilayah Dusun</span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Gubuk Lauk, Gubuk Daya, Sinar Sari, Kedondong, Timba Gerah, Pancor Kopong, dan Aik Dewa.
              </p>
            </div>
          </div>
        </section>

        {/* Artikel & Publikasi Kegiatan Desa */}
        {publishedArticles.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4A6B53]" />
                <h2 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
                  Artikel & Berita Kegiatan Desa Pringgasela Selatan
                </h2>
              </div>
              <p className="text-xs text-stone-500">
                Publikasi resmi kegiatan mahasiswa KKN, edukasi masyarakat, dan pengembangan potensi lokal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => go(`/public/articles/${art.id}`)}
                  className="group rounded-xl bg-white border border-[#E8E6DF] overflow-hidden shadow-2xs hover:shadow-md hover:border-[#4A6B53] cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-16/9 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={art.coverImageUrl}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span className="px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-medium">
                          {art.category}
                        </span>
                        <span>
                          {art.date} · Oleh {art.author}
                        </span>
                      </div>
                      <h3 className="font-serif text-base font-semibold text-stone-900 group-hover:text-[#4A6B53]">
                        {art.title}
                      </h3>
                      <p className="text-stone-600 leading-relaxed line-clamp-2">{art.summary}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-[#FAF9F5] border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4A6B53]">
                    <span>Baca Artikel Selengkapnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {renderFooter()}
    </div>
  );
};
