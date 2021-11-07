import { unzipSync } from 'fflate';
import { ErrorDuringDownloadingPreviewArchive, ErrorEmptyPreviewArchive, ErrorEmptyPreviewExtracted } from '../errors'
import getBundleUrl from '../helpers/getBundleUrl';

export default async function fetchPreviewHtmlController(request: Request, headers: Headers): Promise<Response> {
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
