import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal.jsx';

const ConfirmContext = createContext(null);

// Usage:  const confirm = useConfirm();
//         if (await confirm({ title, message, confirmLabel, danger })) { ... }
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const pending = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        if (pending.current) pending.current(false); // never leave an earlier promise hanging
        pending.current = resolve;
        setDialog(options);
      }),
    [],
  );

  const finish = (result) => {
    const resolve = pending.current;
    pending.current = null;
    setDialog(null);
    if (resolve) resolve(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title}
          onClose={() => finish(false)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => finish(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                data-autofocus
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => finish(true)}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </>
          }
        >
          <p>{dialog.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
