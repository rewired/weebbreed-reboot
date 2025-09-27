import type { ReactNode } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { EventLog } from '@/features/events/EventLog';
import type { SimulationBridge } from '@/facade/systemFacade';

interface DashboardShellProps {
  children: ReactNode;
  bridge: SimulationBridge;
}

export const DashboardShell = ({ children, bridge }: DashboardShellProps) => (
  <div className="flex min-h-screen w-full bg-surface text-text">
    <Sidebar />
    <div className="content-area flex min-h-screen w-full flex-col gap-6 px-6 pb-10 pt-6 lg:pl-8">
      <DashboardHeader bridge={bridge} />
      <Breadcrumbs />
      <main className="grid flex-1 gap-6 pb-20">{children}</main>
      <EventLog />
    </div>
  </div>
);
