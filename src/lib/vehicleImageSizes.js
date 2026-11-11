// Approximate the actual card width in each layout, including container caps,
// gutters and the catalog's 350px mobile card limit.
export const CATALOG_IMAGE_SIZES = '(max-width: 381px) calc(100vw - 32px), (max-width: 639px) 350px, (max-width: 767px) calc(50vw - 26px), (max-width: 899px) calc(50vw - 34px), (max-width: 1023px) calc(33.333vw - 32px), (max-width: 1439px) calc(33.333vw - 37px), 443px';

// These views use the responsive Tailwind .container (640/768/1024/1280/1536),
// which overrides the base container cap at larger breakpoints.
export const FAVORITE_IMAGE_SIZES = '(max-width: 639px) calc(100vw - 40px), (max-width: 767px) 284px, (max-width: 1023px) 348px, (max-width: 1279px) 307px, (max-width: 1535px) 392px, 478px';

export const CAROUSEL_IMAGE_SIZES = '(max-width: 479px) calc(85vw + 12px), (max-width: 639px) calc(70vw + 3px), (max-width: 767px) 451px, (max-width: 1023px) 336px, (max-width: 1279px) 285px, (max-width: 1535px) 362px, 439px';

// Detail uses a 1400px container with 24px side padding. At 1024px the
// gallery takes 1.4 of 2.4 columns after the 48px gap; thumbnails share 3 slots.
export const DETAIL_IMAGE_SIZES = '(max-width: 1023px) calc(100vw - 48px), (max-width: 1399px) calc(58.333vw - 56px), 761px';
export const DETAIL_THUMBNAIL_SIZES = '(max-width: 1023px) calc(33.333vw - 24px), (max-width: 1399px) calc(19.444vw - 27px), 246px';

// The full-screen viewer has 32px padding and limits images to 95% of its
// available width. Portrait images can be further constrained by the height.
export const LIGHTBOX_IMAGE_SIZES = 'calc(95vw - 61px)';
