import re, string, sys, os
import urlparse

import urlresolver
import os
from urlresolver.types import HostedMediaFile
import xbmc
import xbmcgui
import xbmcaddon
import xbmcplugin

addon_id = 'script.video.anyurl'
addon = xbmcaddon.Addon(id=addon_id)

base_url = sys.argv[0]
addon_handle = int(sys.argv[1])
args = urlparse.parse_qs(sys.argv[2][1:])

try:
    mode = args['mode'][0]
except KeyError:
    mode = None

if mode == 'play_video':
    try:
        url = args['url'][0]
        media_source = HostedMediaFile(url)
        file_url = media_source.resolve()
        media_labels = media_source.get_media_labels()
        li = xbmcgui.ListItem(label = media_labels['title'], path = file_url)
        li.setThumbnailImage(media_labels['icon'])
        xbmc.log("%s: Play video %s %s" % (addon_id, media_labels, file_url), xbmc.LOGNOTICE)
        xbmc.Player().play(item = file_url, listitem = li)
    except KeyError:
        xbmc.log("%s: Missing URL" % (addon_id), xbmc.LOGNOTICE)
    except:
        xbmc.log("%s: Unhandled exception %s" % (addon_id, sys.exc_info()[0]), xbmc.LOGNOTICE)
else:
    xbmc.log("%s: Nothing to play" % (addon_id), xbmc.LOGNOTICE)
