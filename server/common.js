import { exec } from 'child_process';
import { get } from 'node:https';
import { promisify } from 'node:util';

export const getAsync = (url, options = {}) => new Promise((resolve, reject) => {
    let req = get(url, options, resolve);
    req.on("abort", reject)
       .on("error", reject)
});
export const waitForResp = (res) => new Promise((resolve, reject) => {
    let data = '';
    
    // A chunk of data has been received
    res.on('data', chunk => {
        data += chunk;
    });
    
    // The whole response has been received
    res.on('end', () => {
        resolve(data)
    })
});

export const execAsync = promisify(exec);