import type { Expense, Category, ExchangeRate } from "../db"

// Define the structure of the exported data
interface ExportData {
  expenses: Expense[]
  categories: Category[]
  exchangeRates: ExchangeRate[]
  settings: {
    income: number
    incomeCurrency: string
    defaultCurrency: string
    incomeMonthStart: string | null
    previousIncomeMonthStart: string | null
  }
}

// Convert app data to CSV format
export function convertToCSV(data: any[]): string {
  if (data.length === 0) return ""

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV header row
  const headerRow = headers.join(",")

  // Create data rows
  const rows = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header]
        // Handle different data types
        if (value === null || value === undefined) return ""
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes if contains comma or quotes
          const escaped = value.replace(/"/g, '""')
          return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n") ? `"${escaped}"` : escaped
        }
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return value
      })
      .join(",")
  })

  // Combine header and data rows
  return [headerRow, ...rows].join("\n")
}

// Parse CSV string to array of objects
export function parseCSV(csv: string): any[] {
  if (!csv || csv.trim() === "") return []

  const lines = csv.split("\n")
  if (lines.length < 2) return [] // Need at least header and one data row

  const headers = parseCSVLine(lines[0])

  const result = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue

    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) {
      console.error(`Line ${i + 1} has ${values.length} values, expected ${headers.length}`)
      continue
    }

    const obj: Record<string, any> = {}
    headers.forEach((header, index) => {
      const value = values[index]

      // Try to parse numbers and booleans
      if (value === "") {
        obj[header] = null
      } else if (value === "true") {
        obj[header] = true
      } else if (value === "false") {
        obj[header] = false
      } else if (!isNaN(Number(value)) && value.trim() !== "") {
        obj[header] = Number(value)
      } else if (value.startsWith("{") || value.startsWith("[")) {
        try {
          obj[header] = JSON.parse(value)
        } catch (e) {
          obj[header] = value
        }
      } else {
        obj[header] = value
      }
    })

    result.push(obj)
  }

  return result
}

// Helper function to parse a CSV line considering quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Check if this is an escaped quote
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // Skip the next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  result.push(current) // Add the last value
  return result
}

// Prepare data for export
export async function prepareDataForExport(
  expenses: Expense[],
  categories: Category[],
  exchangeRates: ExchangeRate[],
  income: number,
  incomeCurrency: string,
  defaultCurrency: string,
  incomeMonthStart: string | null,
  previousIncomeMonthStart: string | null,
): Promise<Blob> {
  // Create a data object with all app data
  const exportData: ExportData = {
    expenses,
    categories,
    exchangeRates,
    settings: {
      income,
      incomeCurrency,
      defaultCurrency,
      incomeMonthStart,
      previousIncomeMonthStart,
    },
  }

  // Convert to JSON string
  const jsonString = JSON.stringify(exportData, null, 2)

  // Create a Blob with the JSON data
  return new Blob([jsonString], { type: "application/json" })
}

// Parse imported data
export function parseImportedData(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString) as ExportData

    // Validate the data structure
    if (!data.expenses || !Array.isArray(data.expenses)) {
      throw new Error("Invalid expenses data")
    }

    if (!data.categories || !Array.isArray(data.categories)) {
      throw new Error("Invalid categories data")
    }

    if (!data.exchangeRates || !Array.isArray(data.exchangeRates)) {
      throw new Error("Invalid exchange rates data")
    }

    if (!data.settings) {
      throw new Error("Missing settings data")
    }

    return data
  } catch (error) {
    console.error("Error parsing imported data:", error)
    return null
  }
}
