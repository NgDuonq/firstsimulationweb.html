/* The original Three.js/OrbitControls pipeline, with reusable buffers and a Canvas fallback.
   All model positions are computed in SI, then multiplied by an explicit view scale. */
(function(){
  'use strict';
  const P=HarmonicPhysics,C={x:'#6ba8ff',v:'#5cdda1',a:'#ff7e88',spring:'#c69bff',gravity:'#f4c572',axis:'#50647e',light:'#c5d7ea'};
  class MechanicalScene {
    constructor(container,status){
      this.container=container;this.status=status;this.labels=container.querySelector('#scene-labels');
      this.objects=new Map();this.labelNodes=new Map();this.materials=new Map();this.helix=new Map();this.canvas=document.createElement('canvas');
      this.canvas.setAttribute('aria-label','Hệ cơ học: lò xo ngang, lò xo đứng hoặc con lắc đơn');this.canvas.setAttribute('role','img');
      this.container.appendChild(this.canvas);this.is3D=false;this.preset='perspective';this.disposed=false;this.circleFrames=new Map();
      try{
        // Probe before constructing Three's renderer so WebGL absence is recoverable.
        const context=window.THREE&&(this.canvas.getContext('webgl2',{antialias:true})||this.canvas.getContext('webgl',{antialias:true}));
        if(context){this.initThree(context);this.is3D=true;}
      }catch(err){console.warn('Chuyển sang sơ đồ 2D:',err.message);}
      if(!this.is3D)this.initFallback();
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.disposeThree();this.is3D=false;this.initFallback();this.resize();});
      this.resize();
    }
    initThree(context){
      const T=window.THREE;this.T=T;this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x080c14,.012);
      this.camera=new T.PerspectiveCamera(40,1,.05,500);this.camera.position.set(0,0,22);
      this.renderer=new T.WebGLRenderer({canvas:this.canvas,context,antialias:true});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.setClearColor(0x080c14);
      this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
      this.scene.add(new T.HemisphereLight(0xdbeafe,0x101c36,1.15));
      const light=new T.DirectionalLight(0xffffff,1.8);light.position.set(8,16,18);light.castShadow=true;
      light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-20,right:20,top:18,bottom:-18,near:.1,far:70});light.shadow.bias=-.0005;this.scene.add(light);
      const cyan=new T.PointLight(0x22d3ee,1.7,28);cyan.position.set(-3,7,4);this.scene.add(cyan);
      const violet=new T.PointLight(0xa855f7,2.1,28);violet.position.set(-8,0,5);this.scene.add(violet);
      const fill=new T.DirectionalLight(0x93c5fd,.65);fill.position.set(-8,2,-8);this.scene.add(fill);
      const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:0x080e1b,metalness:.35,roughness:.6}));
      floor.rotation.x=-Math.PI/2;floor.position.y=-8.25;floor.receiveShadow=true;this.scene.add(floor);
      const grid=new T.GridHelper(80,80,0x30405a,0x172337);grid.position.y=-8.2;grid.material.transparent=true;grid.material.opacity=.65;this.scene.add(grid);
      this.boxGeo=new T.BoxGeometry(1,1,1);this.sphereGeo=new T.SphereGeometry(1,24,16);
      this.tmp=new T.Vector3();this.dir=new T.Vector3();
      if(T.OrbitControls){this.controls=new T.OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.06;this.controls.minDistance=5;this.controls.maxDistance=100;this.controls.maxPolarAngle=Math.PI*.88;}
      this.status.textContent='3D · kéo chuột để xoay · cuộn để thu phóng';
    }
    initFallback(){
      if(this.canvas.parentNode)this.canvas.remove();
      this.canvas=document.createElement('canvas');this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','Sơ đồ 2D tương đương của hệ cơ học');this.container.appendChild(this.canvas);
      this.ctx=this.canvas.getContext('2d');this.labels.innerHTML='';this.labelNodes.clear();
      this.status.textContent='Sơ đồ 2D · thiết bị hiện không hỗ trợ WebGL';
    }
    material(color){
      if(!this.materials.has(color))this.materials.set(color,new this.T.MeshStandardMaterial({color,metalness:.65,roughness:.24,emissive:color,emissiveIntensity:.12}));
      return this.materials.get(color);
    }
    object(id,make){
      let o=this.objects.get(id);if(!o){o=make();this.objects.set(id,o);this.scene.add(o);}o.visible=true;return o;
    }
    resize(){
      const r=this.container.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);
      this.dpr=Math.min(devicePixelRatio||1,2);
      if(this.is3D){this.renderer.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix();this.fitCamera();}
      else{this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
      this.dirty=true;
    }
    fitCamera(){
      if(!this.camera)return;
      const bounds=this.worldBounds();
      // Extend the frustum behind the glass panels while centering objects in the
      // unobscured region. OrbitControls still operates on one real 3D scene.
      const safe=this.contentRect();
      this.camera.setViewOffset(safe.width,safe.height,-safe.left,-safe.top,this.w,this.h);
      const distance=1.1*Math.max(bounds.height/(2*Math.tan(20*Math.PI/180)),bounds.width/(2*Math.tan(20*Math.PI/180)*(safe.width/safe.height)));
      if(this.preset==='perspective')this.camera.position.set(distance*.23,distance*.13,distance);
      else this.camera.position.set(0,0,distance);
      if(this.controls){this.controls.target.set(0,0,0);this.controls.update();}this.camera.lookAt(0,0,0);
    }
    contentRect(){
      let safe={left:0,top:0,width:this.w,height:this.h};
      if(document.body.dataset.presentation==='spatial'&&this.w>1000){
        const focus=document.body.classList.contains('stage-focus');
        const left=focus?25:306,right=focus?25:306,top=210;
        const bottom=document.body.dataset.graphsOpen==='true'?365:190;
        safe={left,top,width:Math.max(180,this.w-left-right),height:Math.max(180,this.h-top-bottom)};
      }
      return safe;
    }
    setView(view){
      if(this.view===view)return;this.view=view;this.combined=view==='combined';
      if(this.canvas.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)this.canvas.animate([{opacity:.25},{opacity:1}],{duration:220});
      this.fitCamera();this.resize();
    }
    worldBounds(){
      if(this.view==='combined')return this.w<600?{width:16,height:24}:{width:21,height:17};
      if(this.view==='reference')return {width:18,height:10};
      return {width:this.view==='horizontal'?14:12,height:this.view==='horizontal'?7:10};
    }
    cameraPreset(preset){this.preset=preset==='reset'?'perspective':preset;this.fitCamera();this.dirty=true;}
    project(x,y){const safe=this.safe||{left:0,top:0,width:this.w,height:this.h};return [safe.left+safe.width/2+x*this.factor,safe.top+safe.height/2-y*this.factor];}
    line(id,points,color=C.axis,dashed=false,width=1){
      if(this.is3D){
        const T=this.T;
        const o=this.object(id,()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(points.length),3).setUsage(T.DynamicDrawUsage));const mat=dashed?new T.LineDashedMaterial({color,dashSize:.12,gapSize:.09}):new T.LineBasicMaterial({color});return new T.Line(g,mat);});
        const a=o.geometry.attributes.position;a.array.set(points);a.needsUpdate=true;o.frustumCulled=false;
        if(dashed){
          let distances=o.geometry.attributes.lineDistance;
          if(!distances){distances=new T.BufferAttribute(new Float32Array(points.length/3),1).setUsage(T.DynamicDrawUsage);o.geometry.setAttribute('lineDistance',distances);}
          distances.array[0]=0;
          for(let i=1;i<points.length/3;i++)distances.array[i]=distances.array[i-1]+Math.hypot(points[3*i]-points[3*i-3],points[3*i+1]-points[3*i-2],points[3*i+2]-points[3*i-1]);
          distances.needsUpdate=true;
        }
      }else{
        const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dashed?[4,4]:[]);c.beginPath();
        for(let i=0;i<points.length;i+=3){const [x,y]=this.project(points[i],points[i+1]);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.setLineDash([]);
      }
    }
    box(id,x,y,z,w,h,d,color){
      if(this.is3D){const o=this.object(id,()=>{
        const mesh=new this.T.Mesh(this.boxGeo,this.material(color));mesh.castShadow=mesh.receiveShadow=true;
        if(!this.edgeGeo)this.edgeGeo=new this.T.EdgesGeometry(this.boxGeo);
        const edge=new this.T.LineSegments(this.edgeGeo,new this.T.LineBasicMaterial({color,transparent:true,opacity:.45}));mesh.add(edge);return mesh;
      });o.position.set(x,y,z);o.scale.set(w,h,d);}
      else{const c=this.ctx,[px,py]=this.project(x-w/2,y+h/2);c.fillStyle=color;c.fillRect(px,py,w*this.factor,h*this.factor);c.strokeStyle='#d1dff633';c.lineWidth=1;c.strokeRect(px,py,w*this.factor,h*this.factor);}
    }
    ball(id,x,y,z,r,color){
      if(this.is3D){const o=this.object(id,()=>{const m=new this.T.Mesh(this.sphereGeo,this.material(color));m.castShadow=true;return m;});o.position.set(x,y,z);o.scale.setScalar(r);}
      else{const c=this.ctx,[px,py]=this.project(x,y),rr=r*this.factor;const gradient=c.createRadialGradient(px-rr*.3,py-rr*.3,1,px,py,rr);gradient.addColorStop(0,'#eaf2ff');gradient.addColorStop(.3,color);gradient.addColorStop(1,color);c.fillStyle=gradient;c.beginPath();c.arc(px,py,rr,0,P.TAU);c.fill();}
    }
    arrow(id,x,y,z,dx,dy,dz,color){
      const length=Math.hypot(dx,dy,dz);if(length<1e-6)return;
      if(this.is3D){
        const o=this.object(id,()=>new this.T.ArrowHelper(new this.T.Vector3(1,0,0),new this.T.Vector3(),1,color,.17,.1));
        o.position.set(x,y,z);this.dir.set(dx,dy,dz).normalize();o.setDirection(this.dir);o.setLength(length,Math.min(.2,length*.3),Math.min(.13,length*.2));
      }else{
        const c=this.ctx,[x1,y1]=this.project(x,y),[x2,y2]=this.project(x+dx,y+dy),a=Math.atan2(y2-y1,x2-x1),head=Math.min(7,length*this.factor*.35);
        c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-head*Math.cos(a-.45),y2-head*Math.sin(a-.45));c.lineTo(x2-head*Math.cos(a+.45),y2-head*Math.sin(a+.45));c.closePath();c.fill();
      }
    }
    label(id,x,y,z,content,color=C.light){
      if(this.is3D){
        let node=this.labelNodes.get(id);if(!node){node=document.createElement('span');node.className='scene-label';this.labels.appendChild(node);this.labelNodes.set(id,node);}
        this.tmp.set(x,y,z).project(this.camera);node.hidden=Math.abs(this.tmp.z)>1;node.style.left=(this.tmp.x+1)*this.w/2+'px';node.style.top=(1-this.tmp.y)*this.h/2+'px';node.style.color=color;if(node.textContent!==content)node.textContent=content;
      }else{
        const [px,py]=this.project(x,y);this.pendingLabels.push({px,py,content,color});
      }
    }
    drawCanvasLabels(){
      const c=this.ctx,placed=[];c.font=(this.combined?'9':'10')+'px system-ui';c.textAlign='center';c.textBaseline='middle';
      for(const label of this.pendingLabels){
        const w=Math.min(this.w-12,c.measureText(label.content).width+8),h=14;
        let px=P.clamp(label.px,w/2+4,this.w-w/2-4),py=P.clamp(label.py,10,this.h-10);
        const collides=y=>placed.some(r=>Math.abs(r.x-px)<(r.w+w)/2+2&&Math.abs(r.y-y)<h+1);
        if(collides(py))for(let n=1;n<=14;n++){
          const candidate=P.clamp(py+(n%2?1:-1)*Math.ceil(n/2)*15,9,this.h-9);
          if(!collides(candidate)){py=candidate;break;}
        }
        if(Math.hypot(px-label.px,py-label.py)>9){c.strokeStyle=label.color+'66';c.lineWidth=.6;c.beginPath();c.moveTo(label.px,label.py);c.lineTo(px,py);c.stroke();}
        c.fillStyle='#0c1726e8';c.fillRect(px-w/2,py-h/2,w,h);c.fillStyle=label.color;c.fillText(label.content,px,py,this.w-16);placed.push({x:px,y:py,w});
      }
    }
    spring(id,x,y,length,vertical,radius=.23){
      const N=241;let a=this.helix.get(id);if(!a){a=new Float32Array(N*3);this.helix.set(id,a);}
      for(let i=0;i<N;i++){
        const f=i/(N-1),coil=Math.sin(P.TAU*12*f)*radius,depth=(Math.cos(P.TAU*12*f)-1)*radius;
        const taper=Math.min(1,f*16,(1-f)*16);
        a[3*i]=vertical?x+coil*taper:x+length*f;a[3*i+1]=vertical?y-length*f:y+coil*taper;a[3*i+2]=depth*taper;
      }
      this.line(id,a,C.spring,false,1.8);
      if(this.is3D)this.tube(id+'-metal',a,C.spring,.035);
    }
    tube(id,points,color,radius){
      const T=this.T,N=points.length/3,R=8,stride=R+1;
      const mesh=this.object(id,()=>{
        const geometry=new T.BufferGeometry(),indices=new Uint16Array((N-1)*R*6);
        geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(N*stride*3),3).setUsage(T.DynamicDrawUsage));
        geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(N*stride*3),3).setUsage(T.DynamicDrawUsage));
        let n=0;for(let i=0;i<N-1;i++)for(let j=0;j<R;j++){
          const a=i*stride+j,b=a+stride;indices.set([a,b,a+1,b,b+1,a+1],n);n+=6;
        }
        geometry.setIndex(new T.BufferAttribute(indices,1));const m=new T.Mesh(geometry,this.material(color));m.castShadow=true;m.frustumCulled=false;return m;
      });
      const pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
      for(let i=0;i<N;i++){
        const prev=Math.max(0,i-1)*3,next=Math.min(N-1,i+1)*3;
        let tx=points[next]-points[prev],ty=points[next+1]-points[prev+1],tz=points[next+2]-points[prev+2];
        const length=Math.hypot(tx,ty,tz)||1;tx/=length;ty/=length;tz/=length;
        const xy=Math.hypot(tx,ty);const nx=xy>1e-9?ty/xy:1,ny=xy>1e-9?-tx/xy:0;
        const bx=-tz*ny,by=tz*nx,bz=tx*ny-ty*nx;
        for(let j=0;j<=R;j++){
          const angle=j/R*P.TAU,c=Math.cos(angle),s=Math.sin(angle),x=c*nx+s*bx,y=c*ny+s*by,z=s*bz,k=(i*stride+j)*3;
          pos.array[k]=points[i*3]+radius*x;pos.array[k+1]=points[i*3+1]+radius*y;pos.array[k+2]=points[i*3+2]+radius*z;
          normal.array[k]=x;normal.array[k+1]=y;normal.array[k+2]=z;
        }
      }
      pos.needsUpdate=normal.needsUpdate=true;
    }
    arc(id,x,y,r,start,end,color){
      const N=65;let points=this.helix.get(id);
      if(!points){points=new Float32Array(N*3);this.helix.set(id,points);}
      for(let i=0;i<N;i++){
        const angle=start+(end-start)*i/(N-1);points[3*i]=x+r*Math.cos(angle);points[3*i+1]=y+r*Math.sin(angle);points[3*i+2]=.025;
      }
      this.line(id,points,color);
    }
    ring(id,x,y,r,color){
      if(this.is3D){
        const mesh=this.object(id,()=>{
          if(!this.ringGeo)this.ringGeo=new this.T.TorusGeometry(1,.009,6,160);
          const material=new this.T.MeshBasicMaterial({color,transparent:true,opacity:.85});return new this.T.Mesh(this.ringGeo,material);
        });mesh.position.set(x,y,0);mesh.scale.setScalar(r);
      }else this.arc(id,x,y,r,0,P.TAU,color);
    }
    drawReference(s,x,y,r,o){
      const separated=o.layout==='separated';
      if(!s.harmonic||s.A===0){
        this.label('circle-notice',x,y,0,s.A===0?'A = 0 · hệ đứng yên':'Con lắc phi tuyến · không có ba vectơ cosin đồng pha quay');return;
      }
      if(!this.circleFrames)this.circleFrames=new Map();
      const alpha=1-Math.exp(-9*Math.min(this.frameDt||1/60,.1)),quantities=[['x',0,s.x,'m'],['v',Math.PI/2,s.v,'m/s'],['a',Math.PI,s.a,'m/s²']];
      const symbol=o.source==='vertical'?'y':o.source==='pendulum'?'s':'x';
      if(!separated)this.ring('circle-common',x,y,r,'#38bdf8');
      for(let i=0;i<3;i++){
        const [key,offset,value,unit]=quantities[i];if(!o.vectors[key])continue;
        const target={x:x+(separated?(i-1)*r*1.65:0),y,r:r*(separated?.64:1)};
        let frame=this.circleFrames.get(key);
        if(!frame){frame={...target};this.circleFrames.set(key,frame);}
        for(const k of ['x','y','r'])frame[k]+=(target[k]-frame[k])*alpha;
        const cx=frame.x,cy=frame.y,rr=frame.r,angle=s.theta+offset,px=cx+rr*Math.cos(angle),py=cy+rr*Math.sin(angle);
        if(separated||Math.abs(rr-r)>.01)this.ring('circle-ring-'+key,cx,cy,rr,C[key]);
        this.line('circle-axis-'+key,[cx-rr-.16,cy,0,cx+rr+.16,cy,0],C.axis);
        this.line('circle-vertical-'+key,[cx,cy-rr-.16,0,cx,cy+rr+.16,0],C.axis,true);
        this.arrow('circle-radius-'+key,cx,cy,.06,px-cx,py-cy,0,C[key]);
        if(this.is3D){
          const dot=this.object('circle-point-'+key,()=>{
            const geometry=key==='a'?this.boxGeo:key==='v'?(this.octaGeo||(this.octaGeo=new this.T.OctahedronGeometry(1))):this.sphereGeo;
            return new this.T.Mesh(geometry,this.material(C[key]));
          });dot.position.set(px,py,.07);dot.scale.setScalar(key==='a'?.17:.13);
        }else this.ball('circle-point-'+key,px,py,.07,.13,C[key]);
        const label=key==='x'?symbol:key;
        this.label('circle-tip-'+key,px+.18,py+.27,.15,label,C[key]);
        if(o.projections){
          this.line('circle-projection-'+key,[px,py,.03,px,cy,.03],C[key],true);
          this.ball('circle-foot-'+key,px,cy,.03,.065,C[key]);
        }
        if(separated){
          this.label('circle-title-'+key,cx,cy+rr+.55,0,`${label}(t) · ${offset===0?'θ':offset===Math.PI?'θ + π':'θ + π/2'}`,C[key]);
          this.label('circle-value-'+key,cx,cy-rr-.45,0,`${value.toFixed(3)} ${unit}`,C[key]);
          if(o.angles)this.label('circle-angle-'+key,cx,cy-rr-.85,0,`${P.wrap(angle).toFixed(2)} rad`);
        }
      }
      if(!separated){
        this.label('circle-title',x,y+r+.65,0,'ĐƯỜNG TRÒN PHA · BÁN KÍNH CHUẨN HÓA 1','#6edfea');
        if(o.angles){
          if(o.vectors.x&&o.vectors.v){this.arc('circle-arc-xv',x,y,r*.4,s.theta,s.theta+Math.PI/2,C.v);this.label('circle-angle-xv',x+r*.56*Math.cos(s.theta+Math.PI/4),y+r*.56*Math.sin(s.theta+Math.PI/4),.08,'π/2',C.v);}
          if(o.vectors.v&&o.vectors.a){this.arc('circle-arc-va',x,y,r*.63,s.theta+Math.PI/2,s.theta+Math.PI,C.a);this.label('circle-angle-va',x+r*.78*Math.cos(s.theta+3*Math.PI/4),y+r*.78*Math.sin(s.theta+3*Math.PI/4),.08,'π/2',C.a);}
          if(o.vectors.x&&o.vectors.a)this.label('circle-angle-xa',x,y-r-.4,0,`${symbol} ↔ a: π rad · ngược pha`,C.a);
        }
      }
    }
    drawHorizontal(s,x0,y0,size,o){
      const scale=size/(s.l0+s.A+.28),wall=x0-s.l0*scale,end=x0+s.x*scale,half=.45;
      this.box('h-wall',wall-.15,y0,0,.3,1.8,.8,'#40536c');
      this.box('h-track',x0-.2,y0-.52,0,size+.3,.09,.55,'#3c526c');
      this.spring('h-coil',wall,y0,(s.l0+s.x)*scale,false,.2);
      this.box('h-mass',end+half,y0,0,half*2,.9,.9,C.spring);
      this.line('h-equilibrium',[x0,y0-1,0,x0,y0+1.2,0],C.axis,true);
      this.label('h-eq-label',x0,y0-1.18,0,'x = 0');
      this.label('h-title',x0,y0+1.75,0,`Lò xo ngang · ω = ${s.omega.toFixed(2)} rad/s`,C.spring);
      this.label('h-scale',x0,y0-1.6,0,`1 m ↔ ${scale.toFixed(2)} đơn vị cảnh`);
      [-1,1].forEach((sign,i)=>{const xx=x0+sign*s.A*scale;this.line('h-limit'+i,[xx,y0-.55,0,xx,y0-.8,0],C.x);this.label('h-limitlabel'+i,xx,y0-.88,0,sign<0?'−A':'+A',C.x);});
      if(o.vectors.x){this.arrow('h-x',x0,y0+1,0,s.x*scale,0,0,C.x);this.label('h-xtext',x0+s.x*scale/2,y0+1.27,0,'x',C.x);}
      if(o.vectors.v){this.arrow('h-v',end+half,y0+.48,.4,(s.vmax?s.v/s.vmax:0)*1.5,0,0,C.v);this.label('h-vtext',end+half,y0+.72,.4,'v',C.v);}
      if(o.vectors.a){this.arrow('h-a',end+half,y0-.67,.4,(s.amax?s.a/s.amax:0)*1.5,0,0,C.a);this.label('h-atext',end+half,y0-.98,.4,'a',C.a);}
      if(o.wave){
        let a=this.helix.get('wave');if(!a){a=new Float32Array(181*3);this.helix.set('wave',a);}
        for(let i=0;i<181;i++){const q=this.sampleHorizontal(this.time-i*s.T/90);a[3*i]=x0+q.x*scale+half;a[3*i+1]=y0;a[3*i+2]=-i/15;}
        this.line('wave',a,C.gravity);this.label('wave-label',x0+1.5,y0+.5,-3,'Vệt x(t − τ)',C.gravity);
      }
    }
    drawVertical(s,x0,top,size,o){
      const scale=size/(s.Leq+s.A+.22),len=s.L*scale,eq=top-s.Leq*scale,natural=top-s.l0*scale;
      const foot=top-len,cy=foot-.33;
      this.box('v-ceiling',x0,top+.16,0,2.4,.3,.9,'#40536c');
      this.spring('v-coil',x0,top,len,true,.24);
      this.box('v-mass',x0,cy,0,.7,.66,.7,C.spring);
      this.ball('v-attachment',x0,foot,.08,.07,C.x);
      this.label('v-title',x0,top+.65,0,`Lò xo đứng · ω = ${s.omega.toFixed(2)} rad/s`,C.spring);
      const refs=[['natural',natural,'l₀ (không biến dạng)',C.gravity,-2.2],['eq',eq,'VTCB · y = 0',C.x,-1.9],['upper',eq+s.A*scale,'−A',C.axis,2],['lower',eq-s.A*scale,'+A',C.axis,2]];
      for(const [id,y,label,color,lx] of refs){this.line('v-ref-'+id,[x0-1.05,y,0,x0+1.35,y,0],color,true);this.label('v-reftext-'+id,x0+lx,y,0,label,color);}
      this.line('v-ruler',[x0+1.3,top,0,x0+1.3,top-size,0],C.axis);
      const maxLength=size/scale,step=this.niceStep(maxLength/6);
      for(let i=0;i<=12;i++){
        const L=i*step,y=top-L*scale;if(L>maxLength)break;
        this.line('v-tick-'+i,[x0+1.25,y,0,x0+1.45,y,0],C.axis);
        this.label('v-ticktext-'+i,x0+2.9,y,0,L.toFixed(step<.1?2:1)+' m',C.light);
      }
      this.label('v-origin',x0+2.8,top+.35,0,'L ↓');
      if(o.projections){this.line('v-extension',[x0-.9,natural,.1,x0-.9,eq,.1],C.gravity);this.label('v-extension-label',x0-3,(natural+eq)/2,.1,`Δl₀ = ${s.extension.toFixed(3)} m`,C.gravity);}
      if(o.vectors.x){this.arrow('v-y',x0-.62,eq,.5,0,-s.x*scale,0,C.x);this.label('v-ylabel',x0-.8,(eq+foot)/2,.5,'y',C.x);}
      if(o.vectors.v){this.arrow('v-v',x0+.58,cy,.6,0,-(s.vmax?s.v/s.vmax:0)*1.3,0,C.v);this.label('v-vlabel',x0+.6,cy+.4,.6,'v',C.v);}
      if(o.vectors.a){this.arrow('v-a',x0+1,cy,.6,0,-(s.amax?s.a/s.amax:0)*1.3,0,C.a);this.label('v-alabel',x0+1,cy+.6,.6,'a',C.a);}
      const forceMax=Math.max(s.Fg+s.k*s.A,s.k*s.A,1e-8),forceScale=1.4/forceMax;
      for(const [key,x,color,label,value] of [['spring',-.25,C.spring,'Fₛ',s.Fs],['gravity',.25,C.gravity,'Fɡ',s.Fg],['net',-.75,C.a,'Fₙₑₜ',s.Fnet]]){
        if(o.forces[key]){this.arrow('v-force-'+key,x0+x,cy,.8,0,-value*forceScale,0,color);this.label('v-force-label'+key,x0+x,cy-value*forceScale+Math.sign(value||1)*-.23,.8,label,color);}
      }
      // One shared force scale preserves the cancellation of mg and Fs at equilibrium.
      this.label('v-force-scale',x0,top-size-.65,0,`Lực: 1 N ↔ ${forceScale.toFixed(2)} đv · mũi tên v, a chuẩn hóa`);
    }
    niceStep(x){const base=10**Math.floor(Math.log10(x));return [1,2,5,10].find(n=>n*base>=x)*base;}
    drawPendulum(s,x0,top,size,o){
      const scale=size/s.L,q=s.q,px=x0+s.bobX*scale,py=top+s.bobY*scale;
      this.box('p-support',x0,top+.15,0,2,.25,.7,'#40536c');this.ball('p-pivot',x0,top,0,.12,C.gravity);
      let rope=this.helix.get('p-rope-points');if(!rope){rope=new Float32Array(6);this.helix.set('p-rope-points',rope);}rope.set([x0,top,0,px,py,0]);
      this.line('p-rope',rope,C.gravity,false,1.8);if(this.is3D)this.tube('p-rope-metal',rope,C.gravity,.023);this.ball('p-bob',px,py,0,.46,C.gravity);
      this.line('p-axis',[x0,top,0,x0,top-size-.4,0],C.axis,true);
      this.label('p-title',x0,top+.65,0,`Con lắc đơn · ${s.model==='small'?'góc nhỏ':'phi tuyến'}`,C.gravity);
      this.label('p-length',x0-1.3,top-size/2,0,`ℓ = ${s.L.toFixed(2)} m`);
      this.label('p-q',x0+.7,top-.5,.2,`α = ${(q*180/Math.PI).toFixed(1)}°`,C.gravity);
      this.label('p-note',x0,top-size-.9,0,`T = ${s.T.toFixed(3)} s · li độ cung s = ℓα`);
      const tx=Math.cos(q),ty=Math.sin(q);
      if(o.vectors.x){this.arrow('p-s',x0,top-size-.45,.3,s.x*scale,0,0,C.x);this.label('p-slabel',x0+s.x*scale/2,top-size-.65,.3,'s (cung)',C.x);}
      if(o.vectors.v){const len=(s.vmax?s.v/s.vmax:0)*1.5;this.arrow('p-v',px,py,.45,tx*len,ty*len,0,C.v);this.label('p-vlabel',px+tx*len,py+ty*len+.3,.45,'v tiếp tuyến',C.v);}
      if(o.vectors.a){const len=(s.amax?s.a/s.amax:0)*1.5;this.arrow('p-a',px,py-.38,.5,tx*len,ty*len,0,C.a);this.label('p-alabel',px+tx*len,py-.55+ty*len,.5,'a tiếp tuyến',C.a);}
    }
    render(time,bundle,view,options,sampleHorizontal){
      if(this.disposed)return;this.setView(view);this.time=time;this.sampleHorizontal=sampleHorizontal;this.frameDt=options.dt||1/60;
      if(this.is3D){
        if(this.controls)this.controls.update();this.camera.updateMatrixWorld(true);
        for(const o of this.objects.values())o.visible=false;for(const n of this.labelNodes.values())n.hidden=true;
      }
      else{
        this.pendingLabels=[];const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);
        const bounds=this.worldBounds(),worldW=bounds.width,worldH=bounds.height;
        this.safe=this.contentRect();this.factor=Math.min(this.safe.width/worldW,this.safe.height/worldH)*.92;
        c.strokeStyle='#23354b66';c.lineWidth=.5;
        for(let x=-15;x<=15;x++){const [xx]=this.project(x,0);c.beginPath();c.moveTo(xx,0);c.lineTo(xx,this.h);c.stroke();}
        for(let y=-6;y<=6;y++){const [,yy]=this.project(0,y);c.beginPath();c.moveTo(0,yy);c.lineTo(this.w,yy);c.stroke();}
      }
      const s=bundle.samples;
      if(view==='reference')this.drawReference(s[options.source||'reference'],0,0,3.4,options);
      else if(view==='horizontal')this.drawHorizontal(s.horizontal,0,0,6.6,options);
      else if(view==='vertical')this.drawVertical(s.vertical,0,3.2,5.6,options);
      else if(view==='pendulum')this.drawPendulum(s.pendulum,0,3,5.2,options);
      else if(this.w<600){
        this.drawReference(s[options.source||'reference'],0,7.4,2.6,options);
        this.drawHorizontal(s.horizontal,0,1.1,6.6,options);
        this.drawVertical(s.vertical,-3,-2,6,options);
        this.drawPendulum(s.pendulum,3,-2,4.7,options);
      }else{
        this.drawReference(s[options.source||'reference'],-2.4,4.2,2.25,options);
        this.drawHorizontal(s.horizontal,-2.4,-.65,6.6,options);
        this.drawVertical(s.vertical,6.4,4.2,9.3,options);
        this.drawPendulum(s.pendulum,-2.4,-3,3.9,options);
      }
      if(this.is3D)this.renderer.render(this.scene,this.camera);
      else this.drawCanvasLabels();
      this.dirty=false;
    }
    disposeThree(){
      if(this.controls)this.controls.dispose();
      const geometries=new Set(),materials=new Set();
      if(this.scene)this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());if(this.renderer)this.renderer.dispose();
      this.objects.clear();this.materials.clear();
    }
    dispose(){this.disposed=true;this.resizeObserver.disconnect();if(this.is3D)this.disposeThree();}
  }
  window.MechanicalScene=MechanicalScene;
})();
