import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowLeft, faCheck} from '@fortawesome/free-solid-svg-icons';
import Button from '../ui/Button';
import useBack from '../hooks/useBack';

export default function EditFormActionBar(props = {}) {
  const {t} = useTranslation();
  const {loading, slot, showBack = true} = props;
  const {back} = useBack();

  return (
    <div className={`flex w-full justify-between roles-end mb-[12px]`}>
      <div>
        {showBack && (
          <Button
            className={`shadow text-[14px] font-[600] `}
            variant={`outline`}
            onClick={back}
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className="mr-1 h-3 w-3"
              size={`sm`}
            />
            {t('Back')}
          </Button>
        )}
      </div>

      <div>
        {slot?.prependButton && slot?.prependButton}
        <Button
          className={`shadow text-[14px] font-[600] bg-primary-main text-primary-contrastText ml-2`}
          disabled={loading}
          loading={loading}
          variant={`filled`}
          type={`submit`}
        >
          <FontAwesomeIcon
            icon={faCheck}
            className="mr-1 h-4 w-4"
            size={`sm`}
          />
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}
