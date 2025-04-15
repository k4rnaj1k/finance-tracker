"use client"

import { useEffect, useState } from "react"
import { BarChart, Wallet, Plus, Trash2, Edit, Save, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseForm } from "./expense-form"
import { ExpenseList } from "./expense-list"
import { CategoryManager } from "./category-manager"
import { ExpenseCharts } from "./expense-charts"
import { CurrencySettings } from "./currency-settings"
import {
  initDB,
  getIncome,
  setIncome,
  getExpenses,
  getCategories,
  getDefaultCurrency,
  getIncomeCurrency,
  convertCurrency,
  getLatestExchangeRate,
} from "./db"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define the Expense type
interface Expense {
  id: string
  amount: number
  description: string
  categoryId: string
  date: string
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

export default function FinanceTracker() {
  const [income, setIncomeState] = useState(0)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDBInitialized, setIsDBInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isEditingIncome, setIsEditingIncome] = useState(false)
  const [newIncome, setNewIncome] = useState(0)
  const [defaultCurrency, setDefaultCurrency] = useState("USD")
  const [incomeCurrency, setIncomeCurrency] = useState("USD")
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)

  useEffect(() => {
    const initialize = async () => {
      await initDB()
      setIsDBInitialized(true)

      // Load initial data
      const savedIncome = await getIncome()
      setIncomeState(savedIncome || 0)
      setNewIncome(savedIncome || 0)

      const savedExpenses = await getExpenses()
      setExpenses(savedExpenses || [])

      const savedCategories = await getCategories()
      setCategories(savedCategories || [])

      const currency = await getDefaultCurrency()
      setDefaultCurrency(currency)

      const savedIncomeCurrency = await getIncomeCurrency()
      setIncomeCurrency(savedIncomeCurrency)

      const latestRate = await getLatestExchangeRate()
      setExchangeRate(latestRate)
    }

    initialize()
  }, [])

  const handleIncomeUpdate = async () => {
    await setIncome(newIncome)
    setIncomeState(newIncome)
    setIsEditingIncome(false)
  }

  const refreshData = async () => {
    const savedExpenses = await getExpenses()
    setExpenses(savedExpenses || [])

    const savedCategories = await getCategories()
    setCategories(savedCategories || [])

    const latestRate = await getLatestExchangeRate()
    setExchangeRate(latestRate)

    const currency = await getDefaultCurrency()
    setDefaultCurrency(currency)

    const savedIncomeCurrency = await getIncomeCurrency()
    setIncomeCurrency(savedIncomeCurrency)
  }

  // Calculate total expenses in the default currency
  const calculateTotalExpenses = async () => {
    let total = 0

    for (const expense of expenses) {
      if (expense.currency === defaultCurrency) {
        total += expense.amount
      } else {
        // Convert to default currency
        const convertedAmount = await convertCurrency(expense.amount, expense.currency, defaultCurrency)
        total += convertedAmount
      }
    }

    return total
  }

  // Calculate remaining balance
  const calculateRemainingBalance = async () => {
    const totalExpenses = await calculateTotalExpenses()

    // If income is in a different currency than default, convert it
    let incomeInDefaultCurrency = income
    if (incomeCurrency !== defaultCurrency) {
      incomeInDefaultCurrency = await convertCurrency(income, incomeCurrency, defaultCurrency)
    }

    return incomeInDefaultCurrency - totalExpenses
  }

  // State for calculated values
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [remainingBalance, setRemainingBalance] = useState(0)

  // Update calculated values when dependencies change
  useEffect(() => {
    const updateCalculations = async () => {
      if (isDBInitialized) {
        const total = await calculateTotalExpenses()
        setTotalExpenses(total)

        const balance = await calculateRemainingBalance()
        setRemainingBalance(balance)
      }
    }

    updateCalculations()
  }, [expenses, income, defaultCurrency, incomeCurrency, exchangeRate, isDBInitialized])

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
  }

  if (!isDBInitialized) {
    return <div className="flex items-center justify-center h-screen">Initializing application...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Personal Finance Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingIncome ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={newIncome}
                  onChange={(e) => setNewIncome(Number(e.target.value))}
                  className="max-w-[150px]"
                />
                <Select value={incomeCurrency} onValueChange={setIncomeCurrency}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="UAH">UAH</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleIncomeUpdate}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {getCurrencySymbol(incomeCurrency)}
                  {income.toFixed(2)} {incomeCurrency}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingIncome(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {getCurrencySymbol(defaultCurrency)}
              {totalExpenses.toFixed(2)} {defaultCurrency}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {getCurrencySymbol(defaultCurrency)}
              {remainingBalance.toFixed(2)} {defaultCurrency}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard">
            <Wallet className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Trash2 className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart className="h-4 w-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your most recent financial activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList
                  expenses={expenses}
                  categories={categories}
                  onDataChange={refreshData}
                  defaultCurrency={defaultCurrency}
                  exchangeRate={exchangeRate}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Record a new expense with category</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm categories={categories} onExpenseAdded={refreshData} defaultCurrency={defaultCurrency} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>Create and manage expense categories</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManager categories={categories} onCategoriesChanged={refreshData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <Card>
            <CardHeader>
              <CardTitle>Expense Analysis</CardTitle>
              <CardDescription>Visual breakdown of your spending</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseCharts
                expenses={expenses}
                categories={categories}
                defaultCurrency={defaultCurrency}
                exchangeRate={exchangeRate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
              <CardDescription>Manage currencies and exchange rates</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencySettings
                defaultCurrency={defaultCurrency}
                onSettingsChanged={refreshData}
                exchangeRate={exchangeRate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
