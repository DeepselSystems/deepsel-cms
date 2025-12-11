import {useState, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSave, faTimes, faPenNib} from '@fortawesome/free-solid-svg-icons';
import {Tooltip} from '@mantine/core';
import Button from '../../../common/ui/Button.jsx';
import TextInput from '../../../common/ui/TextInput.jsx';
import Switch from '../../../common/ui/Switch.jsx';
import PropTypes from 'prop-types';

const SideBySideEditingView = ({
  selectedLanguageContents,
  record,
  setRecord,
  onExitSideBySide,
  onSave,
  isSaving,
  ContentEditor = null,
  AIWriterModalComponent = null,
  aiAutocompleteEnabled = true,
  onAiAutocompleteChange,
  aiAutoCompleteAvailable = false,
  aiWritingAvailable = false,
}) => {
  const {t} = useTranslation();
  const [editorRenderKey, setEditorRenderKey] = useState(0);
  const [aiWriterModalOpened, setAiWriterModalOpened] = useState(false);
  const [activeAiWriterContent, setActiveAiWriterContent] = useState(null);
  const [focusedContentId, setFocusedContentId] = useState(null);

  const updateContentField = useCallback(
    (contentId, field, value) => {
      setRecord((prevRecord) => {
        const updatedContents = prevRecord.contents.map((content) => {
          if (content.id === contentId) {
            return {
              ...content,
              [field]: value,
            };
          }
          return content;
        });

        return {
          ...prevRecord,
          contents: updatedContents,
        };
      });
    },
    [setRecord]
  );

  const handleContentInserted = useCallback(() => {
    setEditorRenderKey((prev) => prev + 1);
  }, []);

  const openAiWriterModal = useCallback(() => {
    if (activeAiWriterContent) {
      setAiWriterModalOpened(true);
    }
  }, [activeAiWriterContent]);

  const closeAiWriterModal = useCallback(() => {
    setAiWriterModalOpened(false);
  }, []);

  const handleContentFocus = useCallback((content) => {
    setActiveAiWriterContent(content);
    setFocusedContentId(content.id);
  }, []);

  const wrappedSetRecord = useCallback(
    (newRecordOrFunction) => {
      if (typeof newRecordOrFunction === 'function') {
        setRecord((prevRecord) => {
          const updatedRecord = newRecordOrFunction(prevRecord);
          return updatedRecord;
        });
      } else {
        setRecord(newRecordOrFunction);
      }
    },
    [setRecord]
  );

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            {t('Side-by-side Language Editing')}
          </h1>
          <div className="flex items-center gap-3">
            <Tooltip
              label={t(
                'Please specify an API key and autocomplete model in Site Settings to use this feature.'
              )}
              disabled={aiAutoCompleteAvailable}
            >
              <div className="inline-flex items-center">
                <Switch
                  label={t('AI Autocomplete')}
                  checked={aiAutocompleteEnabled && aiAutoCompleteAvailable}
                  onChange={(e) =>
                    onAiAutocompleteChange?.(e.currentTarget.checked)
                  }
                  disabled={!aiAutoCompleteAvailable}
                  size="md"
                />
              </div>
            </Tooltip>
            <Tooltip
              label={
                aiWritingAvailable
                  ? t('AI Writer')
                  : t(
                      'Please specify an API key and writing model in Site Settings to use this feature.'
                    ) || t('AI Writer')
              }
            >
              <div>
                <Button
                  variant="filled"
                  size="sm"
                  onClick={openAiWriterModal}
                  disabled={!activeAiWriterContent || !aiWritingAvailable}
                >
                  <FontAwesomeIcon icon={faPenNib} className="mr-2" />
                  {t('AI Writer')}
                </Button>
              </div>
            </Tooltip>
            <Button onClick={onSave} loading={isSaving} size="sm">
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              {t('Save')}
            </Button>
            <Button variant="subtle" onClick={onExitSideBySide} size="sm">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              {t('Exit side-by-side mode')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-x-auto">
        {selectedLanguageContents.map((content, index) => (
          <div
            key={content.id}
            className={`flex-shrink-0 flex flex-col overflow-hidden transition-all duration-200 ${
              selectedLanguageContents.length > 4 ? 'w-96' : 'flex-1'
            } ${
              index !== selectedLanguageContents.length - 1
                ? 'border-r border-gray-200'
                : ''
            } ${
              focusedContentId === content.id
                ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {/* Language Header */}
            <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center">
                <span className="mr-2 text-lg">
                  {content.locale?.emoji_flag}
                </span>
                <div>
                  <div className="font-medium text-gray-900">
                    {content.locale?.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {content.locale?.iso_code}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Title Field */}
                <TextInput
                  placeholder={t('Title')}
                  className="w-full"
                  classNames={{
                    input: 'text-xl font-bold px-3 py-2',
                  }}
                  maxLength={255}
                  size="lg"
                  value={
                    record.contents.find((c) => c.id === content.id)?.title ||
                    ''
                  }
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    updateContentField(content.id, 'title', newTitle);
                  }}
                  onFocus={() => handleContentFocus(content)}
                />

                {/* Content Editor */}
                <div>
                  {ContentEditor ? (
                    <div
                      onClick={() => handleContentFocus(content)}
                      onFocus={() => handleContentFocus(content)}
                      tabIndex={0}
                    >
                      <ContentEditor
                        key={`editor-${content.id}-${editorRenderKey}`}
                        content={
                          record.contents.find((c) => c.id === content.id)
                            ?.content || content.content
                        }
                        contentId={content.id}
                        setRecord={wrappedSetRecord}
                        onFocus={() => handleContentFocus(content)}
                        autoCompleteEnabled={
                          aiAutocompleteEnabled && isAiFeatureAvailable
                        }
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <p>{t('No content editor provided.')}</p>
                      <p className="text-sm mt-2">
                        {t('Please provide a ContentEditor component.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Writer Modal */}
      {AIWriterModalComponent && (
        <AIWriterModalComponent
          opened={aiWriterModalOpened}
          onClose={closeAiWriterModal}
          activeContent={activeAiWriterContent}
          updateContentField={updateContentField}
          onContentInserted={handleContentInserted}
        />
      )}
    </div>
  );
};

SideBySideEditingView.propTypes = {
  selectedLanguageContents: PropTypes.arrayOf(PropTypes.object).isRequired,
  record: PropTypes.object.isRequired,
  setRecord: PropTypes.func.isRequired,
  onExitSideBySide: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  ContentEditor: PropTypes.elementType,
  AIWriterModalComponent: PropTypes.elementType,
  aiAutocompleteEnabled: PropTypes.bool,
  onAiAutocompleteChange: PropTypes.func,
  isAiFeatureAvailable: PropTypes.bool,
  aiFeatureTooltip: PropTypes.string,
};

export default SideBySideEditingView;
