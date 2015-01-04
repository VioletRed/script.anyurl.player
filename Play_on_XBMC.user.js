// ==UserScript==
// @name        Play on XBMC
// @namespace   user@violet.local
//
// @description Resolve and play media on XBMC
// @description Use with AnyURL plugin from:
// @description         https://github.com/VioletRed/script.video.anyurl
//
// @date        2015-01-02
// @version     16
// @include     *
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @updateURL   https://gist.github.com/VioletRed/9577d8c062f3ff056c59/raw/Play_on_XBMC.user.js

// ==/UserScript==
// Simple script to send media to XBMC.
// Supported plugins:
// 	* Youtube
//	* TED
// 	* AnyURL plugin for other domains (https://github.com/VioletRed/script.video.anyurl).

// ==/UserScript==
// Add a "Send to XBMC" on a webpage
// It uses the old GM_*** API, and needs cleaning.

/* ============================================================================
 * Global config
 * */

var xbmc_address = GM_getValue('XBMC_ADDRESS');
var xbmc_queued = null;
const xbmc_music_playlist = 0; // Queue for party mode
const xbmc_video_playlist = 1; // Queue for video mode
//Remove known top domain names (i.e 'www', 'm', 'embed')
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
	consoloe.log("XBMC JSON Error")
}

function xbmc_json_timeout(response) {
	consoloe.log("XBMC JSON Timeout")
}

function json_command_answer(command, logmsgok, logmsgerr) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : command,
		onload : function(response) {
			console.log(logmsgok);
			return response;
		}
	});
	console.log(logmsgerr);
	return -1;
}

function play_movie_directly(video_url) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.Open", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url(video_url) + '" }}, "id" : 1}',
		onload : function(response) {
			show_ui_msg("PLAYING", 2000);
			console.log('Playing video');
		}
	});
	/* Clear playlist */
	setTimeout(
			function() {
				GM_xmlhttpRequest({
					method : 'POST',
					url : 'http://' + xbmc_address + '/jsonrpc',
					headers : {
						"Content-type" : "application/json"
					},
					timeout: 6000,
					data : '{"jsonrpc": "2.0", "method": "Playlist.Clear", '
						+ '"params":{"playlistid" : '+xbmc_video_playlist+'}, "id" : 1}',
					onerror: xbmc_json_error,
					ontimeout: xbmc_json_timeout,
				});
			}, 5000);
}

function open_video_playlist() {
	console.log('New video queue');
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.Open", '
				+ '"params":{"item": { "playlistid" : ' + xbmc_video_playlist 
				+ ' }}, "id" : 1}',
		onload : function(response) {
			console.log('Playing video');
			show_ui_msg("PLAYING", 2000);
		}
	});
}

function dont_open_video_playlist() {
	console.log('Queued video at the end ');
	show_ui_msg("QUEUED", 5000);
	return 0;
}

function play_in_new_playlist(video_url) {
	/* Clear playlist */
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		timeout: 6000,
		data : '{"jsonrpc": "2.0", "method": "Playlist.Clear", '
			+ '"params":{"playlistid" : '+xbmc_video_playlist+'}, "id" : 1}',
		onload : function(response) {
			/* Add movies to Video playlist */
			xbmc_queued = "";
			queue_movie_last(video_url, open_video_playlist); 
		},
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout,
	});
}

function queue_movie_at(video_url, xbmc_playlist, xbmc_queue_depth) {
	if (xbmc_queued == video_url) {
		// Show somehow that this action was already completed
		console.log("Already queued "+xbmc_queued);
		return;
	} 
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.Insert", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url_for_queueing(video_url)
				+ '" }, "playlistid" :'
				+ xbmc_playlist
				+ ', "position" : '
				+ xbmc_queue_depth
				+ ' }, "id" : 1}',
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout,
		onload : function(response) {
			xbmc_queued = video_url;
			show_ui_msg("QUEUEED", 5000);
			console.log('Queueing video');
		}
	})
}

function queue_movie_last(video_url, last_step) {
	if (xbmc_queued == video_url) {
		// Show somehow that this action was already completed
		console.log("Already queued "+xbmc_queued);
		return;
	} 
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.Add", '
				+ '"params":{"item": { "file" : "'
				+ encode_video_url_for_queueing(video_url) + '" }, "playlistid" :'
				+ xbmc_video_playlist + ' }, "id" : 1}',
		onload : function(response) {
			var result = JSON.parse(response.responseText);
			if (result.result == "OK") {
					xbmc_queued = video_url;
					last_step();
					return 0;
			}
		},
		onerror: xbmc_json_error,
		ontimeout: xbmc_json_timeout
	});
	return -1;
}

function queue_in_party_mode(video_url) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.GetItems",'
				+ '"params":{"playlistid" : '
				+ xbmc_music_playlist
				+ '}, "id" : 1}',
		onload : function(response) {
			var xbmc_response = JSON.parse(response.responseText);
			if (xbmc_response.result.limits == undefined) {
				console.log("Error: Playlist.GetItems bad response");
				return;
			}
			// Queue exist, enqueue media at the end of user
			// selection
			xbmc_queue_depth = xbmc_response.result.limits.end - 9;
			console.log("XBMC queue size is "
					+ xbmc_queue_depth);
			queue_movie_at(video_url, xbmc_music_playlist, xbmc_queue_depth);
		}
	})
}

