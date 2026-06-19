import { useState } from 'react'
import { X } from 'lucide-react'

interface NoteDialogProps {
  open: boolean
  title: string
  actionLabel: string
  onClose: () => void
  onConfirm: (note: string) => void
}

export default function NoteDialog({ open, title, actionLabel, onClose, onConfirm }: NoteDialogProps) {
  const [note, setNote] = useState('')

  if (!open) return null

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-navy-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-navy-500">{title}</span>
          <button className="rounded p-1 hover:bg-slate-100 transition-colors" onClick={onClose}>
            <X className="h-4 w-4 text-navy-300" />
          </button>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs text-navy-300 mb-2">处理备注</label>
          <textarea
            className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-2 text-xs text-navy-500 placeholder:text-navy-100 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200 resize-none"
            rows={3}
            placeholder="请输入处理备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button className="btn-secondary text-xs" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary text-xs" onClick={handleConfirm}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
