import re, string, sys, os
import urlparse

import urlresolver
import xbmc
import xbmcgui
import xbmcaddon
import xbmcplugin


base_url = sys.argv[0]
addon_handle = int(sys.argv[1])
args = urlparse.parse_qs(sys.argv[2][1:])
mode = args.get('mode', None)

addon_id = 'script.video.anyurl'

if mode[0] is 'play_video':
    url = "http://localhost/file.mkv"
    file_url = urlresolver.resolve(url)
    listitem = xbmcgui.ListItem(label = 'Title', path=file_url)
    listitem.setInfo(type='Video')
    # self.common.log(u"Playing video: " + repr(video['Title']) + " - " + repr(get('videoid')) + " - " + repr(video['video_url']))
    xbmcplugin.setResolvedUrl(handle=int(sys.argv[1]), succeeded=True, listitem=listitem)
