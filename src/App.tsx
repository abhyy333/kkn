import React, { useState, useEffect } from 'react';
import { WorkspaceModuleId, ViewMode, UnitConfig } from './types';
import {
  INITIAL_UNIT_CONFIG,
  INITIAL_MEMBERS,
  INITIAL_PROGRAMS,
  INITIAL_TASKS,
  INITIAL_MEETINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_VILLAGE_RESEARCH,
  INITIAL_SURVEYS,
  INITIAL_INVENTORY,
  INITIAL_DOCUMENTATION,
  INITIAL_REPORTS,
  INITIAL_DECISION_LOG,
  INITIAL_ARCHIVE,
  INITIAL_STAKEHOLDERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DOCUMENTATION_ALBUMS,
} from './data/mockData';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { FirstLoginPasswordView } from './components/auth/FirstLoginPasswordView';
import { InvitationManagerModal } from './components/admin/InvitationManagerModal';

import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

import { OverviewView } from './components/workspace/OverviewView';
import { MeetingsView } from './components/workspace/MeetingsView';
import { TasksView } from './components/workspace/TasksView';
import { MembersView } from './components/workspace/MembersView';
import { PersonalProfilePage } from './components/workspace/PersonalProfilePage';
import { VillageResearchView } from './components/workspace/VillageResearchView';
import { SurveysView } from './components/workspace/SurveysView';
import { WorkProgramsView } from './components/workspace/WorkProgramsView';
import { FinanceView } from './components/workspace/FinanceView';
import { InventoryView } from './components/workspace/InventoryView';
import { DocumentationAlbumsView } from './components/workspace/DocumentationAlbumsView';
import { ReportsView } from './components/workspace/ReportsView';
import { DecisionLogView } from './components/workspace/DecisionLogView';
import { ArchiveView } from './components/workspace/ArchiveView';
import { SettingsView } from './components/workspace/SettingsView';
import { PublicPortal } from './components/public/PublicPortal';
import { DplWorkspaceView } from './components/dpl/DplWorkspaceView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { supabase, isSupabaseConfigured, isFabricatedLegacyRecord } from './lib/supabase';
import {
  Member,
  ReportRecord,
  WorkProgram,
  MeetingItem,
  TaskItem,
  DecisionLogRecord,
  VillageResearchData,
  SurveyRecord,
  DocumentationPhoto,
  DocumentationAlbum,
  PublicTeamMember,
  InventoryRecord,
  ArchiveRecord,
  PublicArticleRecord,
  TransactionRecord,
  StakeholderRecord,
  AnnouncementRecord,
} from './types';

const INITIAL_PUBLIC_ARTICLES: PublicArticleRecord[] = [
  {
    id: 'art-1',
    title: 'Transformasi Katalog Digital Tenun Gedogan Sasak di Dusun Gubuk Lauk',
    category: 'Berita Kegiatan',
    summary:
      'Tim KKN 104 mendampingi 45 penenun tradisional Pringgasela Selatan mendokumentasikan motif tenun ikat pewarna alami ke dalam katalog digital dwibahasa.',
    content:
      'Melalui program kerja unggulan KKN-PDD-01, mahasiswa KKN bersama kelompok penenun Dusun Gubuk Lauk melakukan pemotretan studio mini untuk 25 motif kain tenun gedogan asli Pringgasela Selatan.',
    author: 'Divisi PDD & Acara',
    date: '2026-07-24',
    dusun: 'Dusun Gubuk Lauk',
    coverImageUrl:
      'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=900&q=80',
    isPublished: true,
  },
  {
    id: 'art-2',
    title: 'Inovasi MP-ASI Puding Daun Kelor untuk Pencegahan Stunting di Posyandu Dusun',
    category: 'Edukasi Warga',
    summary:
      'Optimalisasi tanaman kelor pekarangan warga menjadi kudapan sehat kaya zat besi dan protein bagi balita di 7 dusun Desa Pringgasela Selatan.',
    content:
      'Bekerja sama dengan Bidan Desa dan Kader Posyandu Melati, mahasiswa KKN menggelar demonstrasi pengolahan daun kelor segar menjadi puding bergizi.',
    author: 'Putu Sri Astiningsih (Divisi Konsumsi)',
    date: '2026-07-25',
    dusun: 'Dusun Sinar Sari',
    coverImageUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    isPublished: true,
  },
];

