/* Analytic, bounded Canvas plots: the window is resampled from t, never frame history. */
(function(){
  'use strict';
  const P=HarmonicPhysics, keys=['x','v','a'], colors=['#6ba8ff','#5cdda1','#ff7e88'];
  class TimeCharts {
    constructor(canvas,onSeek){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.domain=[0,1];this.lastKey='';
      canvas.addEventListener('pointerdown',e=>{
        const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;
        const u=P.clamp((x-this.left)/(r.width-this.left-this.right),0,1);
        onSeek(this.domain[0]+u*(this.domain[1]-this.domain[0]));
      });
    }
    draw(time,sample,s,options){
      const canvas=this.canvas,r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
      if(r.width<1||r.height<1)return;
      const w=Math.max(260,r.width),h=r.height;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);this.lastKey='';}
      const key=[time,s.A,s.omega,s.phi,s.harmonic,s.alpha,options.scale,options.window,...keys.map(k=>options.graphs[k]),canvas.width,canvas.height,options.revision].join('|');
      if(key===this.lastKey)return;this.lastKey=key;
      const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      this.left=w<500?63:94;this.right=w<500?12:80;
      const left=this.left,right=w-this.right,plotW=right-left;
      const duration=s.T*options.window,start=Math.max(0,time-duration*.58),end=start+duration;
      this.domain=[start,end];const X=t=>left+(t-start)/duration*plotW;
      const visible=keys.map((k,i)=>({k,i})).filter(o=>options.graphs[o.k]);
      if(!visible.length){ctx.fillStyle='#9cacc4';ctx.font='12px system-ui';ctx.fillText('Bật ít nhất một đồ thị để khảo sát.',left,55);return;}
      const top=10,bottom=h-25,rowH=(bottom-top)/visible.length;
      const amps=[s.A,s.vmax,s.amax],unit=options.scale==='normalized'?[(options.source==='vertical'?'y':options.source==='pendulum'?'s':'x')+'/A','v/vₘₐₓ','a/aₘₐₓ']:[(options.source==='vertical'?'y':options.source==='pendulum'?'s':'x')+' (m)','v (m/s)','a (m/s²)'];
      const points=Math.min(1600,Math.max(350,Math.ceil(plotW))),cache=[];
      for(let j=0;j<=points;j++)cache.push(sample(start+duration*j/points));
      visible.forEach(({k,i},row)=>{
        const cy=top+rowH*(row+.5),amp=amps[i]||1,scale=(rowH/2-11)/amp;
        ctx.fillStyle=row%2===0?'#0d1827':'#101b2b';ctx.fillRect(left,top+row*rowH,plotW,rowH);
        ctx.strokeStyle='#233147';ctx.lineWidth=1;
        for(let j=0;j<=8;j++){const x=left+j*plotW/8;ctx.beginPath();ctx.moveTo(x,top+row*rowH);ctx.lineTo(x,top+(row+1)*rowH);ctx.stroke();}
        ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(left,cy);ctx.lineTo(right,cy);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=colors[i];ctx.font='11px ui-monospace,monospace';ctx.fillText(unit[i],5,cy-4);
        ctx.fillStyle='#9cacc4';ctx.font='9px ui-monospace,monospace';
        const max=options.scale==='normalized'?(amps[i]>0?1:0):amps[i];
        ctx.fillText('+'+this.number(max),left-44,cy-(rowH/2-11)+3);ctx.fillText('−'+this.number(max),left-44,cy+(rowH/2-11)+3);
        ctx.strokeStyle=colors[i];ctx.lineWidth=1.7;ctx.beginPath();
        cache.forEach((q,j)=>{const x=left+plotW*j/points,y=cy-q[k]*scale;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
        if(amps[i]>0){
          // For the nonlinear libration too, quarter-period events give the exact
          // crossings/turning instants; their values come from the actual model.
          const phase=s.phi+i*Math.PI/2,first=Math.ceil((s.omega*start+phase)/(Math.PI/2));
          const last=Math.floor((s.omega*end+phase)/(Math.PI/2));
          for(let n=first;n<=last;n++){
            const t=(n*Math.PI/2-phase)/s.omega,x=X(t),y=cy-sample(t)[k]*scale;
            ctx.strokeStyle=colors[i];ctx.fillStyle='#101b2b';ctx.beginPath();
            if(n%2===0)ctx.arc(x,y,2.6,0,P.TAU);
            else {ctx.moveTo(x,y-3);ctx.lineTo(x+3,y);ctx.lineTo(x,y+3);ctx.lineTo(x-3,y);ctx.closePath();}
            ctx.fill();ctx.stroke();
          }
        }
        const x=X(time),y=cy-s[k]*scale;ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(x,y,3.7,0,P.TAU);ctx.fill();ctx.strokeStyle='#e8f4ff';ctx.lineWidth=1;ctx.stroke();
        if(w>500){ctx.fillStyle=colors[i];ctx.font='10px ui-monospace,monospace';ctx.fillText(this.number(s[k]),right+9,cy+3);}
      });
      const cursor=X(time);ctx.strokeStyle='#e8f4ff99';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(cursor,6);ctx.lineTo(cursor,bottom);ctx.stroke();ctx.setLineDash([]);
      ctx.font='9px ui-monospace,monospace';ctx.fillStyle='#9cacc4';ctx.textAlign='center';
      for(let j=0;j<=8;j++){const t=start+duration*j/8;ctx.fillText(t.toFixed(2),left+j*plotW/8,h-10);}
      ctx.textAlign='left';ctx.fillText('t (s)',5,h-10);
      canvas.setAttribute('aria-label',`Đồ thị tại t = ${time.toFixed(3)} s: li độ ${s.x.toFixed(3)} m; vận tốc ${s.v.toFixed(3)} m/s; gia tốc ${s.a.toFixed(3)} m/s².`);
    }
    number(x){if(Math.abs(x)<.00005)return '0';return Math.abs(x)>=100?x.toFixed(1):x.toFixed(3);}
  }
  window.TimeCharts=TimeCharts;
})();
