"use client"

import type React from "react"

import { useState } from "react"
import { Download, Upload, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { prepareDataForExport, parseImportedData } from "./utils/csv-utils"
import {
  getExpenses,
  getCategories,
  getAllExchangeRates,
  getIncome,
  getIncomeCurrency,
  getDefaultCurrency,
  getIncomeMonthStart,
  getPreviousIncomeMonthStart,
  addExpense,
  addCategory,
  addExchangeRate,
  setIncome,
  setIncomeCurrency,
  setDefaultCurrency,
  setIncomeMonthStart,
  setPreviousIncomeMonthStart,
  deleteCategory,
  deleteExchangeRate,
  deleteExpense,
} from "./db"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface DataManagementProps {
  onDataChanged: () => void
}

export function DataManagement({ onDataChanged }: DataManagementProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Export all data as JSON
  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Fetch all data
      const expenses = await getExpenses()
      const categories = await getCategories()
      const exchangeRates = await getAllExchangeRates()
      const income = (await getIncome()) || 0
      const incomeCurrency = await getIncomeCurrency()
      const defaultCurrency = await getDefaultCurrency()
      const incomeMonthStart = await getIncomeMonthStart()
      const previousIncomeMonthStart = await getPreviousIncomeMonthStart()

      // Prepare data for export
      const blob = await prepareDataForExport(
        expenses,
        categories,
        exchangeRates,
        income,
        incomeCurrency,
        defaultCurrency,
        incomeMonthStart,
        previousIncomeMonthStart,
      )

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0]
      link.download = `finance-tracker-export-${date}.json`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: "Your data has been exported successfully",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast({
        title: "Invalid file type",
        description: "Please select a JSON file",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) {
        toast({
          title: "Error reading file",
          description: "The file appears to be empty",
          variant: "destructive",
        })
        return
      }

      // Show import dialog
      setShowImportDialog(true)
      setImportError(null)

      // Parse the data
      const data = parseImportedData(content)
      if (!data) {
        setImportError("The file format is invalid. Please select a valid export file.")
        return
      }

      // Store the data for import
      sessionStorage.setItem("importData", content)
    }

    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the file",
        variant: "destructive",
      })
    }

    reader.readAsText(file)

    // Reset the input
    e.target.value = ""
  }

  // Import data
  const handleImport = async () => {
    setIsImporting(true)
    setImportProgress(0)

    try {
      const content = sessionStorage.getItem("importData")
      if (!content) {
        throw new Error("No import data found")
      }

      const data = parseImportedData(content)
      if (!data) {
        throw new Error("Invalid import data")
      }

      // Import settings
      setImportProgress(10)
      await setIncome(data.settings.income)
      await setIncomeCurrency(data.settings.incomeCurrency)
      await setDefaultCurrency(data.settings.defaultCurrency)

      if (data.settings.incomeMonthStart) {
        await setIncomeMonthStart(data.settings.incomeMonthStart)
      }

      if (data.settings.previousIncomeMonthStart) {
        await setPreviousIncomeMonthStart(data.settings.previousIncomeMonthStart)
      }

      // Import categories
      setImportProgress(30)
      for (const category of data.categories) {
        const categories = await getCategories();
        categories.forEach(async (cat) => { await deleteCategory(cat.id) });
        await addCategory(category)
      }

      // Import exchange rates
      setImportProgress(50)
      for (const rate of data.exchangeRates) {
        const exchangeRates = await getAllExchangeRates();
        exchangeRates.forEach(async (rate) => { await deleteExchangeRate(rate.id) });
        await addExchangeRate(rate)
      }

      // Import expenses
      let count = 0
      const total = data.expenses.length
      for (const expense of data.expenses) {
        const expenses = await getExpenses();
        expenses.forEach(async (exp) => { await deleteExpense(exp.id) });
        await addExpense(expense)
        count++
        setImportProgress(50 + Math.floor((count / total) * 40))
      }

      setImportProgress(100)

      // Clear import data
      sessionStorage.removeItem("importData")

      // Close dialog
      setShowImportDialog(false)

      // Notify parent component
      onDataChanged()

      toast({
        title: "Import successful",
        description: "Your data has been imported successfully",
      })
    } catch (error) {
      console.error("Import error:", error)
      setImportError(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      toast({
        title: "Import failed",
        description: "There was an error importing your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export or import your finance data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Export Data</h3>
              <p className="text-sm text-muted-foreground">
                Download all your finance data as a JSON file for backup or transfer.
              </p>
              <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export Data"}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Import Data</h3>
              <p className="text-sm text-muted-foreground">Import finance data from a previously exported JSON file.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Select File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Importing data will replace all your current data. Make sure to export your current data first if you want
              to keep it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>This will replace all your current data with the imported data.</DialogDescription>
          </DialogHeader>

          {importError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          ) : isImporting ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm">
                <span>Importing data...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to proceed? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !!importError}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
