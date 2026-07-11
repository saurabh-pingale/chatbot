export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const MAX_BULK_FAQS = 50;

const CSV_TEMPLATE_FILENAME = "faq-bulk-upload-template.csv";

const CSV_EXAMPLE_ROWS = [
  {
    question: "How do I track my order?",
    answer:
      "You can track your order by logging into your account and visiting the Orders page. You will receive a tracking link via email once your order ships.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We accept returns within 30 days of delivery. Items must be unused and in original packaging. Contact support to start a return.",
  },
];

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export function buildCsvTemplateContent(): string {
  const lines = [
    "Question,Answer",
    ...CSV_EXAMPLE_ROWS.map(
      (row) => `${escapeCsvValue(row.question)},${escapeCsvValue(row.answer)}`,
    ),
  ];
  return lines.join("\n");
}

export function downloadCsvTemplate() {
  const content = buildCsvTemplateContent();
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = CSV_TEMPLATE_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ParsedFaqRow {
  question: string;
  answer: string;
}

export interface CsvParseResult {
  rows: ParsedFaqRow[];
  errors: string[];
}

export function parseFaqCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    return { rows: [], errors: ["The CSV file is empty."] };
  }

  const headerValues = parseCsvLine(lines[0]).map((value) =>
    value.trim().toLowerCase(),
  );
  const questionIndex = headerValues.indexOf("question");
  const answerIndex = headerValues.indexOf("answer");

  if (questionIndex === -1 || answerIndex === -1) {
    return {
      rows: [],
      errors: [
        "Invalid CSV format. The file must include 'Question' and 'Answer' column headers.",
      ],
    };
  }

  const rows: ParsedFaqRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const question = (values[questionIndex] ?? "").trim();
    const answer = (values[answerIndex] ?? "").trim();

    if (!question && !answer) {
      continue;
    }

    if (!question || !answer) {
      errors.push(`Row ${i + 1}: both question and answer are required.`);
      continue;
    }

    rows.push({ question, answer });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No valid FAQ rows found. Add at least one question and answer.");
  }

  if (rows.length > MAX_BULK_FAQS) {
    errors.push(
      `Too many FAQs in file. Maximum ${MAX_BULK_FAQS} FAQs allowed per upload (found ${rows.length}).`,
    );
  }

  return { rows, errors };
}

export function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
}
