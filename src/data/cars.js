const chevroletTrackerPremierImagesGlob = import.meta.glob('../assets/cars/chevrolet-tracker-premier/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const chevroletTrackerPremierImages = Object.values(chevroletTrackerPremierImagesGlob);
const fiatCronosImagesGlob = import.meta.glob('../assets/cars/fiat-cronos/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fiatCronosImages = Object.values(fiatCronosImagesGlob);
const volkswagenNivusImagesGlob = import.meta.glob('../assets/cars/volkswagen-nivus/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const volkswagenNivusImages = Object.values(volkswagenNivusImagesGlob);
const peguetoAllureImagesGlob = import.meta.glob('../assets/cars/pegueto-allure-/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const peguetoAllureImages = Object.values(peguetoAllureImagesGlob);
const volkswagenAmarokV6HighlineImagesGlob = import.meta.glob('../assets/cars/volkswagen-amarok-v6-highline/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const volkswagenAmarokV6HighlineImages = Object.values(volkswagenAmarokV6HighlineImagesGlob);
const fordTerritoryTitaniumImagesGlob = import.meta.glob('../assets/cars/ford-territory-titanium/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fordTerritoryTitaniumImages = Object.values(fordTerritoryTitaniumImagesGlob);
const fordMaverickLariatImagesGlob = import.meta.glob('../assets/cars/ford-maverick-lariat/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fordMaverickLariatImages = Object.values(fordMaverickLariatImagesGlob);
const fordEcoSportTitaniumImagesGlob = import.meta.glob('../assets/cars/ford-ecosport-titanium/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fordEcoSportTitaniumImages = Object.values(fordEcoSportTitaniumImagesGlob);
const toyotaHiluxGRImagesGlob = import.meta.glob('../assets/cars/toyota-hilux-gr/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const toyotaHiluxGRImages = Object.values(toyotaHiluxGRImagesGlob);
const testOrderImagesGlob = import.meta.glob('../assets/cars/test-order/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const testOrderImages = Object.values(testOrderImagesGlob);
const toyotaHiluxGRsImagesGlob = import.meta.glob('../assets/cars/toyota-hilux-grs/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const toyotaHiluxGRsImages = Object.values(toyotaHiluxGRsImagesGlob);
const toyotaCorollaGRsImagesGlob = import.meta.glob('../assets/cars/toyota-corolla-grs/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const toyotaCorollaGRsImages = Object.values(toyotaCorollaGRsImagesGlob);
const fiatArgoDriveImagesGlob = import.meta.glob('../assets/cars/fiat-argo-drive/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fiatArgoDriveImages = Object.values(fiatArgoDriveImagesGlob);
const fiatArgoImagesGlob = import.meta.glob('../assets/cars/fiat-argo/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fiatArgoImages = Object.values(fiatArgoImagesGlob);


const testautoAutomated3000ImagesGlob = import.meta.glob('../assets/cars/testauto-automated-3000/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const testautoAutomated3000Images = Object.values(testautoAutomated3000ImagesGlob);

const corollaImagesGlob = import.meta.glob('../assets/cars/corolla-gr/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const corollaImages = Object.values(corollaImagesGlob);

const hiluxImagesGlob = import.meta.glob('../assets/cars/hilux-grs/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const hiluxImages = Object.values(hiluxImagesGlob);

export const carsData = [
    {
        id: 1769445032087,
        brand: 'Chevrolet',
        name: 'Tracker Premier',
        year: 2025,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 39500000,
        currency: '$',
        featured: false,
        image: chevroletTrackerPremierImages[0],
        images: chevroletTrackerPremierImages
    },
    {
        id: 1769444893319,
        brand: 'Fiat',
        name: 'Cronos',
        year: 2024,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 27800000,
        currency: '$',
        featured: false,
        image: fiatCronosImages[0],
        images: fiatCronosImages
    },
    {
        id: 1769444719224,
        brand: 'Volkswagen',
        name: 'Nivus',
        year: 2025,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 37000000,
        currency: '$',
        featured: false,
        image: volkswagenNivusImages[0],
        images: volkswagenNivusImages
    },
    {
        id: 1769444571641,
        brand: 'Pegueto',
        name: 'Allure ',
        year: 2024,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 29800000,
        currency: '$',
        featured: false,
        image: peguetoAllureImages[0],
        images: peguetoAllureImages
    },
    {
        id: 1769444435437,
        brand: 'Volkswagen',
        name: 'Amarok V6 Highline',
        year: 2024,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 0,
        currency: '$',
        featured: false,
        image: volkswagenAmarokV6HighlineImages[0],
        images: volkswagenAmarokV6HighlineImages
    },
    {
        id: 1769444204298,
        brand: 'Ford ',
        name: 'Territory Titanium',
        year: 2022,
        km: 16000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 45000000,
        currency: '$',
        featured: false,
        image: fordTerritoryTitaniumImages[0],
        images: fordTerritoryTitaniumImages
    },
    {
        id: 1769444033550,
        brand: 'Ford',
        name: 'Maverick Lariat',
        year: 2024,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 55000000,
        currency: '$',
        featured: false,
        image: fordMaverickLariatImages[0],
        images: fordMaverickLariatImages
    },
    {
        id: 1769443560391,
        brand: 'Ford ',
        name: 'EcoSport Titanium',
        year: 2018,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 24000000,
        currency: '$',
        featured: false,
        image: fordEcoSportTitaniumImages[0],
        images: fordEcoSportTitaniumImages
    },
    {
        id: 1769119363596,
        brand: 'Fiat',
        name: 'Argo',
        year: 2025,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 27000000,
        currency: '$',
        featured: false,
        image: fiatArgoImages[0],
        images: fiatArgoImages
    },
    {
        id: 1769119270036,
        brand: 'Toyota',
        name: 'Hilux GR',
        year: 2026,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 75000000,
        currency: '$',
        featured: false,
        image: toyotaHiluxGRImages[0],
        images: toyotaHiluxGRImages
    },





    {
        id: 1769116190117,
        brand: 'Toyota',
        name: 'Corolla GRs',
        year: 2026,
        km: 0,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 56800000,
        currency: '$',
        featured: false,
        image: toyotaCorollaGRsImages[0],
        images: toyotaCorollaGRsImages
    },















];
