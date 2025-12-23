import React from 'react';
import { Box, Button, TextInput, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faEdit, faRefresh } from '@fortawesome/free-solid-svg-icons';

/**
 * Render label and description
 *
 * @type {React.NamedExoticComponent<{
 * readonly label?: *,
 * readonly description?: *,
 * readonly required?: boolean
 * }>}
 */
const LabelAndDescription = React.memo(({ label, description, required = false }) => {
  return (
    <>
      {/* Label */}
      {label && (
        <Text size="sm" fw={500} mb={0}>
          {label}{' '}
          {required && (
            <Box component="span" className="text-danger-main">
              {' '}
              *
            </Box>
          )}
        </Text>
      )}
      {/* Description */}
      {description && (
        <Text size="xs" c="dimmed" mb={8}>
          {description}
        </Text>
      )}
    </>
  );
});

LabelAndDescription.displayName = 'LabelAndDescription';

/**
 * @typedef SecretInputRef
 * @property {() => void} setDone
 */

/**
 * Secret input control - A component for displaying and editing truncated secrets
 *
 *
 * @type {React.ForwardRefExoticComponent<React.PropsWithoutRef<{
 * readonly truncateSecret?: string,
 * readonly editingValue?: string,
 * readonly setEditingValue?: React.Dispatch<React.SetStateAction<string>>,
 * readonly label?: string,
 * readonly description?: string,
 * readonly required?: boolean
 * }> & React.RefAttributes<SecretInputRef>>}
 */
const SecretInput = React.forwardRef(
  (
    { truncateSecret, editingValue, setEditingValue, label, description, required = false },
    ref,
  ) => {
    // Translation hook for internationalization
    const { t } = useTranslation();

    // State to manage edit mode toggle
    const [isEditing, setIsEditing] = React.useState(false);

    /**
     * Handles the edit button click - switches to edit mode
     * and initializes temporary value with current editing value
     */
    const handleEditClick = React.useCallback(() => {
      setIsEditing(true);
    }, []);

    /**
     * Handles the done/confirm click - saves the temporary value
     * and exits edit mode
     */
    const handleDoneClick = React.useCallback(() => {
      // Reset state
      setIsEditing(false);
    }, []);

    /**
     * Handles the reset button click - clears temporary value
     * and exits edit mode without saving
     */
    const handleResetClick = React.useCallback(() => {
      setEditingValue?.('');
      setIsEditing(false);
    }, [setEditingValue]);

    /**
     * Handle ref
     */
    React.useImperativeHandle(
      ref,
      () => ({
        setDone: handleDoneClick,
      }),
      [handleDoneClick],
    );

    // Render edit mode: input field with done and reset buttons
    if (isEditing) {
      return (
        <Box>
          <LabelAndDescription required={required} label={label} description={description} />

          <Group gap="sm" className="w-full">
            {/* Input field for editing secret value */}
            <TextInput
              autoFocus
              required={required}
              value={editingValue}
              onChange={({ target: { value } }) => setEditingValue?.(value)}
              placeholder={t('Enter new secret...')}
              className="flex-1"
              size="sm"
            />
            {/* Done button - confirms and saves the changes */}
            <Button
              size="sm"
              variant="filled"
              color="blue"
              leftSection={<FontAwesomeIcon icon={faCheck} />}
              disabled={!editingValue}
              onClick={handleDoneClick}
              className="shrink-0"
            >
              {t('Done')}
            </Button>
            {/* Reset button - cancels editing and reverts changes */}
            <Button
              size="sm"
              variant="outline"
              color="blue"
              leftSection={<FontAwesomeIcon icon={faRefresh} />}
              onClick={handleResetClick}
              className="shrink-0"
            >
              {t('Reset')}
            </Button>
          </Group>
        </Box>
      );
    }

    // Render view mode: display truncated secret with the edit button
    return (
      <Box>
        <LabelAndDescription required={required} label={label} description={description} />
        <Group gap="sm" className="w-full" wrap="nowrap">
          {/*region Display box for truncated secret*/}
          <Box className="flex-1 px-3 py-2 bg-gray-50 rounded-md border border-gray-200 truncate">
            <span className="text-sm text-gray-700 font-mono">
              {editingValue || truncateSecret || t('No secret available')}
            </span>
          </Box>
          {/*endregion Display box for truncated secret*/}

          {/*region Edit button - switches to edit mode*/}
          <Box>
            <Button
              size="sm"
              variant="outline"
              color="blue"
              leftSection={<FontAwesomeIcon icon={faEdit} />}
              onClick={handleEditClick}
              className="shrink-0"
            >
              {t('Edit')}
            </Button>
          </Box>
          {/*endregion Edit button - switches to edit mode*/}
        </Group>
      </Box>
    );
  },
);

SecretInput.displayName = 'SecretInput';
export default SecretInput;
