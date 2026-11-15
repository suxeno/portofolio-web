import urllib.request, urllib.error, time, json, subprocess, sys
if len(sys.argv) != 2:
 raise SystemExit('Usage: python3 scripts/cms-live-cache-probe.py EXPECTED_ACTIVE_VERSION_ID')
versions=json.loads(subprocess.check_output(['node_modules/.bin/wrangler','deployments','list','--name','portofolio','--json'],text=True))
active=versions[-1]['versions']
if active != [{'version_id':sys.argv[1], 'percentage':100}]:
 raise SystemExit('Active version does not match the expected 100% deployment')
print('Verified active version:',sys.argv[1],flush=True)
base='https://portofolio.arvinantobahtiar.workers.dev'
def get(path='/', headers=None, method='GET'):
 h={'User-Agent':'Mozilla/5.0'}; h.update(headers or {})
 req=urllib.request.Request(base+path,headers=h,method=method)
 try: r=urllib.request.urlopen(req,timeout=30)
 except urllib.error.HTTPError as e: r=e
 with r:
  body=r.read(); out={'time':time.time(),'path':path,'status':r.status,'render':r.headers.get('x-portfolio-render'),'cf':r.headers.get('cf-cache-status'),'cache':r.headers.get('cache-control'),'cdn':r.headers.get('cdn-cache-control'),'bytes':len(body)}
 print(json.dumps(out),flush=True); return out
first=get('/writing/data-systems/'); time.sleep(1); second=get('/writing/data-systems/'); third=get('/writing/data-systems/')
assert first['status']==second['status']==third['status']==200
assert first['render'] and first['render']==second['render']==third['render'], 'inner render identity differs on warm requests'
for p,h,m in [('/?verify=1',{},'GET'),('/',{'Cookie':'probe=1'},'GET'),('/',{'Authorization':'Bearer probe'},'GET'),('/',{'Cache-Control':'no-cache'},'GET'),('/',{},'HEAD')]:
 x=get(p,h,m); assert x['cache']=='no-store' and x['render'] is None
for _ in range(2):
 x=get('/writing/not-found-verify-123/'); assert x['status']==404 and x['cache']=='no-store'
target=first['time']+65; time.sleep(max(0,target-time.time())); after=get('/writing/data-systems/'); assert after['render'] and after['render']!=first['render'], 'identity did not refresh after >60s'; again=get('/writing/data-systems/'); assert again['render']==after['render']; print('LIVE CACHE PROBE PASS',flush=True)
