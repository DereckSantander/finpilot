import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  DatabaseBackup,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useBackups } from '@/features/settings/hooks/useBackups';
import { useSettings } from '@/hooks/useSettings';
import { handleError } from '@/lib/handle-error';
import { formatDate } from '@/lib/date';
import { exportTransactionsXlsx, exportReportPdf } from '@/services/export.service';
import {
  exportBackupFile,
  importBackupFile,
  createLocalBackup,
  downloadStoredBackup,
  deleteBackup,
} from '@/services/backups.service';
import { updateSettings } from '@/services/settings.service';
import type { BackupId } from '@/types/ids';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Exportación (Excel/PDF), respaldo/restauración JSON y respaldo automático (F11). */
export function DataBackupCard() {
  const settings = useSettings();
  const backups = useBackups();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const run = async (key: string, fn: () => Promise<void>, successMsg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      handleError(err, 'La operación no se pudo completar');
    } finally {
      setBusy(null);
    }
  };

  const onPickImport = () => fileInput.current?.click();

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite re-seleccionar el mismo archivo
    if (file) setPendingFile(file);
  };

  const toggleAutoBackup = (enabled: boolean) =>
    run('auto', () => updateSettings({ autoBackup: { ...settings.autoBackup, enabled } }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos y respaldos</CardTitle>
        <CardDescription>
          Exporta tus movimientos, genera informes y resguarda o restaura toda tu información.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Exportar */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Exportar</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => run('xlsx', () => exportTransactionsXlsx(settings), 'Excel generado.')}
            >
              {busy === 'xlsx' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => run('pdf', () => exportReportPdf(settings), 'Informe PDF generado.')}
            >
              {busy === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Informe (.pdf)
            </Button>
          </div>
        </div>

        <Separator />

        {/* Respaldo / restauración */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Respaldo completo</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={() => run('export', () => exportBackupFile(), 'Respaldo descargado.')}
            >
              {busy === 'export' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar respaldo (.json)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={busy !== null}
              onClick={onPickImport}
            >
              <Upload className="h-4 w-4" />
              Restaurar respaldo
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Restaurar reemplaza tus datos actuales por los del archivo. Los comprobantes adjuntos
            (imágenes) no se incluyen en el respaldo.
          </p>
        </div>

        <Separator />

        {/* Respaldo automático */}
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Respaldo automático</span>
            <span className="block text-xs text-muted-foreground">
              Crea un respaldo local cada {settings.autoBackup.frequencyDays} días (conserva los{' '}
              {settings.autoBackup.keep} más recientes).
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.autoBackup.enabled}
            disabled={busy !== null}
            onChange={(e) => toggleAutoBackup(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
        </label>

        <Separator />

        {/* Respaldos locales */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Respaldos locales</p>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={busy !== null}
              onClick={() =>
                run(
                  'create',
                  () => createLocalBackup(settings.autoBackup.keep).then(() => undefined),
                  'Respaldo creado.',
                )
              }
            >
              {busy === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DatabaseBackup className="h-4 w-4" />
              )}
              Crear ahora
            </Button>
          </div>

          {backups === undefined ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay respaldos locales.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {backups.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {formatDate(b.createdAt, 'd MMM yyyy, HH:mm', settings.locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(b.sizeBytes)} · esquema v{b.schemaVersion}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={busy !== null}
                      onClick={() =>
                        run('dl-' + b.id, () => downloadStoredBackup(b.id as BackupId))
                      }
                      aria-label="Descargar respaldo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={busy !== null}
                      onClick={() => run('rm-' + b.id, () => deleteBackup(b.id as BackupId))}
                      aria-label="Eliminar respaldo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={pendingFile !== null}
        onOpenChange={(open) => !open && setPendingFile(null)}
        title="Restaurar respaldo"
        description="Se reemplazarán todos tus datos actuales por los del archivo seleccionado. Esta acción no se puede deshacer."
        confirmLabel="Restaurar"
        destructive
        onConfirm={async () => {
          const file = pendingFile;
          if (!file) return;
          setPendingFile(null);
          await run('import', async () => {
            const summary = await importBackupFile(file);
            toast.success(
              `Respaldo restaurado: ${summary.rows} registros en ${summary.tables} tablas.`,
            );
          });
        }}
      />
    </Card>
  );
}
