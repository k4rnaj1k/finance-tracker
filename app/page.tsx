"use client"

import { useEffect, useState } from "react"
import { BarChart, Wallet, Plus, Trash2, Edit, Save, Settings, Menu, Database } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseForm } from "./expense-form"
import { ExpenseList } from "./expense-list"
import { CategoryManager } from "./category-manager"
import { ExpenseCharts } from "./expense-charts"
import { CurrencySettings } from "./currency-settings"
import { InstallPrompt } from "./install-prompt"
import { DataManagement } from "./data-management"
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
  getIncomeMonthStart,
  setDefaultCurrency,
} from "./db"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IncomeMonthManager } from "./income-month-manager"
import { toast } from "@/components/ui/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

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
  const [defaultCurrency, setDefaultCurrencyState] = useState("USD")
  const [incomeCurrency, setIncomeCurrency] = useState("USD")
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [incomeMonthStart, setIncomeMonthStart] = useState<Date | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

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
      setDefaultCurrencyState(currency)

      const savedIncomeCurrency = await getIncomeCurrency()
      setIncomeCurrency(savedIncomeCurrency)

      const latestRate = await getLatestExchangeRate()
      setExchangeRate(latestRate)

      const savedIncomeMonthStart = await getIncomeMonthStart()
      if (savedIncomeMonthStart) {
        setIncomeMonthStart(new Date(savedIncomeMonthStart))
      } else {
        // If no start date is set, use the first day of the current month
        const today = new Date()
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        setIncomeMonthStart(firstDayOfMonth)
        await setIncomeMonthStart(new Date(firstDayOfMonth.toISOString()))
      }
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
    setDefaultCurrencyState(currency)

    const savedIncomeCurrency = await getIncomeCurrency()
    setIncomeCurrency(savedIncomeCurrency)

    const savedIncomeMonthStart = await getIncomeMonthStart()
    if (savedIncomeMonthStart) {
      setIncomeMonthStart(new Date(savedIncomeMonthStart))
    }
  }

  // Handle currency change
  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      await setDefaultCurrency(newCurrency)
      setDefaultCurrencyState(newCurrency)
      toast({
        title: "Currency updated",
        description: `Default currency changed to ${newCurrency}`,
      })
      refreshData()
    } catch (error) {
      console.error("Error changing currency:", error)
      toast({
        title: "Error",
        description: "Failed to change currency. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate total expenses in the default currency
  const calculateTotalExpenses = async () => {
    let total = 0

    for (const expense of expenses) {
      // Only include expenses after the income month start date
      if (incomeMonthStart && new Date(expense.date) >= incomeMonthStart) {
        if (expense.currency === defaultCurrency) {
          total += expense.amount
        } else {
          // Convert to default currency
          try {
            const convertedAmount = await convertCurrency(expense.amount, expense.currency, defaultCurrency)
            total += convertedAmount
          } catch (error) {
            console.error("Error converting expense amount:", error)
          }
        }
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
      try {
        incomeInDefaultCurrency = await convertCurrency(income, incomeCurrency, defaultCurrency)
      } catch (error) {
        console.error("Error converting income:", error)
      }
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
        setIsCalculating(true)
        try {
          const total = await calculateTotalExpenses()
          setTotalExpenses(total)

          const balance = await calculateRemainingBalance()
          setRemainingBalance(balance)
        } catch (error) {
          console.error("Error updating calculations:", error)
        } finally {
          setIsCalculating(false)
        }
      }
    }

    updateCalculations()
  }, [expenses, income, defaultCurrency, incomeCurrency, exchangeRate, isDBInitialized, incomeMonthStart])
  const isMobile = useMediaQuery("(max-width: 768px)")
  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setIsMobileMenuOpen(false)
  }

  if (!isDBInitialized) {
    return <div className="flex items-center justify-center h-screen">Initializing application...</div>
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:px-6 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Personal Finance Tracker</h1>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Select value={defaultCurrency} onValueChange={handleCurrencyChange} className="w-24">
            <SelectTrigger>
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="UAH">UAH (₴)</SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile menu */}
          <div className="block sm:hidden flex-1">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] sm:w-[385px]">
                <nav className="flex flex-col gap-2 mt-6">
                  <Button
                    variant={activeTab === "dashboard" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("dashboard")}
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant={activeTab === "expenses" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("expenses")}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Expense
                  </Button>
                  <Button
                    variant={activeTab === "categories" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("categories")}
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Categories
                  </Button>
                  <Button
                    variant={activeTab === "charts" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("charts")}
                  >
                    <BarChart className="h-5 w-5 mr-2" />
                    Charts
                  </Button>
                  <Button
                    variant={activeTab === "settings" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("settings")}
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant={activeTab === "data" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => handleTabChange("data")}
                  >
                    <Database className="h-5 w-5 mr-2" />
                    Data
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded" role="alert">
          <p className="font-bold">You are offline</p>
          <p>The app is working in offline mode. Your data is saved locally.</p>
        </div>
      )}

      {/* Install prompt */}
      <InstallPrompt />

      <span hidden={isMobile && activeTab === "expenses"}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingIncome ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
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
            <CardDescription className="text-xs">Current income period in {defaultCurrency}</CardDescription>
          </CardHeader>
          <CardContent>
            {isCalculating ? (
              <div className="text-2xl font-bold text-muted-foreground">Calculating...</div>
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {getCurrencySymbol(defaultCurrency)}
                {totalExpenses.toFixed(2)} {defaultCurrency}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            <CardDescription className="text-xs">In {defaultCurrency}</CardDescription>
          </CardHeader>
          <CardContent>
            {isCalculating ? (
              <div className="text-2xl font-bold text-muted-foreground">Calculating...</div>
            ) : (
              <div className={`text-2xl font-bold ${remainingBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
                {getCurrencySymbol(defaultCurrency)}
                {remainingBalance.toFixed(2)} {defaultCurrency}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </span>

      {incomeMonthStart && (
        <div className="bg-muted p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium">Current Income Period: </span>
            <span>{format(incomeMonthStart, "MMMM d, yyyy")} to present</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
            Manage
          </Button>
        </div>
      )}

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
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
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              Data
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
                    incomeMonthStart={incomeMonthStart}
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
                  incomeMonthStart={incomeMonthStart}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income Month</CardTitle>
                  <CardDescription>Manage your income month period</CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomeMonthManager onIncomeMonthChanged={refreshData} />
                </CardContent>
              </Card>

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
            </div>
          </TabsContent>

          <TabsContent value="data">
            <DataManagement onDataChanged={refreshData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile content (without tabs UI, controlled by the side menu) */}
      <div className="block sm:hidden">
        {activeTab === "dashboard" && (
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
                  incomeMonthStart={incomeMonthStart}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "expenses" && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Record a new expense with category</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm categories={categories} onExpenseAdded={refreshData} defaultCurrency={defaultCurrency} />
            </CardContent>
          </Card>
        )}

        {activeTab === "categories" && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>Create and manage expense categories</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManager categories={categories} onCategoriesChanged={refreshData} />
            </CardContent>
          </Card>
        )}

        {activeTab === "charts" && (
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
                incomeMonthStart={incomeMonthStart}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income Month</CardTitle>
                <CardDescription>Manage your income month period</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeMonthManager onIncomeMonthChanged={refreshData} />
              </CardContent>
            </Card>

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
          </div>
        )}

        {activeTab === "data" && <DataManagement onDataChanged={refreshData} />}
      </div>
    </div>
  )
}
