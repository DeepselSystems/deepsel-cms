import React from 'react';
import { Modal, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';

interface Editor {
  display_name?: string;
  username?: string;
}

interface ParallelEditWarningData {
  newEditor?: Editor;
  existingEditors?: Editor[];
  allOtherEditors?: Editor[];
  isNewEditor?: boolean;
  isFirstUser?: boolean;
}

interface ParallelEditWarningProps {
  warning?: ParallelEditWarningData | null;
  onDismiss?: () => void;
  onGoBack?: () => void;
  onContinueEditing?: () => void;
}

/**
 * Modal warning shown when multiple users are editing the same content simultaneously
 */
export const ParallelEditWarning = ({
  warning,
  onDismiss,
  onGoBack,
  onContinueEditing,
}: ParallelEditWarningProps) => {
  const { t } = useTranslation();

  if (!warning) return null;

  const { newEditor, existingEditors, allOtherEditors, isNewEditor, isFirstUser } = warning;

  const getAllEditors = (): Editor[] => {
    if (allOtherEditors && allOtherEditors.length > 0) return allOtherEditors;

    const editors: Editor[] = [];
    if (isNewEditor && existingEditors && existingEditors.length > 0) {
      editors.push(...existingEditors);
    } else if (!isNewEditor && newEditor) {
      editors.push(newEditor);
    }
    return editors;
  };

  const getEditorCount = () => getAllEditors().length;

  return (
    <Modal
      opened={!!warning}
      onClose={isFirstUser ? onDismiss! : onGoBack!}
      title={
        <div className="flex items-center gap-2">
          <IconAlertTriangle size={16} style={{ color: '#fd7e14' }} />
          <span className="text-lg font-bold">{t('WARNING: Parallel Editing Detected')}</span>
        </div>
      }
      size="md"
      centered
      closeOnEscape={false}
      closeOnClickOutside={false}
    >
      <div className="space-y-4">
        <div className="text-sm">
          <p className="mb-3">
            {isFirstUser ? (
              getEditorCount() === 1 ? (
                <>{t('Another user has started editing this content.')}</>
              ) : (
                <>
                  <strong className="text-orange-600">{getEditorCount()}</strong>{' '}
                  {t('other users have started editing this content:')}
                </>
              )
            ) : getEditorCount() === 1 ? (
              <>{t('Another user is currently editing this content:')}</>
            ) : (
              <>
                <strong className="text-orange-600">{getEditorCount()}</strong>{' '}
                {t('other users are currently editing this content:')}
              </>
            )}
          </p>

          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">
              {getEditorCount() === 1 ? t('Active editor:') : t('Active editors:')}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {getAllEditors().map((editor, index) => (
                <li key={index} className="text-orange-700 font-medium">
                  {editor.display_name || editor.username}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <p className="text-orange-800 text-sm">
              {getEditorCount() === 1
                ? t(
                    'Editing simultaneously may result in conflicting changes and data loss. It is recommended to coordinate your edits.',
                  )
                : t(
                    'Multiple users editing simultaneously increases the risk of conflicting changes and data loss. It is strongly recommended to coordinate your edits.',
                  )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {isFirstUser ? (
            <Button
              size="md"
              variant="outline"
              color="gray"
              onClick={onDismiss}
              leftSection={<IconX size={16} />}
              className="w-full"
            >
              {t('Acknowledge')}
            </Button>
          ) : (
            <>
              <Button
                size="md"
                variant="filled"
                color="orange"
                onClick={onGoBack}
                className="flex-1"
              >
                {t('Go back')}
              </Button>
              <Button
                size="md"
                variant="outline"
                color="gray"
                onClick={onContinueEditing}
                className="flex-1"
              >
                {t('Continue editing')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
