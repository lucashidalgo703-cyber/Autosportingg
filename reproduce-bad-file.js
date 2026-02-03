import { readFile } from 'fs/promises';
import { Blob } from 'buffer';

const run = async () => {
    console.log("--- TEST 3: Invalid File Format (.txt) ---");
    try {
        const fileBuffer = await readFile('test.txt');
        const blob = new Blob([fileBuffer], { type: 'text/plain' });

        const formData = new FormData();
        formData.append('images', blob, 'test.txt');
        formData.append('brand', 'TestBadFile');
        formData.append('name', 'TestModelBadFile');
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
            console.error('Test 3 Error:', response.status, text);
        } else {
            const json = await response.json();
            console.log('Test 3 Success:', json);
        }
    } catch (err) {
        console.error('Test 3 Exception:', err);
    }
};

run();
