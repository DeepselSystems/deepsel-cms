import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import useModel from '../../../common/api/useModel.jsx';
import useAuthentication from '../../../common/api/useAuthentication.js';
import OrganizationIdState from '../../../common/stores/OrganizationIdState.js';
import H1 from '../../../common/ui/H1.jsx';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Helmet } from 'react-helmet';
import SitePublicSettingsState from '../../../common/stores/SitePublicSettingsState.js';
import OrganizationState from '../../../common/stores/OrganizationState.js';
import { buildPageUrlWithDomain, buildPagePath } from '../../../utils/domainUtils.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faPlus,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@mantine/core';
import ListViewSearchBar from '../../../common/ui/ListViewSearchBar.jsx';
import LinkedCell from '../../../common/ui/LinkedCell.jsx';
import DataGridColumnMenu from '../../../common/ui/DataGridColumnMenu.jsx';
import ListViewPagination from '../../../common/ui/ListViewPagination.jsx';
import Checkbox from '../../../common/ui/Checkbox.jsx';
import { Link } from 'react-router-dom';
import Button from '../../../common/ui/Button.jsx';
import VisibilityControl from '../../../common/auth/VisibilityControl.jsx';

type PageLocale = {
  iso_code?: string;
  name?: string;
  emoji_flag?: string;
};

type PageContent = {
  id?: number | string;
  locale_id?: number | string;
  locale?: PageLocale;
  title?: string;
  slug?: string;
};

type PageRow = {
  id: number;
  organization_id?: number | string;
  contents?: PageContent[];
  published?: boolean;
};

