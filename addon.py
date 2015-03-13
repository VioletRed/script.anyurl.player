import re, os, sys, string
import urlparse

import urllib2
import xbmc
import xbmcgui
import xbmcaddon
import xbmcplugin

_locallib_path = os.path.dirname(os.path.realpath(__file__)) + "/lib/"
sys.path.append(_locallib_path)

def reencodeYT(video_id):
    return "https://www.youtube.com/watch?v="+video_id

''' Extend Kodi player in order to resolve playlist as soon as playback starts 
'''
class MyPlayer(xbmc.Player):
    def __init__( self):
        xbmc.Player.__init__(self)
        self._processed = False
        self._playlist = xbmc.PLAYLIST_VIDEO
        self._wait = 120 # Start by waiting 2 minutes

    def onPlayBackStarted(self):
        xbmc.Player.onPlayBackStarted(self)
        # Hack here: dig into the playlists, 
        #   and resolve Youtube (and others in the future) videos in advance
        playlist = xbmc.PlayList(self._playlist)
        position = playlist.getposition() + 1
        if (int(position) >= int(playlist.size())):
            position = 0
        resolvePlaylist(self._playlist, position)
        self._processed = True

    def onPlayBackEnded(self):
        xbmc.Player.onPlayBackEnded(self)
        self._wait = 30

    def isProcessed(self):
        return self._processed

    def setPlaylist(self, playlist):
        self._playlist = playlist

    def getWait(self):
        self._wait -= 1
        return self._wait

''' Read from incoming arguments '''
def getArg(args, label, default=None):
    for arg in args:
        match = re.match(label+"=", arg)
        if match:
            return arg[match.end():]
    return default

