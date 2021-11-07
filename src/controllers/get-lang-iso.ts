import { throwAnError, ErrorCantReachExternalApi } from '../errors'

export default async function getLangIsoController(request: Request, headers: Headers): Promise<Response> {
    const paramsRaw = await request.json();

    const langIso = await getLangIso({
        apiToken: paramsRaw.apiToken ?? '',
        projectId: paramsRaw.projectId ?? '',
        langId: parseInt(paramsRaw.langId) ?? -1,
    });

    return new Response(JSON.stringify({ langIso }), { headers });
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