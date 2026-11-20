export default function Piece({type,color}:{type:string;color:string}) {
  const light=color==='w';
  return <svg viewBox="0 0 60 60" className="chess-piece" aria-hidden="true"><g fill={light?'#f7f6ee':'#26312e'} stroke={light?'#37443b':'#101b18'} strokeWidth="1.65" strokeLinejoin="round" strokeLinecap="round">
    {type==='p'&&<><circle cx="30" cy="16" r="7"/><path d="M25 23h10l-2 7c0 5 3 10 7 13H20c4-3 7-8 7-13z"/><path d="M20 43h20l3 7H17z"/></>}
    {type==='r'&&<><path d="M17 10h7v7h6v-7h6v7h7v-7h3v15l-7 5 2 14H19l2-14-7-5V10z"/><path d="M20 25h20M21 30h18M18 44h24l3 7H15z"/></>}
    {type==='b'&&<><circle cx="30" cy="8" r="3"/><path d="M30 11c-6 6-12 11-9 17 2 4 5 5 5 8l-5 8h18l-5-8c0-3 3-4 5-8 3-6-3-11-9-17z"/><path d="M31 16l-5 11M23 33h14M20 44h20l5 7H15z"/></>}
    {type==='n'&&<><path d="M16 45c0-8 5-12 13-17l-7-1-6 5-7-6 7-12 9-3 4-6 4 6c15 3 15 17 14 34z"/><path d="M20 16l-5 9M35 18c6 5 4 15-2 23M16 45h31l3 6H13z"/><circle cx="25" cy="18" r="1.8" fill={light?'#26312e':'#d9e1d6'} stroke="none"/></>}
    {type==='q'&&<><path d="M17 18l8 10 5-14 5 14 8-10-6 21H23z"/><circle cx="16" cy="16" r="3"/><circle cx="30" cy="11" r="3"/><circle cx="44" cy="16" r="3"/><path d="M23 39h14l4 6H19zM19 45h22l4 6H15z"/></>}
    {type==='k'&&<><path d="M30 5v12M25 10h10" fill="none" strokeWidth="3"/><path d="M30 21c-9-13-21-1-13 9l6 8h14l6-8c8-10-4-22-13-9z"/><path d="M30 20v16M22 38h16l3 7H19zM19 45h22l4 6H15z"/></>}
    <path d="M19 48h22" stroke={light?'#fff':'#66766b'} strokeWidth="1.2"/>
  </g></svg>;
}
