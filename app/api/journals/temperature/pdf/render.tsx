import type { ReactElement } from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Font } from "@react-pdf/renderer";

// Регистрируем шрифт с поддержкой кириллицы
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

// Данные по одному оборудованию с температурами за месяц
interface EquipmentRow {
  locationName: string;
  equipmentName: string;
  // Ключ — день месяца (1-31), значение — температуры
  days: Record<number, { morning: number | null; evening: number | null }>;
}

interface TemperatureJournalPdfParams {
  organizationName: string;
  monthName: string;
  year: number;
  daysInMonth: number;
  equipment: EquipmentRow[];
}

const MONTHS_RU: Record<number, string> = {
  1: "Январь",
  2: "Февраль",
  3: "Март",
  4: "Апрель",
  5: "Май",
  6: "Июнь",
  7: "Июль",
  8: "Август",
  9: "Сентябрь",
  10: "Октябрь",
  11: "Ноябрь",
  12: "Декабрь",
};

const styles = StyleSheet.create({
  // Титульная страница
  titlePage: {
    padding: 40,
    fontFamily: "Roboto",
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 30,
  },
  orgBox: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 12,
    marginHorizontal: 40,
    marginBottom: 8,
    minHeight: 50,
  },
  orgLabel: {
    fontSize: 9,
    textAlign: "center",
    color: "#555",
    marginTop: 4,
  },
  datesTable: {
    marginTop: 30,
    marginHorizontal: 80,
  },
  datesRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderTopWidth: 0,
  },
  datesRowFirst: {
    borderTopWidth: 1,
  },
  datesLabel: {
    width: 80,
    padding: 6,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  datesValue: {
    flex: 1,
    padding: 6,
    fontSize: 10,
    textAlign: "center",
  },

  // Страница с таблицей
  tablePage: {
    padding: 20,
    fontFamily: "Roboto",
    fontSize: 6,
  },
  monthHeader: {
    fontSize: 10,
    marginBottom: 8,
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
    fontSize: 5,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#000",
    minHeight: 12,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  colLocation: {
    width: 50,
  },
  colEquipment: {
    width: 60,
  },
  colTime: {
    width: 22,
  },
  colDay: {
    width: 14,
  },
});

function TitlePage({ organizationName, year }: { organizationName: string; year: number }): ReactElement {
  return (
    <Page size="A4" style={styles.titlePage}>
      <Text style={styles.mainTitle}>ЖУРНАЛ</Text>
      <Text style={styles.subtitle}>УЧЕТА ТЕМПЕРАТУРНЫХ РЕЖИМОВ ХОЛОДИЛЬНОГО ОБОРУДОВАНИЯ</Text>

      <View style={styles.orgBox}>
        <Text style={{ fontSize: 11, textAlign: "center" }}>{organizationName}</Text>
      </View>
      <Text style={styles.orgLabel}>наименование организации, учреждения</Text>

      <View style={styles.datesTable}>
        <View style={[styles.datesRow, styles.datesRowFirst]}>
          <Text style={styles.datesLabel}>начат</Text>
          <Text style={styles.datesValue}>«___» ___________ {year} г.</Text>
        </View>
        <View style={styles.datesRow}>
          <Text style={styles.datesLabel}>окончен</Text>
          <Text style={styles.datesValue}>«___» ___________ {year} г.</Text>
        </View>
      </View>
    </Page>
  );
}

function DataPage({
  monthName,
  daysInMonth,
  equipment,
}: {
  monthName: string;
  daysInMonth: number;
  equipment: EquipmentRow[];
}): ReactElement {
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Page size="A4" orientation="landscape" style={styles.tablePage}>
      <Text style={styles.monthHeader}>Месяц: {monthName}</Text>

      <View style={styles.table}>
        {/* Шапка таблицы */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colLocation]}>Наименование производственного помещения</Text>
          <Text style={[styles.headerCell, styles.colEquipment]}>Наименование холодильного оборудования</Text>
          <Text style={[styles.headerCell, styles.colTime]}></Text>
          {dayNumbers.map((d, idx) => (
            <Text
              key={d}
              style={[
                styles.headerCell,
                styles.colDay,
                idx === dayNumbers.length - 1 ? styles.headerCellLast : {},
              ]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Подзаголовок с "Температура в градусах °C / Дни месяца" */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colLocation]}></Text>
          <Text style={[styles.headerCell, styles.colEquipment]}></Text>
          <Text style={[styles.headerCell, styles.colTime]}></Text>
          <Text
            style={[
              styles.headerCell,
              { width: daysInMonth * 14, textAlign: "center" },
              styles.headerCellLast,
            ]}
          >
            Температура в градусах °C / Дни месяца
          </Text>
        </View>

        {/* Данные по оборудованию */}
        {equipment.map((eq, eqIdx) => (
          <View key={eqIdx}>
            {/* Строка "утро" */}
            <View style={styles.dataRow}>
              {eqIdx === 0 || equipment[eqIdx - 1].locationName !== eq.locationName ? (
                <Text style={[styles.cell, styles.colLocation]}>{eq.locationName}</Text>
              ) : (
                <Text style={[styles.cell, styles.colLocation]}></Text>
              )}
              <Text style={[styles.cell, styles.colEquipment]}>{eq.equipmentName}</Text>
              <Text style={[styles.cell, styles.colTime]}>утро</Text>
              {dayNumbers.map((d, idx) => (
                <Text
                  key={d}
                  style={[
                    styles.cell,
                    styles.colDay,
                    idx === dayNumbers.length - 1 ? styles.cellLast : {},
                  ]}
                >
                  {eq.days[d]?.morning != null ? eq.days[d].morning : ""}
                </Text>
              ))}
            </View>
            {/* Строка "вечер" */}
            <View style={styles.dataRow}>
              <Text style={[styles.cell, styles.colLocation]}></Text>
              <Text style={[styles.cell, styles.colEquipment]}></Text>
              <Text style={[styles.cell, styles.colTime]}>вечер</Text>
              {dayNumbers.map((d, idx) => (
                <Text
                  key={d}
                  style={[
                    styles.cell,
                    styles.colDay,
                    idx === dayNumbers.length - 1 ? styles.cellLast : {},
                  ]}
                >
                  {eq.days[d]?.evening != null ? eq.days[d].evening : ""}
                </Text>
              ))}
            </View>
          </View>
        ))}

        {/* Если нет оборудования */}
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

function createDocument(params: TemperatureJournalPdfParams): ReactElement {
  return (
    <Document>
      <TitlePage organizationName={params.organizationName} year={params.year} />
      <DataPage
        monthName={params.monthName}
        daysInMonth={params.daysInMonth}
        equipment={params.equipment}
      />
    </Document>
  );
}

export async function renderTemperatureJournalPdf(params: TemperatureJournalPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}

export { MONTHS_RU };
export type { EquipmentRow, TemperatureJournalPdfParams };
