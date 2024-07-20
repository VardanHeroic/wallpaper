import childProcess from 'node:child_process';
import {commandExists, execFile} from '../util.js';

export async function isAvailable() {
	return commandExists('hyprpaper');
}

async function initialize() {
	return new Promise((resolve, reject) => {
		const hyprpaper = childProcess.spawn('script', ['--quiet', '--command', 'hyprpaper', '/dev/null']);
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
	//	Query output looks like:
	//	 eDP-1 = /path/to/image
	//	  = /path/to/fallbackimage
	//	 HDMI-A-1 = /path/to/image
	const {stdout: query} = await execFile('hyprctl', ['hyprpaper', 'listactive']);
	if (query.includes('no wallpapers active')) {
		return;
	}

	const formattedQuery = query.split('\n').slice(0, -1).map(row => [row.split('=')[0], row.split('=').trim()]);
	const fallBackImage = formattedQuery.find(row => row[0] === ' ')[1];

	if (fallBackImage) {
		return formattedQuery.every(row => row[1] === fallBackImage) ? fallBackImage : formattedQuery.find(row => row[0] !== ' ')[1];
	}

	return formattedQuery[0][1];
}

export async function set(imagePath) {
	await initialize();
	const {stdout: monitors} = await execFile('hyprctl', ['monitors']);
	// "hyprclt monitors" output looks like this:
	//
	// Monitor eDP-1 (ID 0):
	//         1366x768@60.00300 at 0x0
	//         description: Chimei Innolux Corporation 0x14C3
	//         make: Chimei Innolux Corporation
	//         model: 0x14C3
	//         serial:
	//         active workspace: 2 (2)
	//         special workspace: 0 ()
	//         reserved: 0 25 0 0
	//         scale: 1.00
	//         transform: 0
	//         focused: yes
	//         dpmsStatus: 1
	//         vrr: 0
	//         activelyTearing: false
	//         disabled: false
	//         currentFormat: XRGB8888
	//         availableModes: 1366x768@60.00Hz
	//
	// Monitor HDMI-A-1 (ID 1):
	//         1920x1080@60.00000 at 1366x0
	//         description:
	//         make:
	//         model:
	//         serial:
	//         active workspace: 4 (4)
	//         special workspace: 0 ()
	//         reserved: 0 50 0 0
	//         scale: 2.00
	//         transform: 0
	//         focused: no
	//         dpmsStatus: 1
	//         vrr: 0
	//         activelyTearing: false
	//         disabled: false
	//         currentFormat: XRGB8888
	//         availableModes:
	//
	//
	const {stdout: listloaded} = await execFile('hyprctl', ['hyprpaper', 'listloaded']);
	if (!listloaded.includes(imagePath)) {
		await execFile('hyprctl', ['hyprpaper', 'preload', imagePath]);
	}

	await Promise.all(monitors.split('\n').flatMap(monitor => monitor.includes('Monitor') ? [execFile('hyprctl', ['hyprpaper', 'wallpaper', `${monitor.split(' ')[1]}, ${imagePath}`])] : []));
}
