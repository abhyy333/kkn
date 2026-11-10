import React, { useState, useEffect } from 'react';
import { WorkspaceModuleId, ViewMode, UnitConfig } from './types';
import { INITIAL_MEMBERS, OFFICIAL_PROJECT_ID } from './data/mockData';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordView } from './components/auth/ResetPasswordView';

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
  listWorkspaceRecords,
  upsertWorkspaceRecord,
  deleteWorkspaceRecord,
  migrateLegacyLocalStorageToSupabase,
  WorkspaceModuleKey,
} from './lib/workspaceRepository';
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

function AppContent() {
  const {
    user,
    profile,
    registeredEmails,
    isAdmin,
    isSuperAdmin,
    loading,
    isPasswordRecoveryMode,
    clearPasswordRecoveryMode,
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

  // Persistent workspace data is loaded from Supabase; mock/local datasets are not used as fallbacks.
  const [unitConfig, setUnitConfig] = useState<UnitConfig>({
    unitCode: '', unitName: '', university: '', faculty: '', period: '',
    villageName: '', district: '', regency: '', startDate: '', endDate: '',
    dplName: '', dplNip: '', poskoAddress: '',
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [sbPublicRoster, setSbPublicRoster] = useState<any[]>([]);
  const [dplSupervisorRecord, setDplSupervisorRecord] = useState<any | null>(null);
  const [programs, setPrograms] = useState<WorkProgram[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [villageResearch, setVillageResearch] = useState<VillageResearchData>({
    villageName: '', kecamatan: '', kabupaten: '', province: '', geography: '',
    elevation: '', totalPopulation: null, totalHouseholds: null, totalAreaHectares: null,
    dusuns: [], potencies: [],
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    priorityNeeds: [],
  });
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [documentation, setDocumentation] = useState<DocumentationPhoto[]>([]);
  const [documentationAlbums, setDocumentationAlbums] = useState<DocumentationAlbum[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogRecord[]>([]);
  const [archive, setArchive] = useState<ArchiveRecord[]>([]);
  const [publicArticles, setPublicArticles] = useState<PublicArticleRecord[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);

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
        isPasswordRecoveryMode ||
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
  }, [user, profile, isSuperAdmin, loading, isPasswordRecoveryMode]);

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
      if (!sbMembers.length) {
        setMembers([]);
        return;
      }

      const legacyIdsByName = new Map(
        INITIAL_MEMBERS.map((member) => [member.name.trim().toLowerCase(), member.id])
      );
      const memberMap = new Map<string, Member>();

      sbMembers.forEach((rawM: any) => {
        if (!rawM || typeof rawM !== 'object' || isFabricatedLegacyRecord(rawM)) return;
        const databaseId = String(rawM.id || rawM.member_id || rawM.memberId || '').trim();
        const name = String(rawM.full_name || rawM.name || '').trim();
        if (!databaseId || !name) return;
        const id = legacyIdsByName.get(name.toLowerCase()) || databaseId;
        memberMap.set(id, {
          id,
          databaseId,
          name,
          role: String(rawM.position_title || 'Anggota KKN'),
          position: String(rawM.position_title || 'Anggota KKN'),
          division: String(rawM.division || ''),
          major: String(rawM.study_program || ''),
          faculty: String(rawM.faculty || ''),
          nim: String(rawM.student_number || ''),
          phone: String(rawM.phone_private || ''),
          email: '',
          emergencyContact: '',
          avatar: '',
          avatarStoragePath: String(rawM.avatar_path || ''),
          bio: String(rawM.profile_bio || ''),
          isLeader: rawM.position_title === 'Ketua',
          status: rawM.status === 'inactive' ? 'leave' : 'active',
          systemRole: 'member',
          accountStatus: 'unregistered',
          authUid: rawM.auth_user_id ? String(rawM.auth_user_id) : undefined,
        });
      });

      sbRegisteredEmails.forEach((reg) => {
        if (!reg || typeof reg !== 'object') return;
        const regEmail = String(reg.email || '').trim().toLowerCase();
        const regMemberId = String(reg.member_id || '').trim();
        if (!regEmail || !regMemberId) return;
        const target = Array.from(memberMap.entries()).find(
          ([legacyId, item]) => item.databaseId === regMemberId || legacyId === regMemberId
        );
        if (!target) return;
        const [legacyId, member] = target;
        const isDisabled = reg.is_enabled === false;
        const isActivated = !isDisabled && Boolean(reg.activated_at && member.authUid);
        memberMap.set(legacyId, {
          ...member,
          email: isDisabled ? '' : regEmail,
          registeredEmail: isDisabled ? undefined : regEmail,
          accountStatus: isDisabled ? 'disabled' : isActivated ? 'active' : 'pending',
          acceptedAt: reg.activated_at || undefined,
        });
      });

      if (user?.email) {
        const currentEmail = user.email.trim().toLowerCase();
        for (const [id, member] of memberMap.entries()) {
          const isOwnUid = Boolean(user.uid && member.authUid && member.authUid === user.uid);
          if (isOwnUid || (currentEmail === 'abhyy333@gmail.com' && member.databaseId === profile?.memberId)) {
            memberMap.set(id, {
              ...member,
              authUid: user.uid,
              email: user.email,
              registeredEmail: user.email,
              accountStatus: 'active',
              acceptedAt: profile?.acceptedAt || member.acceptedAt,
            });
          }
        }
      }

      const merged = Array.from(memberMap.values());
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
        .eq('project_id', OFFICIAL_PROJECT_ID)
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
                  dplName: supervisor.full_name || prev.dplName,
                  dplNip: supervisor.institutional_id || prev.dplNip,
                  faculty: supervisor.faculty || prev.faculty,
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
        .eq('project_id', OFFICIAL_PROJECT_ID)
        .eq('member_category', 'supervisor')
        .maybeSingle()
        .then(
          ({ data }) => {
            if (data) {
              setDplSupervisorRecord(data);
              setUnitConfig((prev) => ({
                ...prev,
                dplName: data.full_name || prev.dplName,
                dplNip: data.institutional_id || prev.dplNip,
                faculty: data.faculty || prev.faculty,
              }));
            }
          },
          () => {}
        );

      // 4. Authoritative verified registered_emails
      supabase
        .from('registered_emails')
        .select('id,project_id,member_id,email,is_enabled,activated_at,created_at')
        .eq('project_id', OFFICIAL_PROJECT_ID)
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
  }, [user, profile, registeredEmails]);

  // Load workspace module data from Supabase. Local storage is reserved for one-time legacy import only.
  useEffect(() => {
    let cancelled = false;

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
        dueDate: String(t.dueDate || new Date().toISOString().slice(0, 10)),
        tags: Array.isArray(t.tags) ? t.tags : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      };
    };

    const normalizeMeeting = (m: any): MeetingItem | null => {
      if (!m || !m.id || !m.title) return null;
      const attendeesList = Array.isArray(m.attendeesList) ? m.attendeesList : [];
      return {
        ...m,
        id: String(m.id),
        title: String(m.title),
        date: String(m.date || new Date().toISOString().slice(0, 10)),
        time: String(m.time || ''),
        location: String(m.location || ''),
        type: m.type || 'Internal Posko',
        attendeesCount: typeof m.attendeesCount === 'number'
          ? m.attendeesCount
          : attendeesList.filter((a: any) => a?.status === 'hadir').length,
        attendeesList,
        agenda: Array.isArray(m.agenda) ? m.agenda.filter(Boolean).map(String) : [],
        notesSummary: String(m.notesSummary || ''),
        actionItems: Array.isArray(m.actionItems) ? m.actionItems : [],
        documents: Array.isArray(m.documents) ? m.documents : [],
        status: m.status === 'completed' ? 'completed' : 'upcoming',
      };
    };

    const safeList = async <T extends { id: string }>(moduleKey: WorkspaceModuleKey): Promise<T[]> => {
      try {
        return await listWorkspaceRecords<T>(moduleKey);
      } catch (error) {
        console.error(`Failed to load Supabase module ${moduleKey}:`, error);
        return [];
      }
    };

    const loadWorkspace = async () => {
      try {
        if (user && isSuperAdmin) {
          try {
            const migration = await migrateLegacyLocalStorageToSupabase();
            if (migration.removedKeys > 0) {
              appNotify({
                type: 'success',
                title: 'Data Lama Dipindahkan',
                message: `${migration.migratedRecords} record dipindahkan ke Supabase; ${migration.removedKeys} kunci penyimpanan lokal KKN dibersihkan.`,
              });
            }
          } catch (migrationError) {
            console.error('Legacy KKN data migration failed:', migrationError);
            appNotify({
              type: 'error',
              title: 'Migrasi Data Lokal Belum Selesai',
              message: migrationError instanceof Error
                ? migrationError.message
                : 'Data lokal belum dihapus karena pemindahan ke Supabase gagal.',
            });
          }
        }

        const publicRecordsPromise = Promise.all([
          safeList<PublicArticleRecord>('public_articles'),
          safeList<AnnouncementRecord>('announcements'),
        ]);
        if (!user || !isSupabaseConfigured) {
          const [articles, news] = await publicRecordsPromise;
          if (!cancelled) {
            setPublicArticles(articles);
            setAnnouncements(news);
          }
          return;
        }

        const [
          projectResult,
          programsData, tasksData, meetingsData, decisionsData, villageData,
          surveysData, documentationData, albumsData, transactionsData,
          inventoryData, reportsData, archiveData, stakeholdersData, publicData,
          unitConfigRecords,
        ] = await Promise.all([
          supabase.from('kkn_projects')
            .select('slug,name,village_name,subdistrict,regency,province,academic_year,starts_on,ends_on')
            .eq('id', OFFICIAL_PROJECT_ID)
            .maybeSingle(),
          safeList<WorkProgram>('programs'),
          safeList<TaskItem>('tasks'),
          safeList<MeetingItem>('meetings'),
          safeList<DecisionLogRecord>('decisions'),
          safeList<VillageResearchData>('village_research'),
          safeList<SurveyRecord>('surveys'),
          safeList<DocumentationPhoto>('documentation'),
          safeList<DocumentationAlbum>('documentation_albums'),
          safeList<TransactionRecord>('transactions'),
          safeList<InventoryRecord>('inventory'),
          safeList<ReportRecord>('reports'),
          safeList<ArchiveRecord>('archive'),
          safeList<StakeholderRecord>('stakeholders'),
          publicRecordsPromise,
          safeList<UnitConfig & { id: string }>('unit_config'),
        ]);

        if (projectResult.error) {
          throw new Error(`Gagal memuat konfigurasi project: ${projectResult.error.message}`);
        }
        if (cancelled) return;

        const project = projectResult.data;
        const projectUnitConfig: UnitConfig = {
          unitCode: String(project?.slug || ''),
          unitName: String(project?.name || ''),
          university: '',
          faculty: '',
          period: String(project?.academic_year || ''),
          villageName: String(project?.village_name || ''),
          district: String(project?.subdistrict || ''),
          regency: [project?.regency, project?.province].filter(Boolean).join(', '),
          startDate: String(project?.starts_on || ''),
          endDate: String(project?.ends_on || ''),
          dplName: String(dplSupervisorRecord?.full_name || ''),
          dplNip: String(dplSupervisorRecord?.institutional_id || ''),
          poskoAddress: '',
        };
        setUnitConfig({ ...projectUnitConfig, ...(unitConfigRecords[0] || {}) });

        const emptyVillageResearch: VillageResearchData = {
          villageName: String(project?.village_name || ''),
          kecamatan: String(project?.subdistrict || ''),
          kabupaten: String(project?.regency || ''),
          province: String(project?.province || ''),
          geography: '',
          elevation: '',
          totalPopulation: null,
          totalHouseholds: null,
          totalAreaHectares: null,
          dusuns: [],
          potencies: [],
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
          priorityNeeds: [],
        };

        setPrograms(programsData);
        setTasks(tasksData.map(normalizeTask).filter(Boolean) as TaskItem[]);
        setMeetings(meetingsData.map(normalizeMeeting).filter(Boolean) as MeetingItem[]);
        setDecisions(decisionsData.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
        setVillageResearch(villageData[0] || emptyVillageResearch);
        setSurveys(surveysData.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
        setDocumentation(documentationData.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
        setDocumentationAlbums(albumsData);
        setTransactions(transactionsData);
        setInventory(inventoryData);
        setReports(reportsData);
        setArchive(archiveData);
        setStakeholders(stakeholdersData);
        setPublicArticles(publicData[0]);
        setAnnouncements(publicData[1]);
      } catch (error) {
        console.error('Workspace Supabase load failed:', error);
        if (!cancelled) {
          appNotify({
            type: 'error',
            title: 'Gagal Memuat Data Supabase',
            message: error instanceof Error ? error.message : 'Periksa koneksi dan izin database.',
          });
        }
      }
    };

    void loadWorkspace();
    return () => { cancelled = true; };
  }, [user?.uid, isSuperAdmin, dplSupervisorRecord?.id]);

  const handleSaveDocumentationAlbums = async (nextAlbums: DocumentationAlbum[]) => {
    const nextIds = new Set(nextAlbums.map((album) => album.id));
    const removedAlbums = documentationAlbums.filter((album) => !nextIds.has(album.id));
    for (const album of removedAlbums) {
      await deleteWorkspaceRecord('documentation_albums', album.id);
    }
    for (const album of nextAlbums) {
      await upsertWorkspaceRecord('documentation_albums', album);
    }
    setDocumentationAlbums(nextAlbums);
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

  const handleUpdateUnitConfig = async (updatedConfig: UnitConfig) => {
    await upsertWorkspaceRecord('unit_config', {
      id: 'unit-config',
      ...updatedConfig,
    });
    setUnitConfig(updatedConfig);
  };

  const syncToSupabase = async (
    moduleKey: WorkspaceModuleKey,
    payload: Record<string, any>
  ) => {
    await upsertWorkspaceRecord(moduleKey, payload as { id: string });
  };

  const deleteFromSupabase = async (moduleKey: WorkspaceModuleKey, id: string) => {
    await deleteWorkspaceRecord(moduleKey, id);
  };

  const handleDplReportNote = async (
    reportId: string,
    notes: string,
    status: ReportRecord['status']
  ) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase belum terkonfigurasi. Penilaian laporan tidak dapat disimpan.');
    }

    const decision: 'approved' | 'revision_requested' | 'rejected' =
      status === 'approved' || status === 'approved_by_dpl'
        ? 'approved'
        : status === 'rejected'
          ? 'rejected'
          : 'revision_requested';

    const { data, error } = await supabase.functions.invoke('dpl-report-review', {
      body: {
        report_id: reportId,
        decision,
        feedback: notes,
      },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || 'Penilaian DPL gagal disimpan ke Supabase.');
    }

    const updatedReports = await listWorkspaceRecords<ReportRecord>('reports');
    setReports(updatedReports);
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    const existingMember = members.find((m) => m.id === updatedMember.id);
    if (!existingMember?.databaseId) {
      throw new Error('ID anggota Supabase tidak ditemukan. Muat ulang daftar anggota.');
    }

    const isOwnRecord = Boolean(
      user &&
      (
        existingMember.databaseId === profile?.memberId ||
        existingMember.authUid === user.uid ||
        existingMember.email?.toLowerCase() === user.email?.toLowerCase() ||
        existingMember.registeredEmail?.toLowerCase() === user.email?.toLowerCase()
      )
    );

    if (!isSuperAdmin && !isOwnRecord) {
      throw new Error(
        'Akses ditolak: Anda hanya diizinkan mengubah profil dan data keanggotaan Anda sendiri.'
      );
    }
    if (!isSupabaseConfigured) {
      throw new Error('Supabase belum terkonfigurasi. Perubahan profil tidak dapat disimpan.');
    }

    const sanitizedMember: Member = {
      ...existingMember,
      ...updatedMember,
      id: existingMember.id,
      databaseId: existingMember.databaseId,
      name: updatedMember.name?.trim() || existingMember.name,
      role: isSuperAdmin ? (updatedMember.role?.trim() || existingMember.role) : existingMember.role,
      position: isSuperAdmin
        ? (updatedMember.position?.trim() || updatedMember.role?.trim() || existingMember.position)
        : existingMember.position,
      division: isSuperAdmin ? (updatedMember.division?.trim() || existingMember.division) : existingMember.division,
      nim: isSuperAdmin ? (updatedMember.nim?.trim() || existingMember.nim) : existingMember.nim,
      major: isSuperAdmin ? (updatedMember.major?.trim() || existingMember.major) : existingMember.major,
      faculty: isSuperAdmin ? (updatedMember.faculty?.trim() || existingMember.faculty) : existingMember.faculty,
      phone: updatedMember.phone?.trim() ?? existingMember.phone,
      bio: updatedMember.bio !== undefined ? updatedMember.bio : existingMember.bio,
      avatar: updatedMember.avatar || existingMember.avatar,
      avatarStoragePath: updatedMember.avatarStoragePath || existingMember.avatarStoragePath,
      responsibilities: isSuperAdmin && Array.isArray(updatedMember.responsibilities)
        ? updatedMember.responsibilities
        : existingMember.responsibilities,
      systemRole: existingMember.systemRole,
      authUid: existingMember.authUid,
      accountStatus: existingMember.accountStatus,
      email: existingMember.email,
      registeredEmail: existingMember.registeredEmail,
      acceptedAt: existingMember.acceptedAt,
      disabledAt: existingMember.disabledAt,
    };

    if (isSuperAdmin) {
      const { error } = await supabase
        .from('members')
        .update({
          full_name: sanitizedMember.name,
          position_title: sanitizedMember.position || sanitizedMember.role,
          division: sanitizedMember.division,
          student_number: sanitizedMember.nim || null,
          study_program: sanitizedMember.major || null,
          faculty: sanitizedMember.faculty || null,
          phone_private: sanitizedMember.phone || null,
          profile_bio: sanitizedMember.bio || null,
          avatar_path: sanitizedMember.avatarStoragePath || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMember.databaseId)
        .eq('project_id', OFFICIAL_PROJECT_ID);

      if (error) {
        throw new Error(`Gagal memperbarui data anggota di Supabase: ${error.message}`);
      }
    } else {
      const { error } = await supabase.rpc('update_own_member_profile', {
        p_member_id: existingMember.databaseId,
        p_name: sanitizedMember.name,
        p_phone: sanitizedMember.phone || null,
        p_bio: sanitizedMember.bio || null,
        p_avatar_path: sanitizedMember.avatarStoragePath || null,
      });
      if (error) {
        throw new Error(`Gagal memperbarui profil pribadi: ${error.message}`);
      }
    }

    setMembers((prev) =>
      prev.map((member) => member.id === sanitizedMember.id ? sanitizedMember : member)
    );

    if (isOwnRecord) {
      syncOwnProfileMetadata({
        displayName: sanitizedMember.name,
        position: sanitizedMember.position || sanitizedMember.role,
        division: sanitizedMember.division,
      });
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

  // Meetings Supabase + Local CRUD
  const handleAddMeeting = async (newMeeting: MeetingItem) => {
    setMeetings((prev) => {
      const next = [newMeeting, ...prev];
      
      return next;
    });
    await syncToSupabase('meetings', newMeeting);
  };

  const handleUpdateMeeting = async (updatedMeeting: MeetingItem) => {
    setMeetings((prev) => {
      const next = prev.map((m) =>
        m.id === updatedMeeting.id ? updatedMeeting : m
      );
      
      return next;
    });
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

    setMeetings((prev) => {
      const next = prev.filter((m) => m.id !== meetingId);
      
      return next;
    });
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

  // Tasks Supabase + Local CRUD
  const handleAddTask = async (newTask: TaskItem) => {
    setTasks((prev) => {
      const next = [newTask, ...prev];
      
      return next;
    });
    await syncToSupabase('tasks', newTask);
  };

  const handleUpdateTask = async (updatedTask: TaskItem) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === updatedTask.id ? updatedTask : t
      );
      
      return next;
    });
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

    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      
      return next;
    });
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

  // Decisions Supabase + Local CRUD
  const handleAddDecision = async (newDecision: DecisionLogRecord) => {
    setDecisions((prev) => {
      const next = [newDecision, ...prev];
      
      return next;
    });
    await syncToSupabase('decisions', newDecision);
  };

  const handleUpdateDecision = async (updatedDecision: DecisionLogRecord) => {
    setDecisions((prev) => {
      const next = prev.map((d) =>
        d.id === updatedDecision.id ? updatedDecision : d
      );
      
      return next;
    });
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

    setDecisions((prev) => {
      const next = prev.filter((d) => d.id !== decisionId);
      
      return next;
    });
    await deleteFromSupabase('decisions', decisionId);
    appNotify({
      type: 'success',
      title: 'Keputusan Dihapus',
      message: 'Catatan keputusan telah dihapus dari sistem.',
    });
  };

  // Village Research Supabase + Local CRUD
  const handleUpdateVillageResearch = async (
    updatedData: VillageResearchData
  ) => {
    setVillageResearch(updatedData);
    
    await syncToSupabase('village_research', {
      id: 'pringgasela-selatan',
      ...updatedData,
    });
  };

  // Surveys Supabase + Local CRUD
  const handleAddSurvey = async (newSurvey: SurveyRecord) => {
    setSurveys((prev) => {
      const next = [newSurvey, ...prev];
      
      return next;
    });
    await syncToSupabase('surveys', newSurvey);
  };

  const handleUpdateSurvey = async (updatedSurvey: SurveyRecord) => {
    setSurveys((prev) => {
      const next = prev.map((s) =>
        s.id === updatedSurvey.id ? updatedSurvey : s
      );
      
      return next;
    });
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

    setSurveys((prev) => {
      const next = prev.filter((s) => s.id !== surveyId);
      
      return next;
    });
    await deleteFromSupabase('surveys', surveyId);
    appNotify({
      type: 'success',
      title: 'Data Survei Dihapus',
      message: 'Rekaman survei lapangan telah dihapus.',
    });
  };

  // Documentation Supabase + Local CRUD
  const handleAddPhoto = async (newPhoto: DocumentationPhoto) => {
    setDocumentation((prev) => {
      const next = [newPhoto, ...prev];
      
      return next;
    });
    await syncToSupabase('documentation', newPhoto);
  };

  const handleUpdatePhoto = async (updatedPhoto: DocumentationPhoto) => {
    setDocumentation((prev) => {
      const next = prev.map((p) =>
        p.id === updatedPhoto.id ? updatedPhoto : p
      );
      
      return next;
    });
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

    setDocumentation((prev) => {
      const next = prev.filter((p) => p.id !== photoId);
      
      return next;
    });
    await deleteFromSupabase('documentation', photoId);
  };

  const handleToggleMilestone = async (
    programId: string,
    milestoneIndex: number
  ) => {
    const current = programs.find((program) => program.id === programId);
    if (!current) return;

    const newMilestones = current.keyMilestones.map((milestone, index) =>
      index === milestoneIndex
        ? { ...milestone, completed: !milestone.completed }
        : milestone
    );
    const completedCount = newMilestones.filter((milestone) => milestone.completed).length;
    const newPercent = Math.round((completedCount / (newMilestones.length || 1)) * 100);
    const updatedProgram: WorkProgram = {
      ...current,
      keyMilestones: newMilestones,
      progressPercent: newPercent,
      status: newPercent === 100 ? 'completed' : 'in_progress',
    };

    await syncToSupabase('programs', updatedProgram);
    setPrograms((prev) => prev.map((program) =>
      program.id === programId ? updatedProgram : program
    ));
  };

  const handleTogglePublicVisibility = async (programId: string) => {
    const current = programs.find((program) => program.id === programId);
    if (!current) return;
    const updatedProgram = {
      ...current,
      isFeaturedInPublic: !current.isFeaturedInPublic,
    };
    await syncToSupabase('programs', updatedProgram);
    setPrograms((prev) => prev.map((program) =>
      program.id === programId ? updatedProgram : program
    ));
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
    if (!isSuperAdmin) {
      throw new Error('Hanya Super Admin yang dapat menghapus seluruh data workspace.');
    }
    const ok = await appConfirm({
      title: 'Hapus Seluruh Data Operasional Workspace?',
      description:
        'Tindakan ini menghapus data program, tugas, rapat, survei, dokumen, transaksi, laporan, dan pengumuman dari Supabase. Profil anggota, akun, histori registrasi, serta log keamanan tidak dihapus.',
      targetName: 'Data Operasional KKN SPACE di Supabase',
      consequences: [
        'Seluruh record operasional pada modul workspace akan dihapus permanen.',
        'Profil anggota dan akun login tetap dipertahankan.',
      ],
      level: 'irreversible',
      confirmLabel: 'Hapus Data Operasional',
      requireTypeConfirmation: 'RESET',
    });
    if (!ok) return;

    const modules: WorkspaceModuleKey[] = [
      'unit_config', 'programs', 'tasks', 'meetings', 'decisions',
      'village_research', 'surveys', 'documentation', 'documentation_albums',
      'transactions', 'inventory', 'reports', 'archive', 'stakeholders',
      'announcements', 'public_articles',
    ];

    for (const moduleKey of modules) {
      const records = await listWorkspaceRecords<{ id: string } & Record<string, any>>(moduleKey);
      for (const record of records) {
        await deleteWorkspaceRecord(moduleKey, record.id);
      }
    }

    setPrograms([]);
    setTasks([]);
    setMeetings([]);
    setTransactions([]);
    setSurveys([]);
    setInventory([]);
    setDocumentation([]);
    setDocumentationAlbums([]);
    setReports([]);
    setDecisions([]);
    setArchive([]);
    setStakeholders([]);
    setPublicArticles([]);
    setAnnouncements([]);
    setVillageResearch({
      villageName: unitConfig.villageName,
      kecamatan: unitConfig.district,
      kabupaten: unitConfig.regency.split(',')[0] || '',
      province: unitConfig.regency.split(',').slice(1).join(',').trim(),
      geography: '',
      elevation: '',
      totalPopulation: null,
      totalHouseholds: null,
      totalAreaHectares: null,
      dusuns: [],
      potencies: [],
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      priorityNeeds: [],
    });
    setDocumentation([]);
    appNotify({
      type: 'success',
      title: 'Data Operasional Dihapus',
      message: 'Workspace telah dikosongkan di Supabase. Data anggota dan autentikasi tetap aman.',
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

  if (isResetPasswordRoute || isPasswordRecoveryMode) {
    return (
      <ResetPasswordView
        onRedirectToLogin={() => {
          clearPasswordRecoveryMode();
          setIsResetPasswordRoute(false);
          navigateTo('/public');
          setIsAuthModalOpen(true);
        }}
        onNavigateToPublic={() => {
          clearPasswordRecoveryMode();
          setIsResetPasswordRoute(false);
          navigateTo('/public');
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
          onRefreshData={async () => {
            try {
              const latestReports = await listWorkspaceRecords<ReportRecord>('reports');
              setReports(latestReports);
              appNotify({
                type: 'success',
                title: 'Laporan Diperbarui',
                message: 'Daftar laporan berhasil dimuat ulang dari Supabase.',
              });
            } catch (error) {
              appNotify({
                type: 'error',
                title: 'Gagal Memuat Laporan',
                message: error instanceof Error ? error.message : 'Data laporan tidak dapat dimuat.',
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
                onUpdateUnitConfig={handleUpdateUnitConfig}
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
                  onUpdateConfig={handleUpdateUnitConfig}
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

