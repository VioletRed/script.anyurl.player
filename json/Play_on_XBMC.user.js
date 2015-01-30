// ==UserScript==
// @name        Play on Kodi/XBMC
// @namespace   user@violet.local
//
// @description Resolve and play media on Kodi/XBMC
// @description Use with AnyURL plugin from:
// @description  https://github.com/VioletRed/script.anyurl.player/wiki
//
// @date        2015-01-09
// @version     21
// @include     *
// @require     https://raw.github.com/sizzlemctwizzle/GM_config/master/gm_config.js
// @require     https://github.com/VioletRed/script.anyurl.player/raw/testing/json/UI_Elements.js
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @updateURL   https://github.com/VioletRed/script.anyurl.player/raw/master/json/Play_on_XBMC.user.js
// ==/UserScript==
//
// Simple script to send media to Kodi.
// Adds a "Send to Kodi" button on supported websites
// Supported plugins:
// 	* Youtube
//	* TED
// 	* AnyURL plugin for other domains (https://github.com/VioletRed/script.anyurl.player).
//
// It uses the old GM_*** API, and needs cleaning.

/* ============================================================================
 * Global config
 * */
GM_config.init({
	'id' : 'GM_config', // The id used for this instance of GM_config
	'title' : 'Kodi setup',
	'fields' : // Fields object
	{
		'XBMC_ADDRESS' : // This is the id of the field
		{
			'label' : 'Host', // Appears next to field
			'type' : 'text', // Makes this setting a text field
			'default' : '<host>:<port>' // Default value if user doesn't
		// change it
		},
		'USE_BIG' : {
			'label' : 'Use big buttons', // Appears next to field
			'type' : 'checkbox', // Makes this setting a checkbox input
			'default' : false
		// Default value if user doesn't change it
		},
		'RESOLVE' : {
			'label' : 'Try to resolve queued elements (hack!)', // Appears next to field
			'type' : 'checkbox', // Makes this setting a checkbox input
			'default' : false
		// Default value if user doesn't change it
		}
	},
	'css' : 'background:#103040;'
});

var xbmc_address = GM_config.get('XBMC_ADDRESS');
var xbmc_queued = null;
const
xbmc_music_playlist = 0; // Queue for party mode
const
xbmc_video_playlist = 1; // Queue for video mode
const
xbmc_partylist_size = -10
const
is_playlist = 1;
// Remove known top domain names (i.e 'www', 'm', 'embed')
var top_domain = /^www\.|^m\.|^embed\./
var current_host = window.location.host.toLowerCase().replace(top_domain, '');

/*
 * ============================================================================
 * Global UI elements
 * ============================================================================
 */
var xbmc_ui = null;
var xbmc_title = null;
var xbmc_play_control = null;
var xbmc_msg_timer = null;

/*
 * ============================================================================
 * Site independent code here!!!!
 * ============================================================================
 */

function xbmc_json_error(response) {
	remove_ui_msg();
	consoloe.log("XBMC JSON Error")
}

function xbmc_json_timeout(response) {
	remove_ui_msg();
	consoloe.log("XBMC JSON Timeout")
}

function execute_anyurl_command(context, command, last_step) {
	// Don't try to resolve by default
	// Resolving is kind of a hack, and might not behave
	if (!GM_config.get('RESOLVE')) {
		return
	}

	anyurl_command = '{"jsonrpc": "2.0", "id" : 1, "method": "Addons.ExecuteAddon", '
			+ '"params": {  "addonid":"script.anyurl.player",'
			+ '"params" : {'
			+ '"mode" : "' + command + '"';
	if (context['title'] != undefined) {
		anyurl_command += ', "title": "' + context['title'] + '"';
	}
	if (context['url'] != undefined) {
		anyurl_command += ', "url" : "' + context['encoded'] + '"';
	}
	if (context['playlistid'] != undefined) {
		anyurl_command += ', "playlistid" : "' + context['playlistid'] + '"';
	}
	if (context['position'] != undefined) {
		anyurl_command += ', "position" : "' + context['position'] + '"';
	}
	if (context['description'] != undefined) {
		anyurl_command += ', "description" : "' + context['description'] + '"';
	}
	anyurl_command += ' } } }';

	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : anyurl_command,
		onload : last_step
	});
}

