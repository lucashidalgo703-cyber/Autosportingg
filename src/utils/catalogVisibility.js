// Catalogue visibility and its stable default order are shared by public reads
// and the seller's ordering screen. Manual sorting in Catalog remains optional.
export const publicCatalogQuery = () => ({
    visibleEnWeb: { $ne: false },
    sold: { $ne: true },
    status: { $nin: [/^vendido$/i, /^reservado$/i, /^pausado$/i, /^cancelado$/i, /^anulado$/i, /^eliminado$/i] }
});
export const PUBLIC_CATALOG_SORT = { order: 1, createdAt: -1, _id: 1 };
