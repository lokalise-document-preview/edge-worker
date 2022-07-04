import { throwAnError, ErrorCantReachExternalApi } from '../errors'

export default async function fetchProjectComments(request: Request, headers: Headers): Promise<Response> {
    const paramsRaw = await request.json();
    const params = {
        apiToken: paramsRaw.apiToken ?? '',
        projectId: paramsRaw.projectId ?? ''
    };

    const comments = await getProjectComments(params);
    const keys = [...new Set(comments.map(comment => comment.key_id, comments))];
    const keys_data: any = {};
    const keys_request_page = 300;

    for (let index = 0; index < keys.length; index =+ keys_request_page) {
        const keys_page = await getProjectKeys(params, keys.slice(index, 300 - 1));
        keys_page.forEach((key: any) => {keys_data[key.key_id] = key})
    }

    const comments_indexed: any = {};
    comments.forEach(comment => {
        if (!comments_indexed.hasOwnProperty(comment.key_id)) {
            const current_key_data = keys_data[comment.key_id] ?? {};
            comments_indexed[comment.key_id] = {
                data: {
                    key_name: current_key_data.key_name,
                    filenames: current_key_data.filenames
                },
                comments: []
            };
        }

        comments_indexed[comment.key_id].comments.push(comment)
    });

    return new Response(JSON.stringify(comments_indexed), { headers });
}

interface ProjectCommentsParams {
    apiToken: string;
    projectId: string;
}

async function getProjectComments(params: ProjectCommentsParams) : Promise<any[]> {
    const requestURL = `https://api.lokalise.com/api2/projects/${params.projectId}/comments?limit=5000`;

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
    return payload.comments;
}

async function getProjectKeys(params: ProjectCommentsParams, keys: number[]) {
    const requestURL = `https://api.lokalise.com/api2/projects/${params.projectId}/keys?disable_references=1&filter_key_ids=${keys.join(',')}&limit=5000`;

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
    return payload.keys;
}
