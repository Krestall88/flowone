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

// Краткие обозначения статусов для таблицы
const STATUS_SHORT: Record<string, string> = {
  healthy: "Зд.",
  sick: "Отстр.",
  vacation: "Отп.",
  day_off: "В",
  sick_leave: "Б/л",
};

// Данные по одному сотруднику за месяц
interface EmployeeRow {
  employeeId: number;
  employeeName: string;
  position: string;
  // Ключ — день месяца (1-31), значение — статус
  days: Record<number, string>;
}

interface HealthJournalPdfParams {
  organizationName: string;
  monthName: string;
  year: number;
  daysInMonth: number;
  employees: EmployeeRow[];
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
  noteSection: {
    marginTop: 30,
    marginHorizontal: 40,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 9,
    marginBottom: 3,
  },
  legendSection: {
    marginTop: 16,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  legendItem: {
    fontSize: 9,
    marginBottom: 2,
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
    minHeight: 14,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  colNum: {
    width: 16,
  },
  colName: {
    width: 70,
    textAlign: "left",
    paddingLeft: 4,
  },
  colPosition: {
    width: 50,
    textAlign: "left",
    paddingLeft: 4,
  },
  colDay: {
    width: 14,
  },
});

function TitlePage({ organizationName, year }: { organizationName: string; year: number }): ReactElement {
  return (
    <Page size="A4" style={styles.titlePage}>
      <Text style={styles.mainTitle}>ЖУРНАЛ</Text>
      <Text style={styles.subtitle}>ЗДОРОВЬЯ СОТРУДНИКОВ</Text>

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

      <View style={styles.noteSection}>
        <Text style={styles.noteTitle}>Примечание:</Text>
        <Text style={styles.noteText}>
          *Список работников, отмеченных в журнале в день осмотра, должен соответствовать числу работников на этот день в смену
        </Text>

        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>**Условные обозначения:</Text>
          <Text style={styles.legendItem}>Зд. — здоров;</Text>
          <Text style={styles.legendItem}>Отстранен — отстранен от работы;</Text>
          <Text style={styles.legendItem}>Отп. — отпуск;</Text>
          <Text style={styles.legendItem}>В — выходной;</Text>
          <Text style={styles.legendItem}>Б/л — больничный лист.</Text>
        </View>
      </View>
    </Page>
  );
}

function DataPage({
  monthName,
  daysInMonth,
  employees,
}: {
  monthName: string;
  daysInMonth: number;
  employees: EmployeeRow[];
}): ReactElement {
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Page size="A4" orientation="landscape" style={styles.tablePage}>
      <Text style={styles.monthHeader}>Месяц/дни: {monthName}</Text>

      <View style={styles.table}>
        {/* Шапка таблицы */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colNum]}>п</Text>
          <Text style={[styles.headerCell, styles.colName]}>ФИО работника</Text>
          <Text style={[styles.headerCell, styles.colPosition]}>Должность</Text>
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

        {/* Данные по сотрудникам */}
        {employees.map((emp, empIdx) => (
          <View key={emp.employeeId} style={styles.dataRow}>
            <Text style={[styles.cell, styles.colNum]}>{empIdx + 1}</Text>
            <Text style={[styles.cell, styles.colName]}>{emp.employeeName}</Text>
            <Text style={[styles.cell, styles.colPosition]}>{emp.position}</Text>
            {dayNumbers.map((d, idx) => {
              const status = emp.days[d];
              const shortStatus = status ? (STATUS_SHORT[status] ?? status) : "";
              return (
                <Text
                  key={d}
                  style={[
                    styles.cell,
                    styles.colDay,
                    idx === dayNumbers.length - 1 ? styles.cellLast : {},
                  ]}
                >
                  {shortStatus}
                </Text>
              );
            })}
          </View>
        ))}

        {/* Если нет сотрудников */}
        {employees.length === 0 && (
          <View style={styles.dataRow}>
            <Text style={[styles.cell, { flex: 1, textAlign: "center", padding: 8 }]}>
              Нет данных по сотрудникам
            </Text>
          </View>
        )}
      </View>
    </Page>
  );
}

function createDocument(params: HealthJournalPdfParams): ReactElement {
  return (
    <Document>
      <TitlePage organizationName={params.organizationName} year={params.year} />
      <DataPage
        monthName={params.monthName}
        daysInMonth={params.daysInMonth}
        employees={params.employees}
      />
    </Document>
  );
}

export async function renderHealthJournalPdf(params: HealthJournalPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}

export { MONTHS_RU };
export type { EmployeeRow, HealthJournalPdfParams };
