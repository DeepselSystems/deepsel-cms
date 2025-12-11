import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowLeft, faPen, faTrash} from '@fortawesome/free-solid-svg-icons';
import Button from '../ui/Button';
import {useNavigate} from 'react-router-dom';
import NotificationState from '../stores/NotificationState.js';
import useAuthentication from '../api/useAuthentication.js';
import useBack from '../hooks/useBack.js';

export default function ViewFormActionBar(props) {
  const {t} = useTranslation();
  const {
    query,
    allowEdit = true,
    allowDelete = true,
    allowEditRoleIds = [],
    allowDeleteRoleIds = [],
    customActions,
    title,
  } = props;
  const {loading, deleteWithConfirm, record, archive} = query;
  const navigate = useNavigate();
  const {back} = useBack();
  const {notify} = NotificationState((state) => state);
  const {user} = useAuthentication();
  const userRoleIds = user?.all_roles?.map((rec) => rec.string_id) || [];
  const roleCanEdit = allowEditRoleIds.some((roleId) =>
    userRoleIds.includes(roleId)
  );
  const roleCanDelete = allowDeleteRoleIds.some((roleId) =>
    userRoleIds.includes(roleId)
  );
  const canEdit =
    allowEdit &&
    (allowEditRoleIds.length > 0 ? roleCanEdit : true) &&
    !record?.system;
  const canDelete =
    allowDelete &&
    (allowDeleteRoleIds.length > 0 ? roleCanDelete : true) &&
    !record?.system;

  function handleDelete() {
    try {
      deleteWithConfirm(
        [record.id],
        () => navigate(-1),
        (error) =>
          notify({
            message: error.message,
            type: 'error',
          })
      );
    } catch (e) {
      console.error(e);
      notify({
        message: e.message,
        type: 'error',
      });
    }
  }

  async function handleArchive() {
    try {
      await archive(record);
      notify({
        message: 'Archived successfully!',
        type: 'success',
      });
      navigate(-1);
    } catch (e) {
      console.error(e);
      notify({
        message: e.message,
        type: 'error',
      });
    }
  }

  return (
    <div
      className={`flex w-full justify-between roles-end mb-[12px] flex-wrap gap-2`}
    >
      <div className={`flex items-center`}>
        <Button
          className={`shadow text-[14px] font-[600] mr-2`}
          variant={`outline`}
          onClick={() => back()}
        >
          <FontAwesomeIcon
            icon={faArrowLeft}
            className="mr-1 h-4 w-4 sm:h-3 sm:w-3"
            size={`sm`}
          />
          <span className="hidden sm:block">{t('Back')}</span>
        </Button>
      </div>

      {customActions ? (
        customActions
      ) : (
        <div className={`flex items-center gap-1`}>
          {canEdit && (
            <Button
              className={`shadow text-[14px] font-[600]`}
              onClick={() => navigate(`edit`)}
              disabled={loading}
              loading={loading}
              variant={`filled`}
            >
              <FontAwesomeIcon
                icon={faPen}
                className="mr-2 h-3 w-3"
                size={`sm`}
              />
              {t('Edit')}
            </Button>
          )}
          {canDelete && (
            <Button variant={`outline`} onClick={handleDelete}>
              <FontAwesomeIcon
                icon={faTrash}
                className="mr-2 h-3 w-3"
                size={`sm`}
              />
              {t('Delete')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
