import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import useAuthentication from './useAuthentication.js';
import { modals } from '@mantine/modals';
import { Alert } from '@mantine/core';
import dayjs from 'dayjs';
import H2 from '../../common/ui/H2';
import BackendHostURLState from '../stores/BackendHostURLState.js';
import OrganizationIdState from '../stores/OrganizationIdState.js';
import { useTranslation } from 'react-i18next';
import { PagingTableParams } from '../../constants/searchParams.js';
import usePagingTableParams from './usePagingTableParams.js';
import useSearchParamState from './useSearchParamState.js';

function isISODateString(str) {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{6})?$/;
  return isoDatePattern.test(str);
}

/**
 * Custom hook to manage pagination, page size, and search term states, with an option to sync them with URL search parameters.
 *
 * @param {boolean} syncPagingParamsWithURL - Determines whether to store the page, page size, and search term in URL search parameters.
 * @param {number} initialPage - The initial page number to start with.
 * @param {number} initialPageSize - The initial page size to start with.
 * @param {string} initialSearchTerm - The initial search term to start with.
 *
 * @return {Object} - Returns an object with the following properties:
 *
 * - If `syncPagingParamsWithURL` is true, the values are synced with URL search parameters.
 * - If `syncPagingParamsWithURL` is false, the values are managed locally in state.
 */
const usePagingState = (
  syncPagingParamsWithURL,
  initialPage,
  initialPageSize,
  initialSearchTerm,
) => {
  // Search params state for page number
  const [searchParamPage, setSearchParamPage] = usePagingTableParams(
    PagingTableParams.Page,
    initialPage,
  );
  const [page, setPage] = useState(initialPage);

  // Search param state for page size
  const [searchParamPageSize, setSearchParamPageSize] = usePagingTableParams(
    PagingTableParams.Limit,
    initialPageSize,
  );
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Search param state for search term
  const [searchParamSearchTerm, setSearchParamSearchTerm] = useSearchParamState(
    PagingTableParams.Search,
    initialSearchTerm,
  );
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  return {
    page: syncPagingParamsWithURL ? searchParamPage : page,
    setPage: syncPagingParamsWithURL ? setSearchParamPage : setPage,
    pageSize: syncPagingParamsWithURL ? searchParamPageSize : pageSize,
    setPageSize: syncPagingParamsWithURL ? setSearchParamPageSize : setPageSize,
    searchTerm: syncPagingParamsWithURL ? searchParamSearchTerm : searchTerm,
    setSearchTerm: syncPagingParamsWithURL ? setSearchParamSearchTerm : setSearchTerm,
  };
};

/**
 * Manage API calls
 *
 * @param {string} modelName
 * @param {UseModelOptions} options
 */
