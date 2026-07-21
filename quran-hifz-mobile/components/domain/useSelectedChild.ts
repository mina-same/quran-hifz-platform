import { useParentChildren, type ParentChild } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';

/**
 * Shared gate for the 5 non-dashboard parent screens: reads the active
 * child id from portalStore (set by <ChildSelector /> on the dashboard)
 * and resolves it against the parent's children list.
 */
export function useSelectedChild() {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);

  const activeChild: ParentChild | null =
    children?.find((c) => c._id === selectedChildId) ?? null;

  return {
    selectedChildId,
    activeChild,
    isChildrenLoading,
    hasNoChildren: !isChildrenLoading && (children?.length ?? 0) === 0,
  };
}
