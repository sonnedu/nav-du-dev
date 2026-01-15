import { useEffect, useRef } from 'react';
import { useI18n } from '../../lib/useI18n';

export interface AdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'info';
  type?: 'confirm' | 'alert';
}

export function AdminDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  type = 'confirm'
}: AdminDialogProps) {
  const { m } = useI18n();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      setTimeout(() => confirmRef.current?.focus(), 50);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal admin-dialog" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="admin-modal-header">
          <h2 id="dialog-title" className="admin-modal-title">{title}</h2>
          <button className="btn btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-dialog-message">
            {message}
          </div>
        </div>
        <div className="admin-modal-footer">
          {type === 'confirm' && (
            <button type="button" className="btn" onClick={onClose}>
              {cancelLabel || m.admin.cancel}
            </button>
          )}
          <button 
            ref={confirmRef}
            type="button" 
            className={`btn btn-${variant}`} 
            onClick={handleConfirm}
          >
            {confirmLabel || (type === 'confirm' ? m.admin.confirm : m.admin.ok)}
          </button>
        </div>
      </div>
    </div>
  );
}
