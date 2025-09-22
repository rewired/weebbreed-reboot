import { useAppStore } from '@/store';

const App = () => {
  const connectionStatus = useAppStore((state) => state.connectionStatus);

  return (
    <main className="min-h-screen bg-background text-text-primary font-sans">
      <div className="mx-auto max-w-layout px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Weed Breed Simulation Dashboard</h1>
        <p className="mt-4 text-lg text-text-secondary">
          Connection status:{' '}
          <span className="font-mono text-accent-strong">{connectionStatus}</span>
        </p>
        <p className="mt-6 max-w-2xl text-text-muted">
          Core hooks, stores, and configuration from the legacy frontend are ready to plug into new
          views so we can focus on rapid feature development.
        </p>
      </div>
    </main>
  );
};

export default App;
