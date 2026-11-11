// Approximate the actual card width in each layout, including container caps,
// gutters and the catalog's 350px mobile card limit.
export const CATALOG_IMAGE_SIZES = '(max-width: 381px) calc(100vw - 32px), (max-width: 639px) 350px, (max-width: 767px) calc(50vw - 26px), (max-width: 899px) calc(50vw - 34px), (max-width: 1023px) calc(33.333vw - 32px), (max-width: 1439px) calc(33.333vw - 37px), 443px';

// These views use the responsive Tailwind .container (640/768/1024/1280/1536),
// which overrides the base container cap at larger breakpoints.
export const FAVORITE_IMAGE_SIZES = '(max-width: 639px) calc(100vw - 40px), (max-width: 767px) 284px, (max-width: 1023px) 348px, (max-width: 1279px) 307px, (max-width: 1535px) 392px, 478px';

export const CAROUSEL_IMAGE_SIZES = '(max-width: 479px) calc(85vw + 12px), (max-width: 639px) calc(70vw + 3px), (max-width: 767px) 451px, (max-width: 1023px) 336px, (max-width: 1279px) 285px, (max-width: 1535px) 362px, 439px';
