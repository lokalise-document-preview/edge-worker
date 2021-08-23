import { unzipSync } from 'fflate';

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname == '/fetch-preview') {
    const params = await request.json();

    const bundleUrl = await getBundleUrl({
      apiToken: params.apiToken,
      projectId: params.projectId,
      filename: params.filename,
      fileformat: params.fileformat,
      langIso: params.langIso,
    })

    const unpacked =  await extractFileFromBundle(bundleUrl)

    const headers = new Headers();
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