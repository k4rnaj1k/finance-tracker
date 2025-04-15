"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { setDefaultCurrency, addExchangeRate, getAllExchangeRates, getLatestExchangeRate } from "./db"
import { toast } from "@/components/ui/use-toast"

interface ExchangeRate {
  id: string
  date: string
  rate: number
}

interface CurrencySettingsProps {
  defaultCurrency: string
  onSettingsChanged: () => void
  exchangeRate: ExchangeRate | null
}

export function CurrencySettings({ defaultCurrency, onSettingsChanged, exchangeRate }: CurrencySettingsProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency)
  const [newExchangeRate, setNewExchangeRate] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])

  // Load exchange rate history
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const rates = await getAllExchangeRates()
        setExchangeRates(rates)
      } catch (error) {
        console.error("Error loading exchange rates:", error)
      }
    }

    loadExchangeRates()
  }, [])

  const handleCurrencyChange = async () => {
    try {
      await setDefaultCurrency(selectedCurrency)
      onSettingsChanged()
      toast({
        title: "Default currency updated",
        description: `Your default currency is now ${selectedCurrency}`,
      })
    } catch (error) {
      console.error("Error updating default currency:", error)
      toast({
        title: "Error",
        description: "Failed to update default currency. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExchangeRateUpdate = async () => {
    if (!newExchangeRate || isNaN(Number(newExchangeRate)) || Number(newExchangeRate) <= 0) {
      toast({
        title: "Invalid exchange rate",
        description: "Please enter a valid positive number",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)

    try {
      const rate = {
        id: uuidv4(),
        date: new Date().toISOString(),
        rate: Number(newExchangeRate),
      }

      await addExchangeRate(rate)

      // Refresh data
      const rates = await getAllExchangeRates()
      setExchangeRates(rates)

      const latestRate = await getLatestExchangeRate()

      // Reset form
      setNewExchangeRate("")

      onSettingsChanged()

      toast({
        title: "Exchange rate updated",
        description: `New exchange rate: 1 USD = ${Number(newExchangeRate).toFixed(2)} UAH`,
      })
    } catch (error) {
      console.error("Error updating exchange rate:", error)
      toast({
        title: "Error",
        description: "Failed to update exchange rate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Default Currency</CardTitle>
            <CardDescription>Set your preferred currency for the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-currency">Default Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger id="default-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="UAH">UAH (₴)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCurrencyChange}>Save Default Currency</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate</CardTitle>
            <CardDescription>Update the UAH to USD exchange rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="exchange-rate">Current Rate: 1 USD =</Label>
                  <div className="text-sm font-medium">
                    {exchangeRate ? `${exchangeRate.rate.toFixed(2)} UAH` : "Not set"}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="exchange-rate"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Enter new rate"
                    value={newExchangeRate}
                    onChange={(e) => setNewExchangeRate(e.target.value)}
                  />
                  <span className="flex items-center">UAH</span>
                </div>
              </div>
              <Button onClick={handleExchangeRateUpdate} disabled={isUpdating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isUpdating ? "Updating..." : "Update Rate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exchange Rate History</CardTitle>
          <CardDescription>Previous exchange rates</CardDescription>
        </CardHeader>
        <CardContent>
          {exchangeRates.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No exchange rate history available</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Rate (1 USD = X UAH)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>{format(new Date(rate.date), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">{rate.rate.toFixed(2)} UAH</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
