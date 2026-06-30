import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

export interface Column {
  key: string;
  label: string;
  flex?: number;
}

interface Props {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  emptyMessage?: string;
}

export default function DataTable({ columns, rows, emptyMessage = 'لا توجد بيانات' }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.headerRow}>
          {columns.map((col) => (
            <View key={col.key} style={[styles.cell, styles.headerCell, { flex: col.flex ?? 1 }]}>
              <Text style={styles.headerText}>{col.label}</Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          rows.map((row, i) => (
            <View key={i} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
              {columns.map((col) => (
                <View key={col.key} style={[styles.cell, { flex: col.flex ?? 1 }]}>
                  {typeof row[col.key] === 'string' || typeof row[col.key] === 'number' ? (
                    <Text style={styles.cellText}>{row[col.key] as string}</Text>
                  ) : (
                    (row[col.key] as React.ReactNode)
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: { minWidth: '100%' },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 2,
    borderBottomColor: '#86EFAC',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowAlt: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    minWidth: 80,
  },
  headerCell: {},
  headerText: {
    fontSize: 12,
    fontFamily: theme.fontCairoBold,
    color: theme.green,
    textAlign: 'right',
  },
  cellText: {
    fontSize: 13,
    fontFamily: theme.fontCairo,
    color: theme.text,
    textAlign: 'right',
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
    fontFamily: theme.fontCairo,
  },
});
