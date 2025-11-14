import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  FolderTree,
  Layers3,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Home,
  Briefcase,
  Heart,
  GraduationCap,
  Gamepad2,
  Music,
  Camera,
  Dumbbell,
  Plane,
  Hotel,
  Stethoscope,
  Wrench,
  Shirt,
  Coffee,
  Gift,
  FileText,
  Zap,
} from "lucide-react";

import api from "../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "../components/Modal";
import { cn } from "@/lib/utils";

// Icon mapping for categories
const getCategoryIcon = (categoryName) => {
  const name = categoryName?.toLowerCase() || "";
  const iconMap = {
    travel: Plane,
    transportation: Car,
    food: UtensilsCrossed,
    dining: UtensilsCrossed,
    meals: UtensilsCrossed,
    restaurant: UtensilsCrossed,
    shopping: ShoppingBag,
    retail: ShoppingBag,
    home: Home,
    housing: Home,
    rent: Home,
    business: Briefcase,
    work: Briefcase,
    office: Building2,
    health: Heart,
    medical: Stethoscope,
    fitness: Dumbbell,
    gym: Dumbbell,
    education: GraduationCap,
    school: GraduationCap,
    entertainment: Gamepad2,
    games: Gamepad2,
    music: Music,
    hobbies: Camera,
    photography: Camera,
    clothing: Shirt,
    fashion: Shirt,
    coffee: Coffee,
    beverages: Coffee,
    gifts: Gift,
    utilities: Zap,
    maintenance: Wrench,
    repairs: Wrench,
    documents: FileText,
    admin: FileText,
  };

  // Find matching icon
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return Icon;
    }
  }

  // Default icon
  return FolderTree;
};

// Gradient colors for categories
const getCategoryGradient = (index) => {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-blue-500",
    "from-teal-500 to-green-500",
    "from-rose-500 to-pink-500",
    "from-violet-500 to-purple-500",
  ];
  return gradients[index % gradients.length];
};

async function fetchCategories() {
  const { data } = await api.get("/categories", { params: { includeAll: true } });
  return data?.categories ?? data ?? [];
}

