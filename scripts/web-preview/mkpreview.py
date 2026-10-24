import re,base64,glob,os,sys
D=os.path.expanduser('~/webdist')
js=open(glob.glob(D+'/_expo/static/js/web/entry-*.js')[0],encoding='utf-8').read()
mime={'ttf':'font/ttf','png':'image/png'}
n=0
def rep(m):
    global n
    p=D+m.group(1)
    if not os.path.exists(p): return m.group(0)
    n+=1
    ext=p.rsplit('.',1)[1]
    return '"data:%s;base64,%s"'%(mime[ext],base64.b64encode(open(p,'rb').read()).decode())
js=re.sub(r'"(/assets/[^"]+\.(?:ttf|png))"',rep,js)
a='if(o.visualViewport){var c=o.visualViewport;e=Math.round(c.height*c.scale),t=Math.round(c.width*c.scale)}else{var l=o.document.documentElement;'
assert js.count(a)==1
js=js.replace(a,'{var l=o.document.body;')
js=js.replace('</script','<\\/script')
head=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'head.html'),encoding='utf-8').read()
out=head+'\n<script>\n'+js+'\n</script>\n'
os.makedirs(sys.argv[1],exist_ok=True)
open(sys.argv[1]+'/index.html','w',encoding='utf-8').write(out)
print(n,len(out))