export default function PageList() {
  const { t } = useTranslation();
  const { user } = useAuthentication();
  const { organizationId } = OrganizationIdState();
  const { settings: siteSettings } = SitePublicSettingsState((state: any) => state);
  const { organizations } = OrganizationState();
  const ButtonAny = Button as any;

  const query = useModel('page', {
    autoFetch: true,
    searchFields: ['contents.title', 'contents.slug'],
    syncPagingParamsWithURL: true,
    orderBy: { field: 'id', direction: 'desc' },
    filters: organizationId
      ? [
          {
            field: 'organization_id',
            operator: '=',
            value: organizationId,
          },
        ]
      : [],
  } as any) as any;

  const {
    data: rawItems,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    orderBy,
    setOrderBy,
    setFilters,
  } = query as any;

  const items = (rawItems ?? []) as PageRow[];
  const [selectedRows, setSelectedRows] = useState<PageRow[]>([]);

  useEffect(() => {
    setFilters(
      organizationId
        ? [
            {
              field: 'organization_id',
              operator: '=',
              value: organizationId,
            },
          ]
        : [],
    );
  }, [organizationId, setFilters]);

  const getContentForCurrentLanguage = (
    contents: PageContent[] | null | undefined,
  ): PageContent | null => {
    if (!contents || contents.length === 0) return null;

    const currentLang = i18n.language;

    const defaultLangId = siteSettings?.default_language_id;
    const defaultLangContent = contents.find((content) => content.locale_id === defaultLangId);

    let selectedContent: PageContent | undefined;

    selectedContent = contents.find((content) => content.locale?.iso_code === currentLang);

    if (!selectedContent && defaultLangContent) {
      selectedContent = defaultLangContent;
    }

    if (!selectedContent) {
      selectedContent = contents.find((content) => content.locale?.iso_code === 'en');
    }

    if (!selectedContent) {
      selectedContent = contents[0];
    }

    return selectedContent;
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: '#',
      width: 80,
      renderCell: (params: any) => <strong>#{params.value}</strong>,
    },
    {
      field: 'contents',
      headerName: t('Title'),
      width: 350,
      valueGetter: (params: any) => {
        const selectedContent = getContentForCurrentLanguage(params.row.contents);
        return selectedContent?.title || '-';
      },
      renderCell: (params: any) => <LinkedCell params={params}>{params.value}</LinkedCell>,
    },
    {
      field: 'slug',
      headerName: t('Slug'),
      width: 250,
      valueGetter: (params: any) => {
        const selectedContent = getContentForCurrentLanguage(params.row.contents);
        if (!selectedContent?.slug) return '-';
        if (!selectedContent?.locale?.iso_code) return '-';
        return buildPagePath(
          selectedContent.slug,
          selectedContent.locale?.iso_code,
          siteSettings?.default_language,
        );
      },
      renderCell: (params: any) => <LinkedCell params={params}>{params.value || '-'}</LinkedCell>,
    },
    {
      field: 'languages',
      headerName: t('Languages'),
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => {
        const contents = params.row.contents || [];
        if (contents.length === 0) return <span>-</span>;

        const sortedContents = [...contents].sort((a, b) => {
          const nameA = a.locale?.name || 'Unknown';
          const nameB = b.locale?.name || 'Unknown';
          return nameA.localeCompare(nameB);
        });

        return (
          <div className="flex gap-1 flex-wrap">
            {sortedContents.map((content, index) => (
              <span
                key={(content.id as any) || index}
                title={content.locale?.name || 'Unknown'}
                className="text-lg"
              >
                {content.locale?.emoji_flag || '🏳️'}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      field: 'published',
      headerName: t('Published'),
      width: 90,
      renderCell: (params: any) => (
        <LinkedCell params={params}>
          <Checkbox checked={Boolean(params.value)} readOnly />
        </LinkedCell>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => {
        const selectedContent = getContentForCurrentLanguage(params.row.contents);
        if (!selectedContent?.slug) return null;
        if (!selectedContent?.locale?.iso_code) return null;

        const pageUrl = buildPageUrlWithDomain(
          params.row,
          selectedContent.slug,
          selectedContent.locale?.iso_code,
          siteSettings?.default_language,
          organizations,
        );

        if (!params.row.published) {
          return null;
        }

        return (
          <div className="flex justify-center">
            <ButtonAny
              component="a"
              href={pageUrl}
              target="_blank"
              variant="subtle"
              size="sm"
              className="p-1 min-w-0 text-gray-600 hover:text-primary-main"
              title={t('Go to page')}
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} className="h-4 w-4" />
            </ButtonAny>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Helmet>
        <title>Pages</title>
      </Helmet>
      <main className="h-[calc(100vh-50px-32px-20px)] flex flex-col m-auto px-[12px] sm:px-[24px]">
        <div className="flex w-full justify-between gap-2 my-3">
          <H1 className="text-[32px] font-bold text-primary">{t('Pages')}</H1>
          <VisibilityControl
            roleIds={[
              'super_admin_role',
              'admin_role',
              'website_admin_role',
              'website_editor_role',
            ]}
            render={false}
          >
            <Link to={`/pages/create`}>
              <ButtonAny
                className={`shadow bg-primary-main text-primary-contrastText`}
                color={`primary`}
              >
                <FontAwesomeIcon icon={faPlus} className="sm:mr-1 h-4 w-4" />
                {t('')}
                <span className={`hidden sm:inline`}>{t('Create Page')}</span>
              </ButtonAny>
            </Link>
          </VisibilityControl>
        </div>

        <ListViewSearchBar
          query={query}
          columns={columns}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          allowDelete={
            user.roles.find((role: any) =>
              [
                'admin_role',
                'super_admin_role',
                'website_admin_role',
                'website_editor_role',
              ].includes(role.string_id),
            ) || false
          }
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
          onPageChange={(newPage: number) => setPage(newPage + 1)}
          rowsPerPageOptions={[20, 30, 50, 100]}
          disableSelectionOnClick
          checkboxSelection
          className={`!border-0 `}
          sortModel={
            orderBy
              ? [
                  {
                    field: orderBy.field,
                    sort: orderBy.direction?.toLowerCase(),
                  },
                ]
              : []
          }
          onSortModelChange={(model: any) => {
            if (model.length > 0) {
              setOrderBy({
                field: model[0].field,
                direction: model[0].sort.toLowerCase(),
              });
            } else {
              setOrderBy(null);
            }
          }}
          onSelectionModelChange={(ids: any) => {
            setSelectedRows(items.filter((item) => (ids || []).includes(item.id)));
          }}
          components={{
            ColumnMenu: DataGridColumnMenu,
            Footer: () => null,
          }}
          componentsProps={{ columnMenu: { query } } as any}
          localeText={{ noRowsLabel: t('Nothing here yet.') }}
        />

        <ListViewPagination query={query} />
      </main>
    </>
  );
}
