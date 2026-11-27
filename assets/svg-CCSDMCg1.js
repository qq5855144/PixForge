async function c(t){const r=URL.createObjectURL(t);try{const e=new Image;return e.src=r,await e.decode(),e}catch{throw new Error("无法解码此图片")}finally{URL.revokeObjectURL(r)}}export{c as loadImage};
