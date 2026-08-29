import { useEffect, useMemo, useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Snap points as percentages of screen height, e.g. ['40%', '80%']. Defaults to a single auto-sizing snap point. */
  snapPoints?: (string | number)[];
  /**
   * Render `children` straight into the sheet, with no BottomSheetView wrapper.
   * REQUIRED whenever the content is (or contains) a BottomSheet* scrollable:
   * BottomSheetView's focus effect re-tags the sheet's scrollable as
   * SCROLLABLE_TYPE.VIEW, and because parent effects run after child ones it
   * always wins over the scrollable's own registration — the list then scrolls
   * the sheet instead of itself. The sheet's content container already has an
   * explicit height for fixed snap points, so a `flex: 1` scrollable laid out
   * directly under it fills correctly without the wrapper.
   */
  rawContent?: boolean;
  /** Pinned footer, rendered by the library on top of the content (use BottomSheetFooter). */
  footerComponent?: React.FC<BottomSheetFooterProps>;
}

/**
 * Shared gesture-driven bottom sheet (wraps @gorhom/bottom-sheet) — the app-wide
 * replacement for hand-rolled `Modal` + manual height math dropdowns/popups.
 * Controlled the same way a plain <Modal visible onClose /> would be, so call
 * sites don't need to manage imperative refs.
 */
export default function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  rawContent = false,
  footerComponent,
}: Props) {
  const theme = useAppTheme();
  const ref = useRef<BottomSheetModal>(null);
  const points = useMemo(() => snapPoints ?? ['50%'], [snapPoints]);
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => StyleSheet.create({
    background: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    handle: {
      backgroundColor: theme.border,
      width: 40,
    },
    /**
     * BottomSheetView is `position: absolute` with only top/left/right pinned, so it
     * hugs its content height and any child laid out with `flex: 1` (a scroll list, a
     * footer pinned to the bottom) collapses to zero height and the sheet renders
     * blank. Pinning `bottom: 0` — the one edge the library leaves alone — makes it
     * fill the sheet, which already has an explicit height whenever snapPoints are
     * given. Only safe for fixed snap points: with enableDynamicSizing the sheet
     * height is derived FROM this view's measured height, so filling would loop.
     */
    contentFill: {
      bottom: 0,
    },
  }), [theme]);

  // The sheet is drawn over the home indicator, so a footer button laid out at
  // the very bottom of the content ends up half-swallowed by it. Every sheet
  // pays the inset once, here, instead of each call site guessing a magic
  // paddingBottom (which is how the date picker's "تم" button got clipped).
  const bottomPad = useMemo(() => ({ paddingBottom: 24 + insets.bottom }), [insets.bottom]);

  // Only dismiss a sheet that was actually presented. Calling dismiss() on a
  // never-presented BottomSheetModal moves its internal status to DISMISSING and
  // leaves it there forever: dismiss() delegates to the inner sheet's
  // forceClose() to animate back out, but there is no inner sheet mounted yet, so
  // no animation callback ever runs to clear the status. From then on the modal's
  // portal render is short-circuited (`if (status === DISMISSING) return;`), so a
  // later present() mounts nothing and the sheet silently never appears. Since
  // this component is controlled, `visible` starts false on every mount, which
  // used to poison every sheet in the app before its first open.
  const wasPresented = useRef(false);

  useEffect(() => {
    if (visible) {
      wasPresented.current = true;
      ref.current?.present();
    } else if (wasPresented.current) {
      wasPresented.current = false;
      ref.current?.dismiss();
    }
  }, [visible]);

  // The library resets the modal to its INITIAL status as part of unmounting, so
  // the flag has to be cleared here too — otherwise the `visible -> false` render
  // that follows a swipe-to-dismiss would fire the poisoning dismiss() described
  // above and break every subsequent open.
  const handleDismiss = useCallback(() => {
    wasPresented.current = false;
    onClose();
  }, [onClose]);

  // A 0.4 scrim barely separates a dark sheet from the dark page behind it.
  const backdropOpacity = theme.mode === 'dark' ? 0.6 : 0.4;
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={backdropOpacity} pressBehavior="close" />
    ),
    [backdropOpacity],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      enableDynamicSizing={!snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      footerComponent={footerComponent}
      // The sheet's own surface. These MUST come from the themed sheet above —
      // a module-scope StyleSheet froze them to the light palette, which is why
      // every sheet in the app stayed white after switching to dark mode.
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      {rawContent ? (
        children
      ) : (
        <BottomSheetView
          // Adds the footer's measured height to the content's bottom padding, so
          // the pinned footer never sits on top of the content — and, under
          // enableDynamicSizing, so the sheet measures tall enough to fit it.
          enableFooterMarginAdjustment={!!footerComponent}
          style={[snapPoints ? styles.contentFill : null, bottomPad]}
        >
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}
