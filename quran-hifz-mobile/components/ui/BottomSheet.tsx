import { useEffect, useMemo, useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Snap points as percentages of screen height, e.g. ['40%', '80%']. Defaults to a single auto-sizing snap point. */
  snapPoints?: (string | number)[];
}

/**
 * Shared gesture-driven bottom sheet (wraps @gorhom/bottom-sheet) — the app-wide
 * replacement for hand-rolled `Modal` + manual height math dropdowns/popups.
 * Controlled the same way a plain <Modal visible onClose /> would be, so call
 * sites don't need to manage imperative refs.
 */
export default function BottomSheet({ visible, onClose, children, snapPoints }: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const points = useMemo(() => snapPoints ?? ['50%'], [snapPoints]);
  const insets = useSafeAreaInsets();

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

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      enableDynamicSizing={!snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={[snapPoints ? styles.contentFill : null, bottomPad]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
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
});
