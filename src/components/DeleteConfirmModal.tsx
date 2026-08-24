import { useEffect } from "react";

/**
 * Branded, in-app delete confirmation. Replaces native window.confirm so every
 * destructive action asks "are you sure?" in the CoCreate visual language.
 */
export function DeleteConfirmModal({
  open,
  title = "Delete this?",
  itemName,
  message,
  confirmLabel = "Delete",
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  itemName?: string | null;
  message?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, busy]);

  if (!open) return null;

  return (
    <div className="dcm-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={() => { if (!busy) onCancel(); }}>
      <div className="dcm-card" onClick={(e) => e.stopPropagation()}>
        <div className="dcm-iconwrap">
          <span className="dcm-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M6 6l1 14h10l1-14" />
            </svg>
          </span>
        </div>
        <div className="dcm-body">
          <h2 className="dcm-title">{title}</h2>
          {itemName ? (
            <div className="dcm-itemname" title={itemName}>{itemName}</div>
          ) : null}
          {message ? <p className="dcm-copy">{message}</p> : null}
        </div>
        <div className="dcm-actions">
          <button type="button" className="dcm-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="dcm-confirm" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        .dcm-overlay{position:fixed;inset:0;background:rgba(16,16,24,0.42);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;animation:dcmFade .16s ease;}
        .dcm-card{background:#FBF8ED;border:1.5px solid #ECE4CE;border-radius:20px;width:100%;max-width:440px;padding:0;overflow:hidden;box-shadow:0 24px 60px -16px rgba(16,16,24,0.4);animation:dcmPop .18s cubic-bezier(.2,.8,.2,1);}
        @keyframes dcmFade{from{opacity:0;}to{opacity:1;}}
        @keyframes dcmPop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}
        .dcm-iconwrap{display:flex;align-items:center;justify-content:center;padding:30px 24px 18px;}
        .dcm-icon{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:999px;background:rgba(179,34,12,0.1);color:#B3220C;}
        .dcm-body{padding:0 28px;}
        .dcm-title{font-family:'Archivo Black','Poppins',sans-serif;font-size:22px;font-weight:900;color:#20201C;margin:0 0 6px;line-height:1.2;}
        .dcm-itemname{font-size:14px;font-weight:700;color:#20201C;background:#fff;border:1px solid #ECE4CE;border-radius:10px;padding:8px 14px;margin:10px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .dcm-copy{font-size:13px;line-height:1.5;color:#6b6a60;margin:8px 0 0;}
        .dcm-actions{display:flex;gap:10px;padding:20px 28px 28px;}
        .dcm-cancel{flex:1;background:#fff;border:1.5px solid #ECE4CE;color:#20201C;font-family:inherit;font-size:14px;font-weight:800;padding:13px 18px;border-radius:999px;cursor:pointer;transition:border-color .15s ease, background .15s ease;}
        .dcm-cancel:hover{border-color:#8a8879;background:#fff;}
        .dcm-confirm{flex:1;background:#B3220C;border:1.5px solid #B3220C;color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:13px 18px;border-radius:999px;cursor:pointer;transition:background .15s ease, border-color .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
        .dcm-confirm:hover{background:#8a1A08;border-color:#8a1A08;}
        .dcm-confirm:disabled{opacity:.6;cursor:default;}
        @media (max-width:480px){.dcm-card{max-width:none;border-radius:0;}}
      `}</style>
    </div>
  );
}

export default DeleteConfirmModal;
