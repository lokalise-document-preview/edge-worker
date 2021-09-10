import { unzipSync } from 'fflate';

const allowOrigin = 'https://app.lokalise.com';
// 401 Wrong token
// 403 No access rights to download
// 404 Project or lang does not exist
// 502 Can't access Lokalise API
// 500 Error during preparing a preview or another exception in a handler

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method == 'OPTIONS') {
    // Handle CORS preflight requests
    return handleOptions(request);
  }

  const url = new URL(request.url);

  if (url.pathname == '/get-lang-iso') {
    const params = await request.json();

    const langIso = await getLangIso({
      apiToken: params.apiToken,
      projectId: params.projectId,
      langId: params.langId,
    })

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Content-type', 'application/json');

    return new Response(JSON.stringify({langIso}), {headers});
  }

  if (url.pathname == '/fetch-preview') {
    const params = await request.json();

    const bundleUrl = await getBundleUrl({
      apiToken: params.apiToken,
      projectId: params.projectId,
      filename: params.filename,
      fileformat: params.fileformat,
      langIso: params.langIso,
    });

    const unpacked =  await extractFileFromBundle(bundleUrl);

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    if (params.fileformat == 'html') {
      headers.set('Content-type', 'text/html');
    }

    return new Response(unpacked.buffer, {headers});
  }

  return new Response(`
    url: ${request.url}
    request method: ${request.method}
  `);
}

interface LangIsoParams {
  apiToken: string | null;
  projectId: string | null;
  langId: string | null;
}

async function getLangIso(params: LangIsoParams) {
  const requestURL = `https://api.lokalise.com/api2/projects/${params.projectId}/languages/${params.langId}`;

  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('x-api-token', params.apiToken ?? '');

  const response = await fetch(requestURL, {
      method: 'GET',
      headers: requestHeaders
  });

  const payload = await response.json();
  return payload.language?.lang_iso;
}

interface PreviewParams {
  apiToken: string | null;
  projectId: string | null;
  filename: string | null;
  fileformat: string | null;
  langIso: string | null;
}

async function getBundleUrl(params: PreviewParams): Promise<string> {
  const requestURL = `https://api.lokalise.com/api2/projects/${params.projectId}/files/download`;

  const requestBody = {
    format: params.fileformat,
    filter_filenames: [params.filename],
    filter_langs: [params.langIso],
    export_empty_as: 'base'
  };

  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('x-api-token', params.apiToken ?? '');

  const response = await fetch(requestURL, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
  });
  const payload = await response.json();
  return payload.bundle_url;
}

async function extractFileFromBundle(url: string): Promise<Uint8Array> {
  const body = await fetch(url).then(res => res.arrayBuffer());
  const archive = new Uint8Array(body);

  return new Promise(resolve => {
    if (archive) {
      const unzipped = unzipSync(archive, {filter: file => file.size > 0});
      const filepath = Object.keys(unzipped)[0];
      resolve(unzipped[filepath]);
    } else {
      resolve(new Uint8Array());
    }
  });
}

function handleOptions(request: Request): Response {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const reqHeaders = request.headers;
  if (
    reqHeaders.get('Origin') !== null &&
    reqHeaders.get('Access-Control-Request-Method') !== null &&
    reqHeaders.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    headers.set('Access-Control-Max-Age', '86400');

    // Allow all future content Request headers to go back to browser
    // such as Authorization (Bearer) or X-Client-Name-Version
    headers.set('Access-Control-Allow-Headers', reqHeaders.get('Access-Control-Request-Headers') ?? '');

    return new Response(null, { headers });
  }
  else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    })
  }
}