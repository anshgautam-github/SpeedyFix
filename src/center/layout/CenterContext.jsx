import { createContext, useContext, useMemo } from 'react';
import { centerServices } from '../services';
import { useAsync } from '../../portal/hooks/useAsync';
import { ErrorState, Skeleton } from '../../portal/ui';

const Ctx = createContext(null);
export const useCenter = () => useContext(Ctx);

/** Loads who the signed-in staff member is, which center they belong to, and what their role may do. */
export function CenterProvider({ children }) {
  const q = useAsync(() => centerServices.context.get(), []);
  const value = useMemo(() => (q.data ? { ...q.data, can: (p) => q.data.permissions.includes(p), reload: q.reload } : null), [q.data, q.reload]);
  if (q.error) return <div className="mx-auto max-w-xl p-6"><ErrorState error={q.error} onRetry={q.reload} title="Could not load your service center" /></div>;
  if (!value) return <div className="mx-auto max-w-5xl space-y-4 p-6"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
