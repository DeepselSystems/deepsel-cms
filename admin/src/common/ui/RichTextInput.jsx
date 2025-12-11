/* eslint-disable react/display-name */
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  faPlus,
  faMinus,
  faImages,
  faTable,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faArrowDown,
  faTrash,
  faTimes,
  faAngleDown,
  faCube,
} from '@fortawesome/free-solid-svg-icons';
import {faYoutube} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useDisclosure} from '@mantine/hooks';
import {Link, RichTextEditor as MantineRichTextEditor} from '@mantine/tiptap';
import Highlight from '@tiptap/extension-highlight';
import SubScript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import YoutubeJumpMarks from './tiptap-extensions/youtube-jumpmarks-extension/index.js';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  EnhancedDetails,
  DetailsContent,
  DetailsSummary,
} from './tiptap-extensions/details-extension/index.js';
import Placeholder from '@tiptap/extension-placeholder';
import {useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {AutocompleteExtension} from './tiptap-extensions/autocomplete-extension/index.js';
import FontSize from 'tiptap-extension-font-size';
import TextStyle from '@tiptap/extension-text-style';
import {Menu, Tooltip, Select, Modal, NumberInput, Button} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import GalleryModal from './GalleryModal.jsx';
import {RichText} from './tiptap-extensions/richtext-extension';
import Gallery from './tiptap-extensions/gallery-extension';
import RichTextModal from './RichTextModal.jsx';
import JumpMarksModal from './tiptap-extensions/youtube-jumpmarks-extension/components/JumpMarksModal.jsx';
import HtmlComponentsModal from './HtmlComponentsModal.jsx';
import EmbedVideo from './tiptap-extensions/embed-video-extension/index.js';
import EmbedVideoButton from './tiptap-extensions/embed-video-extension/components/EmbedVideoButton.jsx';
import EmbedAudio from './tiptap-extensions/embed-audio-extension/index.js';
import EmbedAudioButton from './tiptap-extensions/embed-audio-extension/components/EmbedAudioButton.jsx';
import EmbedFiles from './tiptap-extensions/embed-files-extension/index.js';
import EmbedFilesButton from './tiptap-extensions/embed-files-extension/components/EmbedFilesButton.jsx';
import EnhancedImageButton from './tiptap-extensions/enhanced-image-extension/components/EnhancedImageButton.jsx';
import AuthenticatedContent from './tiptap-extensions/authenticated-content-extension/index.js';
import AuthenticatedContentButton from './tiptap-extensions/authenticated-content-extension/components/AuthenticatedContentButton.jsx';
import useAuthentication from '../api/useAuthentication.js';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import SitePublicSettingsState from '../stores/SitePublicSettingsState.js';
import EnhancedImage from './tiptap-extensions/enhanced-image-extension/index.js';
import PasteHandler from './tiptap-extensions/paste-handler-extension/index.js';

const RichTextInput = forwardRef((props, ref) => {
  const {
    content = '',
    label,
    onChange = () => {},
    canAddImage = true,
    onAddImageOverride = () => {},
    variant = 'subtle',
    currentLocaleId,
    autoComplete = false,
    ...others
  } = props;
  const {t} = useTranslation();
  const {user} = useAuthentication();
  const {backendHost} = BackendHostURLState();
  const {settings: siteSettings} = SitePublicSettingsState();

  const [
    isGalleryModalOpened,
    {open: openGalleryModal, close: closeGalleryModal},
  ] = useDisclosure(false);

  const [fontSize, setFontSize] = useState('12'); // Default font size
  const [galleryData, setGalleryData] = useState(null);
  const [richTextData, setRichTextData] = useState(null);
  const [isInsideCollapse, setIsInsideCollapse] = useState(false);

  const [
    isRichTextModalOpened,
    {open: openRichTextModal, close: closeRichTextModal},
  ] = useDisclosure(false);

  const [isTableModalOpened, {open: openTableModal, close: closeTableModal}] =
    useDisclosure(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const [
    isJumpMarksModalOpened,
    {open: openJumpMarksModal, close: closeJumpMarksModal},
  ] = useDisclosure(false);
  const [jumpMarksData, setJumpMarksData] = useState(null);

  const [
    isHtmlComponentsModalOpened,
    {open: openHtmlComponentsModal, close: closeHtmlComponentsModal},
  ] = useDisclosure(false);

  // Check if AI features are available
  const isAIAvailable = useMemo(() => {
    return (
      autoComplete &&
      siteSettings?.has_openrouter_api_key &&
      siteSettings?.ai_autocomplete_model_id &&
      user?.token &&
      backendHost
    );
  }, [autoComplete, siteSettings, user, backendHost]);

  const editorRef = useRef(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Underline,
        Link,
        Superscript,
        SubScript,
        Highlight,
        TextAlign.configure({types: ['heading', 'paragraph']}),
        EnhancedImage,
        Youtube,
        YoutubeJumpMarks,
        FontSize,
        TextStyle,
        Gallery,
        RichText,
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        EnhancedDetails,
        DetailsSummary,
        DetailsContent,
        Placeholder,
        EmbedVideo,
        EmbedAudio,
        EmbedFiles,
        PasteHandler,
        AuthenticatedContent,
        ...(isAIAvailable
          ? [
              AutocompleteExtension.configure({
                backendHost,
                token: user?.token,
                enabled: true,
              }),
            ]
          : []),
      ],
      content,
      onUpdate({editor}) {
        if (editor) {
          onChange(editor.getHTML());
        }
      },
    },
    [isAIAvailable, backendHost, user?.token]
  );

  // Update editorRef when editor is created
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Debug: Log content changes to ensure we're getting current data
  useEffect(() => {
    if (editor) {
      const handleUpdate = () => {
        console.log(
          'RichTextInput content updated:',
          editor.getText().substring(0, 50)
        );
      };

      editor.on('update', handleUpdate);

      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor]);

  function getHTML() {
    return editor ? editor.getHTML() : '';
  }

  useImperativeHandle(ref, () => ({
    getHTML,
  }));

  // Update font size and collapse state when selection changes
  useEffect(() => {
    if (!editor) return;

    /**
     * Check if the current cursor position is inside a collapse/details element
     * @returns {boolean} True if cursor is inside a collapse element
     */
    const checkIfInsideCollapse = () => {
      if (!editor) return false;

      const {state} = editor;
      const {selection} = state;
      const {$from} = selection;

      // Walk up the node tree to check if we're inside a details element
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'details') {
          return true;
        }
      }

      return false;
    };

    const updateFontSize = () => {
      // Get the current font size from the editor using textStyle mark
      const attrs = editor.getAttributes('textStyle');
      if (attrs.fontSize) {
        // Remove 'pt' from the fontSize value
        const size = attrs.fontSize.replace('pt', '');
        setFontSize(size);
      }
    };

    const updateCollapseState = () => {
      // Check if cursor is inside a collapse element
      const insideCollapse = checkIfInsideCollapse();
      setIsInsideCollapse(insideCollapse);
    };

    // Listen for selection changes
    editor.on('selectionUpdate', updateFontSize);
    editor.on('selectionUpdate', updateCollapseState);

    // Initial check
    updateCollapseState();

    // Add event listener for gallery edit events
    const handleEditGallery = (event) => {
      const {galleryId, config, attachments, updateGallery} = event.detail;
      setGalleryData({
        galleryId,
        config,
        attachments,
        updateGallery,
      });
      openGalleryModal();
    };

    // Add event listener for rich text edit events
    const handleEditRichText = (event) => {
      const {richtextId, config, content, updateRichText} = event.detail;
      // Ensure we're setting the content properly
      setRichTextData({
        richtextId,
        config,
        content: content || '',
        updateRichText,
      });
      openRichTextModal();
    };

    window.addEventListener('editGallery', handleEditGallery);
    window.addEventListener('editRichText', handleEditRichText);

    return () => {
      editor.off('selectionUpdate', updateFontSize);
      editor.off('selectionUpdate', updateCollapseState);
      window.removeEventListener('editGallery', handleEditGallery);
      window.removeEventListener('editRichText', handleEditRichText);
    };
  }, [editor, openGalleryModal, openRichTextModal]);

  // Font size options
  const fontSizeOptions = [
    {value: '8', label: '8'},
    {value: '9', label: '9'},
    {value: '10', label: '10'},
    {value: '11', label: '11'},
    {value: '12', label: '12'},
    {value: '14', label: '14'},
    {value: '16', label: '16'},
    {value: '18', label: '18'},
    {value: '20', label: '20'},
    {value: '22', label: '22'},
    {value: '24', label: '24'},
    {value: '26', label: '26'},
    {value: '28', label: '28'},
    {value: '36', label: '36'},
    {value: '48', label: '48'},
    {value: '72', label: '72'},
  ];

  // Apply font size
  const applyFontSize = (size) => {
    if (!editor || !size) return;
    editor.chain().focus().setFontSize(`${size}pt`).run();
  };

  return (
    <>
      {label && (
        <div
          style={{
            fontSize: `var(--input-label-size,var(--mantine-font-size-md))`,
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          {label}
        </div>
      )}
      {/* CSS for ProseMirror editor - autocomplete styles are added dynamically by the extension */}
      <style>{`
        .ProseMirror { 
          outline: none; 
        }
      `}</style>

      <div className={`flex flex-col`}>
        <MantineRichTextEditor
          editor={editor}
          variant={variant}
          className={`w-full`}
          {...others}
        >
          <MantineRichTextEditor.Toolbar
            sticky
            stickyOffset={60}
            className="!z-50"
          >
            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.Bold />
              <MantineRichTextEditor.Italic />
              <MantineRichTextEditor.Underline />
              <MantineRichTextEditor.Strikethrough />
              <MantineRichTextEditor.ClearFormatting />
              <MantineRichTextEditor.Highlight />
              <MantineRichTextEditor.Code />
            </MantineRichTextEditor.ControlsGroup>

            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.H1 />
              <MantineRichTextEditor.H2 />
              <MantineRichTextEditor.H3 />
              <MantineRichTextEditor.H4 />
            </MantineRichTextEditor.ControlsGroup>

            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.Blockquote />
              <MantineRichTextEditor.Hr />
              <MantineRichTextEditor.BulletList />
              <MantineRichTextEditor.OrderedList />
              <MantineRichTextEditor.Subscript />
              <MantineRichTextEditor.Superscript />
            </MantineRichTextEditor.ControlsGroup>

            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.Link />
              <MantineRichTextEditor.Unlink />
            </MantineRichTextEditor.ControlsGroup>

            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.AlignLeft />
              <MantineRichTextEditor.AlignCenter />
              <MantineRichTextEditor.AlignJustify />
              <MantineRichTextEditor.AlignRight />
            </MantineRichTextEditor.ControlsGroup>

            <MantineRichTextEditor.ControlsGroup>
              <MantineRichTextEditor.Undo />
              <MantineRichTextEditor.Redo />
            </MantineRichTextEditor.ControlsGroup>

            {/* Table Controls - only show when cursor is in a table */}
            {editor?.isActive('table') && (
              <MantineRichTextEditor.ControlsGroup>
                <Tooltip label={t('Add Column Before')}>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().addColumnBefore().run()
                    }
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faArrowLeft}
                      className="text-[#808496] text-xs"
                    />
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="text-[#808496] text-xs"
                    />
                    <span className="text-[#808496] text-xs">Col</span>
                  </button>
                </Tooltip>

                <Tooltip label={t('Add Column After')}>
                  <button
                    type="button"
                    onClick={() =>
                      editor.chain().focus().addColumnAfter().run()
                    }
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="text-[#808496] text-xs"
                    />
                    <span className="text-[#808496] text-xs">Col</span>

                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-[#808496] text-xs"
                    />
                  </button>
                </Tooltip>

                <Tooltip label={t('Delete Column')}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faTrash}
                      className="text-red-500 text-xs"
                    />
                    <span className="text-red-500 text-xs">Col</span>
                  </button>
                </Tooltip>

                <Tooltip label={t('Add Row Before')}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().addRowBefore().run()}
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="text-[#808496] text-xs"
                    />

                    <span className="text-[#808496] text-xs">Row</span>
                    <FontAwesomeIcon
                      icon={faArrowUp}
                      className="text-[#808496] text-xs"
                    />
                  </button>
                </Tooltip>

                <Tooltip label={t('Add Row After')}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="text-[#808496] text-xs"
                    />

                    <span className="text-[#808496] text-xs">Row</span>
                    <FontAwesomeIcon
                      icon={faArrowDown}
                      className="text-[#808496] text-xs"
                    />
                  </button>
                </Tooltip>

                <Tooltip label={t('Delete Row')}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faTrash}
                      className="text-red-500 text-xs"
                    />
                    <span className="text-red-500 text-xs">Row</span>
                  </button>
                </Tooltip>

                <Tooltip label={t('Delete Table')}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="h-[26px] px-2 flex justify-center items-center gap-1
                              rounded-[4px] font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="text-red-500 text-xs"
                    />
                    <span className="text-red-500 text-xs">Table</span>
                  </button>
                </Tooltip>
              </MantineRichTextEditor.ControlsGroup>
            )}

            {/* Font Size Controls */}
            <MantineRichTextEditor.ControlsGroup>
              <Tooltip label={t('Decrease Font Size')}>
                <button
                  type="button"
                  onClick={() => {
                    if (!editor) return;
                    const newSize = Math.max(8, parseInt(fontSize || '16') - 1);
                    setFontSize(newSize.toString());
                    applyFontSize(newSize.toString());
                  }}
                  className="w-[26px] h-[26px] flex justify-center items-center
                            rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                >
                  <FontAwesomeIcon icon={faMinus} className="text-[#808496]" />
                </button>
              </Tooltip>

              <div className="flex items-center px-1">
                <Select
                  value={fontSize}
                  radius="md"
                  onChange={(value) => {
                    setFontSize(value);
                    applyFontSize(value);
                  }}
                  data={fontSizeOptions}
                  className="w-[70px]"
                  classNames={{
                    dropdown: 'overflow-auto',
                  }}
                  styles={{
                    input: {
                      height: '26px',
                      minHeight: '26px',
                      paddingLeft: '8px',
                      paddingRight: '8px',
                    },
                    wrapper: {
                      height: '26px',
                    },
                    dropdown: {
                      maxHeight: '200px',
                    },
                  }}
                />
              </div>

              <Tooltip label={t('Increase Font Size')}>
                <button
                  type="button"
                  onClick={() => {
                    if (!editor) return;
                    const newSize = parseInt(fontSize || '16') + 1;
                    setFontSize(newSize.toString());
                    applyFontSize(newSize.toString());
                  }}
                  className="w-[26px] h-[26px] flex justify-center items-center
                            rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[#808496]" />
                </button>
              </Tooltip>
            </MantineRichTextEditor.ControlsGroup>

            {canAddImage && (
              <MantineRichTextEditor.ControlsGroup>
                {/* Insert Image Button */}
                <EnhancedImageButton
                  editor={editor}
                  onAddImageOverride={onAddImageOverride}
                />

                {/* Insert Gallery Button */}
                <Menu shadow="md" width={200} position="bottom-start">
                  <Menu.Target>
                    <Tooltip label={t('Insert Gallery')}>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryData(null); // Reset gallery data for new gallery
                          openGalleryModal();
                        }}
                        className="w-[26px] h-[26px] flex justify-center items-center
                                                  rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                      >
                        <FontAwesomeIcon
                          icon={faImages}
                          className="text-[#808496]"
                        />
                      </button>
                    </Tooltip>
                  </Menu.Target>
                </Menu>

                {/* Insert Authenticated Content Button */}
                <AuthenticatedContentButton editor={editor} />

                {/* Insert Video Button */}
                <EmbedVideoButton editor={editor} />

                {/* Insert Audio Button */}
                <EmbedAudioButton editor={editor} />

                {/* Insert Files Button */}
                <EmbedFilesButton editor={editor} />

                {/* Insert Table Button */}
                <Menu shadow="md" width={200} position="bottom-start">
                  <Menu.Target>
                    <Tooltip label={t('Insert Table')}>
                      <button
                        type="button"
                        onClick={openTableModal}
                        className="w-[26px] h-[26px] flex justify-center items-center
                                                  rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                      >
                        <FontAwesomeIcon
                          icon={faTable}
                          className="text-[#808496]"
                        />
                      </button>
                    </Tooltip>
                  </Menu.Target>
                </Menu>

                {/* Insert HTML Components Button */}
                <Tooltip label={t('Insert HTML Component')}>
                  <button
                    type="button"
                    onClick={openHtmlComponentsModal}
                    className="w-[26px] h-[26px] flex justify-center items-center
                                              rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                  >
                    <FontAwesomeIcon icon={faCube} className="text-[#808496]" />
                  </button>
                </Tooltip>

                {/* Insert Rich Text Component Button */}
                {/* <Menu shadow="md" width={200} position="bottom-start">
                  <Menu.Target>
                    <Tooltip label={t('Insert Rich Text Component')}>
                      <button
                        type="button"
                        onClick={() => {
                          setRichTextData(null); // Reset rich text data for new component
                          openRichTextModal();
                        }}
                        className="w-[26px] h-[26px] flex justify-center items-center
                                                  rounded-[4px] p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-[#808496]"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="9" y1="3" x2="9" y2="21"></line>
                          <line x1="14" y1="8" x2="19" y2="8"></line>
                          <line x1="14" y1="12" x2="19" y2="12"></line>
                          <line x1="14" y1="16" x2="19" y2="16"></line>
                        </svg>
                      </button>
                    </Tooltip>
                  </Menu.Target>
                </Menu> */}

                {/* Insert YouTube Video with Jump Marks Button */}
                <Tooltip label={t('Insert Collapse')}>
                  <button
                    type="button"
                    className="w-6 h-6 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                    onClick={() => {
                      setJumpMarksData(null);
                      openJumpMarksModal();
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faYoutube}
                      className="text-[#808496]"
                    />
                  </button>
                </Tooltip>

                {/* Add Collapsable content - hide when inside another collapse */}
                {!isInsideCollapse && (
                  <Tooltip label={t('Insert Collapse')}>
                    <button
                      type="button"
                      className="w-6 h-6 flex justify-center items-center rounded p-1 font-thin cursor-pointer hover:bg-[#e4e6ed]"
                      onClick={(event) => {
                        event.preventDefault();
                        editor
                          .chain()
                          .focus()
                          .insertContent(
                            `<details><summary>${t('Click to expand')}</summary><div data-type="details-content"><p>${t('Add your content here...')}</p></div></details>`
                          )
                          .run();
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faAngleDown}
                        className="text-[#808496]"
                      />
                    </button>
                  </Tooltip>
                )}

                {/* Add CSS for hover menu */}
                <style>{`
                  /* Table styles */
                  .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 1rem 0;
                    overflow: hidden;
                    position: relative;
                  }

                  .ProseMirror td,
                  .ProseMirror th {
                    min-width: 1em;
                    border: 2px solid #ced4da;
                    padding: 8px 12px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                  }

                  .ProseMirror th {
                    font-weight: bold;
                    text-align: left;
                    background-color: #f8f9fa;
                  }

                  .ProseMirror .selectedCell:after {
                    z-index: 2;
                    position: absolute;
                    content: '';
                    left: 0;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    background: rgba(200, 200, 255, 0.4);
                    pointer-events: none;
                  }

                  .ProseMirror .column-resize-handle {
                    position: absolute;
                    right: -2px;
                    top: 0;
                    bottom: -2px;
                    width: 4px;
                    background-color: #adf;
                    pointer-events: none;
                  }

                  .ProseMirror.resize-cursor {
                    cursor: ew-resize;
                    cursor: col-resize;
                  }

                  /* Table hover controls */
                  .ProseMirror table:hover .table-controls {
                    opacity: 1 !important;
                  }

                  .ProseMirror tr:hover .table-row-controls {
                    opacity: 1 !important;
                  }

                  .ProseMirror td:hover .table-col-controls,
                  .ProseMirror th:hover .table-col-controls {
                    opacity: 1 !important;
                  }

                  .table-controls {
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                  }

                  .table-row-controls {
                    position: absolute;
                    left: -40px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    z-index: 10;
                  }

                  .table-col-controls {
                    position: absolute;
                    top: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 3px;
                    z-index: 10;
                  }

                  .table-control-btn {
                    width: 28px;
                    height: 28px;
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: normal;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                    transition: all 0.2s ease;
                    color: #495057;
                    line-height: 1;
                  }

                  .table-control-btn:hover {
                    background: #f8f9fa;
                    border-color: #adb5bd;
                    transform: scale(1.15);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                  }

                  .table-control-btn:active {
                    transform: scale(0.95);
                  }

                  /* Specific button colors */
                  .table-control-btn.delete {
                    color: #dc3545;
                  }

                  .table-control-btn.delete:hover {
                    background: #f8d7da;
                    border-color: #dc3545;
                  }

                  .table-control-btn.add {
                    color: #28a745;
                  }

                  .table-control-btn.add:hover {
                    background: #d4edda;
                    border-color: #28a745;
                  }
                `}</style>
              </MantineRichTextEditor.ControlsGroup>
            )}
          </MantineRichTextEditor.Toolbar>

          <MantineRichTextEditor.Content />
        </MantineRichTextEditor>
      </div>
      {canAddImage && (
        <>
          <GalleryModal
            isOpen={isGalleryModalOpened}
            close={closeGalleryModal}
            galleryId={galleryData?.galleryId}
            initialConfig={galleryData?.config}
            initialAttachments={galleryData?.attachments}
            onSave={(galleryData) => {
              if (galleryData.updateGallery) {
                // Update existing gallery
                galleryData.updateGallery({
                  config: galleryData.config,
                  attachments: galleryData.attachments,
                });
              } else {
                // Insert new gallery
                if (editor) {
                  editor
                    .chain()
                    .focus()
                    .setGallery({
                      galleryId: galleryData.galleryId,
                      config: galleryData.config,
                      attachments: galleryData.attachments,
                    })
                    .run();
                }
              }
            }}
          />

          <RichTextModal
            isOpen={isRichTextModalOpened}
            close={closeRichTextModal}
            richtextId={richTextData?.richtextId}
            initialConfig={richTextData?.config}
            initialContent={richTextData?.content}
            onSave={(data) => {
              if (data.updateRichText && richTextData?.updateRichText) {
                // Update existing rich text using the original updateRichText function
                richTextData.updateRichText({
                  config: data.config,
                  content: data.content,
                });
              } else {
                // Insert new rich text
                if (editor) {
                  editor
                    .chain()
                    .focus()
                    .setRichText({
                      richtextId: data.richtextId,
                      config: data.config,
                      content: data.content,
                    })
                    .run();
                }
              }
            }}
          />

          <Modal
            opened={isTableModalOpened}
            onClose={closeTableModal}
            title={t('Insert Table')}
            size="sm"
          >
            <div className="space-y-4">
              <NumberInput
                label={t('Number of rows')}
                value={tableRows}
                onChange={setTableRows}
                min={1}
                max={20}
              />
              <NumberInput
                label={t('Number of columns')}
                value={tableCols}
                onChange={setTableCols}
                min={1}
                max={10}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeTableModal}>
                  {t('Cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (editor) {
                      editor
                        .chain()
                        .focus()
                        .insertTable({
                          rows: tableRows,
                          cols: tableCols,
                          withHeaderRow: true,
                        })
                        .run();
                    }
                    closeTableModal();
                  }}
                >
                  {t('Insert Table')}
                </Button>
              </div>
            </div>
          </Modal>

          <JumpMarksModal
            isOpen={isJumpMarksModalOpened}
            onClose={closeJumpMarksModal}
            initialData={jumpMarksData}
            onSave={(data) => {
              if (editor) {
                // Add YouTube content
                editor.chain().focus().setYoutubeVideoWithJumpMarks(data).run();

                // Add line break after YouTube video
                setTimeout(() => {
                  editor.chain().focus().createParagraphNear().run();
                }, 300);
              }
            }}
          />

          <HtmlComponentsModal
            isOpen={isHtmlComponentsModalOpened}
            onClose={closeHtmlComponentsModal}
            currentLocaleId={currentLocaleId}
            onInsert={(html) => {
              if (editor) {
                editor.chain().focus().insertContent(html).run();
              }
            }}
          />
        </>
      )}
    </>
  );
});

RichTextInput.displayName = 'RichTextInput';

export default RichTextInput;
