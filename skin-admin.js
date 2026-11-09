(() => {
  const list=document.getElementById('adminSkinList');
  const form=document.getElementById('adminSkinOrder');
  if(!list)return;
  list.addEventListener('submit',event=>{
    if(event.target.matches('[data-remove-skin]')&&!confirm('Xóa skin này khỏi hồ sơ donate và OBS? Người dùng đã mở khóa sẽ lấy lại lượt chọn.')){
      event.preventDefault();
    }
  });
  if(!form)return;
  const order=()=>[...list.children].map(row=>row.dataset.skinKey).join(',');
  const initial=order();
  let dragged=null;
  const update=()=>{
    form.elements.skin_order.value=order();
    form.querySelector('button').disabled=order()===initial;
  };
  list.addEventListener('dragstart',event=>{
    if(!event.target.matches('[data-skin-handle]'))return;
    dragged=event.target.closest('li');
    event.dataTransfer.setData('text/plain',dragged.dataset.skinKey);
    event.dataTransfer.effectAllowed='move';
  });
  list.addEventListener('dragend',()=>{dragged=null});
  list.addEventListener('dragover',event=>{
    if(dragged&&event.target.closest('li'))event.preventDefault();
  });
  list.addEventListener('drop',event=>{
    const target=event.target.closest('li');
    if(!dragged||!target)return;
    event.preventDefault();
    if(dragged===target)return;
    const rows=[...list.children];
    list.insertBefore(dragged,rows.indexOf(dragged)<rows.indexOf(target)?target.nextElementSibling:target);
    update();
  });
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-skin-move]');
    if(!button)return;
    const row=button.closest('li');
    const forward=button.dataset.skinMove==='1';
    const neighbor=forward?row.nextElementSibling:row.previousElementSibling;
    if(!neighbor)return;
    list.insertBefore(row,forward?neighbor.nextElementSibling:neighbor);
    button.focus();
    update();
  });
})();