export default function useModel(modelName, options = {}) {
  const { t } = useTranslation();
  const {
    id = null,
    autoFetch = false,
    syncPagingParamsWithURL = false,
    searchFields = [],
    page: initialPage = 1,
    pageSize: initialPageSize = 20,
    filters: initialFilters = [],
    orderBy: initialOrderBy = { field: 'id', direction: 'desc' },
    redirectLoginIfUnauthorized = true,
    abortPreviousRequest = true,
    filterAfterLoad = null, // Function to filter data after loading from API
  } = options;

  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Store original data from API
  const [record, setRecord] = useState(null); // single record, used for getOne()
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, setUser } = useAuthentication();
  const { backendHost } = BackendHostURLState();
  const { organizationId } = OrganizationIdState();

  const [total, setTotal] = useState(0);

  // get paging params, searching term, filter states
  const { page, setPage, pageSize, setPageSize, searchTerm, setSearchTerm } = usePagingState(
    syncPagingParamsWithURL,
    initialPage,
    initialPageSize,
    '',
  );
  const [filters, setFilters] = syncPagingParamsWithURL
    ? useSearchParamState('filters', initialFilters)
    : useState(initialFilters);
  const [orderBy, setOrderBy] = syncPagingParamsWithURL
    ? useSearchParamState('orderBy', initialOrderBy)
    : useState(initialOrderBy);

  const abortControllerRef = useRef(null);

  // Function to apply client-side filtering
  const applyClientSideFilter = (rawData) => {
    if (!filterAfterLoad || typeof filterAfterLoad !== 'function') {
      return rawData;
    }
    return rawData.filter(filterAfterLoad);
  };

  // Apply client-side filtering when originalData or filterAfterLoad changes
  useEffect(() => {
    if (originalData.length > 0) {
      const filteredData = applyClientSideFilter(originalData);
      setData(filteredData);
      // Update total count when using client-side filtering
      if (filterAfterLoad) {
        setTotal(filteredData.length);
      }
    }
  }, [originalData, filterAfterLoad]);

  // initial fetch
  useEffect(() => {
    if (autoFetch) {
      if (id) getOne(id);
      else get();
    }
  }, [autoFetch, page, pageSize, id, searchTerm, orderBy, filters]);

  function _buildQueryBody() {
    const newQuery = {
      order_by: orderBy || undefined,
      search: {
        AND: filters,
        OR: [],
      },
    };

    // if no search term, do not add to OR
    if (searchTerm === '') {
      return newQuery;
    }

    newQuery.search.OR = searchFields.map((field) => ({
      field,
      operator: 'ilike',
      value: searchTerm,
    }));

    return newQuery;
  }

  async function get(queryObject = null) {
    try {
      // Cancel any in-flight request
      if (abortControllerRef.current && abortPreviousRequest) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setLoading(true);
      const skip = (page - 1) * (pageSize || 0); // Use 0 if pageSize is null

      let endpoint = `${backendHost}/${modelName}/search?skip=${skip}`;
      if (pageSize !== null) {
        endpoint += `&limit=${pageSize}`;
      }

      const query = queryObject || _buildQueryBody();

      const headers = { 'Content-Type': 'application/json' };
      const tokenResult = await Preferences.get({ key: 'token' });
      if (tokenResult?.value) headers.Authorization = `Bearer ${tokenResult.value}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(queryObject || query),
        headers,
      });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      const responseData = await response.json();

      // Store original data
      setOriginalData(responseData.data);

      // Apply client-side filtering if specified
      const filteredData = applyClientSideFilter(responseData.data);
      setData(filteredData);

      // Note: When using filterAfterLoad, total count from server may not match filtered data
      // You may want to adjust this based on your needs
      setTotal(filterAfterLoad ? filteredData.length : responseData.total);
      setError(null);

      return {
        ...responseData,
        data: filteredData,
        total: filterAfterLoad ? filteredData.length : responseData.total,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        // console.log('Fetch aborted'); // Handle abort error if needed
      } else {
        throw error; // Rethrow other errors
      }
    } finally {
      setLoading(false);
    }
  }

  async function getOne(id) {
    try {
      if (abortControllerRef.current && abortPreviousRequest) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      setLoading(true);
      const endpoint = `${backendHost}/${modelName}/${id}`;
      const headers = {};
      const tokenResult = await Preferences.get({ key: 'token' });
      if (tokenResult?.value) headers.Authorization = `Bearer ${tokenResult.value}`;

      const response = await fetch(endpoint, { headers });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      const recordData = await response.json();

      for (const key in recordData) {
        // Check if the value is an ISO date string
        if (isISODateString(recordData[key])) {
          // Convert the string to a date object using dayjs
          recordData[key] = dayjs.utc(recordData[key]).toDate();
        }
      }

      setRecord(recordData);
      setError(null);

      return recordData;
    } catch (error) {
      if (error.name === 'AbortError') {
        // console.log('Fetch aborted'); // Handle abort error if needed
      } else {
        throw error; // Rethrow other errors
      }
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV(selectedRows = null) {
    try {
      setLoading(true);
      const endpoint = `${backendHost}/${modelName}/export`;
      let query = _buildQueryBody();
      if (selectedRows != null) {
        query = {
          order_by: orderBy,
          search: {
            AND: [
              {
                field: 'id',
                operator: 'in',
                value: selectedRows.map((obj) => obj.id),
              },
            ],
            OR: [],
          },
        };
      }
      const headers = { 'Content-Type': 'application/json' };
      const tokenResult = await Preferences.get({ key: 'token' });
      if (tokenResult?.value) headers.Authorization = `Bearer ${tokenResult.value}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(query),
        headers,
      });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        console.log(detail);
        setError(detail);
        throw new Error(detail);
      }
      const data = await response.blob();
      setError(null);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function importCSV(file) {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `${backendHost}/${modelName}/import`;
      const tokenResult = await Preferences.get({ key: 'token' });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenResult.value}`,
        },
        body: formData,
      });
      if (res.status !== 200) {
        const { detail } = await res.json();
        setError(detail);
        throw new Error(detail);
      }

      const resp = await res.json();
      return resp;
    } finally {
      setLoading(false);
    }
  }

  async function create(newItem) {
    setLoading(true);
    // replace all date objects with naive datetime strings
    const keys = Object.keys(newItem);
    const newItemCopy = { ...newItem };
    for (const key of keys) {
      if (newItem[key] instanceof Date) {
        // Send date as-is without any timezone conversion
        newItemCopy[key] = dayjs(newItem[key]).format('YYYY-MM-DDTHH:mm:ss');
      }
    }

    try {
      const endpoint = `${backendHost}/${modelName}`;

      const headers = { 'Content-Type': 'application/json' };
      const tokenResult = await Preferences.get({ key: 'token' });
      if (tokenResult?.value) headers.Authorization = `Bearer ${tokenResult.value}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(newItemCopy),
      });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        console.error(detail);
        setError(detail);
        throw new Error(detail);
      }

      const createdItem = await response.json();
      const newOriginalData = [...originalData, createdItem];
      setOriginalData(newOriginalData);

      const newFilteredData = applyClientSideFilter(newOriginalData);
      setData(newFilteredData);
      setError(null);
      return createdItem;
    } finally {
      setLoading(false);
    }
  }

  async function update(updatedItem) {
    try {
      setLoading(true);

      // replace all date objects with naive datetime strings
      const keys = Object.keys(updatedItem);
      const updatedItemCopy = { ...updatedItem };
      for (const key of keys) {
        if (updatedItem[key] instanceof Date) {
          // Send date as-is without any timezone conversion
          updatedItemCopy[key] = dayjs(updatedItem[key]).format('YYYY-MM-DDTHH:mm:ss');
        }
      }

      const endpoint = `${backendHost}/${modelName}/${updatedItem.id}`;
      const headers = { 'Content-Type': 'application/json' };
      const tokenResult = await Preferences.get({ key: 'token' });
      if (tokenResult?.value) headers.Authorization = `Bearer ${tokenResult.value}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedItemCopy),
      });
      if (response.status === 401) return resetAuth();
      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      // Update original data first
      const updatedOriginalData = originalData.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      );
      setOriginalData(updatedOriginalData);

      // Then apply filtering to get updated filtered data
      const updatedFilteredData = applyClientSideFilter(updatedOriginalData);
      setData(updatedFilteredData);

      // set the updated record
      const updatedRecord = {
        ...updatedItem,
        ...(await response.json()),
      };
      setRecord(updatedRecord);

      // clear error
      setError(null);

      return updatedRecord;
    } finally {
      setLoading(false);
    }
  }

  async function del(recordId, force = false) {
    try {
      setLoading(true);
      let endpoint = `${backendHost}/${modelName}/${recordId}`;
      if (force) endpoint += '?force=true';

      const headers = {};
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;

      const response = await fetch(endpoint, { method: 'DELETE', headers });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }

      const updatedOriginalData = originalData.filter((item) => item.id !== recordId);
      setOriginalData(updatedOriginalData);

      const updatedFilteredData = applyClientSideFilter(updatedOriginalData);
      setData(updatedFilteredData);
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Bulk delete record using query params
   *
   * @description If the query parameters are empty, it means there are no any filters for deleting, witch means it will delete all records of this model
   *
   * @param queryObject
   * @param force
   * @return {Promise<void>}
   */
  async function bulkDelete(queryObject = {}, force = false) {
    try {
      setLoading(true);
      const endpoint = `${backendHost}/${modelName}/bulk_delete${force ? '?force=true' : ''}`;
      const query = queryObject || {};
      const headers = {
        'Content-Type': 'application/json',
        ...(user?.token && { ['Authorization']: `Bearer ${user.token}` }),
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryObject || query),
      });
      if (response.status === 401) {
        return resetAuth();
      }
      if (response.status !== 200) {
        const { detail } = await response.json();
        setError(detail);
        throw new Error(detail);
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle deleting modal confirm
   *
   * @description the delete modal always deletes record with id condition
   * If the list of ids to be deleted is empty, do not do anything to avoid deleting all records
   *
   * @param recordIds
   * @param callback
   * @param onErr
   * @return {Promise<void>}
   */
  async function handleDeleteConfirm(recordIds = [], callback = () => {}, onErr = () => {}) {
    try {
      // return to avoid deleting all records
      if (!recordIds.length) return;

      setLoading(true);
      await bulkDelete(
        {
          OR: recordIds.map((id) => ({
            field: 'id',
            operator: '=',
            value: id,
          })),
        },
        true,
      );
      modals.closeAll();
      if (callback) callback();
    } catch (e) {
      if (onErr) return onErr(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function deleteWithConfirm(recordIds, callback = null, onErr = null) {
    setLoading(true);
    const res = await fetch(
      `${backendHost}/util/delete_check/${modelName}/${recordIds.join(',')}`,
      {
        headers: { Authorization: `Bearer ${user.token}` },
      },
    );
    const response = await res.json();

    const toDelete = response.to_delete || {};
    const toSetNull = response.to_set_null || {};

    setLoading(false);

    modals.openConfirmModal({
      title: <span className={`text-2xl font-bold`}>{t('Delete')}</span>,
      centered: true,
      labels: { confirm: t('Delete'), cancel: t('Cancel') },
      onConfirm: () => handleDeleteConfirm(recordIds, callback, onErr),
      children: (
        <div>
          <div className={`mb-2`}>
            {t(
              recordIds.length > 1
                ? 'Are you sure you want to delete these records?'
                : 'Are you sure you want to delete this record?',
            )}
            {/* Are you sure you want to delete {recordIds.length} record{recordIds.length > 1 ? 's' : ''}?
                        This action cannot be undone. */}
          </div>
          {Object.keys(toDelete).length > 0 || Object.keys(toSetNull).length > 0 ? (
            <Alert color="red" title={<H2>{t('WARNING')}</H2>} className={`mb-2`}>
              <div>
                <div>{t('Deleting this record will have the following cascading effects:')}</div>
                {Object.keys(toDelete).map((tableName) => (
                  <div key={tableName}>
                    <div className={`font-semibold`}>
                      {t('Deleting from ')}
                      {tableName}:
                    </div>
                    {toDelete[tableName].map((record) => (
                      <div key={record}>{record}</div>
                    ))}
                  </div>
                ))}
                {Object.keys(toSetNull).map((tableName) => (
                  <div key={tableName}>
                    <div className={`font-semibold`}>
                      {t('Setting empty reference in ')}
                      {tableName}:
                    </div>
                    {toSetNull[tableName].map((record) => (
                      <div key={record}>{record}</div>
                    ))}
                  </div>
                ))}
              </div>
            </Alert>
          ) : null}
        </div>
      ),
    });
  }

  async function resetAuth() {
    await Promise.all([
      Preferences.remove({ key: 'token' }),
      Preferences.remove({ key: 'userData' }),
    ]);
    setUser(null);
    if (redirectLoginIfUnauthorized) {
      console.error('useModel.resetAuth redirect to login');
      return navigate(`/login?redirect=${currentPath}`);
    }
  }

  async function uploadFile(file, attachmentIdField, rcd = record) {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${backendHost}/attachment/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
        body: formData,
      });
      if (res.status !== 200) {
        const { detail } = await res.json();
        setError(detail);
        throw new Error(detail);
      }

      const resp = await res.json();

      if (rcd) {
        const copyRecord = { ...rcd };
        copyRecord[attachmentIdField] = resp.id;
        await update(copyRecord);
      }

      return resp;
    } finally {
      setLoading(false);
    }
  }

  return {
    modelName,
    data,
    setData, // multiple records
    originalData, // unfiltered data from API
    setOriginalData,
    record,
    setRecord, // single record, with id specified from props
    loading,
    error,
    // crud methods
    get,
    getOne,
    create,
    update,
    del,
    bulkDelete,
    deleteWithConfirm,
    exportCSV,
    importCSV,
    // pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    // filter
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    orderBy,
    setOrderBy,
    uploadFile,
  };
}
