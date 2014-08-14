// ==UserScript==
// @name          Play YouTube on XBMC
// @description   Adds a link to play videos from YouTube in XBMC
// @date          2012-10-20
// @include       *youtube.*/*
// @include       *youtu.be/*
// @grant         GM_addStyle
// @grant         GM_registerMenuCommand
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_xmlhttpRequest
// @grant         GM_log
// @grant         unsafeWindow
// @require       https://gist.githubusercontent.com/VioletRed/9577d8c062f3ff056c59/raw/play_on_xbmc.js
// ==/UserScript==
// Simple script to send Youtube movies to XBMC, 
// it uses the Youtube plugin so it should be installed to make it work

/* ============================================================================
 * Site independent code here!!!!
 * */

var xbmc_address = GM_getValue('XBMC_ADDRESS');
var xbmc_playlist = GM_getValue('XBMC_PLAYLIST');
var xbmc_queued = false;

GM_registerMenuCommand('Modify the XBMC address', modify_xbmc_address);
GM_registerMenuCommand('Select XBMC playlist', modify_xbmc_playlist);

if (xbmc_address === undefined)
	modify_xbmc_address();

if (xbmc_playlist === undefined)
	modify_xbmc_playlist();

function modify_xbmc_address() {
	xbmc_address = window
			.prompt(
					'Enter the address for the XBMC web interface\n(username:password@address:port)',
					xbmc_address);
	GM_setValue("XBMC_ADDRESS", xbmc_address);
}

function modify_xbmc_playlist() {
	xbmc_playlist = window.prompt('Set the playlist number (0 or 1)',
			xbmc_playlist);
	GM_setValue("XBMC_PLAYLIST", xbmc_playlist);
}

/*
 * ============================================================================
 * Site dependent code here!!!!
 * ============================================================================
 */

function encode_video_url(video_url) {
	return 'plugin://plugin.video.youtube/?action=play_video&videoid='
			+ video_url.replace('v=', '');
}

try {
	GM_log('Trying to get video id from video_id element');
	var clip = unsafeWindow.yt.getConfig('VIDEO_ID');
} catch (Exception) {
	GM_log('Not found');
}

if (clip == undefined) {
	GM_log('Trying to get video id from url');
	var clip;

	var search = window.location.search.substring(1).split('&');
	GM_log('search = ' + search);

	for (i = 0; i < search.length; i++) {
		if (search[i].substring(0, 2) == 'v=') {
			var clip = search[i].substring(2);
			GM_log('Clip found using alternative method: ' + clip);
			break;
		}
	}
}

if (clip != undefined) {
	add_play_on_xbmc_buttons(clip)
}
