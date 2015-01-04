import re, string, sys, os
import urlparse

import urlresolver
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
            media_labels = media_source.get_media_labels()
            if not media_labels.get('title',''):
                media_labels['title'] = label
            li = xbmcgui.ListItem(label = media_labels['title'], path = file_url)
            li.setProperty('IsPlayable', 'true')
            # li.setThumbnailImage(media_labels['icon'])
            return (li, file_url)
        else:
            xbmc.log("%s: Non playable URL" % (addon_id), xbmc.LOGNOTICE)
            # xbmcplugin.setResolvedUrl(addon_handle, succeeded=False, listitem=li)
    except KeyError:
        xbmc.log("%s: Missing URL" % (addon_id), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
    return (None, '')

addon_id = 'script.anyurl.player'
addon = xbmcaddon.Addon(id=addon_id)

print sys.argv
try:
    base_url = sys.argv[0]
    addon_handle = int(sys.argv[1])
    args = urlparse.parse_qs(sys.argv[2][1:])
    mode = args.get('mode',[None])[0]
    url = args.get('url',[''])[0]
    label = args.get('title',[''])[0]
    index = args.get('index',[''])[0]
except:
    base_url = "plugin://"+sys.argv[0]
    addon_handle = None


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
elif mode == 'queue_add':
    if (re.match('plugin:', url)):
        xbmc.log("Just a plugin")
    else:
        try:
            li, file_url = resolveURL(url, label)
            if (re.match('plugin:', file_url)):
                xbmc.log("%s: Queue video %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
            elif file_url:
                xbmc.log("%s: Queue resolved URL %s %s" % (addon_id, li.getLabel(), file_url), xbmc.LOGNOTICE)
        except:
            xbmc.log("%s: Unhandled exception %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
elif mode == 'queue_insert':
    pass
else:
    xbmc.log("%s: Nothing to play" % (addon_id), xbmc.LOGNOTICE)


print "Goodbye, thanks for visiting"
