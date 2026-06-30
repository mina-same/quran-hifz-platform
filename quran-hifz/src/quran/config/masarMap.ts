export type MasarLevel = "لم" | "صعوبة" | "مقبول" | "طلاقة" | "حافظ" | "بالغ";

export type MasarInfo = { name: string; desc: string; halqa: string };

export const MASAR_MAP: Record<MasarLevel, MasarInfo> = {
  "لم": { name: "مسار البراعم", desc: "القاعدة النورانية — التأسيس القرآني الصحيح", halqa: "حلقة أبي بكر الصديق" },
  "صعوبة": { name: "مسار التلقين", desc: "ضبط المخارج والتهيئة للحفظ المكثّف", halqa: "حلقة علي بن أبي طالب" },
  "مقبول": { name: "الحفظ العام — مبتدئ", desc: "حفظ متقن وفق خطة فردية مرنة", halqa: "حلقة عثمان بن عفان" },
  "طلاقة": { name: "الحفظ العام — متقدم", desc: "أداء تلاوي جيد + حفظ مكثف بخطة فردية", halqa: "حلقة عبدالرحمن بن عوف" },
  "حافظ": { name: "الحلقة المتميزة ⭐", desc: "ختم القرآن وإعداد المتسابقين", halqa: "حلقة عمر بن الخطاب" },
  "بالغ": { name: "تعليم الكبار", desc: "تصحيح التلاوة + الفاتحة والقصار", halqa: "حلقة سعد بن أبي وقاص" },
};

export function pickMasar(level: string, age: number | undefined): MasarInfo | null {
  if (!level) return null;
  const key: MasarLevel = age !== undefined && age >= 50 ? "بالغ" : (level as MasarLevel);
  return MASAR_MAP[key] ?? null;
}
