import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { StudyFlowProvider, useStudyFlow } from "./context/StudyFlowContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { MobileNav } from "./components/layout/MobileNav";
import { DashboardView } from "./components/dashboard/DashboardView";
import { SubjectsView } from "./components/subjects/SubjectsView";
import { PlannerView } from "./components/planner/PlannerView";
import { AssignmentsView } from "./components/assignments/AssignmentsView";
import { ExamsView } from "./components/exams/ExamsView";
import { FocusTimer } from "./components/focus/FocusTimer";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { SettingsView } from "./components/settings/SettingsView";
import { QuizGeneratorView } from "./components/ai/QuizGeneratorView";
import { NotesSummarizerView } from "./components/ai/NotesSummarizerView";
import { RoadmapView } from "./components/roadmap/RoadmapView";
import { KamranAssistant } from "./components/ai/KamranAssistant";
import { QuickSearchModal } from "./components/common/QuickSearchModal";
import { Toast } from "./components/common/Toast";
import { AuthModal } from "./components/auth/AuthModal";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const MainContent: React.FC = () => {
  const { activePage, setActivePage } = useStudyFlow();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const renderActiveView = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardView />;
      case "subjects":
        return <SubjectsView />;
      case "planner":
        return <PlannerView />;
      case "assignments":
        return <AssignmentsView />;
      case "exams":
        return <ExamsView />;
      case "roadmap":
        return <RoadmapView />;
      case "quizzes":
        return <QuizGeneratorView />;
      case "summarizer":
        return <NotesSummarizerView />;
      case "focus":
        return <FocusTimer />;
      case "analytics":
        return <AnalyticsView />;
      case "profile":
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#161513] text-[#22211F] dark:text-[#F5F3EE] flex font-sans antialiased selection:bg-[#F4ECC9] dark:selection:bg-[#4A3B1E] selection:text-[#22211F] dark:selection:text-[#FAF9F6] transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Header */}
        <Header onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} />

        {/* Dynamic Page Views */}
        <main className="flex-1 px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            <ErrorBoundary onResetToDashboard={() => setActivePage("dashboard")}>
              {renderActiveView()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Navigation and Drawer */}
      <MobileNav
        isDrawerOpen={isMobileDrawerOpen}
        setIsDrawerOpen={setIsMobileDrawerOpen}
      />

      {/* Global Study Tutor / AI Assistant */}
      <KamranAssistant />

      {/* Global Modals & Notifications */}
      <QuickSearchModal />
      <Toast />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StudyFlowProvider>
        <MainContent />
      </StudyFlowProvider>
    </AuthProvider>
  );
}
