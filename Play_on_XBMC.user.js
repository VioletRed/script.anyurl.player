// ==UserScript==
// @name        Play on XBMC
// @namespace   user@helio
// @description Resolve and play media on XBMC
// @date        2014-08-14
// @include *.180upload.com/*
// @include *.2gb-hosting.com/*
// @include *.allmyvideos.net/*
// @include *.auengine.com/*
// @include *.bayfiles.com/*
// @include *.bestreams.net/*
// @include *.billionuploads.com/*
// @include *.castamp.com/*
// @include *.cheesestream.com/*
// @include *.clicktoview.org/*
// @include *.cloudy.ch/*
// @include *.cloudy.com/*
// @include *.cloudy.ec/*
// @include *.cloudy.eu/*
// @include *.cloudy.sx/*
// @include *.crunchyroll.com/*
// @include *.cyberlocker.ch/*
// @include *.daclips.com/*
// @include *.daclips.in/*
// @include *.dailymotion.com/*
// @include *.divxden.com/*
// @include *.divxstage.eu/*
// @include *.divxstage.net/*
// @include *.divxstage.to/*
// @include *.donevideo.com/*
// @include *.ecostream.tv/*
// @include *.entroupload.com/*
// @include *.facebook.com/*
// @include *.filebox.com/*
// @include *.filedrive.com/*
// @include *.filenuke.com/*
// @include *.firedrive.com/*
// @include *.flashx.tv/*
// @include *.gorillavid.com/*
// @include *.gorillavid.in/*
// @include *.hostingbulk.com/*
// @include *.hostingcup.com/*
// @include *.hugefiles.net/*
// @include *.jumbofiles.com/*
// @include *.lemuploads.com/*
// @include *.limevideo.net/*
// @include *.megarelease.org/*
// @include *.mega-vids.com/*
// @include *.mightyupload.com/*
// @include *.mooshare.biz/*
// @include *.movdivx.com/*
// @include *.movpod.in/*
// @include *.movpod.net/*
// @include *.movreel.com/*
// @include *.movshare.net/*
// @include *.movzap.com/*
// @include *.mp4stream.com/*
// @include *.mp4upload.com/*
// @include *.mrfile.me/*
// @include *.muchshare.net/*
// @include *.nolimitvideo.com/*
// @include *.nosvideo.com/*
// @include *.novamov.com/*
// @include *.nowvideo.ch/*
// @include *.nowvideo.eu/*
// @include *.nowvideo.sx/*
// @include *.ovile.com/*
// @include *.play44.net/*
// @include *.played.to/*
// @include *.playwire.com/*
// @include *.primeshare.tv/*
// @include *.promptfile.com/*
// @include *.purevid.com/*
// @include *.putlocker.com/*
// @include *.rapidvideo.com/*
// @include *.seeon.tv/*
// @include *.shared.sx/*
// @include *.sharefiles4u.com/*
// @include *.sharerepo.com/*
// @include *.sharesix.com/*
// @include *.sharevid.org/*
// @include *.skyload.net/*
// @include *.slickvid.com/*
// @include *.sockshare.com/*
// @include *.stagevu.com/*
// @include *.stream2k.com/*
// @include *.streamcloud.eu/*
// @include *.thefile.me/*
// @include *.trollvid.net/*
// @include *.tubeplus.me/*
// @include *.tune.pk/*
// @include *.ufliq.com/*
// @include *.uploadc.com/*
// @include *.uploadcrazy.net/*
// @include *.veehd.com/*
// @include *.veoh.com/*
// @include *.vidbull.com/*
// @include *.vidbux.com/*
// @include *.vidcrazy.net/*
// @include *.video44.net/*
// @include *.videobb.com/*
// @include *.videoboxone.com/*
// @include *.videofun.me/*
// @include *.videomega.tv/*
// @include *.videotanker.co/*
// @include *.videoweed.es/*
// @include *.videozed.net/*
// @include *.videozer.com/*
// @include *.vidhog.com/*
// @include *.vidpe.com/*
// @include *.vidplay.net/*
// @include *.vidspot.net/*
// @include *.vidstream.in/*
// @include *.vidto.me/*
// @include *.vidup.org/*
// @include *.vidxden.com/*
// @include *.vidzur.com/*
// @include *.vimeo.com/*
// @include *.vk.com/*
// @include *.vodlocker.com/*
// @include *.vureel.com/*
// @include *.watchfreeinhd.com/*
// @include *.xvidstage.com/*
// @include *.yourupload.com/*
// @include *.youtu.be/*
// @include *.youtube.com/*
// @include *.youwatch.org/*
// @include *.zalaa.com/*
// @include *.zooupload.com/*
// @include *.zshare.net/*
// @include *.zuzvideo.com/*
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @require     https://gist.githubusercontent.com/VioletRed/9577d8c062f3ff056c59/raw/play_on_xbmc.js

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

function encode_video_url(video_url) {
	return 'plugin://script.video.anyurl/?mode=play_video&url='
			+ encodeURIComponent(video_url);
}

var clip = document.URL;
add_play_on_xbmc_buttons(clip)

