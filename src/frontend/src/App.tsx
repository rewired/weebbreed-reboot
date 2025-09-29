import { useEffect, useMemo } from 'react';
import { StartScreen } from '@/views/StartScreen';
import { NewGameView } from '@/views/NewGameView';
import { DashboardShell } from '@/views/DashboardShell';
import { DashboardView } from '@/views/DashboardView';
import { StructureView } from '@/views/StructureView';
import { RoomView } from '@/views/RoomView';
import { ZoneView } from '@/views/ZoneView';
import { PersonnelView } from '@/views/PersonnelView';
import { FinanceView } from '@/views/FinanceView';
import { ModalHost } from '@/components/modals/ModalHost';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { useSimulationBridge } from '@/hooks/useSimulationBridge';
import { useNavigationStore } from '@/store/navigation';
import { useSimulationStore } from '@/store/simulation';
import { useUIStore } from '@/store/ui';

const App = () => {
  const bridge = useSimulationBridge();
  const currentView = useNavigationStore((state) => state.currentView);
  const snapshot = useSimulationStore((state) => state.snapshot);
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const { classList } = document.documentElement;
    classList.remove('theme-light', 'theme-forest', 'theme-weedbreed');
    if (theme === 'light') {
      classList.add('theme-light');
    } else if (theme === 'forest') {
      classList.add('theme-forest');
    } else {
      classList.add('theme-weedbreed');
    }
  }, [theme]);

  const content = useMemo(() => {
    switch (currentView) {
      case 'structure':
        return <StructureView />;
      case 'room':
        return <RoomView />;
      case 'zone':
        return <ZoneView bridge={bridge} />;
      case 'personnel':
        return <PersonnelView bridge={bridge} />;
      case 'finance':
        return <FinanceView bridge={bridge} />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  }, [currentView, bridge]);

  if (!snapshot || currentView === 'start') {
    return (
      <>
        <StartScreen bridge={bridge} />
        <ModalHost bridge={bridge} />
        <ToastViewport />
      </>
    );
  }

  if (currentView === 'newGame') {
    return (
      <>
        <NewGameView bridge={bridge} />
        <ModalHost bridge={bridge} />
        <ToastViewport />
      </>
    );
  }

  return (
    <>
      <DashboardShell bridge={bridge}>{content}</DashboardShell>
      <ModalHost bridge={bridge} />
      <ToastViewport />
    </>
  );
};

export default App;
