import { respondWithError } from './errors';
import optionsController, { allowOrigin } from './controllers/options';
import getLangIsoController from './controllers/get-lang-iso';
import fetchPreviewHtmlController from './controllers/fetch-preview-html';
import fetchPreviewDocxController from './controllers/fetch-preview-docx';
import fetchProjectComments from './controllers/fetch-project-comments';

export async function routeRequest(request: Request): Promise<Response> {
  if (request.method == 'OPTIONS') {
    // Handle CORS preflight requests
    return optionsController(request);
  }

  const url = new URL(request.url);

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Content-type', 'application/json');

  try {
    if (url.pathname == '/get-lang-iso') {
      return getLangIsoController(request, headers);
    }

    // Deprecated, will be removed after the browser extension new version release
    if (url.pathname == '/fetch-preview') {
      return fetchPreviewHtmlController(request, headers);
    }

    if (url.pathname == '/fetch-preview-html') {
      return fetchPreviewHtmlController(request, headers);
    }

    if (url.pathname == '/fetch-preview-docx') {
      return fetchPreviewDocxController(request, headers);
    }

    if (url.pathname == '/fetch-project-comments') {
      return fetchProjectComments(request, headers);
    }
  } catch (error) {
    return respondWithError(error, headers);
  }

  return new Response(null, {
    status: 404,
    statusText: 'Path not found in the worker.',
    headers
  });
}
