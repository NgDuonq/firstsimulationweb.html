/* SVG diagrams retain exact angular geometry independently of WebGL and camera. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', P = HarmonicPhysics;
  const colors = ['#6ba8ff','#5cdda1','#ff7e88'];
  const keys = ['x','v','a'], offsets = [0,Math.PI/2,Math.PI];
  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS,tag);
    for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
    if (parent) parent.appendChild(n); return n;
  }
  function text(parent, x, y, content, color, cls='circle-text') {
    const n=el('text',{x,y,fill:color,class:cls},parent); n.textContent=content; return n;
  }
  function arc(cx,cy,r,start,sweep) {
    const x=cx+r*Math.cos(start), y=cy-r*Math.sin(start);
    const x2=cx+r*Math.cos(start+sweep), y2=cy-r*Math.sin(start+sweep);
    return `M ${x} ${y} A ${r} ${r} 0 ${sweep>Math.PI?1:0} 0 ${x2} ${y2}`;
  }
  class CircleView {
    constructor(host) {
      this.host=host; this.layout='overlap'; this.positions=[];
      this.svg=el('svg',{viewBox:'0 0 580 216',role:'img','aria-label':'Ba vectơ quay x, v, a và các hình chiếu chuẩn hóa'},host);
      const defs=el('defs',{},this.svg);
      this.groups=keys.map((key,i)=>{
        const marker=el('marker',{id:`head-${key}`,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'},defs);
        el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:colors[i]},marker);
        const g=el('g',{},this.svg);
        const ring=el('circle',{fill:'none',stroke:colors[i],'stroke-width':1,opacity:.35,'stroke-dasharray':i===1?'5 5':i===2?'1 5':''},g);
        const ax=el('path',{fill:'none',stroke:'#34445a','stroke-width':1},g);
        const drop=el('line',{stroke:colors[i],opacity:.65,'stroke-dasharray':'3 4'},g);
        const projection=el('line',{stroke:colors[i],'stroke-width':3,opacity:.8},g);
        const arrow=el('line',{stroke:colors[i],'stroke-width':2.4,'marker-end':`url(#head-${key})`},g);
        const point=el(i===1?'rect':i===2?'path':'circle',{fill:colors[i],stroke:'#101b2b','stroke-width':2},g);
        const foot=el('circle',{r:4+i,fill:'#101b2b',stroke:colors[i],'stroke-width':1.7},g);
        const tip=text(g,0,0,key,colors[i],'circle-title');
        const title=text(g,0,0,`${key}(t)`,colors[i],'circle-title');
        const value=text(g,0,0,'',colors[i]), angle=text(g,0,0,'','#b1c3db'), phase=text(g,0,0,'','#b1c3db');
        const phaseArc=el('path',{fill:'none',stroke:colors[i],opacity:.35,'stroke-width':1},g);
        return {g,ring,ax,drop,projection,arrow,point,foot,tip,title,value,angle,phase,phaseArc};
      });
      this.arcs=el('g',{},this.svg);
      this.anglePaths=[0,1,2].map((_,i)=>({path:el('path',{fill:'none',stroke:i===2?'#90a8c7':'#8ccfc1','stroke-width':1.2,'marker-end':'url(#head-v)'},this.arcs),label:text(this.arcs,0,0,'','#d4e5fa','phase-label')}));
    }
    update(s,options,dt=1) {
      const nonlinear=!s.harmonic||s.A===0,narrow=this.host.clientWidth<450,mobile=narrow&&options.layout==='separated';
      this.host.className=(options.layout==='separated'?'separated':'')+(nonlinear?' nonlinear':'');
      this.svg.style.display=nonlinear?'none':'';
      if(nonlinear){
        if(!this.warning){this.warning=document.createElement('p');this.host.appendChild(this.warning);} this.warning.textContent=s.A===0?'A = 0: hệ đứng yên; không xác định tỉ số chuẩn hóa theo biên độ.':'Con lắc phi tuyến không có quan hệ pha x–v–a cố định. Chọn “Góc nhỏ” để dùng biểu diễn đường tròn điều hòa.';this.warning.hidden=false;return;
      }
      if(this.warning)this.warning.hidden=true;
      const separated=options.layout==='separated', width=mobile?260:separated?720:narrow?300:580,height=mobile?600:narrow&&!separated?340:216;
      this.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const smoothing=matchMedia('(prefers-reduced-motion: reduce)').matches?1:1-Math.exp(-12*Math.min(dt,.1));
      const vals=[s.x,s.v,s.a], units=['m','m/s','m/s²'];
      const normalized=[Math.cos(s.theta),Math.cos(s.theta+offsets[1]),Math.cos(s.theta+offsets[2])];
      this.groups.forEach((o,i)=>{
        const target=separated?(mobile?[100,79+i*198,57]:[120+240*i,91,61]):narrow?[150,95,74]:[153,103,78];
        if(!this.positions[i] || mobile!==this.mobile)this.positions[i]=target.slice();
        const pos=this.positions[i];for(let j=0;j<3;j++)pos[j]+=(target[j]-pos[j])*smoothing;
        const [cx,cy,r]=pos, theta=s.theta+offsets[i], px=cx+r*Math.cos(theta),py=cy-r*Math.sin(theta), fx=cx+r*normalized[i];
        o.g.style.display=options.vectors[keys[i]]?'':'none';
        const symbol=i===0?(options.positionSymbol||'x'):keys[i];o.tip.textContent=symbol;o.title.textContent=symbol+'(t)';
        o.ring.setAttribute('cx',cx);o.ring.setAttribute('cy',cy);o.ring.setAttribute('r',r);
        o.ax.setAttribute('d',`M ${cx-r-10} ${cy} H ${cx+r+10} M ${cx} ${cy-r-8} V ${cy+r+8}`);
        for(const [line,x1,y1,x2,y2] of [[o.drop,px,py,fx,cy],[o.arrow,cx,cy,px,py],[o.projection,cx,cy,fx,cy]]){
          for(const [key,v] of Object.entries({x1,y1,x2,y2}))line.setAttribute(key,v);
        }
        o.drop.style.display=o.foot.style.display=o.projection.style.display=options.projections?'':'none';
        o.foot.setAttribute('cx',fx);o.foot.setAttribute('cy',cy);
        if(i===0){o.point.setAttribute('cx',px);o.point.setAttribute('cy',py);o.point.setAttribute('r',5);}
        if(i===1){o.point.setAttribute('x',px-4.5);o.point.setAttribute('y',py-4.5);o.point.setAttribute('width',9);o.point.setAttribute('height',9);}
        if(i===2)o.point.setAttribute('d',`M ${px} ${py-6} l 6 6 l -6 6 l -6 -6 Z`);
        o.tip.setAttribute('x',px+9);o.tip.setAttribute('y',py-7);
        const tx=separated?cx:narrow?25:300,ty=separated?cy-r-13:narrow?219+38*i:39+57*i;
        o.title.setAttribute('x',tx);o.title.setAttribute('y',ty);o.title.setAttribute('text-anchor',separated?'middle':'start');
        o.value.setAttribute('x',separated?cx:narrow?82:352);o.value.setAttribute('y',separated?cy+r+25:ty);o.value.setAttribute('text-anchor',separated?'middle':'start');
        o.value.textContent=`${Math.abs(vals[i])<.00005?'0.000':vals[i].toFixed(3)} ${units[i]}`;
        o.angle.setAttribute('x',separated?cx:narrow?25:300);o.angle.setAttribute('y',separated?cy+r+42:ty+17);o.angle.setAttribute('text-anchor',separated?'middle':'start');
        o.angle.textContent=`θ${symbol} = ${P.wrap(theta).toFixed(2)} rad`;
        o.phase.setAttribute('x',separated?cx:narrow?185:438);o.phase.setAttribute('y',separated?cy+r+56:ty+17);o.phase.setAttribute('text-anchor',separated?'middle':'start');
        o.phase.textContent=['Δφ = 0','Δφ = +π/2','Δφ = +π'][i];o.phase.style.display=options.angles?'':'none';
        o.phaseArc.setAttribute('d',arc(cx,cy,r*.35,0,Math.max(.0001,P.wrap(theta))));
        o.phaseArc.style.display=separated&&options.angles?'':'none';
      });
      this.mobile=mobile;
      this.arcs.style.display=(!separated&&options.angles)?'':'none';
      const [cx,cy,r]=this.positions[0];
      this.anglePaths.forEach((o,i)=>{
        const start=s.theta+(i===1?Math.PI/2:0),sweep=i===2?Math.PI:Math.PI/2,rr=r*[.48,.65,.82][i];
        o.path.setAttribute('d',arc(cx,cy,rr,start,sweep));
        const mid=start+sweep/2;
        o.label.setAttribute('x',cx+(rr+7)*Math.cos(mid));o.label.setAttribute('y',cy-(rr+7)*Math.sin(mid));
        o.label.setAttribute('text-anchor','middle');o.label.textContent=i===2?'π':'π/2';
        const pair=i===0?['x','v']:i===1?['v','a']:['x','a'];
        o.path.style.display=o.label.style.display=pair.every(k=>options.vectors[k])?'':'none';
      });
    }
  }
  window.CircleView=CircleView;
})();
