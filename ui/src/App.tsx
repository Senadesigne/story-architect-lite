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
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

function AppContent() {
  const { user, loading } = useAuth();
  
  // Aktiviraj session timeout za prijavljene korisnike
  useSessionTimeout();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"></div>;
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <Navbar />
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
