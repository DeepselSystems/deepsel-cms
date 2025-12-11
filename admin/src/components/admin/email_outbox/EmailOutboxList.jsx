import {useTranslation} from 'react-i18next';
import dayjs from 'dayjs';
import useModel from '../../../common/api/useModel.jsx';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {Alert, Badge} from '@mantine/core';
import {useState} from 'react';
import {DataGrid} from '@mui/x-data-grid';
import ListViewSearchBar from '../../../common/ui/ListViewSearchBar.jsx';
import ListViewPagination from '../../../common/ui/ListViewPagination.jsx';
import LinkedCell from '../../../common/ui/LinkedCell.jsx';
import DataGridColumnMenu from '../../../common/ui/DataGridColumnMenu.jsx';
import H1 from '../../../common/ui/H1.jsx';
import {Helmet} from 'react-helmet';
import RecordDisplay from '../../../common/ui/RecordDisplay.jsx';

export default function EmailOutboxList() {
  const {t} = useTranslation();
  const query = useModel('email_out', {
    autoFetch: true,
    searchFields: ['subject', 'recipients'],
    syncPagingParamsWithURL: true,
  });
  const {
    data: items,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    orderBy,
    setOrderBy,
  } = query;
  const [selectedRows, setSelectedRows] = useState([]);

  const getStatusText = (status) => {
    switch (status) {
      case 'sending':
        return t('Sending');
      case 'sent':
        return t('Sent Successfully');
      case 'failed':
        return t('Failed');
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sending':
        return 'yellow';
      case 'sent':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const columns = [
    {
      field: 'subject',
      headerName: t('Subject'),
      flex: 3,
      minWidth: 200,
      renderCell: (params) => (
        <LinkedCell params={params}>{params.value}</LinkedCell>
      ),
    },
    {
      field: 'recipients',
      headerName: t('Recipients'),
      flex: 2,
      minWidth: 150,
      renderCell: (params) => (
        <LinkedCell params={params}>{params.value}</LinkedCell>
      ),
    },
    {
      field: 'email_campaign',
      headerName: t('Campaign'),
      flex: 2,
      minWidth: 150,
      sortable: false,
      renderCell: (params) => (
        <LinkedCell params={params}>
          {params.row.email_campaign ? (
            <RecordDisplay
              value={params.row.email_campaign.name}
              linkTo={`/campaigns/${params.row.email_campaign.id}`}
              size="sm"
            />
          ) : (
            <span className="text-gray-500">{t('Manual')}</span>
          )}
        </LinkedCell>
      ),
    },
    {
      field: 'created_at',
      headerName: t('Created'),
      flex: 1.5,
      minWidth: 140,
      renderCell: (params) => (
        <LinkedCell params={params}>
          {dayjs.utc(params.value).local().format('DD/MM/YYYY HH:mm')}
        </LinkedCell>
      ),
    },
    {
      field: 'status',
      headerName: t('Status'),
      flex: 1.5,
      minWidth: 140,
      renderCell: (params) => (
        <LinkedCell params={params}>
          <Badge color={getStatusColor(params.value)}>
            {getStatusText(params.value)}
          </Badge>
        </LinkedCell>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Outgoing E-Mails</title>
      </Helmet>
      <main className="h-[calc(100vh-50px-32px-20px)] flex flex-col m-auto px-[12px] sm:px-[24px]">
        <div className="flex w-full justify-between gap-2 my-3">
          <H1 className="text-[32px] font-bold text-primary">
            {t('Outgoing E-Mails')}
          </H1>
        </div>

        <ListViewSearchBar
          query={query}
          columns={columns}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
        />

        {error && (
          <Alert
            color="red"
            variant="light"
            title="Error"
            className="mb-4"
            icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
          >
            {error}
          </Alert>
        )}

        <DataGrid
          paginationMode="server"
          sortingMode="server"
          filterMode="server"
          loading={loading}
          rows={items}
          columns={columns}
          rowCount={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          page={page - 1}
          onPageChange={(newPage) => setPage(newPage + 1)}
          rowsPerPageOptions={[20, 30, 50, 100]}
          disableRowSelectionOnClick
          checkboxSelection
          className={`!border-0 `}
          sortModel={[
            {
              field: orderBy.field,
              sort: orderBy.direction.toLowerCase(),
            },
          ]}
          onSortModelChange={(model) => {
            if (model.length > 0) {
              setOrderBy({
                field: model[0].field,
                direction: model[0].sort.toLowerCase(),
              });
            }
          }}
          onSelectionModelChange={(ids) => {
            setSelectedRows(items.filter((item) => ids.includes(item.id)));
          }}
          components={{
            ColumnMenu: DataGridColumnMenu,
            Footer: () => null,
          }}
          componentsProps={{columnMenu: {query}}}
          localeText={{noRowsLabel: t('Nothing here yet.')}}
        />

        <ListViewPagination query={query} />
      </main>
    </>
  );
}