function queue_in_playlist(video_url) {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Playlist.GetItems",'
				+ '"params":{"playlistid" : '
				+ xbmc_video_playlist
				+ '}, "id" : 1}',
		onload : function(response) {
			var xbmc_response = JSON.parse(response.responseText);
			if (xbmc_response.result.limits == undefined
					|| xbmc_response.result.limits.end == 0) {
				console.log("Playlist.GetItems bad response");
				play_in_new_playlist(video_url)
				return;
			}
			// Queue exist, enqueue media at the end of user
			// selection
			queue_movie_last(video_url,dont_open_video_playlist);
		}
	})
}

function play_movie() {
	video_url = document.documentURI
	console.log('Trying to play/queue movie');
	var xbmc_queue_depth = undefined;

	show_ui_msg("LOADING", 30000);
	/*
	 * Logic goes like this: First, try to queue the video. If it fails, play
	 * video directly. Because AJAX is asynchronous, we use a timer for "direct
	 * play", and cancel it if we succeed to queue the video where we want
	 */
	if (video_url == undefined || xbmc_queued == video_url) {
		return;
	}
	// Get the current playlist
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			"Content-type" : "application/json"
		},
		data : '{"jsonrpc": "2.0", "method": "Player.GetActivePlayers",'
				+ '"params":{}, "id" : 1}',
		onload : function(response) {
			var xbmc_active = JSON.parse(response.responseText);
			if (xbmc_active.result == undefined
					|| xbmc_active.result.length == 0) {
				console.log("No active players, play directly");
				play_movie_directly(video_url)
				return; // No active players
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
						+ ', "properties" :  [ "playlistid" , "partymode" ] }, "id" : 1}',
				onload : function(response) {
					var xbmc_properties = JSON.parse(response.responseText);
					if (xbmc_properties.result.partymode != true) {
						console.log("Not in party mode, play now");
						play_movie_directly(video_url);
						return;
					}
					queue_in_party_mode(video_url)
				}
			});
		}
	});
}


function queue_movie() {
	video_url = document.documentURI
	console.log('Trying queue movie/create new playlist');
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
		onload : function(response) {
			var xbmc_active = JSON.parse(response.responseText);
			if (xbmc_active.result == undefined
					|| xbmc_active.result.length == 0) {
				console.log("No active players, create a new queue");
				play_in_new_playlist(video_url);
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
						+ ', "properties" :  [ "playlistid" , "partymode" ] }, "id" : 1}',
				onload : function(response) {
					var xbmc_properties = JSON.parse(response.responseText);
					if (xbmc_properties.result.partymode == true) {
						console.log("Party mode, default play");
						queue_in_party_mode(video_url);
						return;
					}
					if (xbmc_active.result[0].playerid != 1) {
						console.log("Playing music, create a new queue");
						play_in_new_playlist(video_url);
					} else {
						console.log("Queue in playlist");
						queue_in_playlist(video_url);
					}
				},
				onerror: function(response) {
					/* No active playlist */
					console.log("Not playing playlist, queue and play")
					play_in_new_playlist(video_url);
				}
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
}

function stop_movie() {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : '{"jsonrpc":"2.0", "method": "Player.Stop", "params":{"playerid":1}, "id" : 1}'
	});
	xbmc_queued = "";
}

function next_movie() {
	GM_xmlhttpRequest({
		method : 'POST',
		url : 'http://' + xbmc_address + '/jsonrpc',
		headers : {
			'Content-Type' : 'application/json'
		},
		data : '{"jsonrpc": "2.0", "method": "Player.GoTo", "params":{"playerid" : 1, "to" : "next" }, "id" : 1}'
	});
	xbmc_queued = "";
}

/*
 * ============================================================================
 * UI functions 
 * ============================================================================
 */
function modify_xbmc_address() {
	xbmc_address = window
			.prompt(
					'Enter the address for the XBMC web interface\n(username:password@address:port)',
					xbmc_address);
	GM_setValue("XBMC_ADDRESS", xbmc_address);
}

//function modify_xbmc_playlist() {
//	xbmc_music_playlist = window.prompt('Set the PARTYMODE playlist number (0 or 1)',
//			xbmc_music_playlist);
//	GM_setValue("XBMC_PLAYLIST", xbmc_music_playlist);
//}

function remove_playing_msg() {
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
	remove_playing_msg();
	xbmc_title.innerHTML = msg;
	xbmc_ui.insertBefore(xbmc_title,xbmc_play_control);
	xbmc_msg_timer = setTimeout(remove_playing_msg, timeout);
}

