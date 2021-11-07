import { unzipSync } from 'fflate';
import { throwAnError, ErrorCantReachExternalApi, ErrorDuringDownloadingPreviewArchive, ErrorEmptyPreviewArchive, ErrorEmptyPreviewExtracted } from '../errors'

export default async function fetchPreviewController(request: Request, headers: Headers): Promise<Response> {
    const params = await request.json();

    const bundleUrl = await getBundleUrl({
        apiToken: params.apiToken,
        projectId: params.projectId,
        filename: params.filename,
        fileformat: params.fileformat,
        langIso: params.langIso,
    });

    const unpacked = await extractFileFromBundle(bundleUrl);

    headers.set('Content-type', params.fileformat == 'html' ? 'text/html' : '');
    return new Response(unpacked.buffer, { headers });
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
        const unzipped = unzipSync(archive, { filter: file => file.size > 0 });
        const filepath = Object.keys(unzipped)[0];
        if (Boolean(filepath) && Boolean(unzipped[filepath])) {
            resolve(unzipped[filepath]);
        } else {
            throw new ErrorEmptyPreviewExtracted('');
        }
    });
}
