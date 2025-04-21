// Define types for our data models
export interface Expense {
  id: string
  amount: number
  description: string
  categoryId: string
  date: string
  currency: string // Added currency field
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface ExchangeRate {
  id: string
  date: string
  rate: number // UAH per 1 USD
}

let db: IDBDatabase | null = null

// Initialize the IndexedDB database
export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FinanceTrackerDB", 2) // Increased version number

    request.onerror = (event) => {
      console.error("Error opening database:", event)
      reject(new Error("Could not open IndexedDB"))
    }

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      console.log("Database opened successfully")
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      // Create object stores if they don't exist
      if (oldVersion < 1) {
        if (!database.objectStoreNames.contains("expenses")) {
          database.createObjectStore("expenses", { keyPath: "id" })
        }

        if (!database.objectStoreNames.contains("categories")) {
          database.createObjectStore("categories", { keyPath: "id" })
        }

        if (!database.objectStoreNames.contains("settings")) {
          database.createObjectStore("settings", { keyPath: "key" })
        }

        // Add default categories if this is a new database
        const categoryStore = (event.target as IDBOpenDBRequest).transaction?.objectStore("categories")
        if (categoryStore) {
          const defaultCategories = [
            { id: "1", name: "Housing", color: "#FF5733" },
            { id: "2", name: "Food", color: "#33FF57" },
            { id: "3", name: "Transportation", color: "#3357FF" },
            { id: "4", name: "Entertainment", color: "#F033FF" },
            { id: "5", name: "Utilities", color: "#FF9F33" },
          ]

          defaultCategories.forEach((category) => {
            categoryStore.add(category)
          })
        }
      }

      // Add exchange rates store in version 2
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains("exchangeRates")) {
          database.createObjectStore("exchangeRates", { keyPath: "id" })
        }

        // Set default exchange rate
        const settingsStore = (event.target as IDBOpenDBRequest).transaction?.objectStore("settings")
        if (settingsStore) {
          settingsStore.put({ key: "defaultCurrency", value: "USD" })
        }

        // Add default exchange rate
        const ratesStore = (event.target as IDBOpenDBRequest).transaction?.objectStore("exchangeRates")
        if (ratesStore) {
          const defaultRate = {
            id: "1",
            date: new Date().toISOString(),
            rate: 38.5, // Default UAH per 1 USD
          }
          ratesStore.add(defaultRate)
        }
      }
    }
  })
}

// Get all expenses
export const getExpenses = (): Promise<Expense[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["expenses"], "readonly")
    const store = transaction.objectStore("expenses")
    const request = store.getAll()

    request.onsuccess = () => {
      // Add currency field to old expenses if missing
      const expenses = request.result.map((expense) => {
        if (!expense.currency) {
          return { ...expense, currency: "USD" }
        }
        return expense
      })
      resolve(expenses)
    }

    request.onerror = (event) => {
      console.error("Error getting expenses:", event)
      reject(new Error("Could not get expenses"))
    }
  })
}

// Add a new expense
export const addExpense = (expense: Expense): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["expenses"], "readwrite")
    const store = transaction.objectStore("expenses")
    const request = store.add(expense)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error adding expense:", event)
      reject(new Error("Could not add expense"))
    }
  })
}

// Update an expense
export const updateExpense = (expense: Expense): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["expenses"], "readwrite")
    const store = transaction.objectStore("expenses")
    const request = store.put(expense)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error updating expense:", event)
      reject(new Error("Could not update expense"))
    }
  })
}

export const deleteExchangeRate = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }
    const transaction = db.transaction(["exchangeRates"], "readwrite")
    const store = transaction.objectStore("exchangeRates")
    const request = store.delete(id)
    request.onsuccess = () => {
      resolve()
    }
    request.onerror = (event) => {
      console.error("Error deleting exchange rate:", event)
      reject(new Error("Could not delete exchange rate"))
    }
  })
};

// Delete an expense
export const deleteExpense = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["expenses"], "readwrite")
    const store = transaction.objectStore("expenses")
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error deleting expense:", event)
      reject(new Error("Could not delete expense"))
    }
  })
}

// Get all categories
export const getCategories = (): Promise<Category[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["categories"], "readonly")
    const store = transaction.objectStore("categories")
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error("Error getting categories:", event)
      reject(new Error("Could not get categories"))
    }
  })
}

// Add a new category
export const addCategory = (category: Category): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["categories"], "readwrite")
    const store = transaction.objectStore("categories")
    const request = store.add(category)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error adding category:", event)
      reject(new Error("Could not add category"))
    }
  })
}

// Update a category
export const updateCategory = (category: Category): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["categories"], "readwrite")
    const store = transaction.objectStore("categories")
    const request = store.put(category)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error updating category:", event)
      reject(new Error("Could not update category"))
    }
  })
}