function add_play_on_xbmc_buttons() {
	console.log('Found clip ' + document.documentURI);
	xbmc_ui = document.createElement('div');
	xbmc_ui.setAttribute('id', 'xbmc');

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
	xbmc_play.addEventListener('click', function() {
		play_movie()
	}, false);
	xbmc_play.setAttribute('id', 'btPlay');
	xbmc_play.setAttribute('title', 'Start playback');

	var xbmc_pause = document.createElement('span');
	xbmc_pause.addEventListener('click', pause_movie, false);
	xbmc_pause.setAttribute('id', 'btPause');
	xbmc_pause.setAttribute('title', 'Pause playback');

	var xbmc_stop = document.createElement('span');
	xbmc_stop.addEventListener('click', stop_movie, false);
	xbmc_stop.setAttribute('id', 'btStop');
	xbmc_stop.setAttribute('title', 'Stop video');

	xbmc_play_control.appendChild(xbmc_play);	var xbmc_next = document.createElement('span');
	xbmc_next.addEventListener('click', next_movie, false);
	xbmc_next.setAttribute('id', 'btNext');
	xbmc_next.setAttribute('title', 'Play next video');

	var xbmc_queue = document.createElement('span');
	xbmc_queue.addEventListener('click', queue_movie, false);
	xbmc_queue.setAttribute('id', 'btQueue');
	xbmc_queue.setAttribute('title', 'Queue video');

	xbmc_play_control.appendChild(xbmc_play);
	xbmc_playback_control.appendChild(xbmc_queue);
	xbmc_playback_control.appendChild(xbmc_next);
	xbmc_playback_control.appendChild(xbmc_pause);
	xbmc_playback_control.appendChild(xbmc_stop);

	xbmc_other_control.appendChild(xbmc_playback_control);
	xbmc_ui.appendChild(xbmc_play_control);
	xbmc_ui.appendChild(xbmc_other_control);
	
	document.body.parentNode.insertBefore(xbmc_ui, document.body);

	GM_addStyle('#xbmc { opacity:0.4; width:90px; position:fixed; z-index:100; bottom:0; right:0; display:block; background:#103040; -moz-border-radius-topleft: 20px; -moz-border-radius-bottomleft:20px; -webkit-border-top-left-radius:20px;  -webkit-border-bottom-left-radius:20px; } ')
	GM_addStyle('#xbmc:hover { opacity: 0.7; } ')

	GM_addStyle('#xbmcText { opacity:0.8; font-family:Terminal; text-align:center; font-size:12px; font-weight:bold; background:#401010; color:#a0a0a0 } ')

	// Play control
	GM_addStyle('#playControl span, #playbackPlay span:hover { width:40px; height:40px; float:left; display:block; padding-bottom:0px; -moz-background-size:40px; background-size:40px; -webkit-background-size:40px; -o-background-size:40px; -khtml-background-size:40px; cursor:pointer; } ')

	GM_addStyle('#btPlay { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQQ7DKP8ygAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAS6SURBVFjDzZh9TFZVHMc/5zxvYs58QRGNVeqW6bhNDXwBZfCIb2mz1IxejJUNNkwlFRV8jSlGCbMyNwN0utRiJb5Evo10Kuqcpnc20bSspQ41weTFh+c+9/QHz+OetWkgPMB3u3/c3XPu/dzfOed3zu8rNE1D13U0TXMAY4Bs4DlaR98CKcDfuq4rTdMQAJqmdfQ+HGO43XTpHorhdl03Dbcr0EQKhbTYHcJi61lVcRNpsQKkAl/run5LaJpmB3IQIsVVW8OoyYln+4R2LggO7npDmm53oAFNpfAIm+12taEd+alk6q9nj/az2YMANRfIFZqmBQO3XPdrSZq/oix1RsI0wAr10W1hGfOyN20vLsjqZ3O0AwiWwDLT4+H5yLirqTMSXjOVsrcSHKapbJ+mJU7r0/8FTNMDsFwCNQqFNjDiR1PhkEKoVlogSCmU4THt/cMHbldKAbgkMEgISfX1Ml0KHgrn7WAAZiAhrRapHNI4LYSshwZ0AKvVYnlURyGEmbYwY9i1O0ZYoCHraqtrH0QVaOiQekoO7hv7VFfbzozlWZPPl13uDAR8lcvGNLZYLG6AVSvSM2ampOQs/Wj1VO+CcrcJQH8dLtkfnrls0eLY+Anrzv9eMRCoMk1TtBlAnw4d/CEyvHeXTVmfbc6XUlajVNsC9Cl99jtRI53jTi9IXxJfWUP7+mFvOq1szr89UrI3KHv1yqyJ40evyvl8w3gQlqaueBmIiX308IHoubOSst54b87aqjqCgDrTVG0H0KdtBWuHxURHHVuW+cmHUorHiqQ10HnszKlSzpwqTTxaenywMy52S/r8Dw4BdUopqxCidSPor5K9O8Iz0mZlv/TK62u+23NosBCisiGbRIsB+lRc9M2IKRNj89+fuWADYGtzgD7lrcuOGx4zZue1G+X2Vp2DD5Nz9ISTyamL83qGhrjbFKBz7KSL0VFD1icnJZ3r0a3znf8b5hYFzMjMzU96980tYT273fMeMmytnmYAJkyacn33jsK3gJtAu8aUFAEFHOkcf2KUM/bLJYvmnQA6KGjX2ONOQAAjhsfdHhkVMXf+wqVXQrq0rwI68piVWLMDOkfF524s2FgYFtarrjm+0Wx5MG7cqxeK9pVOP3hg/1d+cE0vopr6gqiY+IuRQ4bsyfk4cz3QQSnVviF7bMABI4aOICp6RF7KzNlb+z7dvQLo5K3+mrcMfZxO06YnH9uS/8Vsm/VBpWoJWJ3ciLaiR2ivP3LXb86ak/x2YUvt4w8ADcPwPNImU8q6s+j7Td5be0AdJD8W6bM1nuzxbG/1iFTlnVsO7xUwc0mB6BDS+xmv1YIETCHg/IWLka46d6u4Wv6qqqqxXvj5eKIXxJTALiEEf135JSZ/644BwH2au7htmExAbizcnXju9MkQWW8V7bKEhISUCyFevF99r++lS5fiKzxB5cMHDbhcD4oJeFrgcgMybenKhL1F22cZhoEQYj+wxudRDwOKUaqTxWZ3DRg01GWTbHPX3K0MeNiUwm3KTpV3/0m4ee2qQynlAH4DYnVd/1P4ufzdgTLgCdM07c2dcBuUx4SoAyoBTdf1cn+X3wfZC4gHXm4Ja+0/sgHFuq7n+TP9C6ku1BHL4Se8AAAAAElFTkSuQmCC") no-repeat; } ')
	GM_addStyle('#btPlay:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQULM2H9JwAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAATySURBVFjDzZhZbFRVGMd/59w7dwqFFpC2QQMGrLKk3AYomxKhuLRQy1YWRUAiKESWWDQE8YFFKQYjEkEKyCIEjBA1QNkhFeKG7L1CI4mAAlEatlboTDsz9xwfmDb1xVrodPpP5mlybn7nW863CNu2cRwH27a9QAawBOhIdLQNmAbcdBxH27aNALBtOy78Z0YwGKBl6yQMKW6i3GCkibQGLQ1PMKQeKi+9gWGaALnAFsdxrgvbti1gqRBimt9XTva4qb/1Sknem5iYcNMSOqQjCCcABQRcYV69XtqhoGDXgLNHD7WzvE0B/RbwsbBtuzVwvcLvY8bcvCvTJ45aAMjw+YaW+86yzfO25y9sa8U0AWgtgXnKDZHaL/Pa9Imj5mmtjSjBobU2Fr85bv5jXVJRygWYLwGfUpqn+j19TIMlhCBaEkKgtPb07de/UCkFUCmB7giBFbh1QUBtIeeGwyZikkLohBax56ucKAEHwDSkrOWs+nzTli4374QSIw0pVChQDUztVqsG3L93V+8XMvovWrN+c7+/Sm40B0KRdrusy8VM0wyVld5iVf6KV3JzZ01bv/GLAeELuo0B8N4BaeAGfJz75XT71fnLx4+dMDn30rU7yYBfay2iDlj1xEopqfD7OFd0vPPg9J5zVmz4ZrYQoqKRAP5bluVl5YfvpgzNeWnN2g0be5RXam99xaesr5t6PBYXzjvW8mVLX5806dXXvtq+p0+NahZ9QADDMAEoLjrRdemHH0ycMXvhdF9AeYGg1jr6gNURKiXld8s83+7ZmpKVlbUi/7NNo4UQqtEA1rTojWtXWb50ceaLE6bM/fLrnd1qVKT/JTPiD62USMvi7Mnv2188f2bqwYOFRZMmTT7wZM+UM0BsbY1JxAGrrWmaVFb4OfnzkdRzRcc6DcwcdjZv3uy1tSWRpEEl0Erh95V7d2zb2CN7xNi80rI7ZqOwYHU7FArRLL4VyU90Kp4y/e3dLeKbu40CUGtNRYWfbr36/zEkO7NgSFbWhebNmvxdG0ODAGqliGkaq6bMnLPv5dFDD7SIi/WFk8OMbhYLgSGlz07r41+1bvWiGLgNWHUZKSICqJSLkAZduqYVDx82dPuYnOxioGkYrk6qd8BgIEC7x1PKxowcvjInJ+fPuFivP/ze3ZfM+kwCaRiVA599fueiRe8diY+Lqxr6jQf5rvng7lR4Y2JUcufuV3NzZ23p3a3jecBbXxc3HwRMSIPkTvbl9PT0ozPfmLwDaKLBW59ttXl/cVZJm3bJZA0evHv8+PGHElo1vws0IwITf50BXTfEwEEjnWVLFnzqMY2Il8w6AbZt+2hJds64LaOHZRxuqDpeDRhylaolTY28vPf3VXX4kYSqySKrlnTaimvznyF0b2fjiTScBkLe+CTCI4IElJCCE2ecziHXJdoKBILm0cP7B4l7mxglgZ1SGhSf+il1T+EP7YFAlNg0ILcWHMg8/uN3LQ3DANhpJCUllQgh0gL+u8mnThelWS0fvm137HA1DKrDHW+kfyFALPlk9TOb1+WPUMpFCHEA+KhqR90X2IvW8aY3Jti1e59AQutWhZYO3NURNptSmjJ/sNnvly4OvHblkqWU6wFxEUh3HOeyqLHlTwR+BWKVUlZD+laEk1AIEQBKAdtxnJKaW/4qyEeA54AhQLCBY9AD7HEcZ21Npn8Aiiz5zaXkaTgAAAAASUVORK5CYII=") no-repeat; } ')

	// Other control
	GM_addStyle('#playbackControl span, #playbackControl span:hover { width:20px; height:20px; bottom:0; float:left; display:block; margin-left:3px; -moz-background-size:20px; background-size:20px; -webkit-background-size:20px; -o-background-size:20px; -khtml-background-size:20px; cursor:pointer; } ')

	GM_addStyle('#btQueue { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFRMBzyyh7gAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAJjSURBVDjLpVRNaBNREP7eT5rWCDWVEExF2rR6iNlUEGxBA4Iobf2h1V6kEkQiDQR78+JBQYTiVbwEL0kaLz2IggdBJIX4Uy2kehBpxFBiLUqVVMFmd7O7z4ObEmK2MfrBsDM7876dmTezJCBJHYSyGGNsGBAK/gmkTde1rBBihIOQWIfLve/ytZsXhg71LQAwmmV797HYfSk8fuPrl5U483g8ibGz41dCYydeA9gCoLWOMAA2C7/d1d72vaTR5ez8XJQC0Ht3dX42D/wBWVZoeCI6EJ6IDsiyQi2y5Du2b10FhMEBCCEMYVVPOp1un07GYwBweuTk0eGhwWK9OJND8EYNkuUSVHkdAKCYz81AG3ackCq9YTjqZWgA0CuG0+nUavRyVSyrTaqWUJwLnd//LDM7SClTAUDTtNaKMxQKTXLOZQAwDL3lYPDwo1QynrUiFAD43enEnXo9B4BCoTBa/XJpKXEmlYz3A1CtMjT8UuDWyqflfkqpBgC6rtuKxeIBs+RXjLHy7wwN7unc+RKABoDUIyQAMPfieSqfz88wxgAAmUxmWyQSeQgAU1NT14PB4Jr5IXi9XtU8JywvxeFwGJIkyRU7l8tt7Lfb7VZ8Pp/8X2PTLHjjOaSEMr6h/xVh9fDWYq/f/7Or2/ugojdaAA6ArMsqq25sNXp7vMqH94tXTdNmwSeUss4BUCoE1h4/mT1ubkfZHINaIabU85UBlJ/OvzkGkCIJBPpOtdjtM109u+953K4FSpr7wQqArH77sSe3+PaiKpdGSUCSqACOUMYmCeCwKn2zexMADF2/TYD7vwBiPd9+VARjVwAAAABJRU5ErkJggg==") no-repeat; } ')
	GM_addStyle('#btQueue:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFRMZ3EA5uAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAJaSURBVDjLrVRbSJNRHP+dy7dcrE1xZNh0uYZkMCPCQLxALAiih4JeJDISukkUoS8+7qkLJQo9lEFhIj4JQUTRzdCMWi8+RTiZ1oggnGVZ6b5z6aHvy9umW/WHP+ccDufH73LOIaFQqIAy1mUYxj4CmMi5CDR0nplKvVZK7eeU0i5faVld5EL7pR0Vm2IAdK6IH5LfN5w+0XR8fGy0m230+XrOnGu5Hq6tigHIA+BI0wwAB7AmzZ7hXuuYWVew/tPgwOMGTgAVKCmesg4sKyEk6entqwCAw4caYpyzdApYsdf9BdDaAsmscmJiwtXZ2dECAHU11a3B4OZvK+nnqxkkpcDsjxmL7eqZ8axcJ2TRmCugBiDthdPpFEvmYqF3AMhKgPrajZvlw4MDOxljAgBM03QwxgAAbW1tBw3DSP22QvKa+l3Rk8eaRjMCzmnQ9ssXW7kFYMvknGsAGBkZqdV6PsBX0Wj9kaNNp5x8nvUiQAeBDu/e0/9+fGwrZUzaTBKJxBYA8Pv9b23mSkpWWhZ84+Tz9iwDJAA6O648+jo9/cwOIB6PuxobG88DQCQS6Q4EAjMAoLWG2+MxrWM6YygOw9BerzdlrycnJ//cFbfbbRYWFqZWSpniPxfP5jehjC8w5R8Bi4qKZiu3bX9uz7MBJD9TZkbp+fkes6/39q3VCMyZkgEgVCmVvHvvQbX1OoQ1Lm1idbo9AUA8GXpZpTSSXErZ/PTh/f7mz1Ou8mAgxihRuYSgtSbvEh9LXgwP7ZXCPEAqQyGqgTBj/CylxPU3P7bSWkkhrgK48wuevOEqllHmIwAAAABJRU5ErkJggg==") no-repeat; } ')

	GM_addStyle('#btNext { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFRIgml6A8QAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAALLSURBVDjLpVRpSJRRFD33fd+US5HLOFMQEwlaTGq0iqkZqFgQ+DPaMxSEFkMkkiYqc0w0GqggIrUmog2iH0URtNOPos2mMi01y8zJsqQhx2a+791+OAaZewcuPB73nXfvuYdLCfHxKogyhRCbAIQAYIwGRMTMGku5n4S4o4JEXnDoBEfMTKszKmxiPRFGx6cY0Nbutr6tr7vl/9WzQhWCShYkJu097Ki8AkBgbLi6Pm+T99nDe5WCiManp6XUAlABEAAlcB5J6AGJghKsMQ/ACBcAoKoKA+iZM3fBNtsee5zb/VkdRku95oTTNC4o5EWUecqpjo4v4w2KYO7XovbhfVNseeke56KUlOLSckccAC8AyfwPt+Z0OtP8v7zw/OgyV1VXW4QQjH6EJISi67qGd02N2fYSm2OmNd7e4vaEEVFPf0ap+zUAALMES73vftAh9Hi7Ixpev8yOnWa8tGJ1TnZA38Gcg2EJ+3L9Pt+kC2dO2i3TY46UHzg062vnd0NgGANCHakvWlsaE23FRfOdNVVXVq9Ze44HKWZUvtM1v9LS0ryss+tHhCIU/m9Ca/y8G2+bWzMcFfvuSKmPjVBRVGmMMj/dXebIfeV6vHXq5PCfQ70bQkNCRKSxPjl1ybmq48eum4zh3YHlMSQGJAwKDpVL0rMqCjbn31ialfktYBnDX3rqutL3s6ZpYsCWiUi3RMfWnj1zOuPa5Yvnl2ZldgVy+ntQXblu4yMikiGhE9yr1m5ol1L+qZBkb37Q9h07jxYVFjwBMJGZFRpklzGzsiU/tykxMTXTGBnmi7aYPRAGAkCCmbWbt+9aAWhFhQUNzDwJgKAhFiMRgZnVhXNmfI+2mLsBeJ/XvUkmwKOYTCbfp7aPpR3fPK7FKUnvicgHwD9cEJEfgAbAv6vs4PL7N6/ZpJQ5lJAwWwG4nFkWMY9tu/b2Kuwul8v2G/TBGqKeojdGAAAAAElFTkSuQmCC") no-repeat; } ')
	GM_addStyle('#btNext:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFRMojZ45ggAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAALOSURBVDjLpVRpSJRRFD33vW9cGqc0wmyDSY0wstH2sgwVszLDlDZLwlbaLFAqW0mUoh/9KKKCEPSPERROiIaVFoUTmWWiFW60QFCR0TaLzndfPxohLbWxAxfej8t595x73qPIyEgNQKLUtN2ChJEICl5AAYKZXazrJ4UQdzUi2mIaEXR+bszCSvO4kOdCELwiJImWtg6z7cG9apfDvkaTUhampqUX5e7bUwtAYGiwHTia76gou3paSCn94mMXtAHQABAA6UXxL9XwmTcz+oVSCBQAIKVQAFw7d2WnX7dWmH/Y7dLT2B+47vGTwOjpM4uWLE0+ZHc4DQZNKPSRyK9ftU84cfxw3tZt29eXV96eCKCrH2L9htUa7e524euXz0EPH9pG9yyzl2dSSmbdjabGZzEF+cd2b8zavOnDZ7vRQ9wLRMpNRCAiFkSsPNeKPxsJRASH/Yep4cnjhcuT4grOnL0Q4/G3V9/fMOhWXS6n8fLFc1tWrFy19+atGrPd4dQ8y/grtH/JhMFgQEfri4iD+3MmW6KibRnrMqqZWQxpwt/8hbu7Szxvbp79sfOLSQip/ouQmTFtxpz6qjs1ORvWpjUASnktWSkFqWk8OmRs+9Yd2WXpKYubAPgONIjWHxGzQsiYsW8SEpNq9uza8SjA6O8E4DeYEu1PaTr8h5nUspTU0syM1fXhYaHfPJHp1avrbuG5nJiZemIk+mSLQydNaSspKc45cfRgTXhY6Pe++evZUXxi8kshhAowDe+Mmj7rk1KKeiYk/nX2zd6XY02Ii20BMGwgn5RSIn7R/Hdl5VW5AUb/7pGBJjtDAgAJXde7796/bwbgToiLfQvA2M9UfV+JNI8P/jYqyOQE0FVb93QqAd9lcHCwq7WlJc8nILDVMjXiPQC3F6UD0C8VX5l3rbQ4k9mdRRaLRTLzKWbOVUoN6XclIkgpCxsbG4/8BG2OH3Fa2XjVAAAAAElFTkSuQmCC") no-repeat; } ')

	GM_addStyle('#btStop { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQwH6xUKRQAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAIQSURBVDjL7VRPSFRxEP5m3vMtS4QSVocKQ6Rt6+0e1lqqQx2ysKQCD0UXF0SEaKmVYA9BlomHAkESC6KORUZCp4qN1FYr9NCfXVCiJPAQRHSxfK277/2mQ4+wtXV3o2MD3+k38/HNN78ZCgQCXmY+xZoWh0gFyg0iTUQsx7ZPptPpuzozd1euWt2+7+CRnqBvY4oJUg6f5q00EonHDeOjiUHTNB0KhULzx1rauuKnTzwAUL5CQABk26JnOl8MP/SwiNhb62pSLhm7UACcIiA3VwNgrDRkkpg9OgAw0682k88mqs93XYy9mnzuy+WyKl+OUg7V1Pqdlkjkytl4bNwlBP1UCj0//1znhVhy+FHjcj2+nXqNnu6Z/lB9+Gjj3l3vFr9xvh9vXk6YpRhnffuKa/29frf9goTILmScUqdhzc8tsYTxj+M/ISCiqNRipVRxwuo160re5c2B+qJT5gNNh27rFUZRsrpN5ueBvstP8vc/f1Po+tW+If+W4MfBWzd9CxlriVrHthHevd++MdB7R0QcIvrNIp2I9KziFe7VAAB0RFuTHdHWkeWuIABjEZlAM7wQIRbBl5GnY00AcgBsF+SqLwTNXTnbrbPef5htBmSWgsFgs+HxDu3c03C/dv3ae4Q/jK6wTCHDWzWaHIvMTKd3KOVsoG3bw8hmvh9Xoi4BVPUXX48I+ETMh1Op1NQPxAjCXNn+aRUAAAAASUVORK5CYII=") no-repeat; } ')
	GM_addStyle('#btStop:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQwsR6nzBQAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAIfSURBVDjL7ZRLSJRRFMf/59z7NQTlECIWkaOWmDkDQg8J2gjRLJqSQIIsYkYSIqOhVbso3LQII1rXLqK0LMMya+ixcjElfZbgxohqETE9CKxvvvto8xXT6DhNbTvw39zH755z7jmHYrHYUmY+JqVzggghVGwktNFfle/3TU1NXZPM3F+zcnW6+2DqUtuGplkm2EpwVoScu/fGNw4PXrkabW3VUkrnSLLn0MX9e/dMAJCVugfAtkXX38p9+hIeHbrczUSw0ea1swAcABzIAjBlRIEYgFNXu2LGAkskADDTrydfvX5TNXDuQtdL92md1mpe+NYaqq5dY1LJ5NDunTteBED8zFRxiPbswPmuh/fvtAshQEQLxpnLfUT/6ZPphsbGU7GWde8K97gYOO0+axRCgJlBRAtKSgnv+xzGRkciAPRiQCjlm1Ke/fYbRFC+Z4M8lgb+q/0HAtb+eedZa8oDl4erYYwpC9Nao2ZVxJYDUmJX5wMhHWitS8gg73mob2r53Js6kAUgCgHFnUJ9h3ueRBoaco8zY3XKz8/zwBiN+qaYPn60NwNYAxAFvW8DIAlPmVCwQACQiHc8T8Q7JstMGaegpq2yHAJArI3+MDae2QpABW2kgwtiEXHBWQXAm8hObmOmt1IrlR4ZHrzu5f2qTW2tj0RlA9Yqy8tu3Lwdn3GzzVLI7bR5Szu8b3P7tDFnAIT/pvSI6D0zd7quO/0DuWzdLIYmGtcAAAAASUVORK5CYII=") no-repeat; } ')

	GM_addStyle('#btPause { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQs0G4T9lAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAI3SURBVDjL7ZRfSNNRFMe/59y7zSVWCk2KIgihB2HLCAqKIihfymAjStlTJER/3upB2p6aw/4o0WOPIWTQQ71Yrj+iUKATKbFAE5Mowmr2Z9PN/fnd04ML7EejFvTWF87DvZf7OecevveQz+vVYN7PSp1hYreABGWIICxG8paV72CSAQ3i1orKqs56b0OPp6Z6yphCDiD6M5xAOVz6w8eEb/zZSH82s3BUK62ju/c2dl2OhG8DUChfAqD39NlQ9smj3ivMrJx7dm4fBeAAoH+EiOhiArV8HwDb1g4A2lu/eRjM1QyCECFnzzr9esbtDxze19l1rQ6AAWBudPdsaGo61Dg5Nb3C3sp8djHJTNAlnpENBoPH48NDpx7E+mabW44E1q9bmzh5ovVmJpN2J5PJS4ODA7dsLSKRpfJ/qc9ziZUAxLIK1uhIvBKAZDJpNwDMz6ecpe6VBBIt2YeIwMxiO0PZwL/Vf+C/A4qxLAYAEaFCIU/FLwYAMMZQuUDeuKluFgA5XRWW3x/4BkCtWl3zCQDWeGpTZQFFxPX4Yaw7Eu1oHht/GQRgiUjV1y9zB0KhcEus7/6dUoNEQ0Ag5bAbV0R0+HzbZDEpFc1stbdHJkRE2c2tnW4NgNgYyzwdim8FsLi8T8ULCgD9NE8BO0wALLyYeLVLjEkpT60n+/7d2wupPL/ZsW3LDIA0gHwZoaNXrx/sv3e3zRRyx8jnbVBC5iLA51gxQGwr6jfT1RhALEAkOjb2PPwdLsfi/2OSoc8AAAAASUVORK5CYII=") no-repeat; } ')
	GM_addStyle('#btPause:hover { background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gsQFQwaiBNmnAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAIoSURBVDjL7ZRNSFRRFMf/59z7Zho/KJ2mRQousg+oFNGwhr5hIGhXUO2iaNEiaNFQgolt0nCTEUG0iAiDiFoYRJZiSl9YRLaSKCVyoWA5b2rUGee9e1rMDJj1YEZo1x8O3Hsu93f/58C5VFNTq4k5orV1SmldDGJBIRJhx0mnXGe+ndz0gGZWJ0rLgp3hnbufVlVWjCgmJ38YIET8eexL9YuBvv7Zn/HDWvt8bQcPHek6ffL4IACFpel1S1tJ8uG92x2sLd+yXdvDnwDoLHBhcJ45vbWhdoSUXsFELIp5cZkSs+O+K9du1PcPvlydKQ7y5t2HlZ1Xrzd8m7b9iy0yUZKIoYUA0B8lpNs7Lu9/8vjRgfJg6PuWhgfNpcWB+Jno2dYf8VjAtu2uCy1N/Vm3GREAogWJRbLtWAmTEdedl8nJiQAAmZtJBCAO5mYSPq97nkAikuzDklvnjGDBPm/gUvUf+O+AYozLmdkHua6hzFogAogYLhTIlZVVU0IW+QNF7vq1axIAuCwYmmbtR3kwlPACapjsYP0uq7U52hve1vixvr5uCoABUNTX032up/dZxb7Inq9eZrSIS0bkb4cqsnfHeG6ocq3wggkphjHErpN2nr8aWgcg7dESyqNNyaG37zca4yZUKBRKjo6NNgWWrxrftKF6AsA8AKeAoJt3uxvv37l1NJ2aPUa1dZsVjLokpKJsWSBSAFHePzbEwDgpkLgXh4eHz/8CWfTZHcuWkAsAAAAASUVORK5CYII=") no-repeat; } ')
}

