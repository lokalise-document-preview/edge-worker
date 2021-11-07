import { respondWithError } from './errors';
import optionsController, { allowOrigin } from './controllers/options';
import getLangIsoController from './controllers/get-lang-iso';
import fetchPreviewController from './controllers/fetch-html-preview';

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

    if (url.pathname == '/fetch-preview') {
      return fetchPreviewController(request, headers);
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
