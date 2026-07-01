const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');
server = server.replace(
    /const soldCarsThisMonth = await Car\.countDocuments\(\{\s*status: 'Vendido',\s*updatedAt: \{ \$gte: startOfMonth \}\s*\}\);/,
    `const soldCarsThisMonth = await Sale.countDocuments({ \n            saleDate: { $gte: startOfMonth },\n            status: { $nin: ['cancelada', 'borrador'] }\n        });`
);
fs.writeFileSync('server.js', server);

let header = fs.readFileSync('src/components/crm/layout/CrmHeader.jsx', 'utf8');
header = header.replace(
    /fetch\('\/api\/admin\/dashboard\/metrics\$\{monthParam\}'/g,
    `fetch('/api/stats/dashboard'`
);
header = header.replace(
    /fetch\('\/api\/admin\/finance\/accounts'/g,
    `fetch('/api/accounts'`
);
header = header.replace(
    /metrics\.counts\?\.vendidos/g,
    `metrics.soldCarsThisMonth`
);
header = header.replace(
    /metrics\.counts\?\.disponibles/g,
    `metrics.stockCount`
);
header = header.replace(
    /const getBal = \(curr\) => \{\s*const acc = accounts\.find\(a => a\.currency === curr && \(a\.type === 'cash' \|\| a\.type === 'efectivo'\)\);\s*return acc \? acc\.balance : 0;\s*\};/g,
    `const getBal = (curr) => {\n                                return accounts\n                                    .filter(a => a.currency === curr && a.isActive !== false)\n                                    .reduce((sum, a) => sum + (a.balance || 0), 0);\n                            };`
);
// fix trailing whitespace
header = header.replace(/const \[showDropdown, setShowDropdown\] = useState\(false\);\r?\n\s+\r?\n\s+const \[summaryData, setSummaryData\] = useState/g, `const [showDropdown, setShowDropdown] = useState(false);\n    \n    const [summaryData, setSummaryData] = useState`);
fs.writeFileSync('src/components/crm/layout/CrmHeader.jsx', header);

let dash = fs.readFileSync('src/components/crm/dashboard/GeneralDashboardSote.jsx', 'utf8');
dash = dash.replace(
    /Panel title="Proximas entregas y vencimientos" subtitle="Entregas, expedientes y cuotas - proximos 7 dias" href="\/admin\/documentacion"/g,
    `Panel title="Proximas entregas y vencimientos" subtitle="Entregas, expedientes y cuotas - proximos 7 dias" href="/admin/agenda"`
);
fs.writeFileSync('src/components/crm/dashboard/GeneralDashboardSote.jsx', dash);

console.log('done');
