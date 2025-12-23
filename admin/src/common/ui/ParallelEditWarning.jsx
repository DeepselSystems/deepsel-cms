import { Modal, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Component to display parallel edit warnings when multiple users are editing the same content
 */
export default function ParallelEditWarning({ warning, onDismiss, onGoBack, onContinueEditing }) {
  const { t } = useTranslation();

  if (!warning) return null;

  const { newEditor, existingEditors, allOtherEditors, isNewEditor, isFirstUser } = warning;

  const getAllEditors = () => {
    // Use the comprehensive allOtherEditors list if available
    if (allOtherEditors && allOtherEditors.length > 0) {
      return allOtherEditors;
    }

    // Fallback to the original logic for backward compatibility
    const editors = [];
    if (isNewEditor && existingEditors && existingEditors.length > 0) {
      // New user sees existing editors
      editors.push(...existingEditors);
    } else if (!isNewEditor && newEditor) {
      // Existing user sees new editor
      editors.push(newEditor);
    }

    return editors;
  };

  const getEditorList = () => {
    const editors = getAllEditors();
    if (editors.length === 0) return t('Unknown user');

    return editors.map((editor) => editor.display_name || editor.username);
  };

  const getEditorNames = () => {
    const names = getEditorList();
    if (Array.isArray(names)) {
      return names.join(', ');
    }
    return names;
  };

  const getEditorCount = () => {
    return getAllEditors().length;
  };

  return (
    <Modal
      opened={!!warning}
      onClose={isFirstUser ? onDismiss : onGoBack}
      title={
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#fd7e14' }} size="lg" />
          <span className="text-lg font-bold">{t('WARNING: Parallel Editing Detected')}</span>
        </div>
      }
      size="md"
      centered
      closeOnEscape={false}
      closeOnClickOutside={false}
      styles={{
        title: {
          color: '#fd7e14',
        },
      }}
    >
      <div className="space-y-4">
        <div className="text-sm">
          <p className="mb-3">
            {isFirstUser ? (
              // First user sees notification about others joining
              <>
                {getEditorCount() === 1 ? (
                  <>{t('Another user has started editing this content.')}</>
                ) : (
                  <>
                    <strong className="text-orange-600">{getEditorCount()}</strong>{' '}
                    {t('other users have started editing this content:')}
                  </>
                )}
              </>
            ) : (
              // All other users (including 2nd, 3rd, etc.) see warning to go back
              <>
                {getEditorCount() === 1 ? (
                  <>{t('Another user is currently editing this content:')}</>
                ) : (
                  <>
                    <strong className="text-orange-600">{getEditorCount()}</strong>{' '}
                    {t('other users are currently editing this content:')}
                  </>
                )}
              </>
            )}
          </p>

          {/* Always show editor list for clear identification */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">
              {getEditorCount() === 1 ? t('Active editor:') : t('Active editors:')}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {getEditorList().map((name, index) => (
                <li key={index} className="text-orange-700 font-medium">
                  {name}
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
            // First user (who was there first) sees acknowledge option
            <Button
              size="md"
              variant="outline"
              color="gray"
              onClick={onDismiss}
              leftSection={<FontAwesomeIcon icon={faTimes} size="sm" />}
              className="w-full"
            >
              {t('Acknowledge')}
            </Button>
          ) : (
            // All other users (2nd, 3rd, etc.) see go back options
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
}