''' Try to resolve URL '''
def resolveURL(url, label, description=''):
    from urlresolver.types import HostedMediaFile

    if True:
        pass
    try:
        pass
        media_source = HostedMediaFile(url)
        xbmc.log("Resolving %s" % url, xbmc.LOGDEBUG)
        file_url = media_source.resolve()
        li = None
        if hasattr(media_source, "get_list_item"): li = media_source.get_list_item()

        if li: # Do nothing if resolver can create a ListItem
            pass
        elif file_url: # Resolved, but not with metadata
            li = xbmcgui.ListItem(label = label, path = file_url)
            infolabels={"Studio":"","ShowTitle":"","Title":label,
                        "plot":description, 'plotoutline': description}
            li.setInfo(type="video", infoLabels=infolabels)
        else: # Unable to resolve
            xbmc.log("%s: Non resolvable URL: %s %s" % (addon_id, url, label), xbmc.LOGNOTICE)
            return (None, '')
        li.setProperty('IsPlayable', 'true')
        return (li, file_url)
    except KeyError:
        xbmc.log("%s: Missing URL" % (addon_id), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception @resolveURL %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
    return (None, '')

''' Play a single video without touching the current playlist '''
def playVideo(url, label, playlist_id, description=''):
    if True:
        pass
    try:
        pass
        li,file_url = resolveURL(url, label)

        if li is None: return # Non playable URL

        if (re.match('plugin:', file_url)):
            player = MyPlayer()
            xbmc.log("%s: Play video: %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
            player.play(item = file_url, listitem = li)
            player.setPlaylist(playlist_id)
            while(not player.isProcessed() and player.getWait() > 0):
                xbmc.sleep(1000)
        elif file_url:
            xbmc.log("%s: Resolved URL: %s" % (addon_id, li.getLabel()), xbmc.LOGNOTICE)
            xbmcplugin.setResolvedUrl(addon_handle, succeeded=True, listitem=li)
        else:
            pass
    except:
        xbmc.log("%s: Unhandled exception @playVideo %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)

''' Queue a new URL into the playlist '''
def queueVideo(url, label, playlist_id, position):
    if True:
        pass
    try:
        pass
        li, file_url = resolveURL(url, label)

        if li is None:
            return False

        if file_url:
            xbmc.PlayList(playlist_id).add(file_url, li, position)
            xbmc.log("%s: Queue resolved URI: %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception @queueVideo %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
        return False
    return True

''' Recursive function to resolve "plugin://" adresses '''
def resolvePlaylist(playlist_id, position):
    xbmc.log("%s Looking for plugins in playlist %d from %d" % (addon_id, playlist_id, position), xbmc.LOGDEBUG)
    playlist = xbmc.PlayList(playlist_id)
    matched = False
    while (not matched and (int(position) < int(playlist.size()))):
        # Try next item on the list
        if resolvePlaylistElement(playlist_id, position):
            position += 1
            matched = True
    if (int(position) < int(playlist.size())):
        xbmc.sleep(10000) # Resolve one video every 10 seconds
        xbmc.executebuiltin("RunScript(script.anyurl.player,mode=resolve_plugin,position=%d,playlist=%d)" % (position, playlist_id))
    else:
        xbmc.log("%s Finished scanning playlist" % (addon_id), xbmc.LOGDEBUG)

def resolvePlaylistElement(playlist_id, position, url='', label='', description=''):
    xbmc.log("%s Looking for plugins in playlist %d from %d" % (addon_id, playlist_id, position), xbmc.LOGDEBUG)
    playlist = xbmc.PlayList(playlist_id)
    item = playlist[position]
    url_parts = string.split(item.getfilename(),'?',2)
    if len(url_parts) > 1: args = urlparse.parse_qs(url_parts[1])
    else: return True # Nothing to resolve
    if (re.match('plugin://plugin.video.youtube', url_parts[0])):
        url = reencodeYT(args.get('video_id', [''])[0])
        if not label: label = args.get('label',[''])[0]
        if not label: label = item.getLabel()
        if not description: description = args.get('description',[''])[0]
    elif (re.match('plugin://script.anyurl.player', url_parts[0])):
        url = args.get('url',[''])[0]
        if not label: label = args.get('label',[''])[0]
        if not description: description = args.get('description',[''])[0]
    if (url and label):
        return replaceItem(playlist_id, position, url, label)
    return True

def replaceItem(playlist, position, url, label):
    item = xbmc.PlayList(playlist)[position]
    if not item:
        xbmc.log("%s: No item \"%s\"in playlist %s" % (addon_id, label, playlist))
        return False
    orig_url = item.getfilename()
    resolved = queueVideo(url, label, playlist, position)
    xbmc.PlayList(playlist).remove(orig_url)
    if not resolved: # Just update infolabels
        infolabels={"Studio":"","ShowTitle":"","Title":label,
                    "plot":description, 'plotoutline': description}
        item.setLabel(label)
        item.setInfo(type="video", infoLabels=infolabels)
        item.setProperty('IsPlayable', 'true')
        xbmc.PlayList(playlist).add(orig_url, item, position)
        xbmc.log("%s: Queue resolved URI: %s %s" % (addon_id, item.getLabel(), orig_url), xbmc.LOGNOTICE)
    return resolved


addon_id = 'script.anyurl.player'
addon = xbmcaddon.Addon(id=addon_id)

try:
    # Parse arguments as a handled plugin (e.g: Playable URI)
    base_url = sys.argv[0]
    addon_handle = int(sys.argv[1])
    args = urlparse.parse_qs(sys.argv[2][1:])
    mode = args.get('mode',[None])[0]
    url = args.get('url',[''])[0]
    label = args.get('title',[''])[0]
    description = args.get('description',[label])[0]
    position = int(args.get('position',['0'])[0])
    playlist = int(args.get('playlistid',['1'])[0])
except:
    # Parse arguments as a non-handled plugin (e.g. script)
    base_url = "plugin://"+sys.argv[0]
    addon_handle = None
    mode = getArg(sys.argv, 'mode', '')
    url = urllib2.unquote(getArg(sys.argv, 'url', ''))
    label = urllib2.unquote(getArg(sys.argv, 'title', ''))
    description = urllib2.unquote(getArg(sys.argv, 'description', label))
    position = int(getArg(sys.argv, 'position', '-1'))
    playlist = int(getArg(sys.argv, 'playlistid', '1'))

if mode == 'play_video':
    if addon_handle: # Can't play video without a handle
        playVideo(url=url, label=label, playlist_id=playlist)
elif mode == 'queue_video':
    queueVideo(url=url, label=label, playlist_id=playlist, position=position)
elif mode == 'resolve_plugin':
    resolvePlaylist(playlist_id=playlist, position=position)
elif mode == 'resolve_single_plugin':
    resolvePlaylistElement(playlist_id=playlist, position=position, url=url, label=label, description=description)
elif mode == 'test':
    print "Do nothing, yet"
    pass
else:
    xbmc.log("%s: Nothing to play" % (addon_id), xbmc.LOGNOTICE)
