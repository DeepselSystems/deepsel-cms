import {useCallback} from 'react';
import RichTextInput from '../../../common/ui/RichTextInput.jsx';
import PropTypes from 'prop-types';

/**
 * Simple content editor for blog posts (handles string content instead of JSON)
 * @param {Object} props - Component props
 * @param {string} props.content - The content string
 * @param {string|number} props.contentId - The ID of the content being edited
 * @param {Function} props.setRecord - Function to update the record state
 * @param {Function} props.onFocus - Function called when editor is focused
 * @returns {JSX.Element} - Rendered content editor
 */
const BlogPostContentEditor = ({
  content,
  contentId,
  setRecord,
  onFocus,
  autoCompleteEnabled = false,
}) => {
  const updateContentField = useCallback(
    (value) => {
      setRecord((prevRecord) => {
        const updatedContents = prevRecord.contents.map((contentItem) => {
          if (contentItem.id === contentId) {
            return {
              ...contentItem,
              content: value,
            };
          }
          return contentItem;
        });

        return {
          ...prevRecord,
          contents: updatedContents,
        };
      });
    },
    [contentId, setRecord]
  );

  return (
    <div onClick={onFocus} onFocus={onFocus} tabIndex={0}>
      <RichTextInput
        variant="subtle"
        content={content || ''}
        onChange={updateContentField}
        className="min-h-96"
        autoComplete={autoCompleteEnabled}
      />
    </div>
  );
};

BlogPostContentEditor.propTypes = {
  content: PropTypes.string,
  contentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  setRecord: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  autoCompleteEnabled: PropTypes.bool,
};

export default BlogPostContentEditor;
