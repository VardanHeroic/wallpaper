import childProcess from 'node:child_process';
import {commandExists, execFile} from '../util.js';

export async function isAvailable() {
	return commandExists('hyprpaper');
}

async function initialize() {
	return new Promise((resolve, reject) => {
		const hyprpaper = childProcess.spawn('script', ['-c', 'hyprpaper']);

		hyprpaper.stdout.on('data', data => {
			if (data.toString().includes('[ERR]') || data.toString().includes('error')) {
				reject(data.toString());
			} else {
				resolve();
			}
		});
	});
}

export async function get() {
	await initialize();
	const {stdout: query} = await execFile('hyprctl', ['hyprpaper', 'listactive']);
	if (query === 'no wallpapers active') {
		throw new Error('No wallpaper active');
	}

	return query.split(' ')[2];
}

export async function set(imagePath) {
	await initialize();
	console.log(imagePath);
	const {stdout: listloaded} = await execFile('hyprctl', ['hyprpaper', 'listloaded']);
	if (!listloaded.includes(imagePath)) {
		await execFile('hyprctl', ['hyprpaper', 'preload', imagePath]);
	}

	await execFile('hyprctl', ['hyprpaper', 'wallpaper', `,${imagePath}`]);
}
