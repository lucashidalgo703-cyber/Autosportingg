const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const regex = /app\.get\('\/api\/admin\/clients', authenticateToken, async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ message: error\.message \}\);\s*\}\s*\}\);/;

const replacement = `app.get('/api/admin/clients', authenticateToken, async (req, res) => {
    try {
        const { search, type, source, status, segment, limit = 50, page = 1 } = req.query;
        let query = {};
        
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { fullName: regex },
                { phoneNormalized: regex },
                { emailNormalized: regex },
                { locality: regex }
            ];
        }
        if (type) query.type = type;
        if (source) query.source = source;
        if (status) query.status = status;

        const reqUserId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
        if (segment === 'mis-clientes' && reqUserId) {
            query.assignedTo = reqUserId;
        } else if (segment === 'vendieron') {
            query.type = { $in: ['vendedor', 'ambos'] };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const parsedLimit = parseInt(limit);

        if (segment === 'contactados' || segment === 'sin-contactar' || segment === 'compraron') {
            const pipeline = [];
            if (Object.keys(query).length > 0) {
                pipeline.push({ $match: query });
            }

            if (segment === 'contactados' || segment === 'sin-contactar') {
                pipeline.push({
                    $lookup: {
                        from: 'leads',
                        localField: '_id',
                        foreignField: 'clientId',
                        as: 'relatedLeads'
                    }
                });

                if (segment === 'sin-contactar') {
                    pipeline.push({
                        $match: {
                            $and: [
                                { $or: [{ interactions: { $exists: false } }, { interactions: { $size: 0 } }] },
                                {
                                    $or: [
                                        { relatedLeads: { $size: 0 } },
                                        { "relatedLeads": { $not: { $elemMatch: { crmStatus: { $ne: 'nuevo' } } } } }
                                    ]
                                }
                            ]
                        }
                    });
                } else if (segment === 'contactados') {
                    pipeline.push({
                        $match: {
                            $or: [
                                { "interactions.0": { $exists: true } },
                                { "relatedLeads": { $elemMatch: { crmStatus: { $ne: 'nuevo' } } } }
                            ]
                        }
                    });
                }
            } else if (segment === 'compraron') {
                pipeline.push({
                    $lookup: {
                        from: 'sales',
                        localField: '_id',
                        foreignField: 'clientId',
                        as: 'relatedSales'
                    }
                });
                pipeline.push({
                    $match: {
                        "relatedSales": {
                            $elemMatch: { status: { $nin: ['cancelada', 'borrador'] } }
                        }
                    }
                });
            }

            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await Client.aggregate(countPipeline);
            const total = countResult.length > 0 ? countResult[0].total : 0;

            pipeline.push({ $sort: { createdAt: -1 } });
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: parsedLimit });
            pipeline.push({ $project: { relatedLeads: 0, relatedSales: 0 } });

            const clients = await Client.aggregate(pipeline);
            return res.json({ clients, total, pages: Math.ceil(total / parsedLimit) });
        } else {
            const clients = await Client.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean();
                
            const total = await Client.countDocuments(query);
                
            return res.json({ clients, total, pages: Math.ceil(total / parsedLimit) });
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: error.message });
    }
});`;

if (regex.test(server)) {
    server = server.replace(regex, replacement);
    fs.writeFileSync('server.js', server);
    console.log('Replaced GET /api/admin/clients');
} else {
    console.log('Regex not matched');
}
