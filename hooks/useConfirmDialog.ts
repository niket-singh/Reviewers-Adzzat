import { useState } from 'react';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}


export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    loading: false,
  });

  const showConfirm = (options: Omit<ConfirmDialogState, 'isOpen' | 'loading'>) => {
    setState({
      ...options,
      isOpen: true,
      loading: false,
    });
  };

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      await state.onConfirm();
      setState((prev) => ({ ...prev, isOpen: false, loading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  };

  const handleCancel = () => {
    if (!state.loading) {
      setState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return {
    confirmDialog: state,
    showConfirm,
    handleConfirm,
    handleCancel,
  };
}
