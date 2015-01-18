import re, sys, string
import urlparse

import urllib2
from urlresolver.types import HostedMediaFile
import xbmc
import xbmcgui
import xbmcaddon
import xbmcplugin

def reencodeYT(video_id):
    return "https://www.youtube.com/watch?v="+video_id

''' Extend Kodi player '''
class MyPlayer(xbmc.Player):
    def __init__( self):
        xbmc.Player.__init__(self)
        self._processed = False
        self._playlist = xbmc.PLAYLIST_VIDEO

    def onPlayBackStarted(self):
        # Hack here: dig into the playlists, 
        #   and resolve Youtube videos in advance
        playlist = xbmc.PlayList(self._playlist)
        position = playlist.getposition() + 1
        while (int(position) < int(playlist.size())):
            item = playlist[position]
            url_parts = string.split(item.getfilename(),'?',2)
            args = urlparse.parse_qs(url_parts[1])
            if (re.match('plugin://plugin.video.youtube', url_parts[0])):
                if not replaceItem(reencodeYT(args.get('video_id', [''])[0]), 
                            item.getLabel(), self._playlist, position):
                    position -= 1
            # Try next item on the list
            position += 1

        self._processed = True

    def isProcessed(self):
        return self._processed

    def setPlaylist(self, playlist):
        self._playlist = playlist


''' Read from incoming arguments '''
def getArg(args, label, default=None):
    for arg in args:
        match = re.match(label+"=", arg)
        if match:
            return arg[match.end():]
    return default

''' Create video labels '''
def createLabels(li):
    infoLabels={"Studio":"","ShowTitle":"","Title":li.getLabel()}
    return infoLabels

''' Try to resolve URL '''
def resolveURL(url,label):
    if (re.match('plugin:', url)):
        # No need to resolve anything
        li = xbmcgui.ListItem(label = label, path=url)
        li.setProperty('IsPlayable', 'true')
        li.setInfo(type="Video", infoLabels=createLabels(li))
        return (li, url)
    try:
        media_source = HostedMediaFile(url)
        xbmc.log("Resolving %s" % url, xbmc.LOGNOTICE)
        file_url = media_source.resolve()
        li = None
        if hasattr(media_source, "get_list_item"): li = media_source.get_list_item()
        if li:
            li.setProperty('IsPlayable', 'true')
            li.setInfo(type="Video", infoLabels=createLabels(li))
            return (li, file_url)
        if file_url:
            li = xbmcgui.ListItem(label = label, path = file_url)
            li.setProperty('IsPlayable', 'true')
            li.setInfo(type="Video", infoLabels=createLabels(li))
            return (li, file_url)
        else:
            xbmc.log("%s: Non playable URL" % (addon_id), xbmc.LOGNOTICE)
    except KeyError:
        xbmc.log("%s: Missing URL" % (addon_id), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception @resolveURL %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
    return (None, '')

''' Play a single video without touching the current playlist '''
def playVideo(url, label, playlist):
    try:
        li,file_url = resolveURL(url, label)

        if (re.match('plugin:', file_url)):
            player = MyPlayer()
            xbmc.log("%s: Play video: %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
            player.play(item = file_url, listitem = li)
            player.setPlaylist(playlist)
            waiting = 0
            while(not player.isProcessed() and waiting < 1000):
                xbmc.sleep(1000)
                waiting += 1
        elif file_url:
            xbmc.log("%s: Resolved URL: %s" % (addon_id, li.getLabel()), xbmc.LOGNOTICE)
            xbmcplugin.setResolvedUrl(addon_handle, succeeded=True, listitem=li)
        else:
            pass
    except:
        xbmc.log("%s: Unhandled exception @playVideo %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)

''' Queue a new URL into the playlist '''
def queueVideo(url, label, playlist, position):
    try:
        li, file_url = resolveURL(url, label)
        if file_url:
            xbmc.PlayList(playlist).add(file_url, li, position)
            xbmc.log("%s: Queue resolved URI: %s" % (addon_id, li.getLabel()), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception @queueVideo %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
        return False
    return True

def replaceItem(url, label, playlist, position):
    orig = xbmc.PlayList(playlist)[position]
    if not orig:
        xbmc.log("%s: No item in playlist %s" % (addon_id, playlist)) 
        return False
    resolved = queueVideo(url, label, playlist, position)
    xbmc.PlayList(playlist).remove(orig.getfilename())
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
    position = int(args.get('position',['0'])[0])
    playlist = int(args.get('playlistid',['1'])[0])
except:
    # Parse arguments as a non-handled plugin (e.g. script)
    base_url = "plugin://"+sys.argv[0]
    addon_handle = None
    mode = getArg(sys.argv, 'mode', '')
    url = urllib2.unquote(getArg(sys.argv, 'url', ''))
    label = urllib2.unquote(getArg(sys.argv, 'title', ''))
    position = int(getArg(sys.argv, 'position', '-1'))
    playlist = int(getArg(sys.argv, 'playlistid', '1'))

if mode == 'play_video':
    playVideo(url, label, playlist)
elif mode == 'queue_video':
    queueVideo(url, label, playlist, position)
elif mode == 'test':
    print "Do nothing, yet"
    pass
else:
    xbmc.log("%s: Nothing to play" % (addon_id), xbmc.LOGNOTICE)