export default function Categories() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ type: null, category: null });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", parentId: "" });
  const [subForm, setSubForm] = useState({ names: "" });
  const [forceDelete, setForceDelete] = useState(false);
  const [expanded, setExpanded] = useState({});

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/categories", payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Category created successfully!");
      qc.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/categories/${id}`, payload).then((res) => res.data),
    onSuccess: () => {
      toast.success("Category updated successfully!");
      qc.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: () => toast.error("Failed to update category"),
  });

  const bulkSubMutation = useMutation({
    mutationFn: ({ parentId, names }) =>
      api
        .post("/categories/bulk-subcats", {
          parentId,
          names: names.map((name) => name.trim()), // Array of strings, not array of objects
        })
        .then((res) => res.data),
    onSuccess: () => {
      toast.success("Subcategories added successfully!");
      qc.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: () => toast.error("Failed to add subcategories"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => {
      // For subcategories, force is not needed (they have no children)
      // For parent categories with subcategories, force must be true
      const params = force ? { force: 'true' } : {};
      return api.delete(`/categories/${id}`, { params }).then((res) => res.data);
    },
    onSuccess: () => {
      toast.success("Category deleted successfully!");
      qc.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || "Failed to delete category";
      const details = error.response?.data?.details;
      
      if (error.response?.status === 400 && details) {
        toast.error(
          `Cannot delete: ${details.subcategoriesCount || 0} subcategories and ${details.linkedTransactions || 0} linked transactions. Check the box to force delete.`,
          { duration: 5000 }
        );
      } else {
        toast.error(errorMsg);
      }
    },
  });

  const closeModal = () => {
    setModal({ type: null, category: null });
    setCategoryForm({ name: "", description: "", parentId: "" });
    setSubForm({ names: "" });
    setForceDelete(false);
  };

  const openCreate = () => {
    setModal({ type: "create", category: null });
    setCategoryForm({ name: "", description: "", parentId: "" });
  };

  const openEdit = (category) => {
    setModal({ type: "edit", category });
    setCategoryForm({
      name: category.name ?? "",
      description: category.description ?? "",
      parentId: category.parentId ?? "",
    });
  };

  const openAddSub = (category) => {
    setModal({ type: "sub", category });
    setSubForm({ names: "" });
  };

  const openDelete = (category) => {
    setModal({ type: "delete", category });
    setForceDelete(false);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || undefined,
      parentId: categoryForm.parentId || undefined,
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!modal.category) return;
    updateMutation.mutate({
      id: modal.category.id,
      payload: {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        parentId: categoryForm.parentId || null,
      },
    });
  };

  const handleAddSub = (e) => {
    e.preventDefault();
    if (!modal.category) return;
    const names = subForm.names
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    if (!names.length) {
      toast.error("Add at least one subcategory name");
      return;
    }
    bulkSubMutation.mutate({ parentId: modal.category.id, names });
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (!modal.category) return;
    
    // For subcategories, no force needed
    // For parent categories with subcategories, require force if checkbox is checked
    const isSubcategory = !!modal.category.parentId;
    const hasSubcategories = modal.category.subcategories && modal.category.subcategories.length > 0;
    const shouldForce = !isSubcategory && hasSubcategories && forceDelete;
    
    deleteMutation.mutate({ 
      id: modal.category.id, 
      force: shouldForce 
    });
  };

  const topLevelCategories = useMemo(
    () => categories.filter((cat) => !cat.parentId),
    [categories]
  );

  if (error) {
    console.error("Categories fetch error", error);
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-teal-500 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              Categories
            </h1>
          </div>
          <Button
            onClick={openCreate}
            className="bg-white text-blue-600 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Category
          </Button>
        </div>
      </div>

      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary" />
            Listed All Categories and their Sub Categories
          </CardTitle>
          {/* <p className="text-muted-foreground">
            Click any category to expand and manage subcategories
          </p> */}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : topLevelCategories.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary/10 mb-4">
                <FolderTree className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">No categories yet</p>
              <p className="text-muted-foreground text-sm mb-4">Create your first category to get started!</p>
              <Button onClick={openCreate} className="bg-gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevelCategories.map((category, idx) => {
                const isExpanded = expanded[category.id] ?? true;
                const subcats = category.subcategories || [];
                const CategoryIcon = getCategoryIcon(category.name);
                const gradient = getCategoryGradient(idx);

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-card",
                      "hover:shadow-xl transition-all duration-300",
                      "animate-in fade-in-0 slide-in-from-left-4",
                      "hover:scale-[1.01]"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Gradient accent */}
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full bg-gradient-to-b",
                      gradient
                    )} />

                    <div className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Icon with gradient background */}
                          <div className={cn(
                            "relative flex-shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br",
                            gradient,
                            "flex items-center justify-center shadow-lg",
                            "group-hover:scale-110 transition-transform duration-300"
                          )}>
                            <CategoryIcon className="h-7 w-7 text-white" />
                            <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() =>
                                  setExpanded((prev) => ({ ...prev, [category.id]: !isExpanded }))
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                {category.name}
                              </h3>
                            </div>
                            {category.description && (
                              <p className="text-sm text-muted-foreground ml-11">
                                {category.description}
                              </p>
                            )}
                            {subcats.length > 0 && (
                              <div className="mt-2 ml-11">
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                  {subcats.length} {subcats.length === 1 ? 'subcategory' : 'subcategories'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 md:ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(category)}
                            className="hover:bg-primary/10 hover:border-primary/50 transition-all"
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddSub(category)}
                            className="hover:bg-teal-50 hover:border-teal-300 dark:hover:bg-teal-950 transition-all"
                          >
                            <Layers3 className="w-4 h-4 mr-2" />
                            Add Sub
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDelete(category)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {isExpanded && subcats.length > 0 && (
                        <div className="mt-6 pt-6 border-t animate-in fade-in-0 slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 mb-4 ml-11">
                            <Layers3 className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm font-semibold text-muted-foreground">
                              Subcategories
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ml-11">
                            {subcats.map((sub, subIdx) => {
                              const SubIcon = getCategoryIcon(sub.name);
                              return (
                                <div
                                  key={sub.id}
                                  className={cn(
                                    "group/sub relative rounded-lg border bg-muted/50 p-4",
                                    "hover:bg-muted hover:shadow-md transition-all duration-200",
                                    "animate-in fade-in-0 slide-in-from-left-2",
                                    "hover:scale-[1.02]"
                                  )}
                                  style={{ animationDelay: `${subIdx * 30}ms` }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                      <div className={cn(
                                        "h-10 w-10 rounded-lg bg-gradient-to-br",
                                        getCategoryGradient(subIdx),
                                        "flex items-center justify-center shadow-md flex-shrink-0",
                                        "group-hover/sub:scale-110 transition-transform"
                                      )}>
                                        <SubIcon className="h-5 w-5 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate">{sub.name}</p>
                                        {sub.description && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {sub.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-primary/10"
                                        onClick={() => openEdit(sub)}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => openDelete(sub)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      <Modal open={modal.type === "create"} onClose={closeModal} title="Create New Category">
        <form className="space-y-5" onSubmit={handleCreate}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Category Name *</Label>
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Travel, Food, Business"
              required
              className="h-11"
            />
          </div>
          {/* <div className="space-y-2">
            {/* <Label className="text-sm font-semibold">Description</Label> */}
            {/* <Input
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className="h-11"
            />
          </div> */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Parent Category</Label>
            <select
              className="w-full h-11 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm((f) => ({ ...f, parentId: e.target.value }))}
            >
              <option value="">Top-level category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white hover:opacity-90 h-11 shadow-lg"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal open={modal.type === "edit"} onClose={closeModal} title="Edit Category">
        <form className="space-y-5" onSubmit={handleUpdate}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Category Name *</Label>
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="h-11"
            />
          </div>
          {/* <div className="space-y-2">
            <Label className="text-sm font-semibold">Description</Label>
            <Input
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
              className="h-11"
            />
          </div> */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Parent Category</Label>
            <select
              className="w-full h-11 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={categoryForm.parentId ?? ""}
              onChange={(e) => setCategoryForm((f) => ({ ...f, parentId: e.target.value || null }))}
            >
              <option value="">Top-level category</option>
              {categories
                .filter((cat) => cat.id !== modal.category?.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white hover:opacity-90 h-11 shadow-lg"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Subcategories Modal */}
      <Modal
        open={modal.type === "sub"}
        onClose={closeModal}
        title={`Add Subcategories to "${modal.category?.name}"`}
      >
        <form className="space-y-5" onSubmit={handleAddSub}>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Subcategory Names</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter one subcategory name per line
            </p>
            <textarea
              className="w-full min-h-[150px] rounded-lg border border-input bg-background p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder={`Example:\nTravel\nMeals\nCompliance\nEquipment`}
              value={subForm.names}
              onChange={(e) => setSubForm({ names: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary text-white hover:opacity-90 h-11 shadow-lg"
              disabled={bulkSubMutation.isPending}
            >
              {bulkSubMutation.isPending ? "Adding..." : "Add Subcategories"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        open={modal.type === "delete"}
        onClose={closeModal}
        title={`Delete "${modal.category?.name}"?`}
      >
        <form className="space-y-5" onSubmit={handleDelete}>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            {modal.category?.parentId ? (
              // Subcategory deletion - simple confirmation
              <>
                <p className="text-sm text-foreground mb-2 font-semibold">
                  Are you sure you want to delete this subcategory?
                </p>
                <p className="text-xs text-muted-foreground">
                  This will permanently delete "<span className="font-medium">{modal.category.name}</span>". This action cannot be undone.
                </p>
              </>
            ) : (
              // Parent category deletion
              <>
                <p className="text-sm text-foreground mb-2 font-semibold">
                  Are you sure you want to delete this category?
                </p>
                {modal.category?.subcategories && modal.category.subcategories.length > 0 ? (
                  <>
                    <p className="text-sm text-foreground mb-2">
                      This category has <span className="font-semibold text-destructive">{modal.category.subcategories.length}</span> subcategor{modal.category.subcategories.length === 1 ? 'y' : 'ies'}:
                    </p>
                    <ul className="text-xs text-muted-foreground mb-3 list-disc list-inside space-y-1 max-h-32 overflow-y-auto bg-background/50 p-2 rounded">
                      {modal.category.subcategories.slice(0, 5).map((sub) => (
                        <li key={sub.id}>{sub.name}</li>
                      ))}
                      {modal.category.subcategories.length > 5 && (
                        <li className="font-medium">... and {modal.category.subcategories.length - 5} more</li>
                      )}
                    </ul>
                    <p className="text-sm text-foreground font-semibold">
                      Do you want to delete all subcategories as well?
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This action cannot be undone.
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Checkbox for deleting subcategories - only show for parent categories with subcategories */}
          {!modal.category?.parentId && modal.category?.subcategories && modal.category.subcategories.length > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input text-destructive focus:ring-destructive"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
              />
              <span className="text-sm font-medium">
                Yes, delete all {modal.category.subcategories.length} subcategor{modal.category.subcategories.length === 1 ? 'y' : 'ies'} along with this category
              </span>
            </label>
          )}
          
          {/* Delete and Cancel buttons - always visible, sticky at bottom */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="submit"
              className={cn(
                "flex-1 h-11 shadow-lg font-medium transition-all relative overflow-hidden",
                deleteMutation.isPending 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white cursor-wait" 
                  : "bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white hover:from-red-600 hover:via-red-700 hover:to-red-800"
              )}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  <span className="font-semibold">Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Delete</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="h-11 min-w-[100px] font-medium"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
