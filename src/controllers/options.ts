export const allowOrigin = 'https://app.lokalise.com';

export default function optionsController(request: Request): Response {
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
