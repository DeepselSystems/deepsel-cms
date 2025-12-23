import React, { useState } from 'react';
import { Modal } from '@mantine/core';
import { isEmail, isInRange, useForm } from '@mantine/form';
import TextInput from '../../../../common/ui/TextInput.jsx';
import NumberInput from '../../../../common/ui/NumberInput.jsx';
import Button from '../../../../common/ui/Button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlask } from '@fortawesome/free-solid-svg-icons';
import { useDisclosure } from '@mantine/hooks';
import NotificationState from '../../../../common/stores/NotificationState.js';
import { useTranslation } from 'react-i18next';
import useFetch from '../../../../common/api/useFetch.js';

const MaximumSleepInterval = 15; // seconds

/**
 * Find good config modal
 *
 * @type {React.ForwardRefExoticComponent<
 * React.PropsWithoutRef<{open: () => void}> &
 * React.RefAttributes<unknown>
 *   >}
 */
const FindGoodConfigModal = React.forwardRef((props, ref) => {
  // Translation
  const { t } = useTranslation();

  // Notification
  const { notify } = NotificationState();

  // Api model
  const { post: findConfig, loading: findConfigLoading } = useFetch(
    'email_template/util/find-good-config',
  );

  // Result - good config
  const [findConfigResult, setFindConfigResult] = useState(null);

  // Modal visible state
  const [findConfigModalOpened, { open: openFindConfigModal, close: closeFindConfigModal }] =
    useDisclosure(false);

  // Form state
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      test_recipient: 'dev@deepsel.com',
      sleep_interval: 0,
    },
    validate: {
      test_recipient: isEmail('Invalid email'),
      sleep_interval: isInRange(
        { min: 0, max: MaximumSleepInterval },
        t(`You must be 0-${MaximumSleepInterval} seconds to register`),
      ),
    },
  });

  /**
   * Handle submit
   *
   * @type {(value) => void}
   */
  const handleSubmit = React.useCallback(
    async (value) => {
      try {
        const response = await findConfig(value);
        if (response.result) {
          setFindConfigResult(response.result);
          notify({
            message: t('Configuration report prepared.'),
            type: 'info',
          });
        }
      } catch (error) {
        console.error(error);
        notify({
          message: error.message,
          type: 'error',
        });
      }
    },
    [findConfig, notify, t],
  );

  /**
   * Handle ref
   */
  React.useImperativeHandle(ref, () => ({
    open: () => {
      openFindConfigModal();
    },
  }));

  return (
    <>
      <Modal
        closeOnClickOutside={false}
        opened={findConfigModalOpened}
        onClose={closeFindConfigModal}
        title={<div className="font-semibold">{t('Find Good Configuration')}</div>}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)} className="flex flex-col gap-2">
          <TextInput
            required
            label={t('Recipient Email')}
            type="email"
            key={form.key('test_recipient')}
            {...form.getInputProps('test_recipient')}
          />
          <NumberInput
            required
            allowDecimal={false}
            allowNegative={false}
            label={t('Sleep Interval (seconds)')}
            description={t('Specify the delay between each configuration test in seconds.')}
            key={form.key('sleep_interval')}
            {...form.getInputProps('sleep_interval')}
          />
          {findConfigResult && (
            <div
              className="bg-gray-200 text-gray-700 p-2 text-xs rounded font-mono"
              dangerouslySetInnerHTML={{
                __html: findConfigResult
                  .replace(/\n/g, '<br />')
                  .replace(
                    /Successful configuration:/g,
                    '<strong>Successful configuration:</strong>',
                  ),
              }}
            />
          )}
          <Button type="submit" loading={findConfigLoading}>
            <FontAwesomeIcon icon={faFlask} className="mr-2" />
            {t('Find Good Configuration')}
          </Button>
        </form>
      </Modal>
    </>
  );
});

FindGoodConfigModal.displayName = 'FindGoodConfigModal';
export default FindGoodConfigModal;