/*
 * ============================================================================
 * Site dependent code here!!!!
 * ============================================================================
 */
var supported_hosts = [ '180upload.com', '2gb-hosting.com', 'allmyvideos.net',
		'auengine.com', 'bayfiles.com', 'bestreams.net', 'billionuploads.com',
		'castamp.com', 'cheesestream.com', 'clicktoview.org', 'cloudy.ch',
		'cloudy.com', 'cloudy.ec', 'cloudy.eu', 'cloudy.sx', 'crunchyroll.com',
		'cyberlocker.ch', 'daclips.com', 'daclips.in', 'dailymotion.com',
		'divxden.com', 'divxstage.eu', 'divxstage.net', 'divxstage.to',
		'donevideo.com', 'ecostream.tv', 'entroupload.com', 'filebox.com',
		'filedrive.com', 'filenuke.com', 'firedrive.com', 'flashx.tv',
		'gorillavid.com', 'gorillavid.in', 'hostingbulk.com', 'hostingcup.com',
		'hugefiles.net', 'jumbofiles.com', 'lemuploads.com', 'letwatch.us',
		'limevideo.net', 'megarelease.org', 'mega-vids.com',
		'mightyupload.com', 'mooshare.biz', 'movdivx.com', 'movieshd.co',
		'movpod.in', 'movpod.net', 'movreel.com', 'movshare.net', 'movzap.com',
		'mp4star.com', 'mp4stream.com', 'mp4upload.com', 'mrfile.me',
		'muchshare.net', 'nolimitvideo.com', 'nosvideo.com', 'novamov.com',
		'nowvideo.ch', 'nowvideo.eu', 'nowvideo.sx', 'ovile.com', 'play44.net',
		'played.to', 'playwire.com', 'primeshare.tv', 'promptfile.com',
		'purevid.com', 'putlocker.com', 'rapidvideo.com', 'realvid.net',
		'seeon.tv', 'shared.sx', 'sharefiles4u.com', 'sharerepo.com',
		'sharesix.com', 'sharevid.org', 'skyload.net', 'slickvid.com',
		'sockshare.com', 'speedvideo.net', 'stagevu.com', 'stream2k.com',
		'streamcloud.eu', 'streamin.to', 'ted.com', 'thefile.me',
		'thevideo.me', 'trollvid.net', 'tubeplus.me', 'tune.pk', 'ufliq.com',
		'uploadc.com', 'uploadcrazy.net', 'veehd.com', 'veoh.com',
		'vidbull.com', 'vidbux.com', 'vidcrazy.net', 'video44.net',
		'videobb.com', 'videoboxone.com', 'videofun.me', 'videohut.to',
		'videomega.tv', 'videoraj.ch', 'videoraj.com', 'videoraj.ec',
		'videoraj.eu', 'videoraj.sx', 'videotanker.co', 'videoweed.es',
		'videozed.net', 'videozer.com', 'vidhog.com', 'vidpe.com',
		'vidplay.net', 'vidspot.net', 'vidstream.in', 'vidto.me', 'vidup.org',
		'vidxden.com', 'vidzi.tv', 'vidzur.com', 'vimeo.com', 'vk.com',
		'vodlocker.com', 'vureel.com', 'watchfreeinhd.com', 'xvidstage.com',
		'yourupload.com', 'youtu.be', 'youtube.com', 'youwatch.org',
		'zalaa.com', 'zooupload.com', 'zshare.net', 'zuzvideo.com', ];

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

