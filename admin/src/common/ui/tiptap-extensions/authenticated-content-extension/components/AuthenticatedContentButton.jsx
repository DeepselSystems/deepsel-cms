import {useCallback} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLock} from '@fortawesome/free-solid-svg-icons';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Tooltip} from '@mantine/core';

/**
 * Button component to insert authenticated content region
 *
 * @param {Object} props - Component props
 * @param {Object} props.editor - TipTap editor instance
 * @param {string} props.className - Additional CSS classes
 */
const AuthenticatedContentButton = ({editor, className}) => {
  const {t} = useTranslation();

  /**
   * Handle button click - insert authenticated content region
   */
  const handleClick = useCallback(() => {
    if (!editor) return;

    editor.chain().focus().setAuthenticatedContent().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <Tooltip label={t('Insert authenticated content')}>
      <button
        onClick={handleClick}
        className={clsx(
          'w-6 h-6 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]',
          className
        )}
        title={t('Insert Authenticated Content')}
        type="button"
      >
        <FontAwesomeIcon icon={faLock} className="text-[#808496]" />
      </button>
    </Tooltip>
  );
};

export default AuthenticatedContentButton;
