import {useState} from 'react';
import {DataGrid} from '@mui/x-data-grid';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTriangleExclamation, faPlus} from '@fortawesome/free-solid-svg-icons';
import {Alert, Badge, Progress} from '@mantine/core';
import {Helmet} from 'react-helmet';
import dayjs from 'dayjs';
import useModel from '../../../common/api/useModel.jsx';
import H1 from '../../../common/ui/H1.jsx';
import Button from '../../../common/ui/Button.jsx';
import LinkedCell from '../../../common/ui/LinkedCell.jsx';
import ListViewSearchBar from '../../../common/ui/ListViewSearchBar.jsx';
import ListViewPagination from '../../../common/ui/ListViewPagination.jsx';
import DataGridColumnMenu from '../../../common/ui/DataGridColumnMenu.jsx';
import {Link} from 'react-router-dom';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export default function CampaignList() {
  const {t} = useTranslation();
  const query = useModel('email_campaign', {
    autoFetch: true,
    searchFields: ['name'],
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'gray';
      case 'queued':
        return 'orange';
      case 'pending':
        return 'cyan';
      case 'sending':
        return 'blue';
      case 'paused':
        return 'yellow';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft':
        return t('Draft');
      case 'queued':
        return t('Queued');
      case 'pending':
        return t('Pending');
      case 'sending':
        return t('Sending');
      case 'paused':
        return t('Paused');
      case 'completed':
        return t('Completed');
      default:
        return status;
    }
  };

  const getProgressText = (item) => {
    const stats = item.stats || {};
    const total = stats.total_emails || 0;
    const sent = stats.sent_emails || 0;
    const failed = stats.failed_emails || 0;
    const processed = sent + failed;

    if (total === 0) return '0/0';
    return `${processed}/${total}`;
  };

  const getProgressPercentage = (item) => {
    const stats = item.stats || {};
    const total = stats.total_emails || 0;
    const sent = stats.sent_emails || 0;
    const failed = stats.failed_emails || 0;

    if (total === 0) return 0;
    return ((sent + failed) / total) * 100;
  };

  const getDataSourceType = (item) => {
    if (!item.use_table_data) {
      return 'Manual';
    }

    if (item.form_id && item.form) {
      return 'Form';
    }

    return 'CSV';
  };

  const getScheduleText = (item) => {
    if (item.send_type === 'immediate') {
      return 'Immediate';
    }

    if (item.scheduled_at) {
      return dayjs.utc(item.scheduled_at).format('DD/MM/YYYY HH:mm');
    }

    return 'Not scheduled';
  };

  const columns = [
    {
      field: 'name',
      headerName: t('Campaign Name'),
      flex: 2,
      minWidth: 150,
      renderCell: (params) => (
        <LinkedCell params={params}>{params.value}</LinkedCell>
      ),
    },
    {
      field: 'email_template',
      headerName: t('Template'),
      flex: 2.5,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <LinkedCell params={params}>
          {params.row.email_template ? params.row.email_template.name : '-'}
        </LinkedCell>
      ),
    },
    {
      field: 'data_source',
      headerName: t('Data Source'),
      flex: 1,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => (
        <LinkedCell params={params}>{getDataSourceType(params.row)}</LinkedCell>
      ),
    },
    {
      field: 'schedule',
      headerName: t('Schedule'),
      flex: 2,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <LinkedCell params={params}>{getScheduleText(params.row)}</LinkedCell>
      ),
    },
    {
      field: 'status',
      headerName: t('Status'),
      flex: 1.5,
      minWidth: 120,
      renderCell: (params) => (
        <LinkedCell params={params}>
          <Badge color={getStatusColor(params.value)}>
            {getStatusText(params.value)}
          </Badge>
        </LinkedCell>
      ),
    },
    {
      field: 'progress',
      headerName: t('Progress'),
      flex: 2,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => (
        <LinkedCell params={params}>
          <div style={{width: '100%'}}>
            <div
              style={{
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{minWidth: '40px'}}>
                {getProgressText(params.row)}
              </span>
              <span>{t('Emails sent')}</span>
            </div>
            <Progress
              value={getProgressPercentage(params.row)}
              size="sm"
              color={params.row.status === 'completed' ? 'green' : 'blue'}
              style={{width: '100%'}}
            />
          </div>
        </LinkedCell>
      ),
    },
    {
      field: 'created_at',
      headerName: t('Created'),
      flex: 1.5,
      minWidth: 120,
      renderCell: (params) => (
        <LinkedCell params={params}>
          {dayjs.utc(params.value).format('DD/MM/YYYY HH:mm')}
        </LinkedCell>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Campaigns</title>
      </Helmet>
      <main className="h-[calc(100vh-50px-32px-20px)] flex flex-col m-auto px-[12px] sm:px-[24px]">
        <div className="flex w-full justify-between gap-2 my-3">
          <H1 className="text-[32px] font-bold text-primary">
            {t('Campaigns')}
          </H1>
          <Link to={`/campaigns/create`}>
            <Button
              className={`shadow bg-primary-main text-primary-contrastText`}
              color={`primary`}
            >
              <FontAwesomeIcon icon={faPlus} className="sm:mr-1 h-4 w-4" />
              <span className={`hidden sm:inline`}>{t('Create Campaign')}</span>
            </Button>
          </Link>
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
