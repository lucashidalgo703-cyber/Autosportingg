import fs from 'node:fs';
import path from 'node:path';

export function persistentPilotStorage(directory, port = 32529) {
    if (!path.isAbsolute(directory) || !Number.isInteger(port) || port<1024 || port>65535)
        throw new Error('Configurá una ruta absoluta y un puerto local válido para el piloto.');
    fs.mkdirSync(directory,{recursive:true});
    const root=fs.realpathSync(directory);
    const marker=path.join(root,'autosporting-pilot.json');
    const record={purpose:'autosporting-financial-pilot-synthetic',version:1,mongoPort:port};
    if (!fs.existsSync(marker)) {
        if (fs.readdirSync(root).length) throw new Error('El directorio persistente debe estar vacío o identificado como piloto.');
        fs.writeFileSync(marker,JSON.stringify(record),{flag:'wx',flush:true});
    }
    if (JSON.stringify(JSON.parse(fs.readFileSync(marker,'utf8')))!==JSON.stringify(record))
        throw new Error('El directorio no corresponde al piloto o se cambió su puerto MongoDB.');
    const dbPath=path.join(root,'mongo');
    fs.mkdirSync(dbPath,{recursive:true});
    if (fs.realpathSync(dbPath)!==dbPath) throw new Error('El directorio MongoDB debe quedar dentro del almacenamiento del piloto.');
    return {dbPath,port};
}

export async function seedFinancialPilotUser(AdminUser,{name,role,permissions,passwordHash}) {
    const email=name+'@example.test';
    const user=await AdminUser.findOneAndUpdate({email},{$setOnInsert:{name,email,role,permissions,passwordHash}},
        {upsert:true,new:true,setDefaultsOnInsert:true});
    if (!user?.active || user.role!==role || JSON.stringify(user.permissions)!==JSON.stringify(permissions))
        throw new Error('La identidad persistente no coincide con el perfil sintético.');
    return user;
}
