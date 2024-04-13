import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'os';

const execAsync = promisify(exec);

export function openUserFiles(req, res) {
    switch (platform()) {
        case "win32":
            execAsync(`start .\\user-files`);
            break;
        case "linux":
            execAsync(`xdg-open ./user-files`);
            break;
    }

    res.status(204).send();
}