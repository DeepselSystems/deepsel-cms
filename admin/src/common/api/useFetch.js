import { Preferences } from '@capacitor/preferences';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import backendHost from '../../constants/backendHost.js';
import useAuthentication from './useAuthentication.js';

export default function useFetch(
  url,
  { autoFetch = false, params: paramsProp = null, redirectLoginIfUnauthorized = true } = {},
) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setUser } = useAuthentication();
  const [params, setParams] = useState(paramsProp);
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [params]);

  async function fetchCommon({ method = 'GET', path = url, data }) {
    try {
      let endpoint = `${backendHost}/${path}`;
      const headers = { 'Content-Type': 'application/json' };
      const tokenResult = await Preferences.get({ key: 'token' });

      if (tokenResult?.value) {
        headers.Authorization = `Bearer ${tokenResult.value}`;
      }

      const fetchOptions = { method, headers };

      if (method !== 'GET' && data) {
        fetchOptions.body = JSON.stringify(data);
      } else if (method === 'GET' && data) {
        const queryString = new URLSearchParams(data).toString();
        endpoint = `${endpoint}?${queryString}`;
      }

      const response = await fetch(endpoint, fetchOptions);

      if (response.status === 401) {
        await resetAuth();
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.detail || error);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

  async function resetAuth() {
    await Promise.all([
      Preferences.remove({ key: 'token' }),
      Preferences.remove({ key: 'userData' }),
    ]);
    setUser(null);
    console.log('useFetch.resetAuth redirect to login');
    if (redirectLoginIfUnauthorized) {
      navigate(`/login?redirect=${currentPath}`);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const result = await fetchCommon({ data: params });
      if (Array.isArray(result)) {
        setData(result);
      } else {
        setRecord(result);
      }

      setError(null);

      return result;
    } catch (error) {
      setError(error);
      console.error(error);
      throw new Error(error);
    } finally {
      setLoading(false);
    }
  }

  async function post(data, { path } = {}) {
    setLoading(true);
    try {
      const result = await fetchCommon({
        method: 'POST',
        path,
        data,
      });
      setRecord(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function put(data, { path } = {}) {
    setLoading(true);
    try {
      const result = await fetchCommon({
        method: 'PUT',
        path,
        data,
      });
      setRecord(result);
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function del(path) {
    setLoading(true);
    try {
      await fetchCommon({
        method: 'DELETE',
        path,
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    setData,
    record,
    setRecord,
    loading,
    error,
    get: fetchData,
    post,
    put,
    del,
    params,
    setParams,
  };
}
