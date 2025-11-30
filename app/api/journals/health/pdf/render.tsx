import type { ReactElement } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: "Здоров",
  sick: "Отстранён",
  vacation: "Отпуск",
  day_off: "Выходной",
  sick_leave: "Больничный",
};

interface EmployeeEntrySummary {
  employeeId: number;
  employeeName: string;
  status: string;
  note: string | null;
}

interface HealthJournalPdfParams {
  userName: string | null;
  humanDate: string;
  employees: EmployeeEntrySummary[];
  statusCounts: Record<string, number>;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#555",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colName: {
    flex: 2,
  },
  colStatus: {
    flex: 1,
  },
  colNote: {
    flex: 3,
  },
  textBold: {
    fontWeight: 600,
  },
});

function createDocument({ userName, humanDate, employees, statusCounts }: HealthJournalPdfParams): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Журнал здоровья сотрудников</Text>
          <Text style={styles.subtitle}>Дата: {humanDate}</Text>
          <Text style={styles.subtitle}>Ответственный: {userName ?? ""}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Сводка по статусам</Text>
          {Object.keys(statusCounts).length === 0 && <Text>За выбранную дату записей нет.</Text>}
          {Object.entries(statusCounts).map(([status, count]) => (
            <Text key={status}>
              {(HEALTH_STATUS_LABELS[status] ?? status) + ": "}
              {count}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Сотрудники</Text>
          {employees.length === 0 && <Text>За выбранную дату отметок по сотрудникам нет.</Text>}

          {employees.length > 0 && (
            <View>
              <View style={styles.row}>
                <Text style={[styles.colName, styles.textBold]}>Сотрудник</Text>
                <Text style={[styles.colStatus, styles.textBold]}>Статус</Text>
                <Text style={[styles.colNote, styles.textBold]}>Примечание</Text>
              </View>
              {employees.map((entry) => (
                <View key={entry.employeeId} style={styles.row}>
                  <Text style={styles.colName}>{entry.employeeName}</Text>
                  <Text style={styles.colStatus}>{HEALTH_STATUS_LABELS[entry.status] ?? entry.status}</Text>
                  <Text style={styles.colNote}>{entry.note ?? "-"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderHealthJournalPdf(params: HealthJournalPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}
