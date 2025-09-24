import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../i18n';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [i18n] = useState(() => initI18n());
  const [queryClient] = useState(() => createQueryClient());

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {children}
        {import.meta.env.DEV ? (
          <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        ) : null}
      </QueryClientProvider>
    </I18nextProvider>
  );
};
