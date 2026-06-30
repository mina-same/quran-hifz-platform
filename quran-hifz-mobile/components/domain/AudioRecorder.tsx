import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {
  IconMicrophone, IconPlayerStop, IconSend, IconCircleCheck,
} from '@tabler/icons-react-native';
import Alert from '@/components/ui/Alert';
import { theme } from '@/lib/theme';

export default function AudioRecorder() {
  const [done, setDone] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
    })();
  }, []);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const startRecording = async () => {
    if (!permissionGranted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleToggle = () => {
    if (state.isRecording) stopRecording();
    else startRecording();
  };

  const handleSend = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDone(true);
  };

  if (!permissionGranted) {
    return (
      <Alert variant="warning">
        لم يُمنح إذن الميكروفون. يرجى السماح بالوصول في إعدادات التطبيق.
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert variant="success" icon={<IconCircleCheck size={24} color="#166534" />}>
        <Text style={styles.doneTitle}>تم الإرسال!</Text>
        <Text style={styles.doneSub}>📲 أُرسل لولي الأمر • 👨‍🏫 وصل للأستاذ ناصر • 📋 سُجِّل في ملفك</Text>
      </Alert>
    );
  }

  const hasStopped = !state.isRecording && !!recorder.uri;

  return (
    <View style={styles.box}>
      <IconMicrophone size={56} color={theme.red} style={styles.micIcon} />
      {state.isRecording && (
        <Text style={styles.timer}>{fmt(state.durationMillis ?? 0)}</Text>
      )}
      <View style={styles.btns}>
        <Pressable
          onPress={handleToggle}
          android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          style={[styles.btn, state.isRecording ? styles.btnStop : styles.btnStart]}
        >
          {state.isRecording
            ? <IconPlayerStop size={18} color={theme.white} />
            : <IconMicrophone size={18} color={theme.white} />}
          <Text style={styles.btnText}>
            {state.isRecording ? 'إيقاف التسجيل' : 'ابدأ التسجيل'}
          </Text>
        </Pressable>

        {hasStopped && (
          <Pressable onPress={handleSend} style={[styles.btn, styles.btnSend]}>
            <IconSend size={18} color={theme.brown} />
            <Text style={styles.btnTextSend}>إرسال الواجب</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.redPale,
    borderWidth: 2,
    borderColor: theme.redBorder,
    borderRadius: theme.radius,
    padding: 24,
    alignItems: 'center',
  },
  micIcon: { marginBottom: 12 },
  timer: {
    fontSize: 32,
    fontFamily: theme.fontCairoBold,
    color: theme.green,
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: theme.radiusSm,
  },
  btnStart: { backgroundColor: theme.green },
  btnStop:  { backgroundColor: theme.red },
  btnSend: {
    backgroundColor: theme.goldPale,
    borderWidth: 1,
    borderColor: 'rgba(201,149,42,0.3)',
  },
  btnText: {
    fontSize: 14,
    fontFamily: theme.fontCairoBold,
    color: theme.white,
  },
  btnTextSend: {
    fontSize: 14,
    fontFamily: theme.fontCairoBold,
    color: theme.brown,
  },
  doneTitle: {
    fontSize: 14,
    fontFamily: theme.fontCairoBold,
    color: '#166534',
  },
  doneSub: {
    fontSize: 12,
    fontFamily: theme.fontCairo,
    color: '#166534',
    marginTop: 4,
    lineHeight: 20,
  },
});
