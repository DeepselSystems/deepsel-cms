import { Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import Button from './Button.jsx';

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  userRecord,
  serverRecord,
  lastModifiedBy,
  lastModifiedAt,
  conflictExplanation,
  onResolveConflict,
  isLoading,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={<div className="font-semibold text-lg">{t('Edit Conflict Detected')}</div>}
      size="lg"
    >
      <div className="py-4">
        <p className="text-gray-700 mb-4">
          {t('Another user has modified this content while you were editing.')}
          {lastModifiedBy && (
            <span className="font-medium"> {t('Last modified by')}: {lastModifiedBy}</span>
          )}
        </p>
        {conflictExplanation && (
          <div className="bg-gray-50 border rounded-lg p-3 mb-4 text-sm text-gray-600">
            {conflictExplanation}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={() => onResolveConflict(userRecord)} loading={isLoading}>
            {t('Save My Changes')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
