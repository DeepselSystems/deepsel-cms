import React, { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Box, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { MAX_FILES_COUNT } from '../utils';
import FilesSelectorModal from './FilesSelectorModal';
import type { EmbedFileItem } from '../types';

interface EmbedFilesButtonProps {
  editor: Editor | null;
  children?: React.ReactNode;
}

/**
 * Button to insert files into the editor
 *
 * @constructor
 */
const EmbedFilesButton = ({ editor, children }: EmbedFilesButtonProps) => {
  const { t } = useTranslation();

  const [isFilesSelectorModalOpened, setIsFilesSelectorModalOpened] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<EmbedFileItem[]>([]);

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
            {children || (
              <FontAwesomeIcon icon={faFileAlt as IconProp} className="text-[#808496]" />
            )}
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
