import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faSave,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import {Modal, Tabs, Menu, Tooltip} from '@mantine/core';
import RecordSelect from '../../../../common/ui/RecordSelect.jsx';
import SitePublicSettingsState from '../../../../common/stores/SitePublicSettingsState.js';
import Button from '../../../../common/ui/Button.jsx';
import TextInput from '../../../../common/ui/TextInput.jsx';
import Checkbox from '../../../../common/ui/Checkbox.jsx';
import useModel from '../../../../common/api/useModel.jsx';
import OrganizationIdState from '../../../../common/stores/OrganizationIdState.js';

const EditMenuItemModal = ({
  opened,
  onClose,
  editingItem, // null for add mode, item object for edit mode
  onSave, // callback function to handle save (create or update)
  parentId = null, // for adding child items
}) => {
  const {t} = useTranslation();
  const {settings: siteSettings} = SitePublicSettingsState((state) => state);
  const {organizationId} = OrganizationIdState();

  const isEditMode = !!editingItem;

  // Internal state management
  const [translations, setTranslations] = useState({});
  const [activeTranslationTab, setActiveTranslationTab] = useState(null);
  const [addingLanguage, setAddingLanguage] = useState(false);
  const [selectedLocaleId, setSelectedLocaleId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch locales
  const {data: locales} = useModel('locale', {
    autoFetch: true,
    pageSize: null,
  });

  // Get default language name from locales
  const defaultLanguageName =
    locales?.find(
      (locale) => locale.iso_code === siteSettings?.default_language?.iso_code
    )?.name || t('Default');

  // Initialize form values when modal opens
  useEffect(() => {
    if (opened) {
      if (isEditMode && editingItem) {
        // Convert existing translations to new format
        let itemTranslations = editingItem.translations || {};

        // If editing an old-style menu item, create translation for default language
        if (
          Object.keys(itemTranslations).length === 0 &&
          siteSettings?.default_language?.iso_code
        ) {
          itemTranslations = {
            [siteSettings.default_language?.iso_code]: {
              title: editingItem.title || '',
              url: editingItem.url || '',
              page_content_id: editingItem.page_content_id || null,
              use_page_title: !!editingItem.page_content_id,
              use_custom_url: !editingItem.page_content_id,
              open_in_new_tab: editingItem.open_in_new_tab || false,
            },
          };
        }

        setTranslations(itemTranslations);

        // Set active tab to first translation or default language
        const translationKeys = Object.keys(itemTranslations);
        if (translationKeys.length > 0) {
          setActiveTranslationTab(translationKeys[0]);
        } else if (siteSettings?.default_language?.iso_code) {
          setActiveTranslationTab(siteSettings.default_language?.iso_code);
        }
      } else {
        // Reset form for add mode - initialize with default language
        setSelectedLocaleId(null);

        // Initialize with default language translation
        if (siteSettings?.default_language?.iso_code) {
          const defaultTranslations = {
            [siteSettings.default_language?.iso_code]: {
              title: '',
              url: '',
              page_content_id: null,
              use_page_title: true, // Default to true
              use_custom_url: false,
              open_in_new_tab: false,
            },
          };
          setTranslations(defaultTranslations);
          setActiveTranslationTab(siteSettings.default_language?.iso_code);
        } else {
          setTranslations({});
          setActiveTranslationTab(null);
        }
      }
    }
  }, [
    opened,
    isEditMode,
    editingItem,
    siteSettings?.default_language?.iso_code,
  ]);

  const handleDeleteTranslation = (isoCode) => {
    // Don't allow deleting the default language
    if (isoCode === siteSettings?.default_language?.iso_code) {
      return;
    }

    // Remove the translation
    const updatedTranslations = {...translations};
    delete updatedTranslations[isoCode];
    setTranslations(updatedTranslations);

    // Switch to default language tab if we deleted the active tab
    if (activeTranslationTab === isoCode) {
      setActiveTranslationTab(
        siteSettings?.default_language?.iso_code ||
          Object.keys(updatedTranslations)[0]
      );
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const menuItemData = {
        translations: translations,
        parent_id: isEditMode ? editingItem.parent_id : parentId,
      };

      if (isEditMode) {
        // Update existing item
        await onSave(editingItem.id, menuItemData, 'update');
      } else {
        // Add new item
        await onSave(null, menuItemData, 'create');
      }
      // Close modal after save
      onClose();
    } catch (error) {
      console.error('Error saving menu item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className="font-semibold text-lg">
          {isEditMode ? t('Edit Menu Item') : t('Add Menu Item')}
        </div>
      }
      size="lg"
    >
      <div className="p-4">
        <Tabs
          value={activeTranslationTab}
          onChange={setActiveTranslationTab}
          variant="pills"
          radius="lg"
        >
          <Tabs.List className="mb-4 flex-wrap">
            {Object.entries(translations || {}).map(
              ([isoCode, translation]) => {
                const locale = locales?.find((l) => l.iso_code === isoCode);
                const isDefaultLanguage =
                  isoCode === siteSettings?.default_language?.iso_code;
                return (
                  <div key={isoCode} className="relative group">
                    <Menu
                      shadow="md"
                      width={150}
                      position="bottom-end"
                      withArrow
                      radius="md"
                      trigger="hover"
                      openDelay={100}
                      closeDelay={400}
                    >
                      <Menu.Target>
                        <Tabs.Tab value={isoCode} className="mr-1 mb-1">
                          <span className="mr-1">{locale?.emoji_flag}</span>
                          {locale?.name}
                          {isDefaultLanguage && (
                            <span className="ml-1 text-xs opacity-70">
                              ({t('Default')})
                            </span>
                          )}
                        </Tabs.Tab>
                      </Menu.Target>
                      {!isDefaultLanguage && (
                        <Menu.Dropdown>
                          <Menu.Item
                            color="red"
                            leftSection={<FontAwesomeIcon icon={faTrash} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTranslation(isoCode);
                            }}
                          >
                            {t('Remove')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      )}
                    </Menu>
                  </div>
                );
              }
            )}

            <Tooltip label={t('Add Language')}>
              <Tabs.Tab
                value="add_new"
                onClick={(e) => {
                  e.preventDefault();
                  setAddingLanguage(true);
                }}
                className="bg-gray-100 hover:bg-gray-200"
              >
                <FontAwesomeIcon icon={faPlus} />
              </Tabs.Tab>
            </Tooltip>
          </Tabs.List>

          {Object.entries(translations || {}).map(([isoCode, translation]) => {
            const locale = locales?.find((l) => l.iso_code === isoCode);

            return (
              <Tabs.Panel key={isoCode} value={isoCode}>
                <div className="space-y-4">
                  {/* Page Selection (shown when not using custom URL) */}
                  {!translation.use_custom_url && (
                    <RecordSelect
                      model="page_content"
                      displayField="title"
                      pageSize={null}
                      searchFields={['title', 'slug']}
                      label={`${t('Select a page')} (${locale?.name})`}
                      placeholder={t('Search for a page')}
                      value={translation.page_content_id}
                      onChange={(pageContentId) => {
                        setTranslations((prev) => ({
                          ...prev,
                          [isoCode]: {
                            ...prev[isoCode],
                            page_content_id: pageContentId,
                          },
                        }));
                      }}
                      filters={[
                        {
                          field: 'locale.iso_code',
                          operator: '=',
                          value: isoCode,
                        },
                        ...(organizationId
                          ? [
                              {
                                field: 'page.organization_id',
                                operator: '=',
                                value: organizationId,
                              },
                            ]
                          : []),
                      ]}
                      description={t('Select a page to link to')}
                    />
                  )}

                  {/* Manual Title Input (shown when not using page title or using custom URL) */}
                  {(translation.use_custom_url ||
                    (translation.page_content_id &&
                      translation.use_page_title === false)) && (
                    <TextInput
                      label={`${t('Menu Title')} (${locale?.name})`}
                      placeholder={t('Enter custom menu title')}
                      value={translation.title || ''}
                      onChange={(e) => {
                        setTranslations((prev) => ({
                          ...prev,
                          [isoCode]: {
                            ...prev[isoCode],
                            title: e.target.value,
                          },
                        }));
                      }}
                      required
                    />
                  )}

                  {/* Custom URL Input (shown when using custom URL) */}
                  {translation.use_custom_url && (
                    <TextInput
                      label={`${t('Custom URL')} (${locale?.name})`}
                      placeholder={t(
                        'Enter custom URL or leave blank for no link'
                      )}
                      value={translation.url || ''}
                      onChange={(e) => {
                        setTranslations((prev) => ({
                          ...prev,
                          [isoCode]: {
                            ...prev[isoCode],
                            url: e.target.value,
                          },
                        }));
                      }}
                      description={t(
                        'Enter the URL this menu item should link to'
                      )}
                    />
                  )}

                  {/* Use Page Title Checkbox (only shown when page is selected) */}
                  {!translation.use_custom_url && (
                    <Checkbox
                      checked={translation.use_page_title !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTranslations((prev) => ({
                          ...prev,
                          [isoCode]: {
                            ...prev[isoCode],
                            use_page_title: checked,
                          },
                        }));
                      }}
                      label={t('Use page title as menu title')}
                      description={t(
                        "When enabled, the menu will use the selected page's title"
                      )}
                    />
                  )}

                  {/* Use Custom URL Checkbox */}
                  <Checkbox
                    checked={translation.use_custom_url || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTranslations((prev) => ({
                        ...prev,
                        [isoCode]: {
                          ...prev[isoCode],
                          use_custom_url: checked,
                          page_content_id: checked
                            ? null
                            : prev[isoCode]?.page_content_id,
                          url: checked ? prev[isoCode]?.url || '' : '',
                        },
                      }));
                    }}
                    label={t('Use custom URL')}
                    description={t(
                      'Enable to enter a custom URL instead of selecting a page'
                    )}
                  />

                  {/* Open in New Tab Checkbox (per translation) */}
                  <Checkbox
                    checked={translation.open_in_new_tab || false}
                    onChange={(e) => {
                      setTranslations((prev) => ({
                        ...prev,
                        [isoCode]: {
                          ...prev[isoCode],
                          open_in_new_tab: e.target.checked,
                        },
                      }));
                    }}
                    label={`${t('Open in new tab')} (${locale?.name})`}
                    description={t('Apply to this language only')}
                  />
                </div>
              </Tabs.Panel>
            );
          })}
        </Tabs>

        {/* Add Language Modal */}
        {addingLanguage && (
          <Modal
            opened={addingLanguage}
            onClose={() => setAddingLanguage(false)}
            title={t('Add Language Translation')}
            size="md"
          >
            <div className="space-y-4">
              <RecordSelect
                model="locale"
                displayField="name"
                pageSize={1000}
                searchFields={['name', 'iso_code']}
                label={t('Language')}
                placeholder={t('Select a Language')}
                value={selectedLocaleId}
                onChange={(localeId) => {
                  setSelectedLocaleId(localeId);
                }}
                renderOption={(option) => (
                  <span>
                    {option.emoji_flag} {option.name}
                  </span>
                )}
                filters={[
                  {
                    field: 'id',
                    operator: 'not_in',
                    value: [
                      // Filter out languages that already have translations
                      ...Object.keys(translations || {})
                        .map(
                          (isoCode) =>
                            locales?.find((l) => l.iso_code === isoCode)?.id
                        )
                        .filter(Boolean),
                    ].filter(Boolean),
                  },
                ]}
                className="mb-4"
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddingLanguage(false);
                    setSelectedLocaleId(null);
                  }}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  onClick={() => {
                    const locale = locales?.find(
                      (l) => l.id === selectedLocaleId
                    );
                    if (locale) {
                      setTranslations({
                        ...translations,
                        [locale.iso_code]: {
                          title: '',
                          url: '',
                          page_content_id: null,
                          use_page_title: true,
                          use_custom_url: false,
                          open_in_new_tab: false,
                        },
                      });
                      setActiveTranslationTab(locale.iso_code);
                      setAddingLanguage(false);
                      setSelectedLocaleId(null);
                    }
                  }}
                  disabled={!selectedLocaleId}
                  leftSection={<FontAwesomeIcon icon={faPlus} />}
                >
                  {t('Add Translation')}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            leftSection={
              <FontAwesomeIcon icon={editingItem ? faPencil : faSave} />
            }
            disabled={isSaving}
            loading={isSaving}
          >
            {editingItem ? t('Update') : t('Save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditMenuItemModal;
