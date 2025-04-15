"use client"

import type React from "react"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { Edit2, Trash, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addCategory, updateCategory, deleteCategory } from "./db"
import { toast } from "@/components/ui/use-toast"

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryManagerProps {
  categories: Category[]
  onCategoriesChanged: () => void
}

export function CategoryManager({ categories, onCategoriesChanged }: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#6E56CF")
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  const [isProcessing, setIsProcessing] = useState(false)

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCategoryName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a category name",
        variant: "destructive",
      })
      return
    }

    setIsAddingCategory(true)

    try {
      const newCategory = {
        id: uuidv4(),
        name: newCategoryName.trim(),
        color: newCategoryColor,
      }

      await addCategory(newCategory)

      // Reset form
      setNewCategoryName("")
      setNewCategoryColor("#6E56CF")

      // Notify parent component
      onCategoriesChanged()

      toast({
        title: "Category added",
        description: "Your new category has been created successfully",
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingCategory(false)
    }
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setEditName(category.name)
    setEditColor(category.color)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return

    if (!editName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a category name",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const updatedCategory = {
        ...editingCategory,
        name: editName.trim(),
        color: editColor,
      }

      await updateCategory(updatedCategory)

      setIsEditDialogOpen(false)
      onCategoriesChanged()

      toast({
        title: "Category updated",
        description: "The category has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this category? Any expenses assigned to this category will need to be reassigned.",
      )
    ) {
      setIsProcessing(true)
      try {
        await deleteCategory(id)
        onCategoriesChanged()
        toast({
          title: "Category deleted",
          description: "The category has been removed successfully",
        })
      } catch (error) {
        console.error("Error deleting category:", error)
        toast({
          title: "Error",
          description: "Failed to delete category. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddCategory} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="category-name">New Category Name</Label>
            <Input
              id="category-name"
              placeholder="Enter category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="category-color">Color</Label>
            <Input
              id="category-color"
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="h-10 p-1"
            />
          </div>
        </div>
        <Button type="submit" disabled={isAddingCategory}>
          <Plus className="h-4 w-4 mr-2" />
          {isAddingCategory ? "Adding..." : "Add Category"}
        </Button>
      </form>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: category.color }} />
                </TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(category)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      disabled={isProcessing}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit} disabled={isProcessing}>
                {isProcessing ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
