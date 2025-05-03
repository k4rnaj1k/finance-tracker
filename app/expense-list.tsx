"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Edit2, Trash, ChevronDown, ChevronUp } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { deleteExpense, convertCurrency } from "./db"
import { toast } from "@/components/ui/use-toast"
import { ExpenseEditForm } from "./expense-edit-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
  incomeMonthStart: Date | null
}

export function ExpenseList({
  expenses,
  categories,
  onDataChange,
  defaultCurrency,
  exchangeRate,
  incomeMonthStart,
}: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({})
  const [currentIncomeMonthStart, setCurrentIncomeMonthStart] = useState<Date | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({})

  // Convert amounts to default currency for display
  useEffect(() => {
    const updateConvertedAmounts = async () => {
      setIsConverting(true)
      const amounts: Record<string, number> = {}

      try {
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
      } catch (error) {
        console.error("Error updating converted amounts:", error)
      } finally {
        setIsConverting(false)
      }
    }

    updateConvertedAmounts()
  }, [expenses, defaultCurrency, exchangeRate])

  useEffect(() => {
    setCurrentIncomeMonthStart(incomeMonthStart)
  }, [incomeMonthStart])

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

  const toggleExpenseExpanded = (id: string) => {
    setExpandedExpenses((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
  }

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (sortedExpenses.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No expenses recorded yet. Add your first expense to get started.
      </div>
    )
  }

  return (
    <div>
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Original Amount</TableHead>
              <TableHead className="text-right">In {defaultCurrency}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExpenses.map((expense) => (
              <TableRow
                key={expense.id}
                className={
                  currentIncomeMonthStart && new Date(expense.date) >= currentIncomeMonthStart
                    ? "bg-primary/5"
                    : undefined
                }
              >
                <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  {currentIncomeMonthStart && new Date(expense.date) >= currentIncomeMonthStart ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Current
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                      Previous
                    </Badge>
                  )}
                </TableCell>
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
                    isConverting ? (
                      <span className="text-muted-foreground">Converting...</span>
                    ) : (
                      <>
                        {getCurrencySymbol(defaultCurrency)}
                        {convertedAmounts[expense.id]?.toFixed(2) || "0.00"}
                      </>
                    )
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} disabled={isDeleting}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {sortedExpenses.map((expense) => (
          <Card
            key={expense.id}
            className={
              currentIncomeMonthStart && new Date(expense.date) >= currentIncomeMonthStart
                ? "bg-primary/5 border-primary/20"
                : undefined
            }
          >
            <Collapsible open={expandedExpenses[expense.id]} onOpenChange={() => toggleExpenseExpanded(expense.id)}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(expense.categoryId) }}
                    />
                    <span className="font-medium">{expense.description}</span>
                    {currentIncomeMonthStart && new Date(expense.date) >= currentIncomeMonthStart ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Current
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs">
                        Previous
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(expense.date), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="font-medium">
                      {getCurrencySymbol(expense.currency)}
                      {expense.amount.toFixed(2)}
                    </div>
                    {expense.currency !== defaultCurrency && (
                      <div className="text-xs text-muted-foreground">
                        {isConverting ? (
                          "Converting..."
                        ) : (
                          <>
                            {getCurrencySymbol(defaultCurrency)}
                            {convertedAmounts[expense.id]?.toFixed(2) || "0.00"}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {expandedExpenses[expense.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 border-t">
                  <div className="space-y-2 mt-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Category</div>
                      <div>{getCategoryName(expense.categoryId)}</div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(expense)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        disabled={isDeleting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseEditForm
              expense={selectedExpense}
              categories={categories}
              onComplete={handleEditComplete}
              defaultCurrency={defaultCurrency}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
