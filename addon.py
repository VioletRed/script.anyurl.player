import re, string, sys, os
import urlparse

import urlresolver
import urllib2
import os
from urlresolver.types import HostedMediaFile
import xbmc
import xbmcgui
import xbmcaddon
import xbmcplugin

def resolveURL(url,label):
    try:
        media_source = HostedMediaFile(url)
        print "Resolving %s" % url
        file_url = media_source.resolve()
        if file_url:
            li = xbmcgui.ListItem(label = label, path = file_url)
            li.setProperty('IsPlayable', 'true')
            return (li, file_url)
        else:
            xbmc.log("%s: Non playable URL" % (addon_id), xbmc.LOGNOTICE)
    except KeyError:
        xbmc.log("%s: Missing URL" % (addon_id), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
    return (None, '')

def getArg(args, label, default=None):
    for arg in args:
        match = re.match(label+"=", arg)
        if match:
            return arg[match.end():]
    return default

addon_id = 'script.anyurl.player'
addon = xbmcaddon.Addon(id=addon_id)

print sys.argv
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
    try:
        li,file_url = resolveURL(url, label)
        if (re.match('plugin:', file_url)):
            xbmc.log("%s: Play video %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
            xbmc.Player().play(item = li.path, listitem = li)
        elif file_url:
            xbmc.log("%s: Resolved URL %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
            xbmcplugin.setResolvedUrl(addon_handle, succeeded=True, listitem=li)
        else:
            pass
    except:
        xbmc.log("%s: Unhandled exception  %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
elif mode == 'queue_video':
    if (re.match('plugin:', url)):
        li = xbmcgui.ListItem(label = label, path=url)
        xbmc.PlayList(playlist).add(url, li, position)
        xbmc.log("%s: Queue plugin URI %s %s" % (addon_id, label, url), xbmc.LOGNOTICE)
    else:
        try:
            li, file_url = resolveURL(url, label)
            xbmc.PlayList(playlist).add(file_url, li, position)
            xbmc.log("%s: Queue resolved URI %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
        except:
            xbmc.log("%s: Unhandled exception %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
elif mode == 'test':
    print "Do nothing, yet"
    pass
else:
    xbmc.log("%s: Nothing to play" % (addon_id), xbmc.LOGNOTICE)
