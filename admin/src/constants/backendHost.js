const DEFAULT_DEV_BACKEND = 'https://democms-api-dev.deepsel.com';
const DEFAULT_PROD_BACKEND = 'https://democms-api-dev.deepsel.com';

const getInitialBackendHost = () => {
  // Check if window is defined (client-side) before accessing it
  const windowPublicBackend =
    typeof window !== 'undefined' ? window.PUBLIC_BACKEND : undefined;
  const configuredBackend =
    import.meta.env.PUBLIC_BACKEND || windowPublicBackend;
  if (configuredBackend) return configuredBackend;
  return import.meta.env.DEV ? DEFAULT_DEV_BACKEND : DEFAULT_PROD_BACKEND;
};

const checkBackendHealth = async (url) => {
  try {
    const response = await fetch(`${url}/util/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.log('Backend health check failed:', url);
    return false;
  }
};

const getPullRequestBackendHost = async () => {
  const deployBranch = import.meta.env.VITE_NETLIFY_BRANCH;
  const deployPullRequest = import.meta.env.VITE_NETLIFY_PULL_REQUEST;

  if (deployPullRequest !== 'true') return null;

  const backendSubdomain = deployBranch.replace('/', '-').toLowerCase();
  const prBackendHost = `https://${backendSubdomain}.deepsel.com`;

  const isHealthy = await checkBackendHealth(prBackendHost);
  return isHealthy ? prBackendHost : null;
};

let backendHost = getInitialBackendHost();

// Initialize PR backend host if applicable
getPullRequestBackendHost().then((prHost) => {
  if (prHost) {
    backendHost = prHost;
  }
});

export default backendHost;
