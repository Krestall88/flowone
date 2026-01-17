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

const STATUS_SHORT: Record<string, string> = {
  healthy: "Зд.",
  sick: "Отстр.",
  vacation: "Отп.",
  day_off: "В",
  sick_leave: "Б/л",
};

interface EmployeeRow7d {
  employeeId: number;
  employeeName: string;
  position: string;
  days: Record<string, string>;
}

interface HealthJournal7dPdfParams {
  organizationName: string;
  periodLabel: string;
  dates: Date[];
  employees: EmployeeRow7d[];
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
  colNum: {
    width: 18,
  },
  colName: {
    width: 85,
    textAlign: "left",
    paddingLeft: 4,
  },
  colPosition: {
    width: 55,
    textAlign: "left",
    paddingLeft: 4,
  },
  colDay: {
    width: 28,
  },
});

function DataPage({
  periodLabel,
  dates,
  employees,
}: {
  periodLabel: string;
  dates: Date[];
  employees: EmployeeRow7d[];
}): ReactElement {
  const dateKeys = dates.map((d) => format(d, "yyyy-MM-dd"));
  const dateHeaders = dates.map((d) => format(d, "dd.MM"));

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>ЖУРНАЛ ЗДОРОВЬЯ СОТРУДНИКОВ</Text>
        <Text style={styles.subtitle}>{periodLabel}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.colNum]}>№</Text>
          <Text style={[styles.headerCell, styles.colName]}>ФИО</Text>
          <Text style={[styles.headerCell, styles.colPosition]}>Должность</Text>
          {dateHeaders.map((label, idx) => (
            <Text
              key={label}
              style={[styles.headerCell, styles.colDay, idx === dateHeaders.length - 1 ? styles.headerCellLast : {}]}
            >
              {label}
            </Text>
          ))}
        </View>

        {employees.map((emp, idx) => (
          <View key={emp.employeeId} style={styles.dataRow}>
            <Text style={[styles.cell, styles.colNum]}>{idx + 1}</Text>
            <Text style={[styles.cell, styles.colName]}>{emp.employeeName}</Text>
            <Text style={[styles.cell, styles.colPosition]}>{emp.position}</Text>
            {dateKeys.map((k, j) => (
              <Text
                key={k}
                style={[styles.cell, styles.colDay, j === dateKeys.length - 1 ? styles.cellLast : {}]}
              >
                {STATUS_SHORT[emp.days[k] ?? ""] ?? ""}
              </Text>
            ))}
          </View>
        ))}

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

function createDocument(params: HealthJournal7dPdfParams): ReactElement {
  return (
    <Document>
      <DataPage periodLabel={params.periodLabel} dates={params.dates} employees={params.employees} />
    </Document>
  );
}

export async function renderHealthJournal7dPdf(params: HealthJournal7dPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}

export type { EmployeeRow7d, HealthJournal7dPdfParams };
