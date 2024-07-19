import childProcess from 'node:child_process';
import {commandExists, execFile, exec} from '../util.js';

export async function isAvailable() {
	return commandExists('hyprpaper');
}

async function initialize() {
	return new Promise(resolve => {
		const hyprpaper = childProcess.spawn('script', ['--quiet', '--command', 'hyprpaper', '/dev/null']);
		hyprpaper.stdout.on('data', data => {
			if (data.toString().includes('[ERR]') || data.toString().includes('error')) {
				throw new Error(data.toString());
			} else {
				resolve();
			}
		});
	});
}

export async function get() {
	const {stdout: query} = await execFile('hyprctl', ['hyprpaper', 'listactive']);
	if (query.includes('no wallpapers active')) {
		return;
	}

	//	Query output looks like:
	//	 eDP-1 = /path/to/image
	//	 HDMI-A-1 = /path/to/image
	return query.split(' ').at(-1).replace(/(\r\n|\n|\r)/gm, '');
}

export async function set(imagePath) {
	await initialize();
	const commandArray = [];
	const {stdout: monitors} = await exec('hyprctl monitors | grep "Monitor" | awk \'{ print $2 }\'');
	const {stdout: listloaded} = await execFile('hyprctl', ['hyprpaper', 'listloaded']);
	if (!listloaded.includes(imagePath)) {
		await execFile('hyprctl', ['hyprpaper', 'preload', imagePath]);
	}

	for (const monitor of monitors.split('\n').slice(0, -1)) {
		commandArray.push(execFile('hyprctl', ['hyprpaper', 'wallpaper', `${monitor},${imagePath}`]));
	}

	await Promise.all(commandArray);
}
