import { useEffect, useMemo, useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
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

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

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
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={snapPoints ? styles.contentFill : styles.content}>
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
  content: {
    paddingBottom: 24,
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
    paddingBottom: 24,
  },
});
