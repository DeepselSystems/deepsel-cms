import {useState, memo, useCallback} from 'react';
import {DataGrid} from '@mui/x-data-grid';
import {Badge, Button, Alert} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faEye, faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import ContextModal from './ContextModal.jsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const CampaignRowsTable = memo(function CampaignRowsTable({
  rows = [],
  className,
}) {
  const {t} = useTranslation();

  // Modal state
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const handleContextView = useCallback((row) => {
    setSelectedRow(row);
    setModalOpened(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpened(false);
    setSelectedRow(null);
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'orange';
      case 'sending':
        return 'blue';
      case 'queued':
        return 'orange';
      case 'sent':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  }, []);

  const columns = [
    {
      field: 'recipient_email',
      headerName: t('Email'),
      flex: 2,
      minWidth: 200,
      renderCell: (params) => <div className="font-medium">{params.value}</div>,
    },
    {
      field: 'status',
      headerName: t('Status'),
      flex: 1,
      minWidth: 100,
      renderCell: (params) => (
        <Badge size="sm" color={getStatusColor(params.value)} variant="filled">
          {params.value}
        </Badge>
      ),
    },
    {
      field: 'scheduled_send_at',
      headerName: t('Scheduled At'),
      flex: 1.5,
      minWidth: 140,
      renderCell: (params) =>
        params.value ? dayjs.utc(params.value).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      field: 'actions',
      headerName: t('Context'),
      flex: 1,
      minWidth: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="xs"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleContextView(params.row);
          }}
          leftSection={<FontAwesomeIcon icon={faEye} />}
        >
          {t('View')}
        </Button>
      ),
    },
  ];

  if (!rows || rows.length === 0) {
    return (
      <div className={className}>
        <Alert
          color="gray"
          title={t('No Recipients')}
          icon={<FontAwesomeIcon icon={faExclamationTriangle} />}
        >
          {t('This campaign has no recipients yet.')}
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{height: 600, width: '100%'}}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          pagination
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowsPerPageOptions={[10, 25, 50, 100]}
          className="!border-0"
          localeText={{noRowsLabel: t('No recipients')}}
        />
      </div>

      {/* Context Modal */}
      <ContextModal
        opened={modalOpened}
        onClose={handleModalClose}
        rowData={selectedRow?.row_data}
        recipientEmail={selectedRow?.recipient_email}
        status={selectedRow?.status}
      />
    </div>
  );
});

CampaignRowsTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      recipient_email: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      scheduled_send_at: PropTypes.string,
      row_data: PropTypes.object,
    })
  ),
  className: PropTypes.string,
};

export default CampaignRowsTable;
