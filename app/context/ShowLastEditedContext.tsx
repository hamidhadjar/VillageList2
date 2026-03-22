'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'showLastEdited';

function getStored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== 'false';
  } catch {
    return true;
  }
}

type ContextValue = { showLastEdited: boolean; setShowLastEdited: (v: boolean) => void };

const ShowLastEditedContext = createContext<ContextValue>({
  showLastEdited: true,
  setShowLastEdited: () => {},
});

export function ShowLastEditedProvider({ children }: { children: ReactNode }) {
  const [showLastEdited, setShowLastEditedState] = useState(true);

  useEffect(() => {
    setShowLastEditedState(getStored());
  }, []);

  const setShowLastEdited = useCallback((v: boolean) => {
    setShowLastEditedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // ignore
    }
  }, []);

  return (
    <ShowLastEditedContext.Provider value={{ showLastEdited, setShowLastEdited }}>
      {children}
    </ShowLastEditedContext.Provider>
  );
}

export function useShowLastEdited() {
  return useContext(ShowLastEditedContext);
}
