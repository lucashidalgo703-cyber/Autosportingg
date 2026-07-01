export const stockDemoData = [
  {
    id: "V-001",
    marca: "Toyota",
    modelo: "Hilux",
    version: "2.8 SRV 4x4",
    año: 2021,
    kilometraje: 45000,
    color: "Blanco",
    dominio: "AE123XX",
    origen: "propio",
    moneda: "USD",
    precioCompra: 28000,
    gastos: 500,
    precioPublicado: 32000,
    precioMinimo: 31000,
    fechaIngreso: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 días
    estado: "disponible",
    observaciones: "Impecable estado. Único dueño."
  },
  {
    id: "V-002",
    marca: "Volkswagen",
    modelo: "Amarok",
    version: "3.0 V6 Extreme",
    año: 2022,
    kilometraje: 32000,
    color: "Gris Indium",
    dominio: "AF456YY",
    origen: "consignación",
    moneda: "USD",
    precioCompra: 0,
    gastos: 150,
    precioPublicado: 41000,
    precioMinimo: 40000,
    fechaIngreso: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 65 días
    estado: "disponible",
    observaciones: "Consignación de cliente VIP."
  },
  {
    id: "V-003",
    marca: "Ford",
    modelo: "Ranger",
    version: "3.2 XLT 4x4",
    año: 2019,
    kilometraje: 85000,
    color: "Azul",
    dominio: "AD789ZZ",
    origen: "tercero",
    moneda: "ARS",
    precioCompra: 22000000,
    gastos: 500000,
    precioPublicado: 26000000,
    precioMinimo: 25000000,
    fechaIngreso: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 95 días
    estado: "disponible",
    observaciones: "Requiere limpieza de tapizados."
  },
  {
    id: "V-004",
    marca: "Jeep",
    modelo: "Compass",
    version: "2.4 Longitude",
    año: 2023,
    kilometraje: 15000,
    color: "Negro",
    dominio: "AG111BB",
    origen: "propio",
    moneda: "USD",
    precioCompra: 25000,
    gastos: 300,
    precioPublicado: 29000,
    precioMinimo: 28500,
    fechaIngreso: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 días
    estado: "reservado",
    observaciones: "Señado el viernes pasado."
  },
  {
    id: "V-005",
    marca: "Peugeot",
    modelo: "208",
    version: "1.6 Feline",
    año: 2020,
    kilometraje: 55000,
    color: "Gris Aluminio",
    dominio: "AE222CC",
    origen: "mixto",
    moneda: "ARS",
    precioCompra: 12000000,
    gastos: 200000,
    precioPublicado: 14500000,
    precioMinimo: 14000000,
    fechaIngreso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 días
    estado: "vendido",
    observaciones: "Entregado esta mañana."
  }
];

export const calculateVehicleMetrics = (vehicle) => {
    const costoTotal = vehicle.precioCompra + vehicle.gastos;
    const margenEstimado = vehicle.precioPublicado - costoTotal;
    const margenPorcentual = costoTotal > 0 ? ((margenEstimado / costoTotal) * 100).toFixed(1) : 0;
    
    const ingresoDate = new Date(vehicle.fechaIngreso);
    const now = new Date();
    const diffTime = Math.abs(now - ingresoDate);
    const diasEnStock = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let alertaRotacion = "normal";
    if (diasEnStock >= 90) alertaRotacion = "+90 días";
    else if (diasEnStock >= 60) alertaRotacion = "+60 días";

    return {
        ...vehicle,
        costoTotal,
        margenEstimado,
        margenPorcentual,
        diasEnStock,
        alertaRotacion
    };
};
