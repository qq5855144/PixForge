import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, className = '', children, action }: {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = element.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    return () => {
      dialog.close();
      document.body.classList.remove('dialog-open');
    };
  }, []);
  return (
    <dialog ref={element} className={`modal ${className}`} aria-label={title}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === element.current) onClose(); }}>
      <div className="modal-shell">
        <header className="modal-header">
          <button type="button" className="icon-button" aria-label="关闭" onClick={onClose}><X size={19} /></button>
          <h2>{title}</h2>
          {action && <div className="modal-action">{action}</div>}
        </header>
        {children}
      </div>
    </dialog>
  );
}
