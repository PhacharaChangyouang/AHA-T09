// Transitional entry alias: keep old cached /about -> / redirects from looping.
// /about is the canonical public landing. Never render an auth dashboard here.
export { default, metadata } from './about/page';
