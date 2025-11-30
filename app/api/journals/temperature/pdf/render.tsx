import type { ReactElement } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

interface TemperatureItem {
  equipmentName: string;
  targetTemp: number;
  tolerance: number;
  morning: number | null;
  day: number | null;
  evening: number | null;
}

interface TemperatureLocation {
  id: number;
  name: string;
  items: TemperatureItem[];
}

interface TemperatureJournalPdfParams {
  userName: string | null;
  humanDate: string;
  locations: TemperatureLocation[];
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
  locationBlock: {
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  locationName: {
    fontSize: 10,
    fontWeight: 600,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingBottom: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colEquipment: {
    flex: 3,
  },
  colTemp: {
    flex: 1,
    textAlign: "center",
  },
  colNorm: {
    flex: 2,
    textAlign: "center",
  },
  textBold: {
    fontWeight: 600,
  },
});

function createDocument({ userName, humanDate, locations }: TemperatureJournalPdfParams): ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Журнал температурного режима холодильного оборудования</Text>
          <Text style={styles.subtitle}>Дата: {humanDate}</Text>
          <Text style={styles.subtitle}>Ответственный: {userName ?? ""}</Text>
        </View>

        {locations.length === 0 && <Text>За выбранную дату записей в журнале нет.</Text>}

        {locations.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Измерения по помещениям</Text>
            {locations.map((location) => (
              <View key={location.id} style={styles.locationBlock}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text>Объектов: {location.items.length}</Text>
                </View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colEquipment, styles.textBold]}>Оборудование</Text>
                  <Text style={[styles.colTemp, styles.textBold]}>Утро</Text>
                  <Text style={[styles.colTemp, styles.textBold]}>День</Text>
                  <Text style={[styles.colTemp, styles.textBold]}>Вечер</Text>
                  <Text style={[styles.colNorm, styles.textBold]}>Норма, °C</Text>
                </View>
                {location.items.map((item, idx) => {
                  const min = item.targetTemp - item.tolerance;
                  const max = item.targetTemp + item.tolerance;

                  const formatTemp = (v: number | null) => (v == null || Number.isNaN(v) ? "-" : String(v));

                  return (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.colEquipment}>{item.equipmentName}</Text>
                      <Text style={styles.colTemp}>{formatTemp(item.morning)}</Text>
                      <Text style={styles.colTemp}>{formatTemp(item.day)}</Text>
                      <Text style={styles.colTemp}>{formatTemp(item.evening)}</Text>
                      <Text style={styles.colNorm}>
                        {min}…{max}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderTemperatureJournalPdf(params: TemperatureJournalPdfParams) {
  const doc = createDocument(params);
  const pdfBuffer = await pdf(doc).toBuffer();
  return pdfBuffer;
}
