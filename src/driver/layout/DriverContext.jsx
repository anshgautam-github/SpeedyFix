import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { driverServices } from '../services';
import { useAsync, usePolling } from '../../portal/hooks/useAsync';
import { onDataChanged } from '../../portal/lib/events';

const Ctx = createContext(null);
export const useDriver = () => useContext(Ctx);

/** Holds the server-confirmed availability so the top bar and dashboard always agree. */
export function DriverProvider({ children }) {
  const a = useAsync(() => driverServices.availability.get(), []);
  usePolling(() => a.reload(true), 15000);
  // Any job action can put the driver on (or take them off) a job, so re-read the confirmed state right away.
  useEffect(() => onDataChanged(() => a.reload(true)), [a.reload]);
  const set = useCallback(async (online) => {
    const next = await driverServices.availability.set(online); // rejects if the server refuses
    a.setData(next);
    return next;
  }, [a]);
  const value = useMemo(() => ({ availability: a.data, loading: a.loading, error: a.error, reload: a.reload, setOnline: set }), [a.data, a.loading, a.error, a.reload, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
