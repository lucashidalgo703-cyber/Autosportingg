const at = (value, path) => path.split('.').reduce((current, part) => current?.[part], value);

// Hydrating an old record applies current schema defaults. Mongoose would save
// those defaults even when the user edits only a note. Keep absent facts absent.
export function preserveRecordedCarFields(document, rawRecord, input = {}) {
    document.schema.eachPath(path => {
        if (document.$isDefault(path) && !document.isModified(path) && at(rawRecord, path) === undefined && at(input, path) === undefined) document.$ignore(path);
    });
    return document;
}
