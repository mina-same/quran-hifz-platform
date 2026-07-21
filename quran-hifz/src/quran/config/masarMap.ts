export type MasarLevel = "لم" | "صعوبة" | "مقبول" | "طلاقة" | "حافظ" | "بالغ";

export type ServerPath = "حفظ كامل" | "عشرون جزءاً" | "عشرة أجزاء" | "خمسة أجزاء";

export type MasarInfo = { name: string; path: ServerPath; desc: string; halqa: string };

export const MASAR_MAP: Record<MasarLevel, MasarInfo> = {
  "لم":      { name: "مسار البراعم",        path: "خمسة أجزاء",  desc: "القاعدة النورانية — التأسيس القرآني الصحيح",  halqa: "حلقة أبي بكر الصديق" },
  "صعوبة":   { name: "مسار التلقين",        path: "عشرة أجزاء",  desc: "ضبط المخارج والتهيئة للحفظ المكثّف",          halqa: "حلقة علي بن أبي طالب" },
  "مقبول":   { name: "الحفظ العام — مبتدئ", path: "عشرة أجزاء",  desc: "حفظ متقن وفق خطة فردية مرنة",                halqa: "حلقة عثمان بن عفان" },
  "طلاقة":   { name: "الحفظ العام — متقدم", path: "عشرون جزءاً", desc: "أداء تلاوي جيد + حفظ مكثف بخطة فردية",       halqa: "حلقة عبدالرحمن بن عوف" },
  "حافظ":    { name: "الحلقة المتميزة ⭐",  path: "حفظ كامل",    desc: "ختم القرآن وإعداد المتسابقين",                halqa: "حلقة عمر بن الخطاب" },
  "بالغ":    { name: "تعليم الكبار",         path: "خمسة أجزاء",  desc: "تصحيح التلاوة + الفاتحة والقصار",             halqa: "حلقة سعد بن أبي وقاص" },
};

export function pickMasar(level: string, age: number | undefined): MasarInfo | null {
  if (!level) return null;
  const key: MasarLevel = age !== undefined && age >= 50 ? "بالغ" : (level as MasarLevel);
  return MASAR_MAP[key] ?? null;
}
