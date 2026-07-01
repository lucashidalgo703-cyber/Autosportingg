import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import CrmSettings from './src/models/CrmSettings.js';

async function testSave() {
    await connectDB();
    console.log("Connected to DB");

    try {
        let settings = await CrmSettings.findOne();
        if (!settings) settings = new CrmSettings();

        settings.assistantConfig = {
            ...(settings.assistantConfig?.toObject?.() || settings.assistantConfig || {}),
            enabled: true,
            provider: 'openai'
        };

        const id = null;
        settings.updatedBy = id && mongoose.Types.ObjectId.isValid(id) ? id : null;
        settings.markModified('assistantConfig');

        await settings.save();
        console.log("SAVED OK");
    } catch (e) {
        console.error("ERROR SAVING:", e);
    }
    process.exit(0);
}

testSave();
