import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Tags } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryFormDialog } from '@/features/settings/components/CategoryFormDialog';
import { DeleteCategoryDialog } from '@/features/settings/components/DeleteCategoryDialog';
import { useAllCategories } from '@/features/settings/hooks/useAllCategories';
import { categoryIcon } from '@/features/settings/lib/categoryIcons';
import { archiveCategory } from '@/services/categories.service';
import { handleError } from '@/lib/handle-error';
import { cn } from '@/lib/cn';
import type { CategoryRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { CategoryId } from '@/types/ids';

/** Gestión de categorías: crear, editar, archivar y eliminar por tipo (F12). */
export function CategoriesCard() {
  const all = useAllCategories();
  const [type, setType] = useState<TransactionType>('expense');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | undefined>(undefined);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const list = (all ?? [])
    .filter((c) => c.type === type)
    .sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || a.sortOrder - b.sortOrder);

  const activeSameType = (all ?? []).filter((c) => c.type === type && !c.isArchived);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (category: CategoryRow) => {
    setEditing(category);
    setFormOpen(true);
  };

  const toggleArchive = async (category: CategoryRow) => {
    try {
      await archiveCategory(category.id as CategoryId, !category.isArchived);
    } catch (err) {
      handleError(err, 'No se pudo actualizar la categoría');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Categorías</CardTitle>
          <CardDescription>Organiza tus ingresos y gastos.</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="expense">Gastos</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
          </TabsList>
        </Tabs>

        {all === undefined ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay categorías de {type === 'expense' ? 'gasto' : 'ingreso'}.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {list.map((c) => {
              const Icon = categoryIcon(c.icon);
              return (
                <li
                  key={c.id}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2.5',
                    c.isArchived && 'opacity-60',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${c.color}22`, color: c.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {c.isSystem ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Sistema
                      </Badge>
                    ) : null}
                    {c.isArchived ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Archivada
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void toggleArchive(c)}
                      aria-label={c.isArchived ? `Restaurar ${c.name}` : `Archivar ${c.name}`}
                    >
                      {c.isArchived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                    {!c.isSystem ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(c)}
                        aria-label={`Eliminar ${c.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tags className="h-3.5 w-3.5" />
          Las categorías del sistema no se pueden eliminar, solo archivar.
        </p>
      </CardContent>

      {formOpen ? (
        <CategoryFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          defaultType={type}
          initial={editing}
        />
      ) : null}

      <DeleteCategoryDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        category={deleting}
        reassignOptions={activeSameType}
      />
    </Card>
  );
}
