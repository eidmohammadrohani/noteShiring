import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/common/ConfirmDialog.jsx';

// Lets the editor tell the rest of the app "there is unsaved work". Sidebar
// links and logout ask `guard()` before leaving; closing the tab triggers the
// browser's own warning via beforeunload.
const UnsavedContext = createContext(null);

export function UnsavedProvider({ children }) {
  const dirtyRef = useRef(false);
  const confirm = useConfirm();
  const navigate = useNavigate();

  const setDirty = useCallback((value) => {
    dirtyRef.current = Boolean(value);
  }, []);

  // Resolves true when it is OK to leave the current screen.
  const guard = useCallback(async () => {
    if (!dirtyRef.current) return true;
    const leave = await confirm({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes in the note editor. If you leave now they will be lost.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      danger: true,
    });
    if (leave) dirtyRef.current = false;
    return leave;
  }, [confirm]);

  const guardedNavigate = useCallback(
    async (to, options) => {
      if (await guard()) navigate(to, options);
    },
    [guard, navigate],
  );

  const value = useMemo(
    () => ({ setDirty, guard, guardedNavigate }),
    [setDirty, guard, guardedNavigate],
  );
  return <UnsavedContext.Provider value={value}>{children}</UnsavedContext.Provider>;
}

export function useUnsaved() {
  const ctx = useContext(UnsavedContext);
  if (!ctx) throw new Error('useUnsaved must be used inside <UnsavedProvider>');
  return ctx;
}

// Used by the editor: registers the dirty flag and the beforeunload warning.
export function useDirtyGuard(isDirty) {
  const { setDirty } = useUnsaved();
  useEffect(() => {
    setDirty(isDirty);
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
}
