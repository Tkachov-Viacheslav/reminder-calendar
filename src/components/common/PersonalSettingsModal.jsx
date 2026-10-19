import React from 'react';
import { Settings, Tag } from 'lucide-react';
import { Modal } from '../ui';
import { CategoryManager } from '../Reminders/CategoryManager';
import { useTelegram } from '../../context/TelegramContext';

export function PersonalSettingsModal({ isOpen, onClose }) {
  const { setClosingConfirmation } = useTelegram();

  React.useEffect(() => {
    if (isOpen) {
      setClosingConfirmation?.(true);
      return () => setClosingConfirmation?.(false);
    }
  }, [isOpen, setClosingConfirmation]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Налаштування календаря"
      icon={<Settings className="w-5 h-5 text-indigo-500" />}
      maxWidth="max-w-md"
    >
      <div className="p-4 space-y-4">
        <CategoryManager isTeam={false} canEdit={true} />
      </div>
    </Modal>
  );
}
