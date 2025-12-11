import {useState, useEffect} from 'react';
import {Modal, Button, Card, Text, Badge, Switch} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faTimes,
  faExclamationTriangle,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import RichTextInput from './RichTextInput.jsx';

/**
 * Modal for resolving conflicts across multiple language versions
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {object} userRecord - User's current record data (what they're trying to save)
 * @param {object} serverRecord - Server's current record data (newer version from database)
 * @param {string} lastModifiedBy - Name of user who last modified the record
 * @param {string} lastModifiedAt - Timestamp of last modification
 * @param {string} conflictExplanation - AI-generated explanation of conflicts
 * @param {function} onResolveConflict - Function to handle resolved conflict data
 * @param {boolean} isLoading - Whether the resolution is being processed
 */
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
  const {t} = useTranslation();

  // Initialize resolved record with ALL contents from both user and server
  const [resolvedRecord, setResolvedRecord] = useState(() => {
    const initialResolved = {...(userRecord || {})};
    const userContents = userRecord?.contents || [];
    const serverContents = serverRecord?.contents || [];

    // Create a map to merge all contents correctly
    const contentMap = new Map();

    // Add all user contents first (these are what user is trying to save)
    userContents.forEach((userContent) => {
      const localeId = userContent.locale_id || userContent.locale?.id;
      if (localeId) {
        contentMap.set(localeId, userContent);
      }
    });

    // Add server contents that don't exist in user contents (new languages on server)
    serverContents.forEach((serverContent) => {
      const localeId = serverContent.locale_id || serverContent.locale?.id;
      if (localeId && !contentMap.has(localeId)) {
        // This is a new language that only exists on server - add it
        contentMap.set(localeId, serverContent);
      }
    });

    initialResolved.contents = Array.from(contentMap.values());

    return initialResolved;
  });

  // State for toggle decisions on single-sided conflicts - keyed by localeId
  const [toggleStates, setToggleStates] = useState({});

  // Update resolved record when userRecord changes (when user edits content)
  useEffect(() => {
    if (userRecord && serverRecord && isOpen) {
      const userContents = userRecord?.contents || [];
      const serverContents = serverRecord?.contents || [];

      // Create a map to merge all contents correctly
      const contentMap = new Map();

      // Add all user contents first (these are the CURRENT edited data)
      userContents.forEach((userContent) => {
        const localeId = userContent.locale_id || userContent.locale?.id;
        if (localeId) {
          contentMap.set(localeId, userContent);
        }
      });

      // Add server contents that don't exist in user contents (new languages on server)
      serverContents.forEach((serverContent) => {
        const localeId = serverContent.locale_id || serverContent.locale?.id;
        if (localeId && !contentMap.has(localeId)) {
          // This is a new language that only exists on server - add it
          contentMap.set(localeId, serverContent);
        }
      });

      setResolvedRecord((prev) => ({
        ...prev,
        ...userRecord,
        contents: Array.from(contentMap.values()),
      }));
    }
  }, [userRecord, serverRecord, isOpen]);

  if (!isOpen || !serverRecord) return null;

  const handleSaveResolution = async () => {
    try {
      await onResolveConflict(resolvedRecord);
    } catch (error) {
      console.error('Error saving resolution:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getLanguageName = (locale) => {
    if (!locale) return t('Unknown Language');
    return locale.name || locale.iso_code || t('Unknown Language');
  };

  const getLanguageFlag = (locale) => {
    return locale?.emoji_flag || '🌍';
  };

  // Get all unique languages from both server and user versions
  const getAllLanguageVersions = () => {
    const languageVersions = [];
    const userContents = userRecord?.contents || [];
    const serverContents = serverRecord?.contents || [];

    // Create a map to match languages
    const languageMap = new Map();

    // Add user versions
    userContents.forEach((userContent) => {
      const localeId = userContent.locale_id || userContent.locale?.id;
      if (localeId) {
        languageMap.set(localeId, {userContent, serverContent: null});
      }
    });

    // Add server versions
    serverContents.forEach((serverContent) => {
      const localeId = serverContent.locale_id || serverContent.locale?.id;
      if (localeId) {
        if (languageMap.has(localeId)) {
          languageMap.get(localeId).serverContent = serverContent;
        } else {
          languageMap.set(localeId, {userContent: null, serverContent});
        }
      }
    });

    // Convert to array and filter only conflicted or new languages
    languageMap.forEach(({userContent, serverContent}, localeId) => {
      // Only show if:
      // 1. Both versions exist and server has later timestamp (conflicted)
      // 2. Only server version exists (new language added on server)
      // 3. Only user version exists (new language added locally)

      let showInModal = false;

      if (userContent && serverContent) {
        // Check if the content actually differs or has newer timestamp
        const serverTimestamp = new Date(
          serverContent.last_modified_at || serverContent.updated_at
        );
        const userTimestamp = new Date(
          userContent.last_modified_at || userContent.updated_at || 0
        );

        if (
          serverTimestamp > userTimestamp ||
          userContent.title !== serverContent.title ||
          userContent.content !== serverContent.content
        ) {
          showInModal = true;
        }
      } else if (serverContent && !userContent) {
        // New language added on server
        showInModal = true;
      } else if (userContent && !serverContent) {
        // New language added locally (rare but possible)
        showInModal = true;
      }

      if (showInModal) {
        languageVersions.push({
          localeId,
          userContent,
          serverContent,
          locale: userContent?.locale || serverContent?.locale,
        });
      }
    });

    return languageVersions.sort((a, b) => {
      const nameA = getLanguageName(a.locale);
      const nameB = getLanguageName(b.locale);
      return nameA.localeCompare(nameB);
    });
  };

  const updateResolvedContent = (localeId, updatedContent) => {
    setResolvedRecord((prev) => {
      const updatedContents = [...(prev.contents || [])];
      const existingIndex = updatedContents.findIndex(
        (c) => (c.locale_id || c.locale?.id) === localeId
      );

      if (existingIndex >= 0) {
        updatedContents[existingIndex] = {
          ...updatedContents[existingIndex],
          ...updatedContent,
        };
      } else {
        // Add new content
        updatedContents.push({...updatedContent, locale_id: localeId});
      }

      return {...prev, contents: updatedContents};
    });
  };

  // Helper functions to extract and reconstruct content based on type
  const extractHTMLContent = (content) => {
    if (!content) return '';

    // For blog posts: content is string (HTML)
    if (typeof content === 'string') {
      return content;
    }

    // For pages: content is JSON with ds-value structure
    if (
      typeof content === 'object' &&
      content.main &&
      content.main['ds-value']
    ) {
      return content.main['ds-value'];
    }

    return '';
  };

  const reconstructContent = (htmlContent, originalContent) => {
    if (!originalContent) {
      return htmlContent;
    }

    // For blog posts: content is string (HTML)
    if (typeof originalContent === 'string') {
      return htmlContent;
    }

    // For pages: content is JSON, need to reconstruct ds-value structure
    if (typeof originalContent === 'object' && originalContent.main) {
      return {
        ...originalContent,
        main: {
          ...originalContent.main,
          'ds-value': htmlContent,
        },
      };
    }

    return htmlContent;
  };

  const renderLanguageConflict = ({
    localeId,
    userContent,
    serverContent,
    locale,
  }) => {
    // Get current resolved content for this language
    // Priority: userContent (user's edits) > resolvedRecord > serverContent
    const currentResolved =
      userContent ||
      resolvedRecord?.contents?.find(
        (c) => (c.locale_id || c.locale?.id) === localeId
      ) ||
      serverContent;

    // Determine conflict type
    const hasServerOnly = serverContent && !userContent;
    const hasUserOnly = userContent && !serverContent;
    const isSingleSided = hasServerOnly || hasUserOnly;

    // Check if there are actual content differences between user and server versions
    const hasDifferences = () => {
      if (isSingleSided) return true; // Single-sided is always a difference

      if (userContent && serverContent) {
        // Compare title
        const userTitle = userContent.title || '';
        const serverTitle = serverContent.title || '';
        if (userTitle !== serverTitle) return true;

        // Compare content
        const userContentText = extractHTMLContent(userContent.content) || '';
        const serverContentText =
          extractHTMLContent(serverContent.content) || '';
        if (userContentText !== serverContentText) return true;
      }

      return false;
    };

    const contentHasDifferences = hasDifferences();

    // Get toggle state for single-sided conflicts
    const getToggleState = () => {
      if (toggleStates[localeId] !== undefined) {
        return toggleStates[localeId];
      }
      // Default: keep the version that exists
      return true;
    };

    // Handle toggle changes for single-sided conflicts
    const handleToggleChange = (keep) => {
      setToggleStates((prev) => ({...prev, [localeId]: keep}));

      if (keep) {
        // Keep the version - ensure it's in resolved content
        const contentToKeep = hasServerOnly ? serverContent : userContent;
        updateResolvedContent(localeId, contentToKeep);
      } else {
        // Remove the version - remove from resolved content
        setResolvedRecord((prev) => ({
          ...prev,
          contents:
            prev.contents?.filter(
              (c) => (c.locale_id || c.locale?.id) !== localeId
            ) || [],
        }));
      }
    };

    const currentToggleState = getToggleState();

    return (
      <Card
        key={localeId}
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        className={`mb-4 ${
          contentHasDifferences
            ? 'border-l-4 border-l-red-500 bg-red-50'
            : 'border-l-4 border-l-green-500 bg-green-50'
        }`}
      >
        {/* Language Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGlobe} className="text-blue-500" />
            <Text size="lg" fw={600}>
              {getLanguageFlag(locale)} {getLanguageName(locale)}
            </Text>
            {locale?.iso_code && (
              <Badge size="sm" variant="light" color="blue">
                {locale.iso_code.toUpperCase()}
              </Badge>
            )}
            {/* Conflict status indicator */}
            <Badge
              size="sm"
              variant="filled"
              color={contentHasDifferences ? 'red' : 'green'}
            >
              {contentHasDifferences ? 'Has Differences' : 'No Differences'}
            </Badge>
          </div>

          {/* Controls for conflicts */}
          {isSingleSided && (
            <div className="flex items-center gap-2">
              {/* Toggle for single-sided conflicts (only server OR only user version) */}
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded">
                <Text
                  size="sm"
                  fw={500}
                  c={currentToggleState ? 'green' : 'red'}
                >
                  {hasServerOnly
                    ? currentToggleState
                      ? t('Keep server version')
                      : t('Remove server version')
                    : currentToggleState
                      ? t('Keep your version')
                      : t('Remove your version')}
                </Text>
                <Switch
                  checked={currentToggleState}
                  onChange={(event) =>
                    handleToggleChange(event.currentTarget.checked)
                  }
                  color={currentToggleState ? 'green' : 'red'}
                  size="md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Always show two-column layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Server Version - Read Only (always show column) */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-green-700 mb-3">
              {t('Server Version')} ({t('Newer')})
            </h4>

            {serverContent ? (
              <div className="space-y-3">
                <div>
                  <Text size="sm" fw={500} c="dimmed">
                    {t('Title')}:
                  </Text>
                  <Text size="md">{serverContent.title || t('No title')}</Text>
                </div>

                <div>
                  <Text size="sm" fw={500} c="dimmed">
                    {t('Content')}:
                  </Text>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50 text-sm">
                    {serverContent.content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: extractHTMLContent(serverContent.content),
                        }}
                      />
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t('No content')}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 italic">
                {t('No server version')}
              </div>
            )}
          </div>

          {/* Right: Your Version - Editable (always show column) */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-blue-700 mb-3">
              {t('Your Version')}
            </h4>

            {userContent ? (
              <div className="space-y-3">
                {/* Editable Title */}
                <div>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">
                    {t('Title')}:
                  </Text>
                  <input
                    type="text"
                    value={currentResolved?.title || ''}
                    onChange={(e) =>
                      updateResolvedContent(localeId, {title: e.target.value})
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Editable Content */}
                <div>
                  <Text size="sm" fw={500} c="dimmed" mb="xs">
                    {t('Content')}:
                  </Text>
                  <RichTextInput
                    content={extractHTMLContent(currentResolved?.content) || ''}
                    onChange={(htmlValue) => {
                      // Reconstruct content in correct format (string for blog, JSON for page)
                      const reconstructedContent = reconstructContent(
                        htmlValue,
                        currentResolved?.content
                      );
                      updateResolvedContent(localeId, {
                        content: reconstructedContent,
                      });
                    }}
                    placeholder={t('Enter content...')}
                    classNames={{content: 'min-h-[200px]'}}
                    key={`richtext-${localeId}-${currentResolved?.id}`}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 italic">
                {t('No user version')}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const languageVersions = getAllLanguageVersions();

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            style={{color: 'orange'}}
            size="sm"
          />
          <span className="text-lg font-bold">
            {t('Content Conflict Resolution')}
          </span>
        </div>
      }
      size="95%"
      styles={{
        body: {height: '85vh', overflow: 'hidden'},
        header: {flexShrink: 0},
        content: {
          maxWidth: '95vw',
          width: '95vw',
          height: '95vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      centered
      closeOnEscape={false}
      closeOnClickOutside={false}
    >
      <div className="flex flex-col h-full">
        {/* Scrollable Content - All content scrolls together */}
        <div className="flex-1 overflow-y-auto pr-4">
          {/* Explanation Header */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800">
              {t(
                'Content conflicts detected. Review each language version and resolve conflicts.'
              )}
            </p>

            <div className="mt-2 text-xs text-orange-700">
              <strong>{t('Last saved by')}:</strong>{' '}
              {lastModifiedBy || t('Unknown user')} {t('at')}{' '}
              {formatTimestamp(lastModifiedAt)}
            </div>
          </div>

          <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-blue-600 mt-0.5"
              />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">
                  {t('AI Analysis')}
                </h4>
                <div className="text-sm text-blue-700">
                  {conflictExplanation ? (
                    <div
                      dangerouslySetInnerHTML={{__html: conflictExplanation}}
                    />
                  ) : (
                    'Loading AI explanation...'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Language Conflicts */}
          <div className="space-y-4">
            {languageVersions.map(renderLanguageConflict)}

            {languageVersions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {t('No conflicted language versions to resolve')}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            color="gray"
            onClick={onClose}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} size="sm" className="mr-1" />
            {t('Cancel')}
          </Button>
          <Button
            color="green"
            onClick={handleSaveResolution}
            loading={isLoading}
          >
            <FontAwesomeIcon icon={faCheck} size="sm" className="mr-1" />
            {t('Resolve & Save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
