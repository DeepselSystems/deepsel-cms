import { useTranslation } from 'react-i18next';
import { Pagination } from '@mantine/core';

export default function ListViewPagination(props) {
  const { t } = useTranslation();
  const { query, className, ...others } = props;
  const { page, setPage, pageSize, total } = query;
  const recRange = {
    start: Math.min((page - 1) * pageSize + 1, total),
    end: Math.min(page * pageSize, total),
  };
  return (
    <div className={`flex w-full justify-between items-center mt-3 ${className || ''}`} {...others}>
      <div className={`text-sm pl-2`}>
        {recRange.start} to {recRange.end} {t('of')} {total} {t('records')}
      </div>
      <Pagination
        value={page}
        onChange={setPage}
        total={total % pageSize === 0 ? total / pageSize : Math.floor(total / pageSize) + 1}
        color={`primary`}
      />
    </div>
  );
}
