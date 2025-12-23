import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faPalette,
  faCheck,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import { Alert, Card, Badge, SimpleGrid, Loader } from '@mantine/core';
import H1 from '../../../common/ui/H1.jsx';
import Button from '../../../common/ui/Button.jsx';
import BackendHostURLState from '../../../common/stores/BackendHostURLState.js';
import useAuthentication from '../../../common/api/useAuthentication.js';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import NotificationState from '../../../common/stores/NotificationState.js';
import { fetchPublicSettings } from '../../../utils/pageUtils.js';

export default function ThemeList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { backendHost } = BackendHostURLState();
  const { user } = useAuthentication();
  const { settings: siteSettings, setSettings } = SitePublicSettingsState();
  const { notify } = NotificationState((state) => state);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingTheme, setSelectingTheme] = useState(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backendHost}/theme/list`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch themes: ${response.statusText}`);
      }

      const data = await response.json();
      setThemes(data);
    } catch (err) {
      console.error('Error fetching themes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTheme = async (folderName) => {
    try {
      setSelectingTheme(folderName);

      const response = await fetch(`${backendHost}/theme/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ folder_name: folderName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to select theme');
      }

      const data = await response.json();

      // Refresh site settings to get updated selected_theme
      const updatedSettings = await fetchPublicSettings();
      if (updatedSettings) {
        setSettings(updatedSettings);
      }

      notify({
        message: data.message || t('Theme selected successfully'),
        type: 'success',
      });
    } catch (err) {
      console.error('Error selecting theme:', err);
      notify({
        message: err.message,
        type: 'error',
      });
    } finally {
      setSelectingTheme(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Themes</title>
      </Helmet>
      <main className="h-[calc(100vh-50px-32px-20px)] flex flex-col m-auto px-[12px] sm:px-[24px]">
        <div className="flex w-full justify-between gap-2 my-3">
          <H1 className="text-[32px] font-bold text-primary">{t('Themes')}</H1>
        </div>

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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader size="lg" />
          </div>
        ) : themes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FontAwesomeIcon icon={faPalette} className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">{t('No themes found')}</p>
          </div>
        ) : (
          <SimpleGrid
            cols={3}
            spacing="lg"
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'sm', cols: 1 },
            ]}
          >
            {themes.map((theme) => {
              const isSelected = siteSettings?.selected_theme === theme.folder_name;
              const isSelecting = selectingTheme === theme.folder_name;

              return (
                <Card
                  key={theme.folder_name}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  className={`hover:shadow-md transition-shadow ${isSelected ? 'border-green-500 border-2' : ''}`}
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{theme.name}</h3>
                      <div className="flex gap-2 items-center">
                        <Badge color="blue" variant="light" size="sm">
                          v{theme.version}
                        </Badge>
                        {isSelected && (
                          <Badge color="green" variant="filled" size="sm">
                            <FontAwesomeIcon icon={faCheck} className="mr-1" />
                            {t('Selected')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2">
                      {isSelected && (
                        <Button
                          onClick={() => navigate(`/themes/edit/${theme.folder_name}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-2" />
                          {t('Edit')}
                        </Button>
                      )}
                      {!isSelected && (
                        <Button
                          onClick={() => handleSelectTheme(theme.folder_name)}
                          disabled={isSelecting}
                          loading={isSelecting}
                          className="flex-1 bg-primary-main text-primary-contrastText"
                          color="primary"
                        >
                          {t('Select Theme')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </main>
    </>
  );
}
