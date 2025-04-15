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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { convertCurrency } from "./db"

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
}

export function ExpenseCharts({ expenses, categories, defaultCurrency, exchangeRate }: ExpenseChartsProps) {
  const [activeTab, setActiveTab] = useState("pie")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Prepare data for charts - convert all amounts to default currency
  useEffect(() => {
    const prepareChartData = async () => {
      setIsLoading(true)

      try {
        const categoryTotals: Record<string, number> = {}

        // Initialize all categories with 0
        categories.forEach((category) => {
          categoryTotals[category.id] = 0
        })

        // Sum up expenses by category, converting currencies as needed
        for (const expense of expenses) {
          let amount = expense.amount

          // Convert if needed
          if (expense.currency !== defaultCurrency) {
            amount = await convertCurrency(expense.amount, expense.currency, defaultCurrency)
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

        setChartData(data)
      } catch (error) {
        console.error("Error preparing chart data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    prepareChartData()
  }, [expenses, categories, defaultCurrency, exchangeRate])

  // Currency symbol helper
  const getCurrencySymbol = (currency: string) => {
    return currency === "USD" ? "$" : "₴"
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

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="pie" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        `${getCurrencySymbol(defaultCurrency)}${value.toFixed(2)} ${defaultCurrency}`,
                        "Amount",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${getCurrencySymbol(defaultCurrency)}${value}`} />
                    <Tooltip
                      formatter={(value: number) => [
                        `${getCurrencySymbol(defaultCurrency)}${value.toFixed(2)} ${defaultCurrency}`,
                        "Amount",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="value" name={`Amount (${defaultCurrency})`}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
