import type { ReactElement } from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

interface EquipmentRow7d {
  locationName: string;
  equipmentName: string;
  days: Record<string, { morning: number | null; evening: number | null }>;
}

interface TemperatureJournal7dPdfParams {
  organizationName: string;
  periodLabel: string;
  dates: Date[];
  equipment: EquipmentRow7d[];
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontFamily: "Roboto",
    fontSize: 7,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 9,
    color: "#333",
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f5f5f5",
  },
  headerCell: {
    padding: 2,
    fontSize: 6,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontWeight: 700,
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
  },
  cell: {
    padding: 2,
    fontSize: 6,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    minHeight: 14,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  colLocation: {
    width: 55,
  },
  colEquipment: {
    width: 65,
  },
  colTime: {
    width: 24,
  },
  colDay: {
    width: 28,
  },
});

function DataPage({
  periodLabel,
  dates,
  equipment,
}: {
  periodLabel: string;
  dates: Date[];
  equipment: EquipmentRow7d[];
}): ReactElement {
  const dateKeys = dates.map((d) => format(d, "yyyy-MM-dd"));
  const dateHeaders = dates.map((d) => format(d, "dd.MM"));

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>ЖУРНАЛ УЧЕТА ТЕМПЕРАТУРНЫХ РЕЖИМОВ</Text>
        <Text style={styles.subtitle}>{periodLabel}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colLocation]}>Помещение</Text>
          <Text style={[styles.headerCell, styles.colEquipment]}>Оборудование</Text>
          <Text style={[styles.headerCell, styles.colTime]}></Text>
          {dateHeaders.map((label, idx) => (
            <Text
              key={label}
              style={[styles.headerCell, styles.colDay, idx === dateHeaders.length - 1 ? styles.headerCellLast : {}]}
            >
              {label}
            </Text>
          ))}
        </View>

        {equipment.map((eq, eqIdx) => (
          <View key={eqIdx}>
            <View style={styles.dataRow}>
              {eqIdx === 0 || equipment[eqIdx - 1].locationName !== eq.locationName ? (
                <Text style={[styles.cell, styles.colLocation]}>{eq.locationName}</Text>
              ) : (
                <Text style={[styles.cell, styles.colLocation]}></Text>
              )}
              <Text style={[styles.cell, styles.colEquipment]}>{eq.equipmentName}</Text>
              <Text style={[styles.cell, styles.colTime]}>утро</Text>
              {dateKeys.map((k, idx) => (
                <Text
                  key={k}
                  style={[styles.cell, styles.colDay, idx === dateKeys.length - 1 ? styles.cellLast : {}]}
                >
                  {eq.days[k]?.morning != null ? eq.days[k].morning : ""}
                </Text>
              ))}
            </View>

            <View style={styles.dataRow}>
              <Text style={[styles.cell, styles.colLocation]}></Text>
              <Text style={[styles.cell, styles.colEquipment]}></Text>
              <Text style={[styles.cell, styles.colTime]}>вечер</Text>
              {dateKeys.map((k, idx) => (
                <Text
                  key={k}
                  style={[styles.cell, styles.colDay, idx === dateKeys.length - 1 ? styles.cellLast : {}]}
                >
                  {eq.days[k]?.evening != null ? eq.days[k].evening : ""}
                </Text>
              ))}
            </View>
          </View>
        ))}

        {equipment.length === 0 && (
          <View style={styles.dataRow}>
            <Text style={[styles.cell, { flex: 1, textAlign: "center", padding: 8 }]}>
              Нет данных по оборудованию
            </Text>
          </View>
        )}
      </View>
    </Page>
  );
}

function createDocument(params: TemperatureJournal7dPdfParams): ReactElement {
  return (
    <Document>
      <DataPage periodLabel={params.periodLabel} dates={params.dates} equipment={params.equipment} />
    </Document>
  );
}

export async function renderTemperatureJournal7dPdf(params: TemperatureJournal7dPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}

export type { EquipmentRow7d, TemperatureJournal7dPdfParams };
