import getBundleUrl from '../helpers/getBundleUrl';
import { throwAnError, ErrorCantReachExternalApi } from '../errors'

export default async function fetchPreviewDocxController(request: Request, headers: Headers): Promise<Response> {
    const params = await request.json();

    const bundleUrl = await getBundleUrl({
        apiToken: params.apiToken,
        projectId: params.projectId,
        filename: params.filename,
        fileformat: params.fileformat,
        langIso: params.langIso,
    });

    const pdf = await getPdfFromZippedDocx(bundleUrl);

    headers.set('Content-type', params.fileformat == 'docx' ? 'application/pdf' : '');
    return new Response(pdf.body, { headers });
}

async function getPdfFromZippedDocx(bundleUrl: string) {
    const requestURL = `https://docx-to-pdf-convert-with-libreoffice.fly.dev/convert-zip-from-url`;

    const requestBody = {
        url: bundleUrl
    };

    const requestHeaders: HeadersInit = new Headers();
    requestHeaders.set('Content-Type', 'application/json');

    let response: Response;
    try {
        return fetch(requestURL, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
        });
    } catch (error) {
        throw new ErrorCantReachExternalApi('');
    }
}
