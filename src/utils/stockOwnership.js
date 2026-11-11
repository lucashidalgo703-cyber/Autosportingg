export function stockIsAgencyOwned(car) {
 return car?.agencyOwned===true||Boolean(car?.tradeInOrigin?.saleId&&car.tradeInOrigin.consigned!==true&&car.tradeInOrigin.agencyOwned!==false);
}
// Keep the same ownership decision for inventory, capital and investor shares.
export function stockCapitalOwnership(car) {
 const owned=stockIsAgencyOwned(car);
 const percentage=Number(car?.investor?.percentage);
 const isShared=car?.tradeInOrigin?.consigned!==true&&Number.isFinite(percentage)&&percentage>0;
 const isConsignment=!owned&&!isShared&&Boolean(String(car?.consignedBy||car?.ownerName||'').trim()||car?.tradeInOrigin?.consigned===true);
 const isThirdParty=!owned&&!isConsignment&&!isShared;
 const invPct=isShared?Math.min(100,Math.max(0,percentage)):0;
 return {isConsignment,isThirdParty,isShared,invPct,ownPct:isConsignment||isThirdParty?0:100-invPct};
}
export function stockOwnedQuery() {
 return {$or:[{agencyOwned:true},{$and:[{'tradeInOrigin.saleId':{$ne:null}},{'tradeInOrigin.consigned':{$ne:true}},{'tradeInOrigin.agencyOwned':{$ne:false}}]}]};
}