function open_video_player(context) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.Open", '
				+ '"params":{"item": { "file" : "'
				+ context['encoded'] + '" }}, "id" : 1}',
		onload : function(response) {
			show_ui_msg("PLAYING", 4000);
			console.log('Playing video directly');
			setTimeout(function() {
				local_context = {};
				local_context['position'] = 0;
				local_context['playlistid'] = 1;
				execute_anyurl_command(local_context, 'resolve_plugin', function(response) {
					console.log("Resolve playlist");
				})
			}, 5000)
		}
	});
}

function open_video_playlist(context) {
	setTimeout(function() {
		console.log('Playing new video list');
		GM_xmlhttpRequest({
			method : 'POST',
			url : 'http://' + xbmc_address + '/jsonrpc',
			headers : {
				"Content-type" : "application/json"
			},
			data : '{"jsonrpc": "2.0", "method": "Player.Open", '
					+ '"params":{"item": { "playlistid" : '
					+ xbmc_video_playlist + ' }}, "id" : 1}',
			onload : function(response) {
				console.log('Playing video');
				show_ui_msg("PLAYING", 4000);
			}
		});
	}, 2000);
	/* Resolve the whole playlist, just in case */
	setTimeout(function() {
		local_context = {};
		local_context['position'] = 0;
		local_context['playlistid'] = 1;
		execute_anyurl_command(local_context, 'resolve_plugin', function(response) {
			console.log("Resolve playlist");
		})
	}, 30000)
}

function play_in_new_playlist(context) {
	/* Clear playlist */
	GM_setValue('QUEUE_POSITION', 0);
	context['position'] = 0;
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.Clear", '
				+ '"params":{"playlistid" : ' + xbmc_video_playlist
				+ '}, "id" : 1}',
		onload : function(response) {
			/* Add movies to Video playlist */
			xbmc_queued = "";
			context['encoded'] = encode_url_for_new_playlist(context);
			if (context['is_playlist']) {
				open_video_player(context);
			} else {
				context['position'] = 0;
				queue_movie_at(context);
				open_video_playlist(context)
			}
		},
		onerror : xbmc_json_error,
		ontimeout : xbmc_json_timeout,
		timeout : 6000
	});
}

function queue_movie_at(context) {
	if (xbmc_queued == context['url']) {
		// Show somehow that this action was already completed
		console.log("Already queued " + xbmc_queued);
		show_ui_msg("QUEUEED", 1000);
		return;
	}
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.Insert", '
				+ '"params":{"item": { "file" : "' + context['encoded']
				+ '" }, "playlistid" :' + context['playlistid']
				+ ', "position" : ' + context['position'] + ' }, "id" : 1}',
		onerror : xbmc_json_error,
		ontimeout : xbmc_json_timeout,
		timeout : 6000,
		onload : function(response) {
			xbmc_queued = context['url'];
			execute_anyurl_command(context, 'resolve_single_plugin', function(
					response) {
				show_ui_msg("QUEUEED", 4000);
			})
		}
	})
}

function queue_in_party_mode(context, pos) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "id" : 1, "method": "Playlist.GetItems",'
				+ '"params":{"playlistid" : ' + context['playlistid'] + '}}',
		ontimeout : xbmc_json_timeout,
		timeout : 10000,
		onload : function(response) {
			var xbmc_response = JSON.parse(response.responseText);
			if (xbmc_response.result.limits == undefined) {
				console.log("Error: Playlist.GetItems bad response");
				return;
			}
			// Queue exist, enqueue media at the end of user
			// selection
			if (pos < 0) {
				context['position'] = xbmc_response.result.limits.end + pos + 1;
			} else if (pos > xbmc_response.result.limits.end) {
				context['position'] = xbmc_response.result.limits.end;
			}
			console.log("Queue in playlist " + context['playlistid'] + " at "
					+ context['position']);
			GM_setValue('QUEUE_POSITION', context['position'] + 1);
			queue_movie_at(context);
		}
	});
}

