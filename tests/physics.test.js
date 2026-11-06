'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../physics.js');
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
const finite=s=>{for(const [k,v] of Object.entries(s))if(typeof v==='number')assert.ok(Number.isFinite(v),k);};

test('Bốn pha chuẩn: dấu và độ lớn của x, v, a',()=>{
  const A=.35,w=2,expected=[[A,0,-A*w*w],[0,-A*w,0],[-A,0,A*w*w],[0,A*w,0]];
  expected.forEach((row,i)=>{const q=P.harmonic(A,w,0,i*Math.PI/(2*w));[q.x,q.v,q.a].forEach((v,j)=>near(v,row[j]));});
});
test('Vectơ pha: v sớm π/2, a sớm v π/2, a ngược x',()=>{
  for(const phi of [-Math.PI,-.9,0,.7,Math.PI])for(const t of [0,.1,5,100,86400]){
    const q=P.harmonic(.4,7,phi,t);near(q.x/q.A,Math.cos(q.theta));near(q.v/q.vmax,Math.cos(q.theta+Math.PI/2),2e-10);near(q.a/q.amax,Math.cos(q.theta+Math.PI),2e-10);
    near(q.a,-q.omega*q.omega*q.x);near(P.wrap(q.theta+Math.PI/2-q.theta),Math.PI/2,2e-10);
  }
});
test('Lò xo đứng: cân bằng, hai biên, chu kỳ và hợp lực',()=>{
  const p=P.DEFAULTS.vertical,w=Math.sqrt(p.k/p.m),T=P.TAU/w;
  const eq=P.vertical({...p,phi:Math.PI/2},0);near(eq.Fnet,0);near(eq.Fs+eq.Fg,0);near(eq.L,p.l0+p.m*p.g/p.k);
  const low=P.vertical(p,0);near(low.x,p.A);near(low.v,0);near(low.a,-w*w*p.A);
  const high=P.vertical({...p,phi:Math.PI},0);near(high.x,-p.A);near(high.v,0);near(high.a,w*w*p.A);near(low.T,T);
  const next=P.vertical(p,T);near(next.x,low.x);near(next.v,low.v);
  for(let i=0;i<200;i++){const s=P.vertical(p,i*T/199);near(s.Fnet,s.Fs+s.Fg);near(s.Fnet,p.m*s.a);near(s.K+s.U,s.E);}
});
test('Thay g chỉ đổi Δl₀, không đổi ω, T, li độ quanh cân bằng hoặc E',()=>{
  const p=P.DEFAULTS.vertical;
  for(const g of [0,1.62,9.81,20])for(const t of [0,.2,3]){
    const a=P.vertical(p,t),b=P.vertical({...p,g},t);near(a.omega,b.omega);near(a.T,b.T);near(a.x,b.x);near(a.E,b.E);near(b.extension,p.m*g/p.k);
  }
});
test('Toàn bộ tổ hợp biên nhập: hữu hạn, chiều dài lò xo ≥ 0,12 m',()=>{
  for(const m of [.1,2])for(const k of [2,80])for(const g of [0,20])for(const l0 of [.2,1.5])for(const A of [0,.6]){
    const p=P.sanitize('vertical',{m,k,g,l0,A});
    for(let j=0;j<32;j++){const s=P.vertical(p,j*P.TAU/Math.sqrt(k/m)/32);finite(s);assert.ok(s.L>=.12-1e-12);near(s.K+s.U,s.E);near(s.Fnet,s.Fs+s.Fg);}
  }
  for(const m of [.1,2])for(const k of [2,80])for(const A of [0,.6]){
    const p=P.sanitize('horizontal',{m,k,A});for(let j=0;j<16;j++){const s=P.horizontal(p,j*sPeriod(p)/16);finite(s);assert.ok(s.L>0);near(s.K+s.U,s.E);}
  }
});
function sPeriod(p){return P.TAU*Math.sqrt(p.m/p.k);}
test('Dữ liệu không hợp lệ bị giới hạn hoặc thay bằng mặc định',()=>{
  for(const kind of Object.keys(P.DEFAULTS)){
    const p=P.sanitize(kind,Object.fromEntries(Object.keys(P.LIMITS[kind]).map(k=>[k,NaN])));finite(p);finite(P.evaluate(kind,p,0));
    for(const value of [Infinity,-Infinity,-1000,1e8,'bad']){const p=P.sanitize(kind,Object.fromEntries(Object.keys(P.LIMITS[kind]).map(k=>[k,value])));finite(P.evaluate(kind,p,100));}
  }
  near(P.sanitize('pendulum',{model:'small',alpha:1.4}).alpha,.2);
});
test('A = 0: năng lượng và động học bằng 0, không chia 0',()=>{
  for(const kind of ['reference','horizontal','vertical']){const p=P.sanitize(kind,{A:0});for(const t of [0,1,86400]){const s=P.evaluate(kind,p,t);finite(s);for(const k of ['x','v','a','E','K','U'])near(s[k],0);}}
});
test('Đồng hồ: dừng, tua, tiến/lùi đúng 1/60 s độc lập tốc độ phát',()=>{
  const c=new P.Clock();c.speed=2;c.advance(.05);near(c.time,.1);c.running=false;c.advance(10);near(c.time,.1);
  c.seek(10);c.step(1);near(c.time,10+1/60);assert.equal(c.running,false);c.step(-1);near(c.time,10);c.seek(-1);near(c.time,0);c.step(-1);near(c.time,0);c.seek(NaN);near(c.time,0);c.seek(Infinity);near(c.time,0);c.restart();near(c.time,0);
});
test('Chế độ vật lý giữ tần số riêng; chế độ so sánh dùng tham số tương thích',()=>{
  const p=P.freshParams(),before=JSON.stringify(p),physical=P.all(p,'physical',4);
  assert.notEqual(physical.samples.horizontal.omega,physical.samples.vertical.omega);
  for(const omega of [.5,2,8]){
    p.reference.omega=omega;const b=P.all(p,'comparison',4),q=b.params;
    for(const s of Object.values(b.samples))near(s.omega,omega);
    near(q.horizontal.k,q.horizontal.m*omega*omega);near(q.vertical.k,q.vertical.m*omega*omega);near(q.pendulum.L,q.pendulum.g/(omega*omega));
    assert.ok(q.pendulum.alpha<=.2);assert.equal(q.pendulum.model,'small');assert.ok(b.samples.vertical.L>.12);
  }
  p.reference.omega=2;assert.equal(JSON.stringify(p),before);
});
test('Góc nhỏ: chu kỳ √(ℓ/g), dây dài không đổi, động học tiếp tuyến',()=>{
  const p=P.DEFAULTS.pendulum;
  for(let i=0;i<100;i++){
    const s=P.pendulum(p,i/10);near(s.T,P.TAU*Math.sqrt(p.L/p.g));near(Math.hypot(s.bobX,s.bobY),p.L);near(s.x,p.L*s.q);near(s.F,p.m*s.a);near(s.E,s.K+s.U);
  }
});
test('Phi tuyến RK4: chu kỳ elliptic, bảo toàn cơ năng, tính chu kỳ, dấu hồi phục',()=>{
  for(const alpha of [.01,.15,.8,1.4])for(const L of [.3,3])for(const g of [1,20]){
    const p={...P.DEFAULTS.pendulum,alpha,L,g,model:'nonlinear'},initial=P.pendulum(p,0);
    near(initial.T,4*Math.sqrt(L/g)*P.ellipticK(Math.sin(alpha/2)));assert.ok(initial.T>=P.TAU*Math.sqrt(L/g));near(initial.x,L*alpha);near(initial.v,0);
    for(let i=0;i<70;i++){
      const t=initial.T*i/69,s=P.pendulum(p,t),next=P.pendulum(p,t+500*initial.T);finite(s);near(s.K+s.U,s.E,1e-9);near(s.x,next.x,1e-9);near(s.v,next.v,1e-9);near(s.a,-g*Math.sin(s.q));near(Math.hypot(s.bobX,s.bobY),L);assert.ok(s.x*s.a<=1e-12);
    }
  }
});
test('Đạo hàm số độc lập khớp v, a của mọi mô hình',()=>{
  for(const kind of ['reference','horizontal','vertical','pendulum'])for(const nonlinear of [false,true]){
    const p={...P.DEFAULTS[kind]};if(kind==='pendulum'&&nonlinear){p.model='nonlinear';p.alpha=1.1;}
    for(const t of [.133,.287,.619]){
      const h=1e-5,a=P.evaluate(kind,p,t-h),b=P.evaluate(kind,p,t),c=P.evaluate(kind,p,t+h);near((c.x-a.x)/(2*h),b.v,1e-7);near((c.v-a.v)/(2*h),b.a,1e-7);
    }
  }
});

test('So sánh ở miền biên: A = 0, g = 0 và tham số suy ra ngoài miền nhập',()=>{
  for(const A of [0,.35,.6])for(const omega of [.5,2,8])for(const mh of [.1,2])for(const mv of [.1,2])for(const g of [0,20])for(const l0 of [.2,1.5])for(const gp of [1,20]){
    const p=P.freshParams();Object.assign(p.reference,{A,omega});p.horizontal.m=mh;Object.assign(p.vertical,{m:mv,g,l0});p.pendulum.g=gp;
    for(const fraction of [0,.25,.5,.75]){
      const b=P.all(p,'comparison',fraction*P.TAU/omega);
      for(const s of Object.values(b.samples)){finite(s);near(s.omega,omega);near(s.K+s.U,s.E);}
      assert.ok(b.samples.vertical.L>=.12-1e-12);assert.ok(b.samples.horizontal.L>0);assert.ok(b.params.pendulum.alpha<=.2);
    }
  }
});
