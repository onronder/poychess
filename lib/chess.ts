import { Chess } from 'chess.js';
export type PlayedMove = { from: string; to: string; promotion?: string };
export const timeControls = [
  { label: '3 + 2', name: 'Yıldırım', minutes: 3, increment: 2 },
  { label: '5 + 0', name: 'Yıldırım', minutes: 5, increment: 0 },
  { label: '10 + 0', name: 'Hızlı', minutes: 10, increment: 0 },
  { label: '15 + 10', name: 'Hızlı', minutes: 15, increment: 10 },
];
export function replay(moves: PlayedMove[], fen?: string) {
  const game = new Chess(fen); for (const move of moves) game.move(move); return game;
}
export function gameResult(game: Chess): string | null {
  if (game.isCheckmate()) return game.turn() === 'w' ? 'Siyah şah mat ile kazandı.' : 'Beyaz şah mat ile kazandı.';
  if (game.isStalemate()) return 'Pat — oyun berabere.';
  if (game.isThreefoldRepetition()) return 'Üç kez tekrar — oyun berabere.';
  if (game.isInsufficientMaterial()) return 'Yetersiz materyal — oyun berabere.';
  if (game.isDraw()) return '50 hamle kuralı — oyun berabere.';
  return null;
}
export function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
export const pieceNames: Record<string,string> = {p:'piyon',n:'at',b:'fil',r:'kale',q:'vezir',k:'şah'};
export const puzzles = [
  { id: 'back-rank', title: 'Son sıraya dikkat', theme: 'Arka sıra matı', level: 'Başlangıç', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', solution: ['e1e8'], hint: 'Siyah şahın kaçış karelerini kendi piyonları kapatıyor. Kaleyi son sıraya getir.', lesson: 'Re8# ile mat! Kale sekizinci sırayı kontrol ederken f7, g7 ve h7 piyonları şahın kaçmasını engelliyor.' },
  { id: 'fork', title: 'Bir at, iki tehdit', theme: 'Çatal', level: 'Orta', fen: '3q3k/6pp/8/4N3/8/8/6PP/6K1 w - - 0 1', solution: ['e5f7','h8g8','f7d8'], hint: 'Atı f7 karesine getir. Hem şahı hem veziri aynı anda tehdit edebilirsin.', lesson: 'Nf7+ şah ve vezire çatal atar. Şah kaçtıktan sonra Nxd8 ile veziri kazanırsın. Zorlayıcı hamleleri önce ara.' },
  { id: 'queen-mate', title: 'Kralın etrafındaki ağ', theme: 'Bir hamlede mat', level: 'Başlangıç', fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', solution: ['g6g7'], hint: 'Veziri g7 karesine yerleştir. Beyaz şahın onu koruduğuna dikkat et.', lesson: 'Qg7# ile mat! Vezir kaçış karelerini kapatır, f6 üzerindeki şah da veziri korur. Taşların birlikte çalışması önemlidir.' },
  { id: 'rook-mate', title: 'Şahını oyuna kat', theme: 'Kale matı', level: 'Başlangıç', fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1', solution: ['a1a8'], hint: 'Beyaz şah g7 ve h7 karelerini kontrol ediyor. Kale hangi sıradan şah çekmeli?', lesson: 'Ra8# ile mat. Aktif şah kaçış karelerini kapatır; kale son sırada işi bitirir.' },
];
