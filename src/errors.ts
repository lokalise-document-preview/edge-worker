export function respondWithError(error: ErrorWithHttpCode | unknown, headers: Headers) {
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


export function throwAnError(apiResponse: Response) {
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

export class ErrorCantReachExternalApi extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ErrorDuringDownloadingPreviewArchive extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ErrorEmptyPreviewArchive extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ErrorEmptyPreviewExtracted extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class ErrorWithHttpCode extends Error {
    readonly code: number;

    constructor(code: number, msg: string) {
        super(msg);
        this.code = code;
    }
}
