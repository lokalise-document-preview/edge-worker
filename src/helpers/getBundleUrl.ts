import { throwAnError, ErrorCantReachExternalApi } from '../errors'

interface PreviewParams {
    apiToken: string | null;
    projectId: string | null;
    filename: string | null;
    fileformat: string | null;
    langIso: string | null;
}

export default async function getBundleUrl(params: PreviewParams): Promise<string> {
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