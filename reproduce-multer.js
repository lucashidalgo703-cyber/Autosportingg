import { readFile } from 'fs/promises';
import { Blob } from 'buffer';

const run = async () => {
    console.log("--- TEST 4: 11 images (Should Succeed now) ---");
    try {
        const fileBuffer = await readFile('public/autosporting-logo-white.png');
        const blob = new Blob([fileBuffer], { type: 'image/png' });

        const formData = new FormData();
        for (let i = 0; i < 11; i++) {
            formData.append('images', blob, `logo-${i}.png`);
        }

        formData.append('brand', 'TestLimitPass');
        formData.append('name', 'TestModelLimitPass');
        formData.append('year', '2023');
        formData.append('km', '100');
        formData.append('fuel', 'Petrol');
        formData.append('condition', 'New');
        formData.append('price', '10000');
        formData.append('currency', '$');
        formData.append('featured', 'false');

        const response = await fetch('http://localhost:3001/api/cars', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Test 4 Error:', response.status, text);
        } else {
            const json = await response.json();
            console.log('Test 4 Success:', json);
        }
    } catch (err) {
        console.error('Test 4 Exception:', err);
    }

    console.log("\n--- TEST 6: 21 images (Should Fail) ---");
    try {
        const fileBuffer = await readFile('public/autosporting-logo-white.png');
        const blob = new Blob([fileBuffer], { type: 'image/png' });

        const formData = new FormData();
        for (let i = 0; i < 21; i++) {
            formData.append('images', blob, `logo-${i}.png`);
        }

        formData.append('brand', 'TestLimitFail');
        formData.append('name', 'TestModelLimitFail');
        formData.append('year', '2023');
        formData.append('km', '100');
        formData.append('fuel', 'Petrol');
        formData.append('condition', 'New');
        formData.append('price', '10000');
        formData.append('currency', '$');
        formData.append('featured', 'false');

        const response = await fetch('http://localhost:3001/api/cars', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Test 6 Error:', response.status, text);
        } else {
            const json = await response.json();
            console.log('Test 6 Success:', json); // Should not happen
        }
    } catch (err) {
        console.error('Test 6 Exception:', err);
    }
};

run();
