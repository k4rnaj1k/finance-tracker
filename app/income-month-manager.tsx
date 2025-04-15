"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import {
  getIncomeMonthStart,
  setIncomeMonthStart,
  getPreviousIncomeMonthStart,
  setPreviousIncomeMonthStart,
} from "./db"

interface IncomeMonthManagerProps {
  onIncomeMonthChanged: () => void
}

export function IncomeMonthManager({ onIncomeMonthChanged }: IncomeMonthManagerProps) {
  const [incomeMonthStart, setIncomeMonthStartState] = useState<Date | null>(null)
  const [previousIncomeMonthStart, setPreviousIncomeMonthStartState] = useState<Date | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadIncomeMonthData = async () => {
      try {
        const currentStart = await getIncomeMonthStart()
        if (currentStart) {
          setIncomeMonthStartState(new Date(currentStart))
        } else {
          // If no start date is set, use the first day of the current month
          const today = new Date()
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          setIncomeMonthStartState(firstDayOfMonth)
          await setIncomeMonthStart(firstDayOfMonth.toISOString())
        }

        const previousStart = await getPreviousIncomeMonthStart()
        if (previousStart) {
          setPreviousIncomeMonthStartState(new Date(previousStart))
        }
      } catch (error) {
        console.error("Error loading income month data:", error)
      }
    }

    loadIncomeMonthData()
  }, [])

  const handleStartNewIncomeMonth = async () => {
    setIsProcessing(true)

    try {
      // Save the current start date as the previous one
      if (incomeMonthStart) {
        await setPreviousIncomeMonthStart(incomeMonthStart.toISOString())
        setPreviousIncomeMonthStartState(incomeMonthStart)
      }

      // Set today as the new income month start
      const today = new Date()
      await setIncomeMonthStart(today.toISOString())
      setIncomeMonthStartState(today)

      // Notify parent component
      onIncomeMonthChanged()

      toast({
        title: "New income month started",
        description: `Your new income month starts from ${format(today, "MMMM d, yyyy")}`,
      })
    } catch (error) {
      console.error("Error starting new income month:", error)
      toast({
        title: "Error",
        description: "Failed to start new income month. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return

    setIsProcessing(true)

    try {
      // Save the current start date as the previous one
      if (incomeMonthStart) {
        await setPreviousIncomeMonthStart(incomeMonthStart.toISOString())
        setPreviousIncomeMonthStartState(incomeMonthStart)
      }

      // Set the selected date as the new income month start
      await setIncomeMonthStart(date.toISOString())
      setIncomeMonthStartState(date)

      // Notify parent component
      onIncomeMonthChanged()

      toast({
        title: "Income month start date updated",
        description: `Your income month now starts from ${format(date, "MMMM d, yyyy")}`,
      })
    } catch (error) {
      console.error("Error updating income month start:", error)
      toast({
        title: "Error",
        description: "Failed to update income month start. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Month</CardTitle>
        <CardDescription>Manage your income month period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="font-medium">Current Income Month</div>
          {incomeMonthStart ? (
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-md">
                Started on {format(incomeMonthStart, "MMMM d, yyyy")}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={incomeMonthStart} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="text-muted-foreground">No income month set</div>
          )}
        </div>

        {previousIncomeMonthStart && (
          <div className="space-y-2">
            <div className="font-medium">Previous Income Month</div>
            <div className="text-muted-foreground">Started on {format(previousIncomeMonthStart, "MMMM d, yyyy")}</div>
          </div>
        )}

        <Button onClick={handleStartNewIncomeMonth} disabled={isProcessing} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          {isProcessing ? "Processing..." : "Start New Income Month"}
        </Button>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Starting a new income month will reset your remaining balance calculation to only include expenses from the new
        start date.
      </CardFooter>
    </Card>
  )
}
