"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./primitives";

export function Modal({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className={`fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[14px] border border-line bg-surface p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl text-primary">{title}</Dialog.Title>
              <Dialog.Description className={description ? "mt-1 text-sm text-muted" : "sr-only"}>{description ?? title}</Dialog.Description>
            </div>
            <Dialog.Close asChild><button aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-soft"><X className="size-5" /></button></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmModal({ open, onOpenChange, title, description, confirmLabel = "Confirm", danger, loading, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
