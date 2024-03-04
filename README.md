# antelopex-worker
install with 
```
yarn build
```
create db
```
prisma db push
```
configure your worker by editing the example example.env.jsonc  
in chain section make sure that all details for all chain are setup properly

install pm2  
run all needed scripts with pm2  
use example ecosystem file  

```
cp example.ecosystem.config.json ecosystem.config.json
pm2 ecosystem.config.json
```

