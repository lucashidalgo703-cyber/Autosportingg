import('./server.js').then(() => {
    console.log('Server imported successfully. Exiting.');
    process.exit(0);
}).catch((e) => {
    console.error('Error importing server:');
    console.error(e);
    process.exit(1);
});
