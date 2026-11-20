import { Chess as StandardChess } from 'chess.js';
export class Chess extends StandardChess {
  setQueenJumpLimits(limits?: {w?:number;b?:number}):void;
}
