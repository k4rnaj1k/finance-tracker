import { useEffect, useState } from "react";
import { Category, ExchangeRate, Expense, getCategories, getDefaultCurrency, getExpenses, getIncomeMonthStart, getLatestExchangeRate, setDefaultCurrency } from "./db";
import { ExpenseList } from "./expense-list";

export const ExpenseChartsExpenses = ({ categoryId }: { categoryId: string }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [currency, setCurrency] = useState<string>("USD");
    const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
    const [incomeMonthStart, setIncomeMonthStart] = useState(new Date());
    const refreshData = async () => {
        setExpenses(await getExpenses());
        setCategories(await getCategories());
        setCurrency(await getDefaultCurrency());
        setDefaultCurrency(await getDefaultCurrency());
        setExchangeRate(await getLatestExchangeRate());
        setIncomeMonthStart(new Date(await getIncomeMonthStart() || new Date()));
    };
    useEffect(() => {
        (async () => {
            await refreshData();
        })();
    }, []);
    return <ExpenseList
        expenses={expenses.filter(expense => expense.categoryId === categoryId)}
        categories={categories} defaultCurrency={currency}
        exchangeRate={exchangeRate}
        incomeMonthStart={new Date(incomeMonthStart || new Date())}
        onDataChange={refreshData} />
};