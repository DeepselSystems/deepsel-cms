import React from 'react';
import RenderedForm from '../../../../../common/ui/Form/RenderedForm/index.jsx';
import {Box, Center, Stack} from '@mantine/core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useTranslation} from 'react-i18next';
import {faWpforms} from '@fortawesome/free-brands-svg-icons';

/**
 * Preview form
 * @param {FormContent} formContent
 * @returns {JSX.Element}
 * @constructor
 */
const FormFieldsPreview = ({formContent}) => {
  // Translation
  const {t} = useTranslation();

  // Check form has content data
  const hasContent = React.useMemo(
    () =>
      formContent &&
      !![
        !!formContent.fields?.length,
        !!formContent.title,
        !!formContent.description,
      ].find(Boolean),
    [formContent]
  );

  return (
    <>
      {hasContent ? (
        <RenderedForm formContent={formContent} />
      ) : (
        <Box className="my-20 text-gray-pale-sky">
          <Center>
            <Stack align="center" gap="md">
              <FontAwesomeIcon icon={faWpforms} size="2x" />
              <Box className="text-center ">
                {t('Add fields to see preview')}
              </Box>
            </Stack>
          </Center>
        </Box>
      )}
    </>
  );
};

export default FormFieldsPreview;
