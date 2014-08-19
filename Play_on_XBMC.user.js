// ==UserScript==
// @name        Play on XBMC
// @namespace   user@violet.local
//
// @description Resolve and play media on XBMC
// @description Use with AnyURL plugin from:
// @description         https://github.com/VioletRed/script.video.anyurl
//
// @date        2014-08-14
// @version     0.6
// @include     *
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @require     https://gist.githubusercontent.com/VioletRed/9577d8c062f3ff056c59/raw/play_on_xbmc.js
// @updateURL   https://gist.github.com/VioletRed/9577d8c062f3ff056c59/raw/Play_on_XBMC.user.js

// ==/UserScript==
// Simple script to send media to XBMC. 
// It uses AnyURL plugin so it should be installed to make it work.

/* ============================================================================
 * Global config
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
var supported_hosts = [ "180upload.com", "2gb-hosting.com", "allmyvideos.net",
		"auengine.com", "bayfiles.com", "bestreams.net", "billionuploads.com",
		"castamp.com", "cheesestream.com", "clicktoview.org", "cloudy.ch",
		"cloudy.com", "cloudy.ec", "cloudy.eu", "cloudy.sx", "crunchyroll.com",
		"cyberlocker.ch", "daclips.com", "daclips.in", "dailymotion.com",
		"divxden.com", "divxstage.eu", "divxstage.net", "divxstage.to",
		"donevideo.com", "ecostream.tv", "entroupload.com", "facebook.com",
		"filebox.com", "filedrive.com", "filenuke.com", "firedrive.com",
		"flashx.tv", "gorillavid.com", "gorillavid.in", "hostingbulk.com",
		"hostingcup.com", "hugefiles.net", "jumbofiles.com", "lemuploads.com",
		"limevideo.net", "megarelease.org", "mega-vids.com",
		"mightyupload.com", "mooshare.biz", "movdivx.com", "movpod.in",
		"movpod.net", "movreel.com", "movshare.net", "movzap.com",
		"mp4stream.com", "mp4upload.com", "mrfile.me", "muchshare.net",
		"nolimitvideo.com", "nosvideo.com", "novamov.com", "nowvideo.ch",
		"nowvideo.eu", "nowvideo.sx", "ovile.com", "play44.net", "played.to",
		"playwire.com", "primeshare.tv", "promptfile.com", "purevid.com",
		"putlocker.com", "rapidvideo.com", "seeon.tv", "shared.sx",
		"sharefiles4u.com", "sharerepo.com", "sharesix.com", "sharevid.org",
		"skyload.net", "slickvid.com", "sockshare.com", "stagevu.com",
		"stream2k.com", "streamcloud.eu", "thefile.me", "trollvid.net",
		"tubeplus.me", "tune.pk", "ufliq.com", "uploadc.com",
		"uploadcrazy.net", "veehd.com", "veoh.com", "vidbull.com",
		"vidbux.com", "vidcrazy.net", "video44.net", "videobb.com",
		"videoboxone.com", "videofun.me", "videomega.tv", "videotanker.co",
		"videoweed.es", "videozed.net", "videozer.com", "vidhog.com",
		"vidpe.com", "vidplay.net", "vidspot.net", "vidstream.in", "vidto.me",
		"vidup.org", "vidxden.com", "vidzur.com", "vimeo.com", "vk.com",
		"vodlocker.com", "vureel.com", "watchfreeinhd.com", "xvidstage.com",
		"yourupload.com", "youtu.be", "youtube.com", "youwatch.org",
		"zalaa.com", "zooupload.com", "zshare.net", "zuzvideo.com" ];

function binarySearch(items, value) {

	var startIndex = 0, stopIndex = items.length - 1, middle = Math
			.floor((stopIndex + startIndex) / 2);

	while (items[middle] != value && startIndex < stopIndex) {
		// adjust search area
		if (value < items[middle]) {
			stopIndex = middle - 1;
		} else if (value > items[middle]) {
			startIndex = middle + 1;
		}

		// recalculate middle
		middle = Math.floor((stopIndex + startIndex) / 2);
	}

	// make sure it's the right value
	return (items[middle] != value) ? -1 : middle;
}

function encode_video_url(video_url) {
	return 'plugin://script.video.anyurl/?mode=play_video&url='
			+ encodeURIComponent(video_url);
}

var clip = document.URL;

// Remove known top domain names (i.e 'www', 'm', 'embed')
var top_domain = /^www\.|^m\.|^embed\./
var host = window.location.host.toLowerCase().replace(top_domain, '');

if (binarySearch(supported_hosts, host) >= 0 && top == self) {
	add_play_on_xbmc_buttons(clip)
} else {
	console.log("Unsupported host " + clip)
}