function AppContent() {
  const {
    user,
    profile,
    isAdmin,
    isSuperAdmin,
    loading,
    mustChangePassword,
    sessionExpiredNotice,
    syncOwnProfileMetadata,
  } = useAuth();
  const { confirm: appConfirm, notify: appNotify } = useConfirm();

  // Navigation State - Default environment is public portal
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname || '/public' : '/public'
  );
  const [currentModule, setCurrentModule] = useState<WorkspaceModuleId>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('public');
  const [isResetPasswordRoute, setIsResetPasswordRoute] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    (window.location.pathname === '/reset-password' ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery'))
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Core Data States
  const [unitConfig, setUnitConfig] = useState<UnitConfig>(INITIAL_UNIT_CONFIG);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [sbPublicRoster, setSbPublicRoster] = useState<any[]>([]);
  const [dplSupervisorRecord, setDplSupervisorRecord] = useState<any | null>(null);
  const [programs, setPrograms] = useState(INITIAL_PROGRAMS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [villageResearch, setVillageResearch] = useState<VillageResearchData>(
    INITIAL_VILLAGE_RESEARCH
  );
  const [surveys, setSurveys] = useState<SurveyRecord[]>(INITIAL_SURVEYS);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [documentation, setDocumentation] = useState<DocumentationPhoto[]>(
    INITIAL_DOCUMENTATION
  );
  const [documentationAlbums, setDocumentationAlbums] = useState<DocumentationAlbum[]>(
    INITIAL_DOCUMENTATION_ALBUMS
  );
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [decisions, setDecisions] = useState(INITIAL_DECISION_LOG);
  const [archive, setArchive] = useState(INITIAL_ARCHIVE);
  const [publicArticles, setPublicArticles] = useState<PublicArticleRecord[]>(
    INITIAL_PUBLIC_ARTICLES
  );
  const [stakeholders, setStakeholders] = useState<StakeholderRecord[]>(
    INITIAL_STAKEHOLDERS
  );
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(
    INITIAL_ANNOUNCEMENTS
  );

  // Centralized Page Navigation Helper
  const navigateTo = (nextPath: string) => {
    const clean = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
    window.history.pushState({}, '', clean);
    setCurrentPath(clean);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (clean.startsWith('/public')) {
      setViewMode('public');
      return;
    }
    if (clean.startsWith('/admin')) {
      if (user && isSuperAdmin) {
        setViewMode('admin');
      }
      return;
    }
    if (
      clean === '/workspace/supervision' ||
      clean.startsWith('/workspace/supervision') ||
      clean === '/dpl' ||
      clean.startsWith('/dpl')
    ) {
      if (profile?.role === 'dpl') {
        setViewMode('dpl');
      } else {
        setViewMode('workspace');
        window.history.replaceState({}, '', '/workspace');
        setCurrentPath('/workspace');
      }
      return;
    }
    if (clean.startsWith('/workspace')) {
      setViewMode('workspace');
      const sub = clean.replace(/^\/workspace\/?/, '');
      if (!sub || sub === 'overview') {
        setCurrentModule('overview');
      } else if (sub.startsWith('profile')) {
        setCurrentModule('profile');
      } else if (sub.startsWith('members')) {
        setCurrentModule('members');
      } else if (sub.startsWith('programs')) {
        setCurrentModule('programs');
      } else if (sub.startsWith('documentation')) {
        setCurrentModule('documentation');
      } else {
        const mod = sub.split('/')[0] as WorkspaceModuleId;
        setCurrentModule(mod);
      }
    }
  };

  // 3-Environment Routing & Access Control Synchronization with Dedicated Sub-Routes
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname || '/public';
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      // 0. Dedicated Password Recovery Route (/reset-password)
      if (
        path === '/reset-password' ||
        hash.includes('type=recovery') ||
        search.includes('type=recovery')
      ) {
        setIsResetPasswordRoute(true);
        if (path !== '/reset-password') {
          window.history.replaceState({}, '', `/reset-password${search}${hash}`);
        }
        setCurrentPath('/reset-password');
        return;
      }

      setIsResetPasswordRoute(false);

      // 1. Unauthenticated Visitor: Allow all /public and /public/* dedicated pages
      if (!user) {
        setViewMode('public');
        if (path.startsWith('/public')) {
          setCurrentPath(path);
        } else {
          window.history.replaceState({}, '', '/public');
          setCurrentPath('/public');
        }
        return;
      }

      // 2. DPL Supervisor: Route to dedicated DPL supervisory workspace (/workspace/supervision or alias /dpl)
      if (profile?.role === 'dpl') {
        if (path.startsWith('/public')) {
          setViewMode('public');
          setCurrentPath(path);
        } else {
          setViewMode('dpl');
          const isSupervisionPath =
            path === '/dpl' ||
            path === '/workspace/supervision' ||
            path.startsWith('/workspace/supervision');
          if (!isSupervisionPath) {
            window.history.replaceState({}, '', '/workspace/supervision');
            setCurrentPath('/workspace/supervision');
          } else {
            setCurrentPath(path);
          }
        }
        return;
      }

      // Non-DPL members attempting to access /workspace/supervision or /dpl are gated and redirected to /workspace
      if (
        path === '/workspace/supervision' ||
        path.startsWith('/workspace/supervision') ||
        path === '/dpl' ||
        path.startsWith('/dpl')
      ) {
        setViewMode('workspace');
        window.history.replaceState({}, '', '/workspace');
        setCurrentPath('/workspace');
        return;
      }

      // 3. Super Admin Admin Console Route
      if (path.startsWith('/admin')) {
        if (isSuperAdmin) {
          setViewMode('admin');
          setCurrentPath(path);
        } else {
          setViewMode('workspace');
          window.history.replaceState({}, '', '/workspace');
          setCurrentPath('/workspace');
        }
        return;
      }

      // 4. Activated KKN Member / Admin: Public Pages or Member Workspace Pages
      if (path.startsWith('/public')) {
        setViewMode('public');
        setCurrentPath(path);
      } else {
        setViewMode('workspace');
        const normalizedWorkspacePath = path.startsWith('/workspace')
          ? path
          : '/workspace';
        if (path !== normalizedWorkspacePath) {
          window.history.replaceState({}, '', normalizedWorkspacePath);
        }
        setCurrentPath(normalizedWorkspacePath);

        const sub = normalizedWorkspacePath.replace(/^\/workspace\/?/, '');
        if (!sub || sub === 'overview') {
          setCurrentModule('overview');
        } else if (sub.startsWith('profile')) {
          setCurrentModule('profile');
        } else if (sub.startsWith('members')) {
          setCurrentModule('members');
        } else if (sub.startsWith('programs')) {
          setCurrentModule('programs');
        } else if (sub.startsWith('documentation')) {
          setCurrentModule('documentation');
        } else {
          setCurrentModule(sub.split('/')[0] as WorkspaceModuleId);
        }
      }
    };

    if (!loading) {
      handleLocation();
    }

    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, [user, profile, isSuperAdmin, loading]);

  // Surface login modal automatically if an active session expired
  useEffect(() => {
    if (sessionExpiredNotice && !user) {
      setIsAuthModalOpen(true);
    }
  }, [sessionExpiredNotice, user]);

  // Authoritative Member Directory Synchronization (Supabase + Active Session Overlay)
  useEffect(() => {
    let sbMembers: Member[] = [];
    let sbRegisteredEmails: any[] = [];

    const reconcileMembers = () => {
      const memberMap = new Map<string, Member>();
      // 1. Base team structure
      INITIAL_MEMBERS.forEach((m) => memberMap.set(m.id, { ...m }));

      // 2. Authoritative Supabase records populate and overlay the structure

      // 3. Direct Supabase 'members' table records (map snake_case/camelCase onto existing KKN members safely)
      sbMembers.forEach((rawM: any) => {
        if (!rawM || typeof rawM !== 'object' || isFabricatedLegacyRecord(rawM)) return;
        const candidateId = rawM.member_id || rawM.memberId || rawM.id;
        const candidateName = (rawM.name || rawM.full_name || rawM.display_name || '').trim();
        const candidateEmail = (rawM.email || '').trim().toLowerCase();

        let targetId: string | undefined =
          candidateId && memberMap.has(candidateId) ? candidateId : undefined;

        if (!targetId && candidateName) {
          for (const [id, existing] of memberMap.entries()) {
            if (existing.name.toLowerCase() === candidateName.toLowerCase()) {
              targetId = id;
              break;
            }
          }
        }

        if (!targetId && candidateEmail) {
          for (const [id, existing] of memberMap.entries()) {
            if (existing.email && existing.email.toLowerCase() === candidateEmail) {
              targetId = id;
              break;
            }
          }
        }

        if (targetId && memberMap.has(targetId)) {
          const existing = memberMap.get(targetId)!;
          const cleanEmail =
            candidateEmail && !isFabricatedLegacyRecord({ email: candidateEmail })
              ? candidateEmail
              : existing.email;
          const dbUuid =
            rawM.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawM.id)
              ? rawM.id
              : rawM.member_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawM.member_id)
              ? rawM.member_id
              : existing.dbId;

          memberMap.set(targetId, {
            ...existing,
            dbId: dbUuid,
            name: candidateName || existing.name,
            role: rawM.role && rawM.role !== 'member' ? rawM.role : rawM.position || existing.role,
            position: rawM.position || existing.position,
            division: rawM.division || existing.division,
            faculty: rawM.faculty || existing.faculty,
            major: rawM.major || existing.major,
            nim: rawM.nim || existing.nim,
            phone: rawM.phone || existing.phone,
            bio: rawM.bio || existing.bio,
            email: cleanEmail,
            registeredEmail: cleanEmail || undefined,
            avatar: rawM.avatar || rawM.avatar_url || existing.avatar,
            avatarStoragePath: rawM.avatar_storage_path || rawM.avatarStoragePath || existing.avatarStoragePath,
            accountStatus:
              rawM.account_status || rawM.accountStatus || existing.accountStatus,
            authUid: rawM.auth_uid || rawM.authUid || rawM.auth_user_id || rawM.user_id || existing.authUid,
            responsibilities: Array.isArray(rawM.responsibilities)
              ? rawM.responsibilities
              : existing.responsibilities,
          });
        }
      });

      // 4. Authoritative Registered Emails overlay directly from Supabase
      const allVerifiedRegs = sbRegisteredEmails.filter((r) => !isFabricatedLegacyRecord(r));
      allVerifiedRegs.forEach((reg) => {
        if (!reg || typeof reg !== 'object') return;
        const regEmail = String(reg.email || '').trim().toLowerCase();
        if (!regEmail) return;
        const regMemberId = String(reg.member_id || reg.memberId || '').trim();

        let targetMemberId = memberMap.has(regMemberId) ? regMemberId : undefined;
        if (!targetMemberId) {
          for (const [id, m] of memberMap.entries()) {
            if (
              (m.dbId && m.dbId === regMemberId) ||
              (m.email && m.email.toLowerCase() === regEmail) ||
              (reg.name && m.name.toLowerCase() === String(reg.name).toLowerCase()) ||
              (reg.full_name && m.name.toLowerCase() === String(reg.full_name).toLowerCase())
            ) {
              targetMemberId = id;
              break;
            }
          }
        }

        if (!targetMemberId || !memberMap.has(targetMemberId)) return;

        const isDisabled = reg.status === 'disabled' || reg.is_active === false;
        const isActivated =
          !isDisabled &&
          (reg.status === 'activated' ||
            reg.status === 'active' ||
            Boolean(reg.activated_uid || reg.activatedUid || reg.auth_user_id));

        const m = memberMap.get(targetMemberId)!;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regMemberId);
        memberMap.set(targetMemberId, {
          ...m,
          dbId: isUuid ? regMemberId : m.dbId,
          email: regEmail,
          registeredEmail: regEmail,
          accountStatus: isDisabled
            ? 'disabled'
            : isActivated
            ? 'active'
            : 'pending',
          authUid: reg.activated_uid || reg.activatedUid || reg.auth_user_id || m.authUid,
          acceptedAt: reg.activated_at || reg.activatedAt || m.acceptedAt,
          disabledAt: reg.disabled_at || reg.disabledAt || m.disabledAt,
        });
      });

      // 5. Active user session overlay (Strictly isolated - never copy to other members)
      if (user && user.email) {
        const userEmailLower = user.email.trim().toLowerCase();
        for (const [id, m] of memberMap.entries()) {
          const isTargetHabir = userEmailLower === 'abhyy333@gmail.com' && id === 'm-4';
          const isOwnAuthUid = Boolean(user.uid && m.authUid && m.authUid === user.uid);
          const isOwnProfileId = Boolean(profile?.memberId && profile.memberId === id && isOwnAuthUid);

          if (isTargetHabir || isOwnAuthUid || isOwnProfileId) {
            memberMap.set(id, {
              ...m,
              accountStatus: 'active',
              authUid: user.uid,
              email: user.email,
              registeredEmail: user.email,
              acceptedAt: profile?.acceptedAt || m.acceptedAt,
            });
          }
        }
      }

      const merged = Array.from(memberMap.values()).filter(
        (m) => Boolean(m && m.id && m.name)
      );
      merged.sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D/g, '') || '0', 10);
        const numB = parseInt(String(b.id).replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
      setMembers(merged);
    };

    reconcileMembers();

    if (isSupabaseConfigured) {
      // 1. Published student profiles from public_team_roster
      supabase
        .from('public_team_roster')
        .select('*')
        .then(
          ({ data }) => {
            if (Array.isArray(data) && data.length > 0) {
              setSbPublicRoster(data);
            }
          },
          () => {}
        );

      // 2. Authenticated internal member data (excluding supervisor)
      supabase
        .from('members')
        .select('*')
        .then(
          ({ data }) => {
            if (Array.isArray(data) && data.length > 0) {
              sbMembers = data.filter(
                (m: any) => m.member_category !== 'supervisor' && m.is_supervisor !== true
              ) as Member[];

              const supervisor = data.find(
                (m: any) => m.member_category === 'supervisor' || m.is_supervisor === true
              );
              if (supervisor) {
                setDplSupervisorRecord(supervisor);
                setUnitConfig((prev) => ({
                  ...prev,
                  dplName: supervisor.name || supervisor.full_name || prev.dplName,
                  dplNip: supervisor.nip || supervisor.employee_id || prev.dplNip,
                  faculty: supervisor.program_study || supervisor.major || supervisor.faculty || prev.faculty,
                }));
              }

              reconcileMembers();
            }
          },
          () => {}
        );

      // 3. Supervisor record from public.members where member_category = 'supervisor'
      supabase
        .from('members')
        .select('*')
        .eq('member_category', 'supervisor')
        .maybeSingle()
        .then(
          ({ data }) => {
            if (data) {
              setDplSupervisorRecord(data);
              setUnitConfig((prev) => ({
                ...prev,
                dplName: data.name || data.full_name || 'Lalu Muhammad Aby Dujana, M.Si.',
                dplNip: data.nip || data.employee_id || '198910222024061001',
                faculty: data.program_study || data.major || data.faculty || 'S1 Ilmu Lingkungan',
              }));
            }
          },
          () => {}
        );

      // 4. Authoritative verified registered_emails
      supabase
        .from('registered_emails')
        .select('*')
        .then(
          ({ data }) => {
            if (Array.isArray(data) && data.length > 0) {
              sbRegisteredEmails = data;
              reconcileMembers();
            }
          },
          () => {}
        );
    }
  }, [user, profile]);

  // Load workspace module data directly from Supabase when authenticated
  useEffect(() => {
    const normalizeTask = (t: any): TaskItem | null => {
      if (!t || !t.id || !t.title) return null;
      return {
        ...t,
        id: String(t.id),
        title: String(t.title),
        assignee: String(t.assignee || 'Tim KKN'),
        division: String(t.division || 'Semua Divisi'),
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        dueDate: String(t.dueDate || t.due_date || new Date().toISOString().slice(0, 10)),
        tags: Array.isArray(t.tags) ? t.tags : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      };
    };

    const normalizeMeeting = (m: any): MeetingItem | null => {
      if (!m || !m.id || !m.title) return null;
      const rawAttendees = m.attendeesList || m.attendees_list;
      const attendeesList = Array.isArray(rawAttendees)
        ? rawAttendees
            .filter((a: any) => a && (a.memberId || a.member_id || a.name))
            .map((a: any, idx: number) => ({
              memberId: String(a.memberId || a.member_id || `m-${idx + 1}`),
              name: String(a.name || a.full_name || 'Anggota KKN'),
              status: (a.status === 'izin' || a.status === 'alpa' ? a.status : 'hadir') as
                | 'hadir'
                | 'izin'
                | 'alpa',
              notes: a.notes,
            }))
        : undefined;

      return {
        ...m,
        id: String(m.id),
        title: String(m.title),
        date: String(m.date || new Date().toISOString().slice(0, 10)),
        time: String(m.time || '19:30 - 21:00 WITA'),
        location: String(m.location || 'Posko KKN Desa Pringgasela Selatan'),
        type: m.type || 'Internal Posko',
        attendeesCount:
          typeof m.attendeesCount === 'number'
            ? m.attendeesCount
            : attendeesList
            ? attendeesList.filter((a) => a.status === 'hadir').length
            : 10,
        attendeesList,
        agenda: Array.isArray(m.agenda) ? m.agenda.filter(Boolean).map(String) : [],
        notesSummary: String(m.notesSummary || m.notes_summary || ''),
        actionItems: Array.isArray(m.actionItems || m.action_items)
          ? (m.actionItems || m.action_items).map((ai: any, idx: number) => ({
              id: String(ai?.id || `ai-${idx}`),
              text: String(ai?.text || ''),
              pic: String(ai?.pic || 'Tim KKN'),
              completed: Boolean(ai?.completed),
            }))
          : [],
        documents: Array.isArray(m.documents) ? m.documents : [],
        status: m.status === 'completed' ? 'completed' : 'upcoming',
      };
    };

    if (!user || !isSupabaseConfigured) return;

    supabase
      .from('tasks')
      .select('*')
      .then(
        ({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const valid = data.map(normalizeTask).filter(Boolean) as TaskItem[];
            if (valid.length > 0) setTasks(valid);
          }
        },
        () => {}
      );

    supabase
      .from('meetings')
      .select('*')
      .then(
        ({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const valid = data.map(normalizeMeeting).filter(Boolean) as MeetingItem[];
            if (valid.length > 0) {
              valid.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
              setMeetings(valid);
            }
          }
        },
        () => {}
      );

    supabase
      .from('decisions')
      .select('*')
      .then(
        ({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const valid = (data as DecisionLogRecord[]).filter((d) => d && d.id && d.title);
            if (valid.length > 0) {
              valid.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              setDecisions(valid);
            }
          }
        },
        () => {}
      );

    supabase
      .from('surveys')
      .select('*')
      .then(
        ({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const valid = (data as SurveyRecord[]).filter((s) => s && s.id && s.title);
            if (valid.length > 0) {
              valid.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              setSurveys(valid);
            }
          }
        },
        () => {}
      );

    supabase
      .from('documentation')
      .select('*')
      .then(
        ({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const valid = (data as DocumentationPhoto[]).filter((d) => d && d.id && d.title);
            if (valid.length > 0) {
              valid.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              setDocumentation(valid);
            }
          }
        },
        () => {}
      );
  }, [user]);

  const handleSaveDocumentationAlbums = async (nextAlbums: DocumentationAlbum[]) => {
    setDocumentationAlbums(nextAlbums);

    if (isSupabaseConfigured) {
      for (const alb of nextAlbums) {
        try {
          await supabase.from('documentation_albums').upsert(
            {
              id: alb.id,
              title: alb.title,
              description: alb.description,
              category: alb.category,
              activity_date: alb.date,
              dusun: alb.dusun,
              location: alb.location,
              photographer: alb.photographer,
              responsible_members: alb.responsibleMembers || [],
              program_id: alb.programId || null,
              survey_id: alb.surveyId || null,
              cover_image_url: alb.coverImageUrl,
              tags: alb.tags || [],
              verification_status: alb.verificationStatus,
              is_published: alb.isPublished,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {}
      }
    }
  };

  const handleChangeViewMode = (mode: ViewMode) => {
    if (mode === 'admin') {
      if (!user || !isSuperAdmin) {
        navigateTo('/workspace');
        return;
      }
      navigateTo('/admin');
    } else if (mode === 'dpl') {
      if (!user || profile?.role !== 'dpl') {
        navigateTo('/public');
        return;
      }
      navigateTo('/workspace/supervision');
    } else if (mode === 'workspace') {
      if (!user) {
        setIsAuthModalOpen(true);
        return;
      }
      if (profile?.role === 'dpl') {
        navigateTo('/workspace/supervision');
        return;
      }
      navigateTo('/workspace');
    } else {
      navigateTo('/public');
    }
  };

  const syncToSupabase = async (
    table: string,
    payload: Record<string, any>
  ) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from(table).upsert(payload, { onConflict: 'id' });
    } catch {
      // Optional table or RLS guard
    }
  };

  const deleteFromSupabase = async (table: string, id: string) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from(table).delete().eq('id', id);
    } catch {
      // Optional table or RLS guard
    }
  };

  const handleDplReportNote = async (
    reportId: string,
    notes: string,
    status: ReportRecord['status']
  ) => {
    const nowIso = new Date().toISOString();
    const reviewerName = unitConfig.dplName || 'Lalu Muhammad Aby Dujana, M.Si.';

    // Map status to Edge Function decision: 'approved' | 'revision_requested' | 'rejected'
    const decision: 'approved' | 'revision_requested' | 'rejected' =
      status === 'approved' || status === 'approved_by_dpl'
        ? 'approved'
        : status === 'rejected'
        ? 'rejected'
        : 'revision_requested';

    // 1. Invoke backend Edge Function dpl-report-review via Supabase Functions API
    if (isSupabaseConfigured) {
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke(
          'dpl-report-review',
          {
            body: {
              report_id: reportId,
              decision,
              feedback: notes,
            },
          }
        );
        if (edgeErr) {
          console.warn('Notice from dpl-report-review Edge Function (falling back to direct sync):', edgeErr);
        } else if (edgeRes) {
          console.info('dpl-report-review Edge Function response:', edgeRes);
        }
      } catch (invokeErr) {
        console.warn('Network call to dpl-report-review Edge Function notice:', invokeErr);
      }
    }

    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const newHistoryEntry = {
          version: (r.revisionHistory?.length || 0) + 1,
          status,
          comments: notes,
          reviewedBy: reviewerName,
          timestamp: nowIso,
        };
        return {
          ...r,
          dplNotes: notes,
          status,
          reviewedBy: reviewerName,
          reviewTimestamp: nowIso,
          revisionHistory: [...(r.revisionHistory || []), newHistoryEntry],
        };
      })
    );

    const targetReport = reports.find((r) => r.id === reportId);
    const updatedHistory = [
      ...(targetReport?.revisionHistory || []),
      {
        version: (targetReport?.revisionHistory?.length || 0) + 1,
        status,
        comments: notes,
        reviewedBy: reviewerName,
        timestamp: nowIso,
      },
    ];

    await syncToSupabase('reports', {
      id: reportId,
      dplNotes: notes,
      status,
      reviewedBy: reviewerName,
      reviewTimestamp: nowIso,
      revisionHistory: updatedHistory,
    });

    // Also persist review entry to report_reviews table if available
    if (isSupabaseConfigured) {
      try {
        await supabase.from('report_reviews').insert({
          report_id: reportId,
          decision,
          feedback: notes,
          reviewed_by: reviewerName,
          reviewed_at: nowIso,
        });
      } catch {
        // Table or RLS guard
      }
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    const existingMember = members.find((m) => m.id === updatedMember.id);
    const isOwnRecord = Boolean(
      user &&
        existingMember &&
        ((profile?.memberId && profile.memberId === existingMember.id) ||
          (existingMember.authUid && existingMember.authUid === user.uid) ||
          (user.email &&
            existingMember.email &&
            existingMember.email.toLowerCase() === user.email.toLowerCase()) ||
          (user.email &&
            existingMember.registeredEmail &&
            existingMember.registeredEmail.toLowerCase() ===
              user.email.toLowerCase()) ||
          (user.email?.toLowerCase() === 'abhyy333@gmail.com' &&
            existingMember.id === 'm-4'))
    );

    if (!isSuperAdmin && !isAdmin && !isOwnRecord) {
      throw new Error(
        'Akses ditolak: Anda hanya diizinkan mengubah profil dan data keanggotaan Anda sendiri.'
      );
    }

    // Enforce field-level protection: non-super_admin users can NEVER modify protected security fields
    const sanitizedMember: Member = existingMember
      ? {
          ...existingMember,
          ...updatedMember,
          name: updatedMember.name?.trim() || existingMember.name,
          role: updatedMember.role?.trim() || existingMember.role,
          position:
            updatedMember.role?.trim() ||
            updatedMember.position?.trim() ||
            existingMember.position ||
            existingMember.role,
          division: updatedMember.division?.trim() || existingMember.division,
          nim: updatedMember.nim?.trim() || existingMember.nim,
          major: updatedMember.major?.trim() || existingMember.major,
          faculty: updatedMember.faculty?.trim() || existingMember.faculty,
          phone: updatedMember.phone?.trim() || existingMember.phone,
          emergencyContact:
            updatedMember.emergencyContact?.trim() ||
            existingMember.emergencyContact,
          bio:
            updatedMember.bio !== undefined
              ? updatedMember.bio
              : existingMember.bio,
          avatar: updatedMember.avatar || existingMember.avatar,
          avatarStoragePath:
            updatedMember.avatarStoragePath ||
            existingMember.avatarStoragePath,
          responsibilities: Array.isArray(updatedMember.responsibilities)
            ? updatedMember.responsibilities
            : existingMember.responsibilities,
          // Strictly lock security & authorization fields unless super_admin
          id: existingMember.id,
          systemRole: isSuperAdmin
            ? updatedMember.systemRole ?? existingMember.systemRole
            : existingMember.systemRole,
          authUid: isSuperAdmin
            ? updatedMember.authUid ?? existingMember.authUid
            : existingMember.authUid,
          accountStatus: isSuperAdmin
            ? updatedMember.accountStatus ?? existingMember.accountStatus
            : existingMember.accountStatus,
          email: isSuperAdmin
            ? updatedMember.email ?? existingMember.email
            : existingMember.email,
          registeredEmail: isSuperAdmin
            ? updatedMember.registeredEmail ?? existingMember.registeredEmail
            : existingMember.registeredEmail,
          acceptedAt: existingMember.acceptedAt,
          disabledAt: isSuperAdmin
            ? updatedMember.disabledAt ?? existingMember.disabledAt
            : existingMember.disabledAt,
        }
      : updatedMember;

    setMembers((prev) => {
      const exists = prev.some((m) => m.id === sanitizedMember.id);
      return exists
        ? prev.map((m) => (m.id === sanitizedMember.id ? sanitizedMember : m))
        : [...prev, sanitizedMember];
    });

    // If the authenticated user updated their own record, sync display metadata to AuthContext & session cache
    if (isOwnRecord) {
      syncOwnProfileMetadata({
        displayName: sanitizedMember.name,
        position: sanitizedMember.role,
        division: sanitizedMember.division,
      });
    }

    if (isSupabaseConfigured) {
      try {
        // 1. Invoke secure field-specific RPC `update_own_member_profile`
        await supabase.rpc('update_own_member_profile', {
          p_member_id: sanitizedMember.id,
          p_name: sanitizedMember.name,
          p_role: sanitizedMember.role,
          p_division: sanitizedMember.division,
          p_nim: sanitizedMember.nim,
          p_major: sanitizedMember.major,
          p_faculty: sanitizedMember.faculty,
          p_phone: sanitizedMember.phone,
          p_emergency_contact: sanitizedMember.emergencyContact || '-',
          p_bio: sanitizedMember.bio || '',
          p_avatar_url: sanitizedMember.avatar,
          p_avatar_storage_path: sanitizedMember.avatarStoragePath || null,
          p_responsibilities: sanitizedMember.responsibilities || [],
        });
      } catch {
        // Fallback to direct table update governed by RLS + trigger
      }

      try {
        await supabase
          .from('members')
          .update({
            name: sanitizedMember.name,
            role: sanitizedMember.role,
            position: sanitizedMember.role,
            division: sanitizedMember.division,
            nim: sanitizedMember.nim,
            major: sanitizedMember.major,
            faculty: sanitizedMember.faculty,
            phone: sanitizedMember.phone,
            emergency_contact: sanitizedMember.emergencyContact || '-',
            bio: sanitizedMember.bio || '',
            avatar: sanitizedMember.avatar,
            avatar_url: sanitizedMember.avatar,
            avatar_storage_path: sanitizedMember.avatarStoragePath || null,
            responsibilities: sanitizedMember.responsibilities || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', sanitizedMember.id);
      } catch {
        // Governed by RLS
      }
    }
  };

  const handleAddProgram = async (newProgram: WorkProgram) => {
    setPrograms((prev) => [newProgram, ...prev]);
    await syncToSupabase('programs', newProgram);
  };

  const handleUpdateProgram = async (updatedProgram: WorkProgram) => {
    setPrograms((prev) =>
      prev.map((p) => (p.id === updatedProgram.id ? updatedProgram : p))
    );
    await syncToSupabase('programs', updatedProgram);
  };

  const handleDeleteProgram = async (programId: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    await deleteFromSupabase('programs', programId);
  };

  // Meetings Supabase CRUD
  const handleAddMeeting = async (newMeeting: MeetingItem) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    await syncToSupabase('meetings', newMeeting);
  };

  const handleUpdateMeeting = async (updatedMeeting: MeetingItem) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m))
    );
    await syncToSupabase('meetings', updatedMeeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    const target = meetings.find((m) => m.id === meetingId);
    const ok = await appConfirm({
      title: 'Hapus Agenda Rapat Posko?',
      description:
        'Catatan rapat, daftar hadir, dan ringkasan notulensi pada jadwal ini akan dihapus.',
      targetName: target ? `${target.title} (${target.date})` : meetingId,
      level: 'warning',
      confirmLabel: 'Ya, Hapus Rapat',
    });
    if (!ok) return;

    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    await deleteFromSupabase('meetings', meetingId);
    appNotify({
      type: 'success',
      title: 'Agenda Rapat Dihapus',
      message: 'Jadwal rapat telah dihapus dari ruang kerja.',
    });
  };

  const handleToggleActionItem = async (
    meetingId: string,
    actionItemId: string
  ) => {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return;
    const updatedActionItems = (meeting.actionItems || []).map((ai) =>
      ai.id === actionItemId ? { ...ai, completed: !ai.completed } : ai
    );
    const updatedMeeting = { ...meeting, actionItems: updatedActionItems };
    await handleUpdateMeeting(updatedMeeting);
  };

  // Tasks Supabase CRUD
  const handleAddTask = async (newTask: TaskItem) => {
    setTasks((prev) => [newTask, ...prev]);
    await syncToSupabase('tasks', newTask);
  };

  const handleUpdateTask = async (updatedTask: TaskItem) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    await syncToSupabase('tasks', updatedTask);
  };

  const handleDeleteTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const ok = await appConfirm({
      title: 'Hapus Tugas Kerja Ini?',
      description:
        'Tugas yang dihapus tidak lagi tampil pada papan penugasan maupun daftar tugas anggota.',
      targetName: target ? `${target.title} (PIC: ${target.assignee})` : taskId,
      level: 'warning',
      confirmLabel: 'Ya, Hapus Tugas',
    });
    if (!ok) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await deleteFromSupabase('tasks', taskId);
    appNotify({
      type: 'success',
      title: 'Tugas Berhasil Dihapus',
      message: 'Data tugas telah dihapus dari daftar kerja.',
    });
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus: TaskItem['status'] =
      task.status === 'done' ? 'todo' : 'done';
    await handleUpdateTask({ ...task, status: newStatus });
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    newStatus: TaskItem['status']
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await handleUpdateTask({ ...task, status: newStatus });
  };

  // Decisions Supabase CRUD
  const handleAddDecision = async (newDecision: DecisionLogRecord) => {
    setDecisions((prev) => [newDecision, ...prev]);
    await syncToSupabase('decisions', newDecision);
  };

  const handleUpdateDecision = async (updatedDecision: DecisionLogRecord) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === updatedDecision.id ? updatedDecision : d))
    );
    await syncToSupabase('decisions', updatedDecision);
  };

  const handleDeleteDecision = async (decisionId: string) => {
    const target = decisions.find((d) => d.id === decisionId);
    const ok = await appConfirm({
      title: 'Hapus Catatan Keputusan Musyawarah?',
      description:
        'Catatan keputusan ini akan dihapus dari Decision Log posko KKN.',
      targetName: target ? `${target.decisionNumber} — ${target.title}` : decisionId,
      level: 'warning',
      confirmLabel: 'Ya, Hapus Keputusan',
    });
    if (!ok) return;

    setDecisions((prev) => prev.filter((d) => d.id !== decisionId));
    await deleteFromSupabase('decisions', decisionId);
    appNotify({
      type: 'success',
      title: 'Keputusan Dihapus',
      message: 'Catatan keputusan telah dihapus dari sistem.',
    });
  };

  // Village Research Supabase CRUD
  const handleUpdateVillageResearch = async (
    updatedData: VillageResearchData
  ) => {
    setVillageResearch(updatedData);
    await syncToSupabase('village_research', {
      id: 'pringgasela-selatan',
      ...updatedData,
    });
  };

  // Surveys Supabase CRUD
  const handleAddSurvey = async (newSurvey: SurveyRecord) => {
    setSurveys((prev) => [newSurvey, ...prev]);
    await syncToSupabase('surveys', newSurvey);
  };

  const handleUpdateSurvey = async (updatedSurvey: SurveyRecord) => {
    setSurveys((prev) =>
      prev.map((s) => (s.id === updatedSurvey.id ? updatedSurvey : s))
    );
    await syncToSupabase('surveys', updatedSurvey);
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    const target = surveys.find((s) => s.id === surveyId);
    const ok = await appConfirm({
      title: 'Hapus Rekaman Survei Lapangan?',
      description:
        'Data temuan observasi lapangan ini akan dihapus dari basis data survei desa.',
      targetName: target ? `${target.title} (${target.dusun})` : surveyId,
      level: 'warning',
      confirmLabel: 'Ya, Hapus Survei',
    });
    if (!ok) return;

    setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
    await deleteFromSupabase('surveys', surveyId);
    appNotify({
      type: 'success',
      title: 'Data Survei Dihapus',
      message: 'Rekaman survei lapangan telah dihapus.',
    });
  };

  // Documentation Supabase CRUD
  const handleAddPhoto = async (newPhoto: DocumentationPhoto) => {
    setDocumentation((prev) => [newPhoto, ...prev]);
    await syncToSupabase('documentation', newPhoto);
  };

  const handleUpdatePhoto = async (updatedPhoto: DocumentationPhoto) => {
    setDocumentation((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
    );
    await syncToSupabase('documentation', updatedPhoto);
  };

  const handleDeletePhoto = async (photoId: string) => {
    const target = documentation.find((p) => p.id === photoId);
    const ok = await appConfirm({
      title: 'Hapus Foto Dokumentasi?',
      description: 'Foto dokumentasi ini akan dihapus dari penyimpanan.',
      targetName: target ? target.title : photoId,
      level: 'warning',
      confirmLabel: 'Ya, Hapus Foto',
    });
    if (!ok) return;

    setDocumentation((prev) => prev.filter((p) => p.id !== photoId));
    await deleteFromSupabase('documentation', photoId);
  };

  const handleToggleMilestone = (
    programId: string,
    milestoneIndex: number
  ) => {
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id !== programId) return p;
        const newMilestones = p.keyMilestones.map((m, idx) =>
          idx === milestoneIndex ? { ...m, completed: !m.completed } : m
        );
        const completedCount = newMilestones.filter((m) => m.completed).length;
        const newPercent = Math.round(
          (completedCount / (newMilestones.length || 1)) * 100
        );
        return {
          ...p,
          keyMilestones: newMilestones,
          progressPercent: newPercent,
          status: newPercent === 100 ? 'completed' : 'in_progress',
        };
      })
    );
  };

  const handleTogglePublicVisibility = (programId: string) => {
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === programId
          ? { ...p, isFeaturedInPublic: !p.isFeaturedInPublic }
          : p
      )
    );
  };

  const handleAddTransaction = async (tx: TransactionRecord) => {
    setTransactions((prev) => [tx, ...prev]);
    await syncToSupabase('transactions', tx);
  };

  const handleUpdateTransaction = async (tx: TransactionRecord) => {
    setTransactions((prev) => prev.map((item) => (item.id === tx.id ? tx : item)));
    await syncToSupabase('transactions', tx);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    await deleteFromSupabase('transactions', id);
  };

  const handleAddInventoryItem = async (item: InventoryRecord) => {
    setInventory((prev) => [item, ...prev]);
    await syncToSupabase('inventory', item);
  };

  const handleUpdateInventoryItem = async (item: InventoryRecord) => {
    setInventory((prev) => prev.map((inv) => (inv.id === item.id ? item : inv)));
    await syncToSupabase('inventory', item);
  };

  const handleDeleteInventoryItem = async (id: string) => {
    setInventory((prev) => prev.filter((inv) => inv.id !== id));
    await deleteFromSupabase('inventory', id);
  };

  const handleAddReport = async (rep: ReportRecord) => {
    setReports((prev) => [rep, ...prev]);
    await syncToSupabase('reports', rep);
  };

  const handleUpdateReport = async (rep: ReportRecord) => {
    setReports((prev) => prev.map((r) => (r.id === rep.id ? rep : r)));
    await syncToSupabase('reports', rep);
  };

  const handleDeleteReport = async (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    await deleteFromSupabase('reports', id);
  };

  const handleAddArchiveRecord = async (arc: ArchiveRecord) => {
    setArchive((prev) => [arc, ...prev]);
    await syncToSupabase('archive', arc);
  };

  const handleUpdateArchiveRecord = async (arc: ArchiveRecord) => {
    setArchive((prev) => prev.map((a) => (a.id === arc.id ? arc : a)));
    await syncToSupabase('archive', arc);
  };

  const handleDeleteArchiveRecord = async (id: string) => {
    setArchive((prev) => prev.filter((a) => a.id !== id));
    await deleteFromSupabase('archive', id);
  };

  const handleAddStakeholder = async (st: StakeholderRecord) => {
    setStakeholders((prev) => [st, ...prev]);
    await syncToSupabase('stakeholders', st);
  };

  const handleUpdateStakeholder = async (st: StakeholderRecord) => {
    setStakeholders((prev) => prev.map((s) => (s.id === st.id ? st : s)));
    await syncToSupabase('stakeholders', st);
  };

  const handleDeleteStakeholder = async (id: string) => {
    setStakeholders((prev) => prev.filter((s) => s.id !== id));
    await deleteFromSupabase('stakeholders', id);
  };

  const handleAddAnnouncement = async (ann: AnnouncementRecord) => {
    setAnnouncements((prev) => [ann, ...prev]);
    await syncToSupabase('announcements', ann);
  };

  const handleUpdateAnnouncement = async (ann: AnnouncementRecord) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? ann : a)));
    await syncToSupabase('announcements', ann);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await deleteFromSupabase('announcements', id);
  };

  const handleAddArticle = async (article: PublicArticleRecord) => {
    setPublicArticles((prev) => [article, ...prev]);
    await syncToSupabase('public_articles', article);
  };

  const handleUpdateArticle = async (article: PublicArticleRecord) => {
    setPublicArticles((prev) =>
      prev.map((a) => (a.id === article.id ? article : a))
    );
    await syncToSupabase('public_articles', article);
  };

  const handleDeleteArticle = async (articleId: string) => {
    setPublicArticles((prev) => prev.filter((a) => a.id !== articleId));
    await deleteFromSupabase('public_articles', articleId);
  };

  const handleResetData = async () => {
    const ok = await appConfirm({
      title: 'Kembalikan Seluruh Data ke Kondisi Awal?',
      description:
        'Tindakan ini akan mengembalikan seluruh konfigurasi dan modul lokal ke data awal 10 anggota resmi KKN.',
      targetName: 'Basis Data Lokal KKN SPACE',
      consequences: [
        'Perubahan lokal yang belum tersinkronisasi akan diatur ulang ke data standar.',
      ],
      level: 'irreversible',
      confirmLabel: 'Reset Data Sekarang',
      requireTypeConfirmation: 'RESET',
    });
    if (!ok) return;

    setUnitConfig(INITIAL_UNIT_CONFIG);
    setMembers(INITIAL_MEMBERS);
    setPrograms(INITIAL_PROGRAMS);
    setTasks(INITIAL_TASKS);
    setMeetings(INITIAL_MEETINGS);
    setTransactions(INITIAL_TRANSACTIONS);
    setVillageResearch(INITIAL_VILLAGE_RESEARCH);
    setSurveys(INITIAL_SURVEYS);
    setInventory(INITIAL_INVENTORY);
    setDocumentation(INITIAL_DOCUMENTATION);
    setDocumentationAlbums(INITIAL_DOCUMENTATION_ALBUMS);
    setReports(INITIAL_REPORTS);
    setDecisions(INITIAL_DECISION_LOG);
    setArchive(INITIAL_ARCHIVE);
    setPublicArticles(INITIAL_PUBLIC_ARTICLES);
    setStakeholders(INITIAL_STAKEHOLDERS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    appNotify({
      type: 'success',
      title: 'Data Berhasil Direset',
      message: 'Seluruh modul telah dikembalikan ke kondisi awal.',
    });
  };

  // Curated Public Roster: Prefer authoritative published public_team_roster from Supabase
  // Otherwise gracefully derive from members exposing ONLY public-safe fields.
  // Strictly exposes NO phone, NO email, NO NIM, NO internal account status.
  const dynamicPublicRoster: PublicTeamMember[] =
    sbPublicRoster && sbPublicRoster.length > 0
      ? sbPublicRoster.map((r: any) => ({
          id: String(r.id || r.member_id || r.memberId),
          name: String(r.name || r.full_name || 'Mahasiswa KKN'),
          role: String(r.role || r.position || 'Anggota KKN'),
          division: String(r.division || 'Umum'),
          major: r.major || r.program_study || undefined,
          faculty: r.faculty || undefined,
          avatar: r.avatar || r.avatar_url || '',
          bio: r.bio || undefined,
          responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities : undefined,
        }))
      : members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          division: m.division,
          major: m.major,
          faculty: m.faculty,
          avatar: m.avatar || '',
          bio: m.bio,
          responsibilities: m.responsibilities,
        }));

  // Parse workspace sub-route parameters
  const cleanWorkspacePath = currentPath.replace(/\/+$/, '');
  const workspaceMemberDetailMatch = cleanWorkspacePath.match(
    /^\/workspace\/members\/([^/]+)$/
  );
  const workspaceProgramDetailMatch = cleanWorkspacePath.match(
    /^\/workspace\/programs\/([^/]+)$/
  );
  const workspaceAlbumDetailMatch = cleanWorkspacePath.match(
    /^\/workspace\/documentation\/([^/]+)$/
  );
  const isWorkspaceProfileEdit = cleanWorkspacePath === '/workspace/profile/edit';

  const handleSelectWorkspaceModule = (mod: WorkspaceModuleId) => {
    setCurrentModule(mod);
    if (mod === 'overview') {
      navigateTo('/workspace');
    } else {
      navigateTo(`/workspace/${mod}`);
    }
  };

  // Badge counts
  const tasksUrgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming').length;
  const activePrograms = programs.filter((p) => p.status === 'in_progress').length;

  if (isResetPasswordRoute) {
    return (
      <ResetPasswordView
        onRedirectToLogin={() => {
          setIsResetPasswordRoute(false);
          navigateTo('/public');
          setIsAuthModalOpen(true);
        }}
        onNavigateToPublic={() => {
          setIsResetPasswordRoute(false);
          navigateTo('/public');
        }}
      />
    );
  }

  if (user && (mustChangePassword || profile?.mustChangePassword)) {
    return (
      <FirstLoginPasswordView
        onCompleted={() => {
          navigateTo(profile?.role === 'dpl' ? '/dpl' : '/workspace');
        }}
      />
    );
  }

  if (
    loading &&
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('/workspace') ||
      window.location.pathname.includes('/admin') ||
      window.location.pathname.includes('/dpl'))
  ) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#4A6B53] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#2D3748]">
          Memulihkan sesi autentikasi KKN SPACE...
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Memverifikasi sesi Supabase Auth & profil anggota terdaftar
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] antialiased">
      {/* Auth Modal for Sign In and Invitation Activation */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSwitchToPublic={() => {
          setIsAuthModalOpen(false);
          handleChangeViewMode('public');
        }}
        onLoginSuccess={(loggedInProfile) => {
          setIsAuthModalOpen(false);
          if (loggedInProfile.role === 'dpl') {
            navigateTo('/dpl');
          } else {
            navigateTo('/workspace');
          }
        }}
      />

      {/* Admin Invitation Manager */}
      <InvitationManagerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* 3 DISTINCT ENVIRONMENTS */}
      {viewMode === 'public' ? (
        /* ENVIRONMENT 1: PUBLIC PORTAL (Dedicated pages for /public, /public/team, /public/programs, /public/documentation, etc.) */
        <PublicPortal
          config={unitConfig}
          programs={programs}
          documentation={documentation}
          documentationAlbums={documentationAlbums}
          villageResearch={villageResearch}
          transactions={transactions}
          articles={publicArticles}
          publicRoster={dynamicPublicRoster}
          currentPath={currentPath}
          onNavigate={navigateTo}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onReturnToWorkspace={() =>
            handleChangeViewMode(profile?.role === 'dpl' ? 'dpl' : 'workspace')
          }
          isAuthenticated={!!user}
          userRole={profile?.role}
        />
      ) : viewMode === 'dpl' ? (
        /* ENVIRONMENT 3: DPL WORKSPACE (Supervisory evaluation, primarily read-only) */
        <DplWorkspaceView
          config={unitConfig}
          programs={programs}
          reports={reports}
          meetings={meetings}
          members={members}
          transactions={transactions}
          tasks={tasks}
          villageResearch={villageResearch}
          documentationAlbums={documentationAlbums}
          documentation={documentation}
          onUpdateReportNote={handleDplReportNote}
          onSwitchToPublic={() => handleChangeViewMode('public')}
          onRefreshData={() => {
            if (isSupabaseConfigured) {
              supabase
                .from('reports')
                .select('*')
                .then(({ data }) => {
                  if (Array.isArray(data) && data.length > 0) {
                    setReports(data as ReportRecord[]);
                  }
                });
            }
          }}
        />
      ) : viewMode === 'admin' ? (
        /* ENVIRONMENT 4: DEDICATED ADMIN CONSOLE (Super Admin) */
        <div className="flex min-h-screen">
          <Sidebar
            currentModule={currentModule}
            onSelectModule={handleSelectWorkspaceModule}
            viewMode={viewMode}
            onChangeViewMode={handleChangeViewMode}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            counts={{
              tasksUrgent,
              upcomingMeetings,
              activePrograms,
            }}
          />

          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
              isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
            }`}
          >
            <Topbar
              currentModule={currentModule}
              viewMode={viewMode}
              onChangeViewMode={handleChangeViewMode}
              onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              onSelectModule={handleSelectWorkspaceModule}
              notifications={tasks
                .filter((t) => t.priority === 'urgent' && t.status !== 'done')
                .slice(0, 5)
                .map((t) => ({
                  id: t.id,
                  title: t.title,
                  subtitle: `${t.assignee} · Tenggat: ${t.dueDate}`,
                  targetModule: 'tasks' as WorkspaceModuleId,
                }))}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <AdminConsoleView
                initialTab={currentPath === '/admin/dpl-supervision' ? 'dpl-supervision' : undefined}
                members={members}
                programs={programs}
                meetings={meetings}
                decisions={decisions}
                tasks={tasks}
                villageResearch={villageResearch}
                stakeholders={stakeholders}
                surveys={surveys}
                documentation={documentation}
                reports={reports}
                archive={archive}
                transactions={transactions}
                inventory={inventory}
                announcements={announcements}
                publicArticles={publicArticles}
                unitConfig={unitConfig}
                onUpdateUnitConfig={setUnitConfig}
                onUpdateMember={handleUpdateMember}
                onAddProgram={handleAddProgram}
                onUpdateProgram={handleUpdateProgram}
                onDeleteProgram={handleDeleteProgram}
                onAddMeeting={handleAddMeeting}
                onUpdateMeeting={handleUpdateMeeting}
                onDeleteMeeting={handleDeleteMeeting}
                onAddDecision={handleAddDecision}
                onUpdateDecision={handleUpdateDecision}
                onDeleteDecision={handleDeleteDecision}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onUpdateVillageResearch={handleUpdateVillageResearch}
                onAddStakeholder={handleAddStakeholder}
                onUpdateStakeholder={handleUpdateStakeholder}
                onDeleteStakeholder={handleDeleteStakeholder}
                onAddSurvey={handleAddSurvey}
                onUpdateSurvey={handleUpdateSurvey}
                onDeleteSurvey={handleDeleteSurvey}
                onAddPhoto={handleAddPhoto}
                onUpdatePhoto={handleUpdatePhoto}
                onDeletePhoto={handleDeletePhoto}
                onAddReport={handleAddReport}
                onUpdateReport={handleUpdateReport}
                onDeleteReport={handleDeleteReport}
                onAddArchive={handleAddArchiveRecord}
                onUpdateArchive={handleUpdateArchiveRecord}
                onDeleteArchive={handleDeleteArchiveRecord}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onAddInventory={handleAddInventoryItem}
                onUpdateInventory={handleUpdateInventoryItem}
                onDeleteInventory={handleDeleteInventoryItem}
                onAddAnnouncement={handleAddAnnouncement}
                onUpdateAnnouncement={handleUpdateAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                onAddArticle={handleAddArticle}
                onUpdateArticle={handleUpdateArticle}
                onDeleteArticle={handleDeleteArticle}
                onSwitchToWorkspace={() => handleChangeViewMode('workspace')}
                onSwitchToPublic={() => handleChangeViewMode('public')}
              />
            </main>
          </div>
        </div>
      ) : (
        /* ENVIRONMENT 2: MEMBER WORKSPACE (Activated members and administrators) */
        <div className="flex min-h-screen">
          {/* Collapsible Sidebar */}
          <Sidebar
            currentModule={currentModule}
            onSelectModule={handleSelectWorkspaceModule}
            viewMode={viewMode}
            onChangeViewMode={handleChangeViewMode}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            counts={{
              tasksUrgent,
              upcomingMeetings,
              activePrograms,
            }}
          />

          {/* Main Workspace Frame */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
              isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
            }`}
          >
            {/* Topbar */}
            <Topbar
              currentModule={currentModule}
              viewMode={viewMode}
              onChangeViewMode={handleChangeViewMode}
              onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              onSelectModule={handleSelectWorkspaceModule}
              notifications={tasks
                .filter((t) => t.priority === 'urgent' && t.status !== 'done')
                .slice(0, 5)
                .map((t) => ({
                  id: t.id,
                  title: t.title,
                  subtitle: `${t.assignee} · Tenggat: ${t.dueDate}`,
                  targetModule: 'tasks' as WorkspaceModuleId,
                }))}
            />

            {/* Content Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {currentModule === 'overview' && (
                <OverviewView
                  programs={programs}
                  tasks={tasks}
                  meetings={meetings}
                  transactions={transactions}
                  decisions={decisions}
                  onNavigate={handleSelectWorkspaceModule}
                  onToggleTask={handleToggleTask}
                />
              )}

              {currentModule === 'profile' && (
                <PersonalProfilePage
                  members={members}
                  mode={isWorkspaceProfileEdit ? 'edit_self' : 'view_self'}
                  onUpdateMember={handleUpdateMember}
                  onNavigate={navigateTo}
                />
              )}

              {currentModule === 'meetings' && (
                <MeetingsView
                  meetings={meetings}
                  members={members}
                  onAddMeeting={handleAddMeeting}
                  onUpdateMeeting={handleUpdateMeeting}
                  onDeleteMeeting={handleDeleteMeeting}
                  onToggleActionItem={handleToggleActionItem}
                />
              )}

              {currentModule === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  members={members}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onToggleComplete={handleToggleTask}
                />
              )}

              {currentModule === 'members' &&
                (workspaceMemberDetailMatch ? (
                  <PersonalProfilePage
                    members={members}
                    mode="view_member"
                    targetMemberId={workspaceMemberDetailMatch[1]}
                    onUpdateMember={handleUpdateMember}
                    onNavigate={navigateTo}
                  />
                ) : (
                  <MembersView
                    members={members}
                    onUpdateMember={handleUpdateMember}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                    onNavigateToAdmin={() => handleChangeViewMode('admin')}
                    onNavigate={navigateTo}
                  />
                ))}

              {currentModule === 'village-research' && (
                <VillageResearchView
                  data={villageResearch}
                  programs={programs}
                  surveys={surveys}
                  photos={documentation}
                  onUpdateVillageResearch={handleUpdateVillageResearch}
                  onNavigateToSurveys={() => handleSelectWorkspaceModule('surveys')}
                />
              )}

              {currentModule === 'surveys' && (
                <SurveysView
                  surveys={surveys}
                  members={members}
                  programs={programs}
                  villageResearch={villageResearch}
                  photos={documentation}
                  onAddSurvey={handleAddSurvey}
                  onUpdateSurvey={handleUpdateSurvey}
                  onDeleteSurvey={handleDeleteSurvey}
                />
              )}

              {currentModule === 'programs' && (
                <WorkProgramsView
                  programs={programs}
                  selectedProgramIdFromRoute={
                    workspaceProgramDetailMatch ? workspaceProgramDetailMatch[1] : undefined
                  }
                  onNavigate={navigateTo}
                  onToggleMilestone={handleToggleMilestone}
                  onTogglePublicVisibility={handleTogglePublicVisibility}
                  onUpdateProgram={handleUpdateProgram}
                />
              )}

              {currentModule === 'finance' && (
                <FinanceView
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                />
              )}

              {currentModule === 'inventory' && (
                <InventoryView
                  inventory={inventory}
                  onAddItem={handleAddInventoryItem}
                />
              )}

              {currentModule === 'documentation' && (
                <DocumentationAlbumsView
                  albums={documentationAlbums}
                  members={members}
                  programs={programs}
                  surveys={surveys}
                  selectedAlbumId={
                    workspaceAlbumDetailMatch ? workspaceAlbumDetailMatch[1] : undefined
                  }
                  onSaveAlbums={handleSaveDocumentationAlbums}
                  onNavigate={navigateTo}
                />
              )}

              {currentModule === 'reports' && (
                <ReportsView
                  reports={reports}
                  onAddReport={handleAddReport}
                  onUpdateReport={handleUpdateReport}
                />
              )}

              {currentModule === 'decisions' && (
                <DecisionLogView
                  decisions={decisions}
                  meetings={meetings}
                  members={members}
                  onAddDecision={handleAddDecision}
                  onUpdateDecision={handleUpdateDecision}
                  onDeleteDecision={handleDeleteDecision}
                />
              )}

              {currentModule === 'archive' && (
                <ArchiveView
                  records={archive}
                  onAddArchive={handleAddArchiveRecord}
                />
              )}

              {currentModule === 'settings' && (
                <SettingsView
                  config={unitConfig}
                  onUpdateConfig={setUnitConfig}
                  onResetData={handleResetData}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ConfirmProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfirmProvider>
  );
}

