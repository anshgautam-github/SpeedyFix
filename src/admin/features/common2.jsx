import { useAsync } from '../../portal/hooks/useAsync';
import { useDebounced } from './common';
export { SearchBox } from './common';

/** Simple (non-paged) list loader that debounces any text dependency by wrapping the loader. */
export function useAdminList(loader, deps) {
  const d = useDebounced(JSON.stringify(deps), 300);
  const q = useAsync(loader, [d]);
  return { ...q, data: q.data };
}