/* */
function config_script() {
	GM_config.open();
}

/* Send link to Kodi */
function queue_movie() {
	var context = {};
	context['url'] = document.documentURI;
	context['title'] = encodeURIComponent(get_meta_contents("title",
			document.title));
	context['description'] = encodeURIComponent(get_meta_contents(
			"description", context['description']));
	context['encoded'] = encode_url_for_queueing(context);
	context['is_playlist'] = url_is_playlist(context['url']);
	context['playlistid'] = xbmc_video_playlist;
	context['position'] = GM_getValue('QUEUE_POSITION', 0);
	console.log('Trying queue movie/create new playlist ' + context['title']);
	var xbmc_queue_depth = undefined;

	show_ui_msg("LOADING", 30000);

	// Get the current playlist
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.GetActivePlayers",'
				+ '"params":{}, "id" : 1}',
		onerror : xbmc_json_error,
		ontimeout : xbmc_json_timeout,
		timeout : 6000,
		onload : function(response) {
			var xbmc_active = JSON.parse(response.responseText);
			if (xbmc_active.result == undefined
					|| xbmc_active.result.length == 0) {
				console.log("No active players, create a new queue");
				play_in_new_playlist(context);
				return;
			}
			GM_xmlhttpRequest({
				method : 'POST',
				url : 'http://' + xbmc_address + '/jsonrpc',
				headers : {
					"Content-type" : "application/json"
				},
				data : '{"jsonrpc": "2.0", "method": "Player.GetProperties",'
						+ '"params":{"playerid" : '
						+ xbmc_active.result[0].playerid
						+ ', "properties" :  [ "playlistid" , "partymode", "position" ] }, "id" : 1}',
				onload : function(response) {
					var xbmc_properties = JSON.parse(response.responseText);
					context['playlistid'] = xbmc_properties.result.playlistid;
					// If the player is not playing the playlist, 
					// assume the other playlist is active
					if (xbmc_properties.result.position = -1) {
						if (context['playlistid'] == xbmc_video_playlist) {
							context['playlistid'] = xbmc_music_playlist
						} else {
							context['playlistid'] = xbmc_video_playlist
						}
					}
					if (xbmc_properties.result.partymode == true) {
						queue_in_party_mode(context, xbmc_partylist_size);
					} else {
						if (context['position'] <= xbmc_properties.result.position) {
							context['position'] = xbmc_properties.result.position + 1;
						}
						queue_in_party_mode(context, context['position']);
					}
				},
				onerror : function(response) {
					/* No active playlist */
					console.log("Not playing playlist, queue and play")
					play_in_new_playlist(context);
					xbmc_json_error();
				},
				ontimeout : xbmc_json_timeout,
				timeout : 6000,
			});
		}
	});
}

/*
 * ============================================================================
 * Movie control functions
 * ============================================================================
 */
function pause_movie() {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : '{"jsonrpc":"2.0", "method":"Player.PlayPause", "params":{"playerid":1}, "id" : 1}'
	});
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : '{"jsonrpc":"2.0", "method":"Player.PlayPause", "params":{"playerid":0}, "id" : 1}'
	});
}

function stop_movie() {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {	'Content-Type' : 'application/json'	},
		data : '{"jsonrpc":"2.0", "method": "Player.Stop", "params":{"playerid":1}, "id" : 1}'
	});
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {	'Content-Type' : 'application/json' },
		data : '{"jsonrpc":"2.0", "method": "Player.Stop", "params":{"playerid":0}, "id" : 1}'
	});
	xbmc_queued = "";
}

