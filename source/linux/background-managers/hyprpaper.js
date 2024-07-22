import childProcess from 'node:child_process';
import {commandExists, execFile} from '../util.js';

export async function isAvailable() {
	return commandExists('hyprpaper');
}

async function initialize() {
	return new Promise((resolve, reject) => {
		const hyprpaper = childProcess.spawn('script', ['--return', '--quiet', '--command', 'hyprpaper', '/dev/null']);
		hyprpaper.stdout.on('data', data => {
			if (data.toString().includes('[ERR]') || data.toString().includes('error')) {
				reject(new Error(data.toString()));
			} else {
				resolve();
			}
		});
	});
}

export async function get() {
	await initialize();
	//	Query output looks like:
	//	 eDP-1 = /path/to/image
	//	  = /path/to/fallbackimage
	//	 HDMI-A-1 = /path/to/image
	const {stdout: query} = await execFile('hyprctl', ['hyprpaper', 'listactive']);
	if (query.includes('no wallpapers active')) {
		return;
	}

	const formattedQuery = query.split('\n').slice(0, -1).map(row => [row.split('=')[0], row.split('=')[1].trim()]);
	const fallBackImage = formattedQuery.find(row => row[0] === ' ')[1];

	if (fallBackImage) {
		return formattedQuery.every(row => row[1] === fallBackImage) ? fallBackImage : formattedQuery.find(row => row[0] !== ' ')[1];
	}

	return formattedQuery[0][1];
}

export async function set(imagePath) {
	await initialize();
	const {stdout: jsonMonitors} = await execFile('hyprctl', ['monitors', '-j']);
	const monitors = JSON.parse(jsonMonitors);
	const {stdout: listloaded} = await execFile('hyprctl', ['hyprpaper', 'listloaded']);
	if (!listloaded.includes(imagePath)) {
		await execFile('hyprctl', ['hyprpaper', 'preload', imagePath]);
	}

	await Promise.all(monitors.map(monitor => execFile('hyprctl', ['hyprpaper', 'wallpaper', `${monitor.name}, ${imagePath}`])));
}
