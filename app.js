/* UI orchestration: one authoritative clock; views never own or advance time. */
(function(){
  'use strict';
  const P=HarmonicPhysics,$=id=>document.getElementById(id),clock=new P.Clock();
  const names={reference:'Dao động điều hòa mẫu',horizontal:'Lò xo ngang',vertical:'Lò xo thẳng đứng',pendulum:'Con lắc đơn'};
  const state={params:P.freshParams(),mode:'physical',view:'reference',source:'reference',layout:'overlap',scale:'normalized',window:2,revision:0,
    vectors:{x:true,v:true,a:true},graphs:{x:true,v:true,a:true},forces:{spring:true,gravity:true,net:true},angles:true,projections:true,wave:false};
  const fields={
    reference:[['A','Biên độ A','m',.01],['omega','Tần số góc ω','rad/s',.1],['phi','Pha ban đầu φ','rad',.01]],
    horizontal:[['m','Khối lượng m','kg',.01],['k','Độ cứng k','N/m',.1],['A','Biên độ A','m',.01],['phi','Pha ban đầu φ','rad',.01]],
    vertical:[['m','Khối lượng m','kg',.01],['k','Độ cứng k','N/m',.1],['g','Gia tốc trọng trường g','m/s²',.01],['l0','Chiều dài tự nhiên l₀','m',.01],['A','Biên độ A','m',.01],['phi','Pha ban đầu φ','rad',.01]],
    pendulum:[['m','Khối lượng m','kg',.01],['L','Chiều dài dây ℓ','m',.01],['g','Gia tốc trọng trường g','m/s²',.01],['alpha','Biên độ góc α₀','rad',.01],['phi','Pha ban đầu φ','rad',.01]]
  };
  const fmt=(n,d=3)=>Math.abs(n)<.5*10**(-d)?(0).toFixed(d):n.toFixed(d);
  let scene,circles,charts,lastFrame=performance.now(),lastHud=0,dirty=true,rafId=0;
  function sampleAt(t){return P.evaluate(state.source,P.effectiveParams(state.params,state.mode)[state.source],t);}
  function mark(){state.revision++;dirty=true;if(scene&&circles&&charts)draw(1/60,true);}
  function message(text){$('parameter-message').hidden=!text;$('parameter-message').textContent=text||'';}
  function renderParameters(){
    const kind=state.mode==='comparison'?'reference':state.source,p=state.params[kind];
    $('parameter-title').textContent=state.mode==='comparison'?'Thông số pha chung':`Thông số · ${names[kind].toLowerCase()}`;
    const host=$('parameter-body');host.replaceChildren();
    if(kind==='pendulum'){
      const label=document.createElement('label');label.className='field-label';label.htmlFor='pendulum-model';label.textContent='Mô hình con lắc';host.appendChild(label);
      const select=document.createElement('select');select.id='pendulum-model';
      select.innerHTML='<option value="small">Góc nhỏ · gần đúng điều hòa</option><option value="nonlinear">Phi tuyến · tích phân số RK4</option>';select.value=p.model;host.appendChild(select);
      select.addEventListener('change',()=>{state.params.pendulum=P.sanitize('pendulum',{...p,model:select.value});renderParameters();buildFormula();mark();});
    }
    for(const [key,label,unit,step] of fields[kind]){
      const field=document.createElement('div');field.className='param-field';
      let [min,max]=P.LIMITS[kind][key];if(key==='phi'){min=-Math.PI;max=Math.PI;}
      if(kind==='pendulum'&&key==='alpha'&&p.model==='small')max=.2;
      if(kind==='vertical'&&key==='A')max=Math.floor(P.maxVerticalAmplitude(p)*10000)/10000;
      const rangeStep=key==='phi'?'any':key==='A'&&max<.1?.001:step;
      field.innerHTML=`<label for="slider-${key}">${label}<output id="val-${key}">${fmt(p[key],2)} ${unit}</output></label><div class="param-inputs"><input id="slider-${key}" type="range" min="${min}" max="${max}" step="${rangeStep}" value="${p[key]}" aria-label="${label}"><input id="number-${key}" type="number" min="${min}" max="${max}" step="${rangeStep}" value="${p[key]}" aria-label="${label} (nhập số)"></div>`;
      const range=field.querySelector('input[type=range]'),number=field.querySelector('input[type=number]');
      const commit=(input,final=false)=>{
        const value=Number(input.value);
        if(input.value.trim()===''||!Number.isFinite(value)){if(input===number&&!final)return;message('Nhập một số hữu hạn trong khoảng cho phép.');number.value=p[key];return;}
        const oldA=p.A,requested=value;
        const currentMax=kind==='vertical'&&key==='A'?P.maxVerticalAmplitude(state.params.vertical):max;
        if(input===number&&!final&&(value<min||value>currentMax))return;
        const next=P.sanitize(kind,{...state.params[kind],[key]:P.clamp(value,min,currentMax)});
        state.params[kind]=next;Object.assign(p,next);
        range.value=p[key];if(input!==number||final)number.value=key==='phi'?p[key]:Number(p[key].toFixed(6));$('val-'+key).textContent=fmt(p[key],2)+' '+unit;
        if(kind==='vertical'){
          const aRange=$('slider-A'),aNumber=$('number-A');aRange.max=aNumber.max=Math.floor(P.maxVerticalAmplitude(p)*10000)/10000;
          aRange.value=p.A;if(input!==aNumber||final)aNumber.value=Number(p.A.toFixed(6));$('val-A').textContent=fmt(p.A,2)+' m';
        }
        message(oldA>p.A+1e-8&&key!=='A'?'Biên độ đã giảm để chiều dài lò xo luôn ≥ 0,12 m.':requested!==p[key]?'Giá trị đã được giới hạn theo miền thông số hợp lệ.':'');
        updateDerived();buildFormula();mark();
      };
      range.addEventListener('input',()=>commit(range));number.addEventListener('input',()=>{if(number.value!==''&&Number.isFinite(number.valueAsNumber))commit(number);});number.addEventListener('change',()=>commit(number,true));host.appendChild(field);
    }
    if(kind==='pendulum'){
      const note=document.createElement('p');note.className='small muted';note.textContent=p.model==='small'?'Góc nhỏ: α₀ ≤ 0,20 rad (≈ 11,5°). Li độ s là độ dài cung, không phải tọa độ ngang của quả nặng.':'Phi tuyến: α″ = −(g/ℓ)sin α; pha φ định vị theo phần chu kỳ, không phải pha của một cosin.';host.appendChild(note);
    }
    updateDerived();message('');
  }
  function updateDerived(){
    const bundle=P.all(state.params,state.mode,clock.time),s=bundle.samples[state.source];
    $('derived-params').innerHTML=`ω = ${fmt(s.omega)} rad/s<br>T = ${fmt(s.T)} s · f = ${fmt(s.f)} Hz`;
    if(state.source==='vertical')$('derived-params').innerHTML+=`<br>Δl₀ = ${fmt(s.extension)} m<br>L<sub>cb</sub> = ${fmt(s.Leq)} m · A ≤ ${fmt(P.maxVerticalAmplitude(bundle.params.vertical))} m`;
    if(state.mode==='comparison'){
      $('derived-params').innerHTML+=`<br>k<sub>ngang</sub> = ${fmt(bundle.params.horizontal.k)} N/m<br>k<sub>đứng</sub> = ${fmt(bundle.params.vertical.k)} N/m<br>ℓ<sub>đơn</sub> = ${fmt(bundle.params.pendulum.L)} m<br>α₀ = ${fmt(bundle.params.pendulum.alpha)} rad`;
      if(bundle.params.vertical.A!==state.params.reference.A)$('derived-params').innerHTML+=`<br>A<sub>đứng</sub> = ${fmt(bundle.params.vertical.A)} m (giới hạn chiều dài)`;
    }
  }
  let formulaRows=[];
  function buildFormula(){
    const s=sampleAt(clock.time),vertical=state.source==='vertical',pend=state.source==='pendulum',pos=vertical?'y':pend?'s':'x';
    const rows=[];const add=(id,symbol,color,value)=>rows.push({id,symbol,color,value});
    if(s.harmonic){
      add('phase','θ = ωt + φ','',q=>`${fmt(q.omega)}t + ${fmt(q.phi)} rad`);
      add('position',`${pos} = A cos θ`,'x',q=>`${pos} = ${fmt(q.x)} m · A = ${fmt(q.A)} m`);
      add('velocity','v = −Aω sin θ','v',q=>`v = ${fmt(q.v)} m/s · vₘₐₓ = ${fmt(q.vmax)} m/s`);
      add('acceleration',`a = −ω²${pos}`,'a',q=>`a = ${fmt(q.a)} m/s² · aₘₐₓ = ${fmt(q.amax)} m/s²`);
      add('phase-offset','φᵥ − φₓ = π/2; φₐ − φₓ = π','',()=> 'a sớm pha π/2 so với v');
    }else{
      add('position','α″ + (g/ℓ) sin α = 0','x',q=>`α = ${fmt(q.q)} rad · s = ℓα = ${fmt(q.x)} m`);
      add('velocity','v = ℓα̇ (tiếp tuyến)','v',q=>`${fmt(q.v)} m/s`);
      add('acceleration','aₜ = −g sin α','a',q=>`${fmt(q.a)} m/s² · không gồm a hướng tâm`);
      add('phase-offset','Không có độ lệch pha cosin cố định','',()=> 'θ = 2πt/T + φ chỉ là pha chu kỳ');
    }
    if(state.source==='reference')add('omega','ω: thông số dao động mẫu','',q=>`m tương đương = 1 kg; k = ${fmt(q.k)} N/m`);
    else if(pend)add('omega',s.harmonic?'ω₀ = √(g/ℓ)':'T = 4√(ℓ/g) K(sin(α₀/2))','',q=>`ω${s.harmonic?'₀':' = 2π/T'} = ${fmt(q.omega)} rad/s`);
    else add('omega','ω = √(k/m)','',q=>`√(${fmt(q.k)} / ${fmt(q.m)}) = ${fmt(q.omega)} rad/s`);
    add('period',s.harmonic?'T = 2π/ω; f = 1/T':'f = 1/T; ω = 2π/T','',q=>`T = ${fmt(q.T)} s · f = ${fmt(q.f)} Hz`);
    if(vertical){
      add('equilibrium','Δl₀ = mg/k; kΔl₀ = mg','',q=>`Δl₀ = ${fmt(q.extension)} m`);
      add('length','L = l₀ + Δl₀ + y','',q=>`${fmt(q.l0)} + ${fmt(q.extension)} + (${fmt(q.x)}) = ${fmt(q.L)} m`);
      add('forces','Fₛ = −k(Δl₀ + y); Fɡ = mg','',q=>`Fₛ = ${fmt(q.Fs)} N · Fɡ = ${fmt(q.Fg)} N`);
      add('restoring','Fₙₑₜ = mg − k(Δl₀ + y) = −ky','a',q=>`Fₙₑₜ = ${fmt(q.Fnet)} N`);
    }else add('restoring',pend?(s.harmonic?'Fₜ ≈ −(mg/ℓ)s':'Fₜ = −mg sin α'):'F = −kx','a',q=>`F = ${fmt(q.F)} N`);
    add('kinetic','K = ½mv²','v',q=>`${fmt(q.K)} J`);
    add('potential',s.harmonic?(pend?'U ≈ ½(mg/ℓ)s²':`U = ½k${pos}²`):'U = mgℓ(1 − cos α)','x',q=>`${fmt(q.U)} J`);
    add('energy',s.harmonic?(pend?'E ≈ ½mgℓα₀² = K + U':'E = ½kA² = K + U'):'E = mgℓ(1 − cos α₀) = K + U','',q=>`${fmt(q.E)} J`);
    const host=$('formula-body');host.replaceChildren();formulaRows=rows.map(row=>{
      const div=document.createElement('div');div.className='formula-row'+(row.color?' '+row.color+'-color':'');div.dataset.formula=row.id;
      const symbolic=document.createElement('span');symbolic.textContent=row.symbol;div.appendChild(symbolic);
      const value=document.createElement('small');div.appendChild(value);host.appendChild(div);return {...row,div,numeric:value};
    });
    $('glossary-body').innerHTML=`<p><b>A</b>: biên độ li độ (m); <b>ω</b>: tần số góc (rad/s); <b>φ</b>: pha ban đầu (rad); <b>θ</b>: pha hiện tại (rad); <b>T</b>: chu kỳ (s); <b>f</b>: tần số (Hz).</p><p><b>m</b>: khối lượng (kg); <b>k</b>: độ cứng (N/m); <b>g</b>: gia tốc trọng trường (m/s²); <b>ℓ</b>: chiều dài dây; <b>l₀</b>: chiều dài tự nhiên lò xo (m).</p><p>${vertical?'y đo từ vị trí cân bằng tĩnh, chiều dương xuống. L đo từ điểm treo tới đầu gắn vật. Lò xo lý tưởng có thể chịu cả kéo và nén. U = ½ky² đã gồm biến thiên tổng thế năng đàn hồi và trọng trường quanh cân bằng; không cộng mg·y lần nữa.':pend?'s = ℓα là li độ cung có dấu; α = 0 tại vị trí thấp nhất. v và a trong bảng là các đại lượng tiếp tuyến; gia tốc hướng tâm v²/ℓ là một thành phần khác. K trong công thức chu kỳ phi tuyến là tích phân elliptic đầy đủ, khác với ký hiệu K dùng cho động năng.':'x đo từ vị trí cân bằng; chiều dương sang phải. Đường tròn chỉ so sánh các đại lượng đã chuẩn hóa; x, v, a có đơn vị khác nhau.'}</p>`;
    $('energy-note').textContent=state.source==='reference'?'Hệ tương đương m = 1 kg, k = mω².':vertical?'U = ½ky² quanh cân bằng, đã gộp ảnh hưởng trọng trường.':pend?(s.harmonic?'Năng lượng gần đúng theo mô hình góc nhỏ.':'Năng lượng phi tuyến; không ma sát.'):'Mốc thế năng tại vị trí cân bằng.';
  }
  function updateHud(s,bundle){
    $('hud-time').textContent=fmt(clock.time)+' s';$('hud-x').textContent=fmt(s.x)+' m';$('hud-v').textContent=fmt(s.v)+' m/s';$('hud-a').textContent=fmt(s.a)+' m/s²';$('hud-phase').textContent=fmt(P.wrap(s.theta))+' rad';
    $('reading-source').textContent=names[state.source]+(state.source==='pendulum'?(s.harmonic?' · gần đúng góc nhỏ':' · phi tuyến'):'');
    $('graph-position-symbol').textContent=state.source==='vertical'?'y':state.source==='pendulum'?'s':'x';
    $('position-label').textContent=state.source==='vertical'?'Li độ y ↓':state.source==='pendulum'?'Li độ cung s':'Li độ x';
    [s.x,s.v,s.a].forEach((v,i)=>{$('bar-'+['x','v','a'][i]).style.width=(50+50*(v/([s.A,s.vmax,s.amax][i]||1)))+'%';});
    $('hud-wd').textContent=fmt(s.K)+' J';$('hud-wt').textContent=fmt(s.U)+' J';$('hud-w').textContent=fmt(s.E)+' J';
    $('bar-wd').style.width=P.clamp(s.E?s.K/s.E*100:0,0,100)+'%';$('bar-wt').style.width=P.clamp(s.E?s.U/s.E*100:0,0,100)+'%';
    $('force-readings').hidden=state.source!=='vertical';
    if(state.source==='vertical')$('force-values').innerHTML=`<p class="spring-color"><span>Fₛ · đàn hồi</span><output>${fmt(s.Fs)} N</output></p><p class="gravity-color"><span>Fɡ · trọng lực</span><output>${fmt(s.Fg)} N</output></p><p class="a-color"><span>Fₙₑₜ · hợp lực</span><output>${fmt(s.Fnet)} N</output></p>`;
    const turning=s.A>0&&Math.abs(s.v)<s.vmax*.1,equilibrium=s.A>0&&Math.abs(s.x)<s.A*.07;
    for(const row of formulaRows){row.numeric.textContent=row.value(s);row.div.classList.toggle('relevant',(turning&&['position','acceleration','potential'].includes(row.id))||(equilibrium&&['velocity','equilibrium','restoring','kinetic'].includes(row.id)));}
    $('amplitude-line').innerHTML=`<span class="x-color">${state.source==='vertical'?'y':state.source==='pendulum'?'s':'x'}ₘₐₓ = ${fmt(s.A)} m</span><span class="v-color">vₘₐₓ = ${fmt(s.vmax)} m/s</span><span class="a-color">aₘₐₓ = ${fmt(s.amax)} m/s²</span>`;
    $('phase-notice').textContent=s.harmonic?'v sớm pha π/2 so với li độ · a ngược pha li độ · a sớm pha π/2 so với v.':'Phi tuyến: chu kỳ phụ thuộc biên độ góc; x–v–a không còn là ba đường cosin.';
    $('phase-badge').textContent=s.harmonic?'Δφ = π/2':'Phi tuyến';
    const pos=state.source==='vertical'?'y':state.source==='pendulum'?'s':'x';
    const cards=s.A===0?[['Đứng yên','A = 0: li độ, vận tốc, gia tốc và năng lượng dao động đều bằng 0.',true]]:[
      ['Tại hai biên',`|${pos}| = A ⇒ v = 0; gia tốc hướng về cân bằng.`,turning],
      ['Qua cân bằng',`${pos} = 0 ⇒ |v| = vₘₐₓ; hợp lực tiếp tuyến bằng 0.`,equilibrium],
      ['Lực hồi phục',`${pos} và a trái dấu khi khác 0; a hướng về vị trí cân bằng.`,Math.abs(s.x)>s.A*.07]
    ];
    $('insight-cards').innerHTML=cards.map(([title,desc,highlight])=>`<div class="insight${highlight?' highlight':''}"><strong>${title}</strong>${desc}</div>`).join('');
    const max=Math.max(s.T*4,Math.ceil(clock.time/(s.T*2)+1)*s.T*2);if(document.activeElement!==$('timeline-scrubber'))$('timeline-scrubber').max=max;$('timeline-scrubber').value=clock.time;$('timeline-end').textContent=fmt(max,2)+' s';
    if(document.activeElement!==$('time-input'))$('time-input').value=fmt(clock.time);
    const playing=clock.running;$('btn-play').classList.toggle('paused',!playing);$('play-text').textContent=playing?'Ⅱ Tạm dừng':'▶ Tiếp tục';$('btn-play').setAttribute('aria-label',playing?'Tạm dừng':'Tiếp tục');
    $('camera-perspective').disabled=!scene.is3D;$('camera-front').disabled=!scene.is3D;$('camera-reset').disabled=!scene.is3D;
  }
  function selectView(view){
    state.view=view;document.body.dataset.simulationView=view;if(view!=='combined')state.source=view;$('data-source').value=state.source;
    for(const b of document.querySelectorAll('[data-view]')){const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
    $('scene-title').textContent=view==='combined'?'Ba hệ · cùng thời gian, đúng mô hình':view==='reference'?'Lò xo ngang · cùng t, tần số riêng':names[view];
    if(view==='vertical')$('forces-details').open=true;
    renderParameters();buildFormula();mark();
  }
  function seek(t){clock.running=false;clock.seek(t);mark();}
  function setupEvents(){
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
    $('data-source').addEventListener('change',()=>{state.source=$('data-source').value;renderParameters();buildFormula();mark();});
    $('experience-mode').addEventListener('change',()=>{state.mode=$('experience-mode').value;$('mode-note').textContent=state.mode==='comparison'?'Pha chung: k = mω², ℓ = g/ω²; α₀ ≤ 0,20 rad. Hệ đứng có thể giảm A để giữ chiều dài hợp lệ. Thông số riêng được giữ khi trở lại chế độ Vật lý.':'Mỗi hệ có tần số từ thông số riêng; cùng dùng thời gian t.';renderParameters();buildFormula();mark();});
    $('btn-play').addEventListener('click',()=>{clock.running=!clock.running;mark();});
    $('btn-step').addEventListener('click',()=>{clock.step(1);mark();});$('btn-step-back').addEventListener('click',()=>{clock.step(-1);mark();});
    $('btn-restart').addEventListener('click',()=>{clock.restart();mark();});
    $('slider-speed').addEventListener('input',()=>{clock.speed=Number($('slider-speed').value);$('val-speed').textContent=clock.speed.toFixed(1)+'×';mark();});
    $('time-input').addEventListener('input',()=>{if(Number.isFinite($('time-input').valueAsNumber))seek($('time-input').valueAsNumber);});
    $('time-input').addEventListener('change',()=>{const t=$('time-input').valueAsNumber;if(Number.isFinite(t))seek(t);else $('time-input').value=fmt(clock.time);});
    $('timeline-scrubber').addEventListener('input',()=>seek(Number($('timeline-scrubber').value)));
    ['overlap','separated'].forEach(layout=>$('layout-'+layout).addEventListener('click',()=>{state.layout=layout;for(const l of ['overlap','separated']){$('layout-'+l).classList.toggle('active',layout===l);$('layout-'+l).setAttribute('aria-pressed',String(layout===l));}mark();}));
    for(const k of ['x','v','a']){
      $('toggle-vector-'+k).addEventListener('change',e=>{state.vectors[k]=e.target.checked;mark();});
      $('graph-'+k).addEventListener('change',e=>{state.graphs[k]=e.target.checked;mark();});
    }
    for(const k of ['angles','projections','wave-trace'])$('toggle-'+k).addEventListener('change',e=>{state[k==='wave-trace'?'wave':k]=e.target.checked;mark();});
    for(const k of ['spring','gravity','net'])$('toggle-force-'+k).addEventListener('change',e=>{state.forces[k]=e.target.checked;mark();});
    $('graph-scale').addEventListener('change',()=>{state.scale=$('graph-scale').value;mark();});$('graph-window').addEventListener('change',()=>{state.window=Number($('graph-window').value);mark();});
    for(const preset of ['front','perspective','reset'])$('camera-'+preset).addEventListener('click',()=>scene.cameraPreset(preset));
    $('btn-reset-params').addEventListener('click',reset);
    document.addEventListener('keydown',e=>{
      if(/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
      if(e.code==='Space'){e.preventDefault();clock.running=!clock.running;mark();}
      if(e.code==='ArrowRight'){e.preventDefault();clock.step(1);mark();}if(e.code==='ArrowLeft'){e.preventDefault();clock.step(-1);mark();}
      if(e.key.toLowerCase()==='r'){clock.restart();mark();}
    });
    document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();dirty=true;});
    window.addEventListener('resize',()=>{dirty=true;});
    window.addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(rafId);scene.dispose();});
    window.addEventListener('pageshow',e=>{if(e.persisted){lastFrame=performance.now();dirty=true;}});
  }
  function reset(){
    state.params=P.freshParams();state.mode='physical';state.layout='overlap';state.scale='normalized';state.window=2;
    clock.restart();clock.speed=1;clock.running=true;$('slider-speed').value=1;$('val-speed').textContent='1.0×';
    state.vectors={x:true,v:true,a:true};state.graphs={x:true,v:true,a:true};state.forces={spring:true,gravity:true,net:true};state.angles=true;state.projections=true;state.wave=false;
    for(const k of ['x','v','a']){$('toggle-vector-'+k).checked=true;$('graph-'+k).checked=true;}
    for(const k of ['spring','gravity','net'])$('toggle-force-'+k).checked=true;
    $('toggle-angles').checked=$('toggle-projections').checked=true;$('toggle-wave-trace').checked=false;
    $('layout-overlap').classList.add('active');$('layout-overlap').setAttribute('aria-pressed','true');$('layout-separated').classList.remove('active');$('layout-separated').setAttribute('aria-pressed','false');
    $('graph-scale').value='normalized';$('graph-window').value=2;$('experience-mode').value='physical';$('mode-note').textContent='Mỗi hệ có tần số từ thông số riêng; cùng dùng thời gian t.';
    $('controls-details').open=$('readings-details').open=true;scene.cameraPreset('reset');selectView('reference');
  }
  function draw(dt,forceHud=false){
    const bundle=P.all(state.params,state.mode,clock.time),s=bundle.samples[state.source];
    circles.update(s,{layout:state.layout,vectors:state.vectors,angles:state.angles,projections:state.projections,positionSymbol:state.source==='vertical'?'y':state.source==='pendulum'?'s':'x'},dt);
    const p=bundle.params,source=state.source;
    if(state.view!=='reference')scene.render(clock.time,bundle,state.view,state,t=>P.horizontal(p.horizontal,t));
    charts.draw(clock.time,t=>P.evaluate(source,p[source],t),s,state);
    const now=performance.now();
    if(forceHud||dirty||now-lastHud>65){
      updateHud(s,bundle);
      $('graph-note').textContent=state.scale==='normalized'?(s.harmonic?'Li độ/A · v/(Aω) · a/(Aω²) · nhấp đồ thị để khảo sát':'s/sₘₐₓ · v/vₘₐₓ · a/aₘₐₓ · phi tuyến'):'Mỗi hàng theo đơn vị SI riêng · nhấp đồ thị để khảo sát';
      lastHud=now;dirty=false;
    }
  }
  function frame(now){
    const dt=(now-lastFrame)/1000;lastFrame=now;
    if(!document.hidden){clock.advance(dt);draw(dt);}
    else if(dirty)draw(dt,true);
    rafId=requestAnimationFrame(frame);
  }
  function init(){
    scene=new MechanicalScene($('canvas-container'),$('render-status'));circles=new CircleView($('circle-host'));charts=new TimeCharts($('time-chart'),seek);
    setupEvents();selectView('reference');
    // Start with panels collapsed on narrow screens; all controls remain available.
    if(matchMedia('(max-width:620px)').matches){$('controls-details').open=false;$('readings-details').open=false;}
    draw(1,true);rafId=requestAnimationFrame(frame);
  }
  try{init();}catch(err){$('app-error').hidden=false;$('app-error').textContent='Không thể khởi tạo mô phỏng: '+err.message;console.error(err);}
})();
