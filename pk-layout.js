(function(){
  if (new URLSearchParams(location.search).get('preview') === '1') return;
  const box=document.getElementById('pkOverlay');
  if (!box) return;
  const key=new URLSearchParams(location.search).get('k')||'';
  async function sync(){try{const response=await fetch('pk-status.php?k='+encodeURIComponent(key),{cache:'no-store'});const data=await response.json();const layout=data.battle?.layout;if(layout){box.style.left=layout.x+'px';box.style.top=layout.y+'px';box.style.width=layout.width+'px';box.style.height=layout.height+'px';box.style.transform='none';}}catch(error){}}
  sync();setInterval(sync,2000);
})();