/* Youtube has more features than most streaming sites,it needs special treatment
 */
function parse_yt_params(video_url) {
	var regex = /[?&]([^=#]+)=([^&#]*)/g;
	var params = {}, match;
	while (match = regex.exec(video_url)) {
		params[match[1]] = match[2];
	}
	return params;
}

function encode_video_url_for_queueing(video_url) {
	switch (current_host) {
	case "youtube.com":
	case "youtu.be":
		/* Youtube has it's own playlists, but Kodi doesn't support 
		 * queueing a list within another list.
		 * Thus, we queue only current video. */
		var yt_params = parse_yt_params(video_url);
		return 'plugin://plugin.video.youtube/play/?video_id='
				+ yt_params["v"];
		break;
	}
	/* All other domains use the same URI for queueing and playing */
	return encode_video_url(video_url);
}

function encode_video_url(video_url) {
	switch (current_host) {
	case "youtube.com":
	case "youtu.be":
		/* Better talk to YouTube plugin directly, it allows for more flexible use */
		var yt_params = parse_yt_params(video_url);
		if (yt_params["list"]) {
			result = 'plugin://plugin.video.youtube/play/?play=1&order=default&playlist_id='
				+ yt_params["list"];
			if (yt_params["v"]) {
				result = result + '&video_id=' + yt_params["v"];
			}
			return result;
		}
		return 'plugin://plugin.video.youtube/play/?video_id='
			+ yt_params["v"];
		break;
	case "ted.com":
		return 'plugin://plugin.video.ted.talks/?mode=playVideo&url='
			+ encodeURIComponent(video_url)
			+'&icon=a';
		break;
	}
	return 'plugin://script.video.anyurl/?mode=play_video&url='
			+ encodeURIComponent(video_url);
}

/* Add buttons only if necessary */
if (binarySearch(supported_hosts, current_host) >= 0 && top == self) {
	GM_registerMenuCommand('Modify the XBMC address', modify_xbmc_address);
	// GM_registerMenuCommand('XBMC partymode playlist', modify_xbmc_playlist);
    // First run?
	if (xbmc_address === undefined)
		modify_xbmc_address();
	//if (xbmc_music_playlist === undefined)
	//	modify_xbmc_playlist();

	add_play_on_xbmc_buttons()
} else {
	console.log("Unsupported host " + document.documentURI)
}
