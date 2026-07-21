import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBook, IconStar, IconAward, IconGift } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import { theme } from '@/lib/theme';

const MY_PTS = 740;
const ITEMS = [
  { id: 1, name: 'كتاب تجويد مُصوَّر',    pts: 200, Icon: IconBook  },
  { id: 2, name: 'قلم تخطيط للمصحف',     pts: 150, Icon: IconStar  },
  { id: 3, name: 'دروع تقدير من الإدارة', pts: 500, Icon: IconAward },
  { id: 4, name: 'اشتراك رحلة ترفيهية',  pts: 700, Icon: IconGift  },
];

export default function StudentStore() {
  const [redeemed, setRedeemed] = useState<number | null>(null);

  function handleRedeem(id: number, pts: number) {
    if (pts > MY_PTS) return;
    setRedeemed(id);
    setTimeout(() => setRedeemed(null), 4000);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.balance}>
          <IconStar size={28} color={theme.gold} />
          <View>
            <Text style={s.balLabel}>رصيدك الحالي</Text>
            <Text style={s.balNum}>{MY_PTS} نقطة</Text>
          </View>
        </View>
        {redeemed !== null && <Text style={s.successBanner}>تم الاستبدال! سيتواصل معك الأستاذ لتسليم المكافأة ✓</Text>}
        {ITEMS.map((item) => {
          const canAfford = MY_PTS >= item.pts;
          return (
            <Card key={item.id}>
              <View style={s.itemRow}>
                <item.Icon size={32} color={canAfford ? theme.gold : theme.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={[s.itemPts, { color: canAfford ? theme.green : theme.textMuted }]}>{item.pts} نقطة</Text>
                </View>
                <Pressable
                  style={[s.btn, !canAfford && s.btnDisabled]}
                  disabled={!canAfford}
                  onPress={() => handleRedeem(item.id, item.pts)}
                >
                  <Text style={s.btnText}>{canAfford ? 'استبدال' : `تحتاج ${item.pts - MY_PTS}`}</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.cream },
  page: { padding: 16, gap: 14 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.border },
  balLabel: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  balNum: { fontSize: 24, fontFamily: theme.fontCairoBold, color: theme.green },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
  itemPts: { fontSize: 13, fontFamily: theme.fontCairo, marginTop: 2 },
  btn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnDisabled: { backgroundColor: theme.border },
  btnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 12 },
});
