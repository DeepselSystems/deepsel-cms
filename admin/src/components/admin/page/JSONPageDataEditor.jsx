import {useCallback} from 'react';
import RichTextInput from '../../../common/ui/RichTextInput.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';

/**
 * Recursive component for rendering JSON content fields in admin forms
 * @param {Object} props - Component props
 * @param {string} props.fieldKey - The key of the current field
 * @param {*} props.value - The value of the current field
 * @param {string} props.fieldPath - The full path to this field (for nested objects)
 * @param {number} props.level - The nesting level (for indentation)
 * @param {Function} props.onFieldChange - Callback function for field value changes
 * @returns {JSX.Element|null} - Rendered field component
 */
function JSONFieldRenderer({
  fieldKey,
  value,
  fieldPath = '',
  level = 0,
  onFieldChange,
  currentLocaleId,
  autoCompleteEnabled = false,
}) {
  const fullPath = fieldPath ? `${fieldPath}.${fieldKey}` : fieldKey;
  const label = value?.['ds-label'] || fieldKey;
  const type = value?.['ds-type'];

  // Check if this is a container section (object without ds-value property)
  const isContainer =
    typeof value === 'object' &&
    value !== null &&
    !value.hasOwnProperty('ds-value') &&
    !type;

  const handleFieldChange = useCallback(
    (path, newValue) => {
      onFieldChange(path, newValue);
    },
    [onFieldChange]
  );

  if (!value) return null;

  return (
    <div key={fullPath} className="mb-4" style={{marginLeft: level * 8}}>
      {isContainer ? (
        <h3 className="font-semibold text-lg mb-3 text-gray-800">{label}</h3>
      ) : type === 'wysiwyg' ? (
        <RichTextInput
          label={label}
          content={value['ds-value'] || ''}
          currentLocaleId={currentLocaleId}
          onChange={(newValue) =>
            onFieldChange(fullPath, {
              ...value,
              'ds-value': newValue,
            })
          }
          className="mb-2"
          autoComplete={autoCompleteEnabled}
        />
      ) : typeof value === 'string' ? (
        <TextInput label={label} value={value} className="mb-2" />
      ) : value?.['ds-value'] !== undefined ? (
        <TextInput
          label={label}
          value={value['ds-value']}
          onChange={(e) =>
            handleFieldChange(`${fullPath}.ds-value`, e.target.value)
          }
          className="mb-2"
        />
      ) : null}

      {typeof value === 'object' && value !== null && !type ? (
        <div className="pl-1 border-l-2 border-gray-200">
          {Object.entries(value)
            .filter(([k]) => !k.startsWith('ds-')) // Skip special attributes
            .map(([childKey, childValue]) => (
              <JSONFieldRenderer
                key={childKey}
                fieldKey={childKey}
                value={childValue}
                fieldPath={fullPath}
                level={level + 1}
                onFieldChange={onFieldChange}
                currentLocaleId={currentLocaleId}
                autoCompleteEnabled={autoCompleteEnabled}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Main component for rendering JSON page data content in admin forms
 * @param {Object} props - Component props
 * @param {Object} props.content - The JSON content object to render
 * @param {string|number} props.contentId - The ID of the content being edited
 * @param {Function} props.setRecord - Function to update the record state
 * @returns {JSX.Element} - Rendered content fields
 */
export default function JSONPageDataEditor({
  content,
  contentId,
  setRecord,
  currentLocaleId,
  autoCompleteEnabled = false,
}) {
  // Helper function to update JSON content field with nested path support
  const updateJSONContentField = useCallback(
    (fieldPath, value) => {
      setRecord((prevRecord) => {
        const newContents = [...prevRecord.contents];
        const contentIndex = newContents.findIndex((c) => c.id === contentId);

        if (contentIndex === -1) return prevRecord;

        const contentItem = {...newContents[contentIndex]};

        // Create deep copy of content to ensure React detects changes
        const jsonContent = JSON.parse(
          JSON.stringify(contentItem.content || {})
        );

        // Handle nested field paths like "hero.title.ds-value"
        const pathParts = fieldPath.split('.');
        let current = jsonContent;

        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        current[pathParts[pathParts.length - 1]] = value;

        // Assign the new object to ensure reference change
        contentItem.content = jsonContent;

        newContents[contentIndex] = contentItem;

        return {
          ...prevRecord,
          contents: newContents,
        };
      });
    },
    [contentId, setRecord]
  );

  if (
    !content ||
    typeof content !== 'object' ||
    Object.keys(content).length === 0
  ) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
        <p>No content fields defined yet.</p>
        <p className="text-sm mt-2">
          Content fields will appear here when defined in the JSON structure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(content).map(([key, value]) => (
        <JSONFieldRenderer
          key={key}
          fieldKey={key}
          value={value}
          onFieldChange={updateJSONContentField}
          currentLocaleId={currentLocaleId}
          autoCompleteEnabled={autoCompleteEnabled}
        />
      ))}
    </div>
  );
}
