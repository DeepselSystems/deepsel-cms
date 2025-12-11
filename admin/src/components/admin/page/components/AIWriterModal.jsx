import {useState, useEffect} from 'react';
import {Modal, Textarea} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import useAuthentication from '../../../../common/api/useAuthentication.js';
import useModel from '../../../../common/api/useModel.jsx';
import NotificationState from '../../../../common/stores/NotificationState.js';
import BackendHostURLState from '../../../../common/stores/BackendHostURLState.js';
import RecordSelect from '../../../../common/ui/RecordSelect.jsx';
import Button from '../../../../common/ui/Button.jsx';

export default function AIWriterModal({
  opened,
  onClose,
  activeContent,
  updateContentField,
  onContentInserted,
}) {
  const {t} = useTranslation();
  const {user} = useAuthentication();
  const {notify} = NotificationState();
  const {backendHost} = BackendHostURLState();

  // Get organization settings for AI models
  const {record: orgSettings} = useModel('organization', {
    id: 1,
    autoFetch: true,
  });

  // AI Writer state
  const [aiWriterPrompt, setAiWriterPrompt] = useState('');
  const [aiWriterModelId, setAiWriterModelId] = useState('');
  const [aiWriterLoading, setAiWriterLoading] = useState(false);
  const [aiWriterResult, setAiWriterResult] = useState('');

  // Set default AI model from site settings
  useEffect(() => {
    if (orgSettings?.ai_default_writing_model_id && !aiWriterModelId) {
      setAiWriterModelId(orgSettings.ai_default_writing_model_id);
    }
  }, [orgSettings]);

  const handleClose = () => {
    setAiWriterPrompt('');
    setAiWriterResult('');
    onClose();
  };

  const handleAiWritePost = async () => {
    if (!aiWriterPrompt.trim()) return;

    setAiWriterLoading(true);
    try {
      const url = `${backendHost}/page/ai_writing`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          model_id: aiWriterModelId,
          prompt: aiWriterPrompt.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate content');
      }

      const data = await response.json();
      setAiWriterResult(data.content || '');
    } catch (error) {
      console.error(error);
      notify({
        message: error.message || 'Failed to generate AI content',
        type: 'error',
      });
    } finally {
      setAiWriterLoading(false);
    }
  };

  const handleInsertContent = () => {
    if (!aiWriterResult || !activeContent) return;

    // Check if this is a blog post (string content) or page (JSON content)
    // Blog posts have simple string content, pages have JSON structure
    const isBlogPost =
      typeof activeContent.content === 'string' ||
      activeContent.content === null ||
      activeContent.content === undefined;

    let newContent;
    if (isBlogPost) {
      // For blog posts: directly use the AI-generated string content
      newContent = aiWriterResult;
    } else {
      // For pages: create the JSON structure with AI-generated content
      newContent = {
        main: {
          'ds-label': 'Content',
          'ds-type': 'wysiwyg',
          'ds-value': aiWriterResult,
        },
      };
    }

    // Use the proper updateContentField function from the hook
    updateContentField(activeContent.id, 'content', newContent);

    // Call the callback to handle additional logic (like forcing re-render)
    onContentInserted?.();

    handleClose();

    notify({
      message: t('AI content inserted successfully!'),
      type: 'success',
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<div className="font-bold">{t('AI Writer')}</div>}
      size="xl"
      radius={0}
      transitionProps={{transition: 'fade', duration: 200}}
    >
      <div className="space-y-4">
        {/* Model Selection */}
        <RecordSelect
          model="openrouter_model"
          displayField="string_id"
          pageSize={1000}
          searchFields={['string_id', 'name']}
          label={t('AI model')}
          placeholder={t('Select AI model')}
          value={aiWriterModelId}
          onChange={setAiWriterModelId}
          required
        />

        {/* Prompt Input */}
        <Textarea
          label={t('Describe your page content')}
          placeholder={t(
            'Describe what content you want to generate for this page...'
          )}
          value={aiWriterPrompt}
          onChange={(e) => setAiWriterPrompt(e.target.value)}
          required
          minRows={4}
          maxRows={8}
          autosize
        />

        {/* Write Post Button */}
        <div className="flex justify-start">
          <Button
            onClick={handleAiWritePost}
            disabled={
              !aiWriterPrompt.trim() || !aiWriterModelId || aiWriterLoading
            }
            loading={aiWriterLoading}
            variant="filled"
          >
            {t('Write Post')}
          </Button>
        </div>

        {/* AI Result Display */}
        {aiWriterResult && !aiWriterLoading && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-lg">{t('Generated Content')}</h4>

            {/* Result Preview */}
            <div
              className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{__html: aiWriterResult}}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAiWriterResult('')}>
                {t('Clear')}
              </Button>
              <Button
                onClick={handleInsertContent}
                variant="filled"
                color="green"
              >
                {t('Insert Content')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
