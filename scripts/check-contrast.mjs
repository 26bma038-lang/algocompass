// WCAG contrast of the Light and Dark theme tokens (src/styles/globals.css). Run: node scripts/check-contrast.mjs
// Keep these values in sync with globals.css when a token changes.
const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)};
const lin=c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;
const L=h=>{const [r,g,b]=hex(h).map(lin);return 0.2126*r+0.7152*g+0.0722*b};
const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const sets={
 dark:{bgs:{abyss:'#0a0a0c',raised:'#131316',sunken:'#060607',glass:'#17171b'},
  fg:{ink:'#f4f4f5',muted:'#a1a1aa',faint:'#8b8b94',accent:'#8b9bff',accent2:'#b4beff',success:'#6ee7a8',warning:'#fbbf24',danger:'#f87171',cf:'#7fa2ff',lc:'#ffa116',
   newbie:'#a4acbd',pupil:'#4cdb84',specialist:'#27d5c7',expert:'#6b95ff',cm:'#bc7dff',master:'#ff9b3d',gm:'#ff5f6d'}},
 light:{bgs:{abyss:'#f6f6f7',raised:'#ffffff',sunken:'#ececef',glass:'#fbfbfc'},
  fg:{ink:'#111114',muted:'#4f4f58',faint:'#63636c',accent:'#3a4bd0',accent2:'#4654cc',success:'#13703a',warning:'#a35200',danger:'#c62828',cf:'#3656c9',lc:'#a34a07',
   newbie:'#5f6675',pupil:'#127a3a',specialist:'#0b7268',expert:'#2a55cf',cm:'#8336d0',master:'#a64a00',gm:'#c41f30'}},
};
for(const [n,s] of Object.entries(sets)){console.log('==',n);for(const [f,fc] of Object.entries(s.fg)){console.log(f.padEnd(11),Object.entries(s.bgs).map(([b,bc])=>`${b}:${cr(fc,bc).toFixed(2)}`).join(' '))}}
console.log('accent-ink light (white on accent)',cr('#ffffff','#3a4bd0').toFixed(2),'dark',cr('#0a0a0c','#8b9bff').toFixed(2));
