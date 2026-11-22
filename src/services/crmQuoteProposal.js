import Quote from '../models/Quote.js';
import Car from '../models/Car.js';

const amount = value => {
    if (typeof value!=='number' || !Number.isFinite(value) || value<0 || value>1e12) return null;
    return Math.round(value*100)/100;
};
const currencies = new Map([['ARS','ARS'],['$','ARS'],['USD','USD'],['U$S','USD'],['US$','USD']]);
const currencyOf = value => currencies.get(value) ?? null;
const quoteFields = 'quoteNumber vehicleId price currency status validUntil tradeIn.value tradeIn.currency';
const companyStockFields = 'purchasePrice purchaseCurrency agencyOwned jointOwnership.hasPartner investor.percentage purchasePaymentState.isSharedInvestment';

export function quoteProposal(quote, car) {
    const currency = currencyOf(quote.currency);
    const price = amount(quote.price) || null;
    const tradeValue = amount(quote.tradeIn?.value ?? 0);
    const tradeCurrency = tradeValue===0 ? currency : currencyOf(quote.tradeIn?.currency);
    const matchingTrade = currency && tradeValue!==null && tradeCurrency===currency && price!==null && tradeValue<=price;
    const ownStock = car?.agencyOwned===true && !car.jointOwnership?.hasPartner && !car.purchasePaymentState?.isSharedInvestment &&
        !(car.investor?.percentage>0);
    const cost = ownStock && currency && currencyOf(car.purchaseCurrency)===currency ? amount(car.purchasePrice) || null : null;
    return {currency,price,tradeValue,tradeCurrency,status:quote.status,validUntil:quote.validUntil ?? null,
        remaining:matchingTrade ? amount(price-tradeValue) : null,
        recordedOwnCost:cost,marginBeforeExpenses:price!==null && cost!==null ? Math.round((price-cost)*100)/100 : null};
}

export async function listProposalQuotes() {
    const quotes = await Quote.find({status:{$in:['pendiente','enviada','en_revision','aprobada','modificada']}})
        .select('quoteNumber price currency status').sort({updatedAt:-1,_id:-1}).limit(30).lean();
    return quotes.map(({_id,quoteNumber,price,currency,status})=>({id:String(_id),quoteNumber,price:amount(price),currency:currencyOf(currency),status}));
}

export async function loadQuoteProposal(id) {
    const quote = await Quote.findById(id).select(quoteFields).lean();
    if (!quote) return null;
    const car = quote.vehicleId ? await Car.findById(quote.vehicleId).select(companyStockFields).lean() : null;
    return {...quoteProposal(quote,car),quoteNumber:quote.quoteNumber};
}
