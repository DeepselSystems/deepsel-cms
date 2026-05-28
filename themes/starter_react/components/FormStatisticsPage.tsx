import { MantineProvider, Text } from "@mantine/core";
import { WebsiteDataProvider, FormFieldsStatistics } from "@deepsel/cms-react";
import { WebsiteDataTypes, type FormStatisticsData } from "@deepsel/cms-utils";
import Menu from "./Menu";
import Footer from "./Footer";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";

/**
 * Public form statistics page for starter_react theme.
 * Renders title, description, overview cards, then delegates per-field charts to FormStatistics.
 */
export default function FormStatisticsPage({ data }: { data: FormStatisticsData }) {
  if (!data || data.notFound) {
    return (
      <MantineProvider>
        <main className="min-h-screen flex flex-col items-center justify-center text-center gap-4">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-gray-500">Statistics not available for this form.</p>
          <a href="/" className="text-blue-600 underline">Go home</a>
        </main>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.FormStatistics, data }}>
        <main className="min-h-screen flex flex-col">
          <header className="shadow px-3 backdrop-blur bg-white/90">
            <div className="flex justify-between items-center gap-6 max-w-[1200px] mx-auto">
              <a href="/" className="flex items-center gap-2 text-2xl font-bold no-underline text-black">
                My Website
              </a>
              <div className="flex items-center gap-6">
                <Menu />
                <SearchForm />
                <LangSwitcher />
              </div>
            </div>
          </header>

          <div className="grow container px-3 xl:px-6 mx-auto max-w-xl xl:max-w-2xl 2xl:max-w-3xl space-y-6 py-10 xl:py-20">
            {/* Page header */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Form Statistics</h1>
              <p className="text-sm text-gray-500">View detailed statistics and analytics for form submissions</p>
            </div>

            <hr className="border-gray-200" />

            {/* Form title + description */}
            <div className="space-y-2 text-center pt-4">
              <h2 className="text-xl font-bold break-words">{data.title}</h2>
              {data.description && (
                <p className="text-sm text-gray-500">{data.description}</p>
              )}
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-center">
                <p className="font-bold text-gray-500 text-sm">Number of views</p>
                <Text size="xl" fw={700}>{data.views_count ?? 0}</Text>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-center">
                <p className="font-bold text-gray-500 text-sm">Number of submissions</p>
                <Text size="xl" fw={700}>{data.submissions_count ?? 0}</Text>
              </div>
            </div>

            {/* Per-field charts from shared package */}
            <FormFieldsStatistics fields={data.fields} submissions={data.submissions} />
          </div>

          <Footer />
        </main>
      </WebsiteDataProvider>
    </MantineProvider>
  );
}
