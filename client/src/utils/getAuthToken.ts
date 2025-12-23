interface AstroGlobal {
  request: Request;
  url: URL;
}

export default function getAuthToken(Astro: AstroGlobal): string | null {
  let authToken: string | null = null;

  const cookies = Astro.request.headers.get('cookie');
  if (cookies) {
    const tokenMatch = cookies.match(/(?:token|authToken|access_token|jwt)=([^;]+)/);
    authToken = tokenMatch ? tokenMatch[1] : null;
  }

  if (!authToken) {
    authToken = Astro.url.searchParams.get('token');
  }

  return authToken;
}
