import { create } from 'zustand';

interface UIState {
  commandOpen: boolean;
  helpOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  toggleCommand: () => void;
  setHelpOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandOpen: false,
  helpOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}));
