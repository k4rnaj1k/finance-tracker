"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts"
import { convertCurrency } from "./db"
import { Switch } from "@/components/ui/switch"
import { useMediaQuery } from "@/hooks/use-media-query"

// Define the Expense type
interface Expense {
  id: string
  amount: number
  description: string
  date: string
  categoryId: string
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

interface ExpenseChartsProps {
  expenses: Expense[]
  categories: Category[]
  defaultCurrency: string
  exchangeRate: ExchangeRate | null
  incomeMonthStart: Date | null
}

export function ExpenseCharts({
  expenses,
  categories,
  defaultCurrency,
  exchangeRate,
  incomeMonthStart,
}: ExpenseChartsProps) {
  const [activeTab, setActiveTab] = useState("pie")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIncomeMonthStart, setCurrentIncomeMonthStart] = useState<Date | null>(null)
  const [showOnlyCurrentMonth, setShowOnlyCurrentMonth] = useState(true)
  const [currentCurrency, setCurrentCurrency] = useState(defaultCurrency)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Update when default currency changes
  useEffect(() => {
    setCurrentCurrency(defaultCurrency)
  }, [defaultCurrency])

  // Load the income month start date
  useEffect(() => {
    setCurrentIncomeMonthStart(incomeMonthStart)
  }, [incomeMonthStart])

  // Prepare data for charts - convert all amounts to default currency
  useEffect(() => {
    const prepareChartData = async () => {
      if (showOnlyCurrentMonth && !currentIncomeMonthStart) {
        // Wait until currentIncomeMonthStart is set
        return
      }

      setIsLoading(true)

      try {
        const categoryTotals: Record<string, number> = {}

        // Initialize all categories with 0
        categories.forEach((category) => {
          categoryTotals[category.id] = 0
        })

        // Sum up expenses by category, converting currencies as needed
        for (const expense of expenses) {
          // Skip expenses before the income month start if filter is enabled
          if (showOnlyCurrentMonth && currentIncomeMonthStart && new Date(expense.date) < currentIncomeMonthStart) {
            continue
          }

          let amount = expense.amount

          // Convert if needed
          if (expense.currency !== currentCurrency) {
            try {
              amount = await convertCurrency(expense.amount, expense.currency, currentCurrency)
            } catch (error) {
              console.error("Error converting expense for chart:", error)
              // Use original amount if conversion fails
            }
          }

          categoryTotals[expense.categoryId] = (categoryTotals[expense.categoryId] || 0) + amount
        }

        // Convert to array format for charts
        const data = categories
          .map((category) => ({
            name: category.name,
            value: categoryTotals[category.id],
            color: category.color,
          }))
          .filter((item) => item.value > 0) // Only include categories with expenses
          .sort((a, b) => b.value - a.value) // Sort by value (highest first)

        setChartData(data)
      } catch (error) {
        console.error("Error preparing chart data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    prepareChartData()
  }, [expenses, categories, currentCurrency, currentIncomeMonthStart, showOnlyCurrentMonth])

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
  }

  // Format currency for display
  const formatCurrency = (value: number) => {
    return `${getCurrencySymbol(currentCurrency)}${value.toFixed(2)}`
  }

  // If no expenses, show a message
  if (expenses.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No expenses recorded yet. Add expenses to see charts.
      </div>
    )
  }

  // If loading, show loading message
  if (isLoading) {
    return <div className="text-center py-6 text-muted-foreground">Preparing chart data...</div>
  }

  // Prepare mobile-specific chart data with shortened names
  const mobileChartData = chartData.map((item) => ({
    ...item,
    // Shorten name for mobile display
    shortName: item.name.length > 12 ? `${item.name.substring(0, 12)}...` : item.name,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="text-sm font-medium">
          {showOnlyCurrentMonth ? "Showing expenses for current income month only" : "Showing all expenses"}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">All expenses</span>
          <Switch
            checked={showOnlyCurrentMonth}
            onCheckedChange={setShowOnlyCurrentMonth}
            aria-label="Toggle current month only"
          />
          <span className="text-sm text-muted-foreground">Current month only</span>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="pie" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={!isMobile}
                      label={isMobile ? undefined : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={isMobile ? 100 : 150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Amount"]} />
                    <Legend layout={isMobile ? "horizontal" : "vertical"} verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {isMobile ? (
                // Mobile-specific horizontal bar chart
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={mobileChartData.slice(0, 10)} // Limit to top 10 for mobile
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `${value.toFixed(0)}`} />
                      <YAxis type="category" dataKey="shortName" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Amount"]}
                        labelFormatter={(label) => {
                          // Find the original full name
                          const item = mobileChartData.find((d) => d.shortName === label)
                          return item ? item.name : label
                        }}
                      />
                      <Bar dataKey="value" name={`Amount (${currentCurrency})`} radius={[0, 4, 4, 0]}>
                        {mobileChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(value: number) => formatCurrency(value)}
                          style={{ fontSize: "10px", fill: "#666" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                // Desktop bar chart
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `${getCurrencySymbol(currentCurrency)}${value}`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Amount"]} />
                      <Legend />
                      <Bar dataKey="value" name={`Amount (${currentCurrency})`} radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
