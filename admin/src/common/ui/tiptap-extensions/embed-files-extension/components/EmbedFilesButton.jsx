import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { MAX_FILES_COUNT } from '../utils.js';
import FilesSelectorModal from './FilesSelectorModal.jsx';

/**
 * Button to insert files into the editor
 *
 * @param {import('@tiptap/core/src/Editor').Editor} editor
 * @param {Element} children
 *
 * @returns {JSX.Element}
 * @constructor
 */
const EmbedFilesButton = ({ editor, children }) => {
  // Translation
  const { t } = useTranslation();

  // Model visibility state
  const [isFilesSelectorModalOpened, setIsFilesSelectorModalOpened] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  return (
    <>
      <Box>
        <Tooltip label={t(`Insert files (max ${MAX_FILES_COUNT})`)}>
          <button
            type="button"
            onClick={() => {
              setSelectedFiles([]);
              setIsFilesSelectorModalOpened(true);
            }}
            className="w-6 h-6 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
          >
            {children || <FontAwesomeIcon icon={faFileAlt} className="text-[#808496]" />}
          </button>
        </Tooltip>

        <FilesSelectorModal
          editor={editor}
          opened={isFilesSelectorModalOpened}
          setOpened={setIsFilesSelectorModalOpened}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      </Box>
    </>
  );
};

export default EmbedFilesButton;