// Delete a category
export const deleteCategory = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["categories"], "readwrite")
    const store = transaction.objectStore("categories")
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error deleting category:", event)
      reject(new Error("Could not delete category"))
    }
  })
}

// Get income
export const getIncome = (): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")
    const request = store.get("income")

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value)
      } else {
        resolve(null)
      }
    }

    request.onerror = (event) => {
      console.error("Error getting income:", event)
      reject(new Error("Could not get income"))
    }
  })
}

// Set income
export const setIncome = (income: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")
    const request = store.put({ key: "income", value: income })

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error setting income:", event)
      reject(new Error("Could not set income"))
    }
  })
}

// Get income currency
export const getIncomeCurrency = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")
    const request = store.get("incomeCurrency")

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value)
      } else {
        resolve("USD") // Default to USD
      }
    }

    request.onerror = (event) => {
      console.error("Error getting income currency:", event)
      reject(new Error("Could not get income currency"))
    }
  })
}

// Set income currency
export const setIncomeCurrency = (currency: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")
    const request = store.put({ key: "incomeCurrency", value: currency })

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error setting income currency:", event)
      reject(new Error("Could not set income currency"))
    }
  })
}

// Get default currency
export const getDefaultCurrency = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")
    const request = store.get("defaultCurrency")

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value)
      } else {
        resolve("USD") // Default to USD
      }
    }

    request.onerror = (event) => {
      console.error("Error getting default currency:", event)
      reject(new Error("Could not get default currency"))
    }
  })
}

// Set default currency
export const setDefaultCurrency = (currency: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")
    const request = store.put({ key: "defaultCurrency", value: currency })

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error setting default currency:", event)
      reject(new Error("Could not set default currency"))
    }
  })
}

// Get latest exchange rate
export const getLatestExchangeRate = (): Promise<ExchangeRate | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["exchangeRates"], "readonly")
    const store = transaction.objectStore("exchangeRates")
    const request = store.getAll()

    request.onsuccess = () => {
      if (request.result && request.result.length > 0) {
        // Sort by date (newest first) and return the first one
        const rates = request.result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(rates[0])
      } else {
        resolve(null)
      }
    }

    request.onerror = (event) => {
      console.error("Error getting exchange rates:", event)
      reject(new Error("Could not get exchange rates"))
    }
  })
}

// Add a new exchange rate
export const addExchangeRate = (rate: ExchangeRate): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["exchangeRates"], "readwrite")
    const store = transaction.objectStore("exchangeRates")
    const request = store.add(rate)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error adding exchange rate:", event)
      reject(new Error("Could not add exchange rate"))
    }
  })
}

// Get all exchange rates
export const getAllExchangeRates = (): Promise<ExchangeRate[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["exchangeRates"], "readonly")
    const store = transaction.objectStore("exchangeRates")
    const request = store.getAll()

    request.onsuccess = () => {
      // Sort by date (newest first)
      const rates = request.result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      resolve(rates)
    }

    request.onerror = (event) => {
      console.error("Error getting exchange rates:", event)
      reject(new Error("Could not get exchange rates"))
    }
  })
}

// Convert amount between currencies
export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }

  const rate = await getLatestExchangeRate()

  if (!rate) {
    throw new Error("Exchange rate not available")
  }

  // Convert based on direction
  if (fromCurrency === "USD" && toCurrency === "UAH") {
    return amount * rate.rate
  } else if (fromCurrency === "UAH" && toCurrency === "USD") {
    return amount / rate.rate
  }

  // If we reach here, something went wrong with the currency codes
  console.error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`)
  return amount
}

// Get income month start date
export const getIncomeMonthStart = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")
    const request = store.get("incomeMonthStart")

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value)
      } else {
        resolve(null)
      }
    }

    request.onerror = (event) => {
      console.error("Error getting income month start:", event)
      reject(new Error("Could not get income month start"))
    }
  })
}

// Set income month start date
export const setIncomeMonthStart = (date: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")
    const request = store.put({ key: "incomeMonthStart", value: date })

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error setting income month start:", event)
      reject(new Error("Could not set income month start"))
    }
  })
}

// Get previous income month start date
export const getPreviousIncomeMonthStart = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")
    const request = store.get("previousIncomeMonthStart")

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value)
      } else {
        resolve(null)
      }
    }

    request.onerror = (event) => {
      console.error("Error getting previous income month start:", event)
      reject(new Error("Could not get previous income month start"))
    }
  })
}

// Set previous income month start date
export const setPreviousIncomeMonthStart = (date: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")
    const request = store.put({ key: "previousIncomeMonthStart", value: date })

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = (event) => {
      console.error("Error setting previous income month start:", event)
      reject(new Error("Could not set previous income month start"))
    }
  })
}