function next_movie() {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {	'Content-Type' : 'application/json' },
		data : '{"jsonrpc": "2.0", "method": "Player.GoTo", "params":{"playerid" : 1, "to" : "next" }, "id" : 1}'
	});
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : { 'Content-Type' : 'application/json'	},
		data : '{"jsonrpc": "2.0", "method": "Player.GoTo", "params":{"playerid" : 0, "to" : "next" }, "id" : 1}'
	});
	xbmc_queued = "";
}

/*
 * ============================================================================
 * UI functions
 * ============================================================================
 */
function remove_ui_msg() {
	try {
		xbmc_ui.removeChild(xbmc_title);
	} catch (e) {
		// catch and just suppress error
	}
	try {
		clearTimeout(xbmc_msg_timer);
	} catch (e) {
		// catch and just suppress error
	}
}

function show_ui_msg(msg, timeout) {
	remove_ui_msg();
	xbmc_title.innerHTML = msg;
	xbmc_ui.insertBefore(xbmc_title, xbmc_play_control);
	xbmc_msg_timer = setTimeout(remove_ui_msg, timeout);
}

function add_play_on_xbmc_buttons() {
	console.log('Found clip ' + document.documentURI);
	xbmc_ui = document.createElement('div');
	xbmc_ui.setAttribute('id', 'xbmc');

	xbmc_ui_use_big = GM_config.get('USE_BIG');
	xbmc_buttons = {};
	if (xbmc_ui_use_big) {
		xbmc_buttons['share'] = Share_60_png;
		xbmc_buttons['share_h'] = Share_60H_png;
		xbmc_buttons['next'] = Next_30_png;
		xbmc_buttons['next_h'] = Next_30H_png;
		xbmc_buttons['playpause'] = PlayPause_30_png;
		xbmc_buttons['playpause_h'] = PlayPause_30H_png;
		xbmc_buttons['stop'] = Stop_30_png;
		xbmc_buttons['stop_h'] = Stop_30H_png;
		xbmc_buttons['more'] = More_30_png;
		xbmc_buttons['more_h'] = More_30H_png;
		xbmc_buttons['bwidth'] = '60px';
		xbmc_buttons['swidth'] = '30px';
		xbmc_buttons['fwidth'] = '130px';
	} else {
		xbmc_buttons['share'] = Share_40_png;
		xbmc_buttons['share_h'] = Share_40H_png;
		xbmc_buttons['next'] = Next_20_png
		xbmc_buttons['next_h'] = Next_20H_png;
		xbmc_buttons['playpause'] = PlayPause_20_png;
		xbmc_buttons['playpause_h'] = PlayPause_20H_png;
		xbmc_buttons['stop'] = Stop_20_png;
		xbmc_buttons['stop_h'] = Stop_20H_png;
		xbmc_buttons['more'] = More_20_png
		xbmc_buttons['more_h'] = More_20H_png;
		xbmc_buttons['bwidth'] = '40px';
		xbmc_buttons['swidth'] = '20px';
		xbmc_buttons['fwidth'] = '90px';
	}

	xbmc_play_control = document.createElement('div');
	xbmc_play_control.setAttribute('id', 'playControl');

	var xbmc_other_control = document.createElement('div');
	xbmc_other_control.setAttribute('id', 'otherControl');

	var xbmc_playback_control = document.createElement('div');
	xbmc_playback_control.setAttribute('id', 'playbackControl');

	xbmc_title = document.createElement('div');
	xbmc_title.setAttribute('id', 'xbmcText');
	xbmc_title.innerHTML = 'PLAYING';

	var xbmc_play = document.createElement('span');
	xbmc_play.addEventListener('click', queue_movie, false);
	xbmc_play.setAttribute('id', 'btPlay');
	xbmc_play.setAttribute('title', 'Send to Kodi');

	var xbmc_pause = document.createElement('span');
	xbmc_pause.addEventListener('click', pause_movie, false);
	xbmc_pause.setAttribute('id', 'btPause');
	xbmc_pause.setAttribute('title', 'Pause/Resume playback');

	var xbmc_stop = document.createElement('span');
	xbmc_stop.addEventListener('click', stop_movie, false);
	xbmc_stop.setAttribute('id', 'btStop');
	xbmc_stop.setAttribute('title', 'Stop video');

	xbmc_play_control.appendChild(xbmc_play);
	var xbmc_next = document.createElement('span');
	xbmc_next.addEventListener('click', next_movie, false);
	xbmc_next.setAttribute('id', 'btNext');
	xbmc_next.setAttribute('title', 'Play next video');

	var xbmc_more = document.createElement('span');
	xbmc_more.addEventListener('click', config_script, false);
	xbmc_more.setAttribute('id', 'btMore');
	xbmc_more.setAttribute('title', 'More options (Config)');

	xbmc_play_control.appendChild(xbmc_play);
	xbmc_playback_control.appendChild(xbmc_next);
	xbmc_playback_control.appendChild(xbmc_more);
	xbmc_playback_control.appendChild(xbmc_pause);
	xbmc_playback_control.appendChild(xbmc_stop);

	xbmc_other_control.appendChild(xbmc_playback_control);
	xbmc_ui.appendChild(xbmc_play_control);
	xbmc_ui.appendChild(xbmc_other_control);

	document.body.parentNode.insertBefore(xbmc_ui, document.body);

	GM_addStyle('#xbmc { opacity:0.4; width:' + xbmc_buttons['fwidth']
			+ '; position:fixed; z-index:100; bottom:0; right:0;'
			+ ' display:block; background:#103040;'
			+ ' -moz-border-radius-topleft: ' + xbmc_buttons['swidth']
			+ '; -moz-border-radius-bottomleft:' + xbmc_buttons['swidth']
			+ '; -webkit-border-top-left-radius:' + xbmc_buttons['swidth']
			+ ';  -webkit-border-bottom-left-radius:' + xbmc_buttons['swidth']
			+ '; } ')
	GM_addStyle('#xbmc:hover { opacity: 0.7; } ')

	GM_addStyle('#xbmcText { opacity:0.8; font-family:Terminal; '
			+ 'text-align:center; font-size:12px; font-weight:bold; '
			+ 'background:#401010; color:#a0a0a0 } ')

	// 'Share' control
	GM_addStyle('#playControl span, #playbackPlay span:hover { width:'
			+ xbmc_buttons['bwidth']
			+ '; height:'
			+ xbmc_buttons['bwidth']
			+ '; float:left; display:block; padding-bottom:0px; -moz-background-size:'
			+ xbmc_buttons['bwidth'] + '; background-size:'
			+ xbmc_buttons['bwidth'] + '; -webkit-background-size:'
			+ xbmc_buttons['bwidth'] + '; -o-background-size:'
			+ xbmc_buttons['bwidth'] + '; -khtml-background-size:'
			+ xbmc_buttons['bwidth'] + '; cursor:pointer; } ')

	GM_addStyle('#btPlay { background: url("data:image/png;base64,'
			+ xbmc_buttons['share'] + '") no-repeat; } ')
	GM_addStyle('#btPlay:hover { background: url("data:image/png;base64,'
			+ xbmc_buttons['share_h'] + '") no-repeat; } ')

	// Other control
	GM_addStyle('#playbackControl span, #playbackControl span:hover { width:'
			+ xbmc_buttons['swidth'] + '; height:' + xbmc_buttons['swidth']
			+ '; bottom:0; float:left; display:block; margin-left:3px; '
			+ '-moz-background-size:' + xbmc_buttons['swidth']
			+ '; background-size:' + xbmc_buttons['swidth']
			+ '; -webkit-background-size:' + xbmc_buttons['swidth']
			+ '; -o-background-size:' + xbmc_buttons['swidth']
			+ '; -khtml-background-size:' + xbmc_buttons['swidth']
			+ '; cursor:pointer; } ')

	GM_addStyle('#btNext { background: url("data:image/png;base64,'
			+ xbmc_buttons['next'] + '") no-repeat; } ')
	GM_addStyle('#btNext:hover { background: url("data:image/png;base64,'
			+ xbmc_buttons['next_h'] + '") no-repeat; } ')

	GM_addStyle('#btMore { background: url("data:image/png;base64,'
			+ xbmc_buttons['more'] + '") no-repeat; } ')
	GM_addStyle('#btMore:hover { background: url("data:image/png;base64,'
			+ xbmc_buttons['more_h'] + '") no-repeat; } ')

	GM_addStyle('#btPause { background: url("data:image/png;base64,'
			+ xbmc_buttons['playpause'] + '") no-repeat; } ')
	GM_addStyle('#btPause:hover { background: url("data:image/png;base64,'
			+ xbmc_buttons['playpause_h'] + '") no-repeat; } ')

	GM_addStyle('#btStop { background: url("data:image/png;base64,'
			+ xbmc_buttons['stop'] + '") no-repeat; } ')
	GM_addStyle('#btStop:hover { background: url("data:image/png;base64,'
			+ xbmc_buttons['stop_h'] + '") no-repeat; } ')
}

