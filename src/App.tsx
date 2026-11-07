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
  INITIAL_PUBLIC_FEEDBACK,
} from './data/mockData';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { InvitationManagerModal } from './components/admin/InvitationManagerModal';

import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';

import { OverviewView } from './components/workspace/OverviewView';
import { MeetingsView } from './components/workspace/MeetingsView';
import { TasksView } from './components/workspace/TasksView';
import { MembersView } from './components/workspace/MembersView';
import { VillageResearchView } from './components/workspace/VillageResearchView';
import { SurveysView } from './components/workspace/SurveysView';
import { WorkProgramsView } from './components/workspace/WorkProgramsView';
import { FinanceView } from './components/workspace/FinanceView';
import { InventoryView } from './components/workspace/InventoryView';
import { DocumentationView } from './components/workspace/DocumentationView';
import { ReportsView } from './components/workspace/ReportsView';
import { DecisionLogView } from './components/workspace/DecisionLogView';
import { ArchiveView } from './components/workspace/ArchiveView';
import { SettingsView } from './components/workspace/SettingsView';
import { PublicPortal } from './components/public/PublicPortal';
import { collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { Lock, LogIn, Globe } from 'lucide-react';
import { Member } from './types';

function AppContent() {
  const { user, profile, isAdmin, loading } = useAuth();

  // Navigation State
  const [currentModule, setCurrentModule] = useState<WorkspaceModuleId>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('workspace');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Core Data States
  const [unitConfig, setUnitConfig] = useState<UnitConfig>(INITIAL_UNIT_CONFIG);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [programs, setPrograms] = useState(INITIAL_PROGRAMS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [villageResearch] = useState(INITIAL_VILLAGE_RESEARCH);
  const [surveys, setSurveys] = useState(INITIAL_SURVEYS);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [documentation, setDocumentation] = useState(INITIAL_DOCUMENTATION);
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [decisions, setDecisions] = useState(INITIAL_DECISION_LOG);
  const [archive, setArchive] = useState(INITIAL_ARCHIVE);
  const [publicFeedback, setPublicFeedback] = useState(INITIAL_PUBLIC_FEEDBACK);

  // Sync with browser URL /pathname (e.g. /public)
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      if (path.includes('/public')) {
        setViewMode('public');
      } else {
        setViewMode('workspace');
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  // Sync members from Cloud Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => d.data() as Member);
          const memberMap = new Map<string, Member>();
          INITIAL_MEMBERS.forEach((m) => memberMap.set(m.id, m));
          loaded.forEach((m) => memberMap.set(m.id, m));
          const merged = Array.from(memberMap.values());
          merged.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
            const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
            return numA - numB;
          });
          setMembers(merged);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'members');
      }
    );
    return () => unsub();
  }, []);

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'public') {
      window.history.pushState({}, '', '/public');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    try {
      await setDoc(doc(db, 'members', updatedMember.id), updatedMember, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${updatedMember.id}`);
    }
  };


  // State mutation handlers
  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'done' ? 'todo' : 'done' }
          : t
      )
    );
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: (typeof tasks)[0]['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleToggleActionItem = (meetingId: string, actionItemId: string) => {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              actionItems: m.actionItems.map((ai) =>
                ai.id === actionItemId ? { ...ai, completed: !ai.completed } : ai
              ),
            }
          : m
      )
    );
  };

  const handleToggleMilestone = (programId: string, milestoneIndex: number) => {
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id !== programId) return p;
        const newMilestones = p.keyMilestones.map((m, idx) =>
          idx === milestoneIndex ? { ...m, completed: !m.completed } : m
        );
        const completedCount = newMilestones.filter((m) => m.completed).length;
        const newPercent = Math.round((completedCount / (newMilestones.length || 1)) * 100);
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
        p.id === programId ? { ...p, isFeaturedInPublic: !p.isFeaturedInPublic } : p
      )
    );
  };

  const handleAddPublicFeedback = async (fb: typeof publicFeedback[0]) => {
    setPublicFeedback((prev) => [fb, ...prev]);
    try {
      await addDoc(collection(db, 'publicFeedback'), {
        ...fb,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Persisted to local state, cloud sync notice:', err);
    }
  };

  const handleResetData = () => {
    if (confirm('Kembalikan semua data mock ke kondisi awal?')) {
      setUnitConfig(INITIAL_UNIT_CONFIG);
      setMembers(INITIAL_MEMBERS);
      setPrograms(INITIAL_PROGRAMS);
      setTasks(INITIAL_TASKS);
      setMeetings(INITIAL_MEETINGS);
      setTransactions(INITIAL_TRANSACTIONS);
      setSurveys(INITIAL_SURVEYS);
      setInventory(INITIAL_INVENTORY);
      setDocumentation(INITIAL_DOCUMENTATION);
      setReports(INITIAL_REPORTS);
      setDecisions(INITIAL_DECISION_LOG);
      setArchive(INITIAL_ARCHIVE);
      setPublicFeedback(INITIAL_PUBLIC_FEEDBACK);
    }
  };

  // Badge counts
  const tasksUrgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming').length;
  const activePrograms = programs.filter((p) => p.status === 'in_progress').length;

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
      />

      {/* Admin Invitation Manager */}
      <InvitationManagerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* If in Public Portal mode, render PublicPortal */}
      {viewMode === 'public' ? (
        <PublicPortal
          config={unitConfig}
          programs={programs}
          documentation={documentation}
          transactions={transactions}
          feedbackList={publicFeedback}
          onAddFeedback={handleAddPublicFeedback}
          onReturnToWorkspace={() => handleChangeViewMode('workspace')}
        />
      ) : (
        /* Workspace Mode */
        <div className="flex min-h-screen">
          {/* Collapsible Sidebar */}
          <Sidebar
            currentModule={currentModule}
            onSelectModule={setCurrentModule}
            viewMode={viewMode}
            onChangeViewMode={handleChangeViewMode}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            counts={{
              tasksUrgent,
              upcomingMeetings,
              activePrograms,
            }}
          />

          {/* Main Workspace Frame */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            {/* Topbar */}
            <Topbar
              currentModule={currentModule}
              viewMode={viewMode}
              onChangeViewMode={handleChangeViewMode}
              onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              onOpenInviteManager={() => setIsInviteModalOpen(true)}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />

            {/* If user is not logged in, show protected banner with quick sign in button */}
            {!user && (
              <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#CCDCD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 text-stone-700">
                  <div className="w-7 h-7 rounded-md bg-[#4A6B53] text-white flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900 block">
                      Akses Workspace Terbatas (Invitation-Only)
                    </span>
                    <span className="text-stone-500">
                      Anda sedang dalam mode pratinjau. Masuk atau aktivasi kode undangan untuk hak akses penuh.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk / Aktivasi</span>
                  </button>
                  <button
                    onClick={() => handleChangeViewMode('public')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#D5D2C8] text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-stone-500" />
                    <span>Buka Portal Publik</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {currentModule === 'overview' && (
                <OverviewView
                  programs={programs}
                  tasks={tasks}
                  meetings={meetings}
                  transactions={transactions}
                  onNavigate={setCurrentModule}
                  onToggleTask={handleToggleTask}
                />
              )}

              {currentModule === 'meetings' && (
                <MeetingsView
                  meetings={meetings}
                  onAddMeeting={(m) => setMeetings((prev) => [m, ...prev])}
                  onToggleActionItem={handleToggleActionItem}
                />
              )}

              {currentModule === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  members={members}
                  onAddTask={(t) => setTasks((prev) => [t, ...prev])}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onToggleComplete={handleToggleTask}
                />
              )}

              {currentModule === 'members' && (
                <MembersView
                  members={members}
                  onUpdateMember={handleUpdateMember}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                />
              )}

              {currentModule === 'village-research' && (
                <VillageResearchView data={villageResearch} />
              )}

              {currentModule === 'surveys' && (
                <SurveysView
                  surveys={surveys}
                  onAddSurvey={(s) => setSurveys((prev) => [s, ...prev])}
                />
              )}

              {currentModule === 'programs' && (
                <WorkProgramsView
                  programs={programs}
                  onToggleMilestone={handleToggleMilestone}
                  onTogglePublicVisibility={handleTogglePublicVisibility}
                />
              )}

              {currentModule === 'finance' && (
                <FinanceView
                  transactions={transactions}
                  onAddTransaction={(tx) => setTransactions((prev) => [tx, ...prev])}
                />
              )}

              {currentModule === 'inventory' && (
                <InventoryView
                  inventory={inventory}
                  onAddItem={(item) => setInventory((prev) => [item, ...prev])}
                />
              )}

              {currentModule === 'documentation' && (
                <DocumentationView
                  photos={documentation}
                  onAddPhoto={(p) => setDocumentation((prev) => [p, ...prev])}
                />
              )}

              {currentModule === 'reports' && (
                <ReportsView
                  reports={reports}
                  onAddReport={(r) => setReports((prev) => [r, ...prev])}
                />
              )}

              {currentModule === 'decisions' && (
                <DecisionLogView
                  decisions={decisions}
                  onAddDecision={(d) => setDecisions((prev) => [d, ...prev])}
                />
              )}

              {currentModule === 'archive' && (
                <ArchiveView
                  records={archive}
                  onAddArchive={(arc) => setArchive((prev) => [arc, ...prev])}
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
