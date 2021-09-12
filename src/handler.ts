import { unzipSync } from 'fflate';

const allowOrigin = 'https://app.lokalise.com';

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method == 'OPTIONS') {
    // Handle CORS preflight requests
    return handleOptions(request);
  }

  const url = new URL(request.url);

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Content-type', 'application/json');
  
  try {
    if (url.pathname == '/get-lang-iso') {
      const payload = await processGetLangIsoCall(request);
      return new Response(JSON.stringify(payload), {headers});
    }

    if (url.pathname == '/fetch-preview') {
      const previewData = await processFetchPreviewCall(request);
      if (previewData.contentType) {
        headers.set('Content-type', previewData.contentType);
      }
      return new Response(previewData.previewBuffer, {headers});
    }
  } catch(error) {
    return respondWithError(error, headers);
  }

  return new Response(null, {
    status: 404,
    statusText: 'Path not found in the worker.',
    headers
  });
}

async function processGetLangIsoCall (request: Request) {
  const paramsRaw = await request.json();

  const langIso = await getLangIso({
    apiToken: paramsRaw.apiToken ?? '',
    projectId: paramsRaw.projectId ?? '',
    langId: parseInt(paramsRaw.langId) ?? -1,
  });

  return {langIso};
}

async function processFetchPreviewCall(request: Request) {
  const params = await request.json();

  const bundleUrl = await getBundleUrl({
    apiToken: params.apiToken,
    projectId: params.projectId,
    filename: params.filename,
    fileformat: params.fileformat,
    langIso: params.langIso,
  });

  const unpacked =  await extractFileFromBundle(bundleUrl);

  return {
    previewBuffer: unpacked.buffer,
    contentType: params.fileformat == 'html' ? 'text/html' : ''
  };
}

interface LangIsoParams {
  apiToken: string;
  projectId: string;
  langId: number;
}

async function getLangIso(params: LangIsoParams) {
  const requestURL = `https://api.lokalise.com/api2/projects/${params.projectId}/languages/${params.langId}`;

  const requestHeaders: HeadersInit = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('x-api-token', params.apiToken ?? '');

  let response: Response;
  try {
    response = await fetch(requestURL, {
      method: 'GET',
      headers: requestHeaders
    });
  } catch (error) {
    throw new ErrorCantReachExternalApi('');
  }

  if (response.ok == false) {
    throwAnError(response); 
  }

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

  let response: Response;
  try {
    response = await fetch(requestURL, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    throw new ErrorCantReachExternalApi('');
  }

  if (response.ok == false) {
    throwAnError(response); 
  }

  const payload = await response.json();
  return payload.bundle_url;
}

async function extractFileFromBundle(url: string): Promise<Uint8Array> {
  let archive: Uint8Array;
  try {
    const body = await fetch(url).then(res => res.arrayBuffer());
    archive = new Uint8Array(body);
  } catch (error) {
    throw new ErrorDuringDownloadingPreviewArchive('');
  }

  if (!archive.length) {
    throw new ErrorEmptyPreviewArchive('');
  }
  
  return new Promise(resolve => {
    const unzipped = unzipSync(archive, {filter: file => file.size > 0});
    const filepath = Object.keys(unzipped)[0];
    if (Boolean(filepath) && Boolean(unzipped[filepath])) {
      resolve(unzipped[filepath]);
    } else {
      throw new ErrorEmptyPreviewExtracted('');
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

function respondWithError(error: ErrorWithHttpCode | unknown, headers: Headers) {
  headers.set('Content-type', 'application/json');

  let response: Response;
  if (error instanceof ErrorWithHttpCode) {
    response = new Response(null, {
      status: error.code,
      statusText: error.message,
      headers
    });
  } else if (error instanceof ErrorCantReachExternalApi) {
    response = new Response(null, {
      status: 502,
      statusText: 'Can\'t reach Lokalise API from the worker.',
      headers
    });
  } else if (error instanceof ErrorDuringDownloadingPreviewArchive || error instanceof ErrorEmptyPreviewArchive) {
    response = new Response(null, {
      status: 502,
      statusText: 'Can\'t reach the preview download from the worker.',
      headers
    });
  } else if (error instanceof ErrorEmptyPreviewExtracted) {
    response = new Response(null, {
      status: 500,
      statusText: 'Can\'t extract preview from the downloaded preview archive.',
      headers
    });
  } else {
    response = new Response(null, {
      status: 500,
      statusText: 'Error in the worker during processing the request.',
      headers
    });
  }

  return response;
}

class ErrorCantReachExternalApi extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

class ErrorDuringDownloadingPreviewArchive extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

class ErrorEmptyPreviewArchive extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

class ErrorEmptyPreviewExtracted extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

class ErrorWithHttpCode extends Error {
  readonly code: number;

  constructor(code: number, msg: string) {
    super(msg);
    this.code = code;
  }
}

function throwAnError(apiResponse: Response) {
  let code: number;
  let msg: string;

  switch (apiResponse.status) {
    case 400:
      code = 400;
      msg = 'Some required parameter is incorrect or missing required parameter.';
      break;
    case 401:
      code = 401;
      msg = 'API token is invalid.';
      break;
    case 403:
      code = 403;
      msg = 'Authenticated user does not have necessary permissions.';
      break;
    case 404:
      code = 404;
      msg = 'The requested resource does not exist.';
      break;
    case 429:
      code = 429;
      msg = 'Too many requests hit the Lokalise API too quickly.';
      break;
    default:
      code = 502;
      msg = `Error code ${apiResponse.status} was returned from Lokalise API.`;
  }

  throw new ErrorWithHttpCode(code, msg);
}