/*
 * ============================================================================
 * Site dependent code here!!!!
 * ============================================================================
 */
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

/*
 * Read metadata
 */
function get_meta_contents(mn, dv) {
	var m = document.getElementsByTagName('meta');
	for ( var i in m) {
		if (m[i].name == mn) {
			return m[i].content;
		}
	}
	return dv;
}
/*
 * Youtube has more features than most streaming sites,it needs special
 * treatment
 */
function parse_yt_params(video_url) {
	var regex = /[?&]([^=#]+)=([^&#]*)/g;
	var params = {}, match;
	while (match = regex.exec(video_url)) {
		params[match[1]] = match[2];
	}
	return params;
}

function url_is_playlist(video_url) {
	switch (current_host) {
	case "youtube.com":
	case "youtu.be":
		var yt_params = parse_yt_params(video_url);
		if (yt_params["list"]) {
			return is_playlist
		}
		break;
	case "ted.com": /* TED plugin doesn't support playlists yet */
		break;
	}
	return !is_playlist;
}

/*
 * URI to send to AnyURL script in Kodi.
 */
function encode_url_for_queueing(context) {
	switch (current_host) {
	case "youtube.com":
	case "youtu.be":
		/*
		 * Better talk to YouTube plugin directly, it allows for more flexible
		 * use
		 */
		var yt_params = parse_yt_params(context['url']);
		return 'plugin://plugin.video.youtube/play/?video_id=' + yt_params["v"];
		break;
	case "ted.com":
		return 'plugin://plugin.video.ted.talks/?mode=playVideo&url='
				+ encodeURIComponent(context['url']) + '&icon=a';
		break;
	}
	/* URL needs extra processing on Kodi's side */
	anyurl_command = 'plugin://script.anyurl.player/?mode=play_video&url='
			+ encodeURIComponent(context['url']);
	if (context['title'] != undefined) {
		anyurl_command += '&title=' + context['title'];
	}
	if (context['description'] != undefined) {
		anyurl_command += '&description=' + context['description'];
	}
	return anyurl_command
}

/*
 * URI to send to a new playist.
 */
function encode_url_for_new_playlist(context) {
	switch (current_host) {
	case "youtube.com":
	case "youtu.be":
		/*
		 * Better talk to YouTube plugin directly, it allows for more flexible
		 * use
		 */
		var yt_params = parse_yt_params(context['url']);
		if (yt_params["list"]) {
			result = 'plugin://plugin.video.youtube/play/?play=1&order=default&playlist_id='
					+ yt_params["list"];
			if (yt_params["v"]) {
				result = result + '&video_id=' + yt_params["v"];
			}
			return result;
		}
		break;
	}
	return encode_url_for_queueing(context)
}

/* Add buttons only if necessary */
if (binarySearch(supported_hosts, current_host) >= 0 && top == self) {
	// First run?
	if (xbmc_address == '<host>:<port>')
		config_script();

	add_play_on_xbmc_buttons()
} else {
	console.log("Unsupported host " + document.documentURI)
}
