"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Edit2, Trash } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { deleteExpense, convertCurrency } from "./db"
import { toast } from "@/components/ui/use-toast"
import { ExpenseEditForm } from "./expense-edit-form"

// Define the Expense type
interface Expense {
  id: string
  date: string
  categoryId: string
  description: string
  amount: number
  currency: string
}

// Define the Category type
interface Category {
  id: string
  name: string
  color: string
}

// Define the ExchangeRate type
interface ExchangeRate {
  id: string
  date: string
  rate: number
}

interface ExpenseListProps {
  expenses: Expense[]
  categories: Category[]
  onDataChange: () => void
  defaultCurrency: string
  exchangeRate: ExchangeRate | null
}

export function ExpenseList({ expenses, categories, onDataChange, defaultCurrency, exchangeRate }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({})

  // Convert amounts to default currency for display
  const updateConvertedAmounts = async () => {
    const amounts: Record<string, number> = {}

    for (const expense of expenses) {
      if (expense.currency === defaultCurrency) {
        amounts[expense.id] = expense.amount
      } else {
        try {
          const converted = await convertCurrency(expense.amount, expense.currency, defaultCurrency)
          amounts[expense.id] = converted
        } catch (error) {
          console.error("Conversion error:", error)
          amounts[expense.id] = expense.amount
        }
      }
    }

    setConvertedAmounts(amounts)
  }

  // Update converted amounts when expenses or currency changes
  useState(() => {
    updateConvertedAmounts()
  })

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Unknown"
  }

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.color : "#CCCCCC"
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      setIsDeleting(true)
      try {
        await deleteExpense(id)
        onDataChange()
        toast({
          title: "Expense deleted",
          description: "The expense has been removed successfully",
        })
      } catch (error) {
        console.error("Error deleting expense:", error)
        toast({
          title: "Error",
          description: "Failed to delete expense. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsEditDialogOpen(true)
  }

  const handleEditComplete = () => {
    setIsEditDialogOpen(false)
    setSelectedExpense(null)
    onDataChange()
  }

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
  }

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div>
      {sortedExpenses.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          No expenses recorded yet. Add your first expense to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Original Amount</TableHead>
                <TableHead className="text-right">In {defaultCurrency}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getCategoryColor(expense.categoryId) }}
                      />
                      {getCategoryName(expense.categoryId)}
                    </div>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {getCurrencySymbol(expense.currency)}
                    {expense.amount.toFixed(2)} {expense.currency}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {expense.currency !== defaultCurrency ? (
                      <>
                        {getCurrencySymbol(defaultCurrency)}
                        {convertedAmounts[expense.id]?.toFixed(2) || "..."}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                        disabled={isDeleting}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseEditForm expense={selectedExpense} categories={categories} onComplete={handleEditComplete} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
