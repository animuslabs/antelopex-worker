import { ibcSymbols, ibcTokens } from "lib/ibcTokens"
export const chainNames = ["telos", "eos", "ux", "wax"] as const
export type ChainKey = typeof chainNames[number]

export type IbcSymbols = typeof ibcSymbols[number]
// export type SymbolsObject = {
//   [K in typeof ibcSymbols[number]]:K;
// };
export type FilteredSymbol = typeof ibcSymbols[number];

export type FilteredTokens = Partial<typeof ibcTokens>

export interface IbcToken {
  nativeChain:ChainKey
  precision:number
  img?:string
  tokenContract:Partial<Record<ChainKey, string>>
  foreignWraplockContract:Partial<Record<ChainKey, string>>
  nativeWraplockContract:Partial<Record<ChainKey, string>>
}

export interface ProofData {
  blockproof:BlockProof;
  actionproof?:ActionProof;
}

interface BlockProof {
  chain_id:string;
  blocktoprove:BlockToProve;
  bftproof:BFTProof[];
  hashes:string[];
}

interface BlockToProve {
  block:Block;
  active_nodes:number[];
  node_count:number;
}

interface Block {
  header:Header;
  producer_signatures:string[];
  previous_bmroot:string;
  id:string;
  bmproofpath:number[];
}

interface Header {
  timestamp:string;
  producer:string;
  previous:string;
  transaction_mroot:string;
  action_mroot:string;
  confirmed:number;
  schedule_version:number;
  new_producers:null;
  header_extensions:any[];
}

interface BFTProof {
  header:Header;
  producer_signatures:string[];
  previous_bmroot:string;
  bmproofpath:number[];
}

export interface ActionProof {
  amproofpath:string[];
  returnvalue:string;
}


export interface ProofDataResult {
  type:string;
  query:{
    type:string;
    block_to_prove:number;
  };
  proof:ProofData


}

export interface ActionReceipt {
  abi_sequence:string,
  act_digest:string,
  auth_sequence:any[],
  code_sequence:string,
  global_sequence:string,
  receiver:string,
  recv_sequence:string
}
