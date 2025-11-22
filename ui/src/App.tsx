import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from "@/components/theme-provider";
import { LoginForm } from '@/components/login-form';
import { Navbar } from '@/components/navbar';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { Home } from '@/pages/Home';
import { Settings } from '@/pages/Settings';
import { Page1 } from '@/pages/Page1';
import { Page2 } from '@/pages/Page2';
import { ProjectPage } from '@/pages/ProjectPage';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

function AppContent() {
  const { user, loading, isReady } = useAuth();
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith('/project');
  
  // Aktiviraj session timeout za prijavljene korisnike
  useSessionTimeout();

  if (loading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicijalizacija autentifikacije...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {!isProjectRoute && <Navbar />}
      {!user ? (
        <main className="flex flex-col items-center justify-center flex-1 p-4">
          <LoginForm />
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/page1" element={<MainLayout><Page1 /></MainLayout>} />
          <Route path="/page2" element={<MainLayout><Page2 /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          <Route path="/project/:projectId/*" element={<ProjectLayout><ProjectPage /></ProjectLayout>} />
        </Routes>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
        storageKey="volo-app-theme"
      >
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
