const nativeFetch = globalThis.fetch.bind(globalThis);

export const fetch = nativeFetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;

export default nativeFetch;
